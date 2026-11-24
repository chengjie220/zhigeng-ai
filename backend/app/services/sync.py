"""同步编排：采集 → 去重 → 入库 → AI/规则解析。"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crawlers.base import get_crawler
from app.models import AiRun, CrawlRun, Notice, NoticeVersion, Source
from app.services.ai_client import parse_notice
from app.services.deduplicate import content_hash, normalize_url


def _dump(value) -> str | None:
    return json.dumps(value, ensure_ascii=False) if value else None


def apply_parsed(notice: Notice, parsed, db: Session, model: str, status: str, duration_ms: int, error: str | None) -> None:
    notice.category = parsed.category
    notice.summary = parsed.summary
    notice.deadline_date = parsed.deadline_date
    notice.deadline_time = parsed.deadline_time
    notice.audience_json = _dump(parsed.audience)
    notice.requirements_json = _dump(parsed.requirements)
    notice.application_method = parsed.application_method
    notice.evidence_json = _dump(parsed.evidence)
    notice.ai_status = "done" if status == "ok" else "failed"
    notice.updated_at = datetime.now(timezone.utc)
    db.add(
        AiRun(
            notice_id=notice.id,
            model=model,
            status=status,
            duration_ms=duration_ms,
            error=error,
        )
    )


def sync_source(db: Session, source: Source, max_articles: int = 30) -> dict:
    """同步单个来源。返回统计；异常记入 crawl_runs，保留已有数据。"""
    run = CrawlRun(source_id=source.id, status="running")
    db.add(run)
    db.commit()

    stats = {"found": 0, "added": 0, "updated": 0, "error": None}
    try:
        crawler = get_crawler(source.parser_key)
        entries = crawler.fetch_list()
        stats["found"] = len(entries)

        for entry in entries[:max_articles]:
            url = normalize_url(entry.url)
            existing = db.execute(
                select(Notice).where(Notice.original_url == url)
            ).scalar_one_or_none()

            if existing is None:
                article = crawler.fetch_article(entry.url)
                body = article.body_text or ""
                notice = Notice(
                    source_id=source.id,
                    title=article.title or entry.title,
                    original_url=url,
                    published_at=article.published_at or entry.published_at,
                    body_text=body,
                    content_hash=content_hash(body),
                    attachments_json=_dump(article.attachments),
                    ai_status="pending",
                )
                db.add(notice)
                db.flush()
                db.add(NoticeVersion(notice_id=notice.id, content_hash=notice.content_hash))
                result = parse_notice(
                    notice.title, body, notice.published_at, source.name
                )
                apply_parsed(
                    notice, result.parsed, db, result.model, result.status,
                    result.duration_ms, result.error,
                )
                stats["added"] += 1
            else:
                # 内容哈希变化才重新抓取解析
                article = crawler.fetch_article(entry.url)
                body = article.body_text or ""
                new_hash = content_hash(body)
                if new_hash != existing.content_hash:
                    existing.body_text = body
                    existing.content_hash = new_hash
                    existing.title = article.title or existing.title
                    existing.published_at = article.published_at or existing.published_at
                    existing.attachments_json = _dump(article.attachments)
                    db.add(NoticeVersion(notice_id=existing.id, content_hash=new_hash))
                    result = parse_notice(
                        existing.title, body, existing.published_at, source.name
                    )
                    apply_parsed(
                        existing, result.parsed, db, result.model, result.status,
                        result.duration_ms, result.error,
                    )
                    stats["updated"] += 1

        source.last_synced_at = datetime.now(timezone.utc)
        run.status = "ok"
    except Exception as exc:  # noqa: BLE001 —— 单来源失败不影响其他来源与已有数据
        db.rollback()
        run = db.get(CrawlRun, run.id)
        run.status = "failed"
        run.error = str(exc)[:500]
        stats["error"] = str(exc)[:500]

    run.found = stats["found"]
    run.added = stats["added"]
    db.commit()
    return stats


def sync_all(db: Session, max_articles: int = 30) -> list[dict]:
    results = []
    for source in db.execute(select(Source).where(Source.enabled.is_(True))).scalars():
        stats = sync_source(db, source, max_articles=max_articles)
        results.append({"source": source.name, **stats})
    return results

"""通知查询 API。"""
from __future__ import annotations

import json
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Notice, Source
from app.schemas import NoticeAttachment, NoticeDetail, NoticeItem, NoticeListResp
from app.services.attachment_text import read_attachment_text

router = APIRouter()


def _today_bounds() -> tuple[str, str]:
    today = date.today()
    week = today + timedelta(days=7)
    return today.isoformat(), week.isoformat()


def _to_item(n: Notice, source_name: str) -> NoticeItem:
    return NoticeItem(
        id=n.id,
        title=n.title,
        source_id=n.source_id,
        source_name=source_name,
        category=n.category or "活动",
        published_at=n.published_at or "",
        deadline_date=n.deadline_date,
        deadline_time=n.deadline_time,
        summary=n.summary or "",
        ai_status=n.ai_status,
        original_url=n.original_url,
    )


def _loads(raw: str | None, default):
    if not raw:
        return default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return default


def _to_detail(n: Notice, source_name: str) -> NoticeDetail:
    item = _to_item(n, source_name)
    attachments = [
        NoticeAttachment(**a) for a in _loads(n.attachments_json, []) if isinstance(a, dict) and "url" in a
    ]
    return NoticeDetail(
        **item.model_dump(),
        audience=_loads(n.audience_json, []),
        requirements=_loads(n.requirements_json, []),
        application_method=n.application_method,
        evidence=_loads(n.evidence_json, {}),
        attachments=attachments,
        body_text=n.body_text or "",
        extra=_loads(n.extra_json, {}),
    )


@router.get("/notices", response_model=NoticeListResp)
def list_notices(
    q: str | None = None,
    category: str | None = None,
    source_id: int | None = None,
    source_ids: str | None = Query(None, description="逗号分隔的来源 ID，用于订阅过滤"),
    deadline_status: str = Query("all", pattern="^(all|urgent|upcoming|expired|unknown)$"),
    sort: str = Query("deadline", pattern="^(deadline|published)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=500),
    db: Session = Depends(get_db),
):
    today, week = _today_bounds()
    stmt = select(Notice, Source.name).join(Source, Notice.source_id == Source.id)

    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(Notice.title.like(like), Notice.summary.like(like), Notice.category.like(like))
        )
    if category:
        stmt = stmt.where(Notice.category == category)
    if source_id:
        stmt = stmt.where(Notice.source_id == source_id)
    if source_ids:
        try:
            ids = [int(x) for x in source_ids.split(",") if x.strip()]
        except ValueError:
            ids = []
        if ids:
            stmt = stmt.where(Notice.source_id.in_(ids))

    # 截止状态语义与前端 utils/date.ts 保持一致：
    # urgent=今天~7天内；upcoming=7天之后；expired=已过；unknown=无日期
    if deadline_status == "unknown":
        stmt = stmt.where(Notice.deadline_date.is_(None))
    elif deadline_status == "expired":
        stmt = stmt.where(Notice.deadline_date < today)
    elif deadline_status == "urgent":
        stmt = stmt.where(Notice.deadline_date >= today, Notice.deadline_date <= week)
    elif deadline_status == "upcoming":
        stmt = stmt.where(Notice.deadline_date > week)

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()

    if sort == "published":
        stmt = stmt.order_by(Notice.published_at.desc(), Notice.id.desc())
    else:
        # 最近截止优先：未截止按日期升序 → 已截止（刚过期在前）→ 无日期最后
        group = case(
            (Notice.deadline_date.is_(None), 2),
            (Notice.deadline_date < today, 1),
            else_=0,
        )
        stmt = stmt.order_by(
            group.asc(),
            case((Notice.deadline_date >= today, Notice.deadline_date), else_=None).asc(),
            case((Notice.deadline_date < today, Notice.deadline_date), else_=None).desc(),
            Notice.published_at.desc(),
            Notice.id.desc(),
        )

    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).all()
    items = [_to_item(n, name) for n, name in rows]
    return NoticeListResp(items=items, total=total, page=page, page_size=page_size)


@router.get("/notices/{notice_id}", response_model=NoticeDetail)
def get_notice(notice_id: int, db: Session = Depends(get_db)):
    row = db.execute(
        select(Notice, Source.name).join(Source, Notice.source_id == Source.id).where(Notice.id == notice_id)
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="notice not found")
    return _to_detail(row[0], row[1])


@router.get("/notices/{notice_id}/attachments/{index}/text")
def get_attachment_text(notice_id: int, index: int, db: Session = Depends(get_db)):
    """就地读取附件文字，返回 content 或 unsupported 原因。"""
    notice = db.get(Notice, notice_id)
    if notice is None:
        raise HTTPException(status_code=404, detail="notice not found")
    attachments = _loads(notice.attachments_json, [])
    if index < 0 or index >= len(attachments) or not isinstance(attachments[index], dict):
        raise HTTPException(status_code=404, detail="attachment not found")
    item = attachments[index]
    if not item.get("url"):
        raise HTTPException(status_code=404, detail="attachment not found")
    return read_attachment_text(str(item["url"]), str(item.get("name") or "附件"))


@router.get("/notices/{notice_id}/evidence")
def get_evidence(notice_id: int, db: Session = Depends(get_db)):
    notice = db.get(Notice, notice_id)
    if notice is None:
        raise HTTPException(status_code=404, detail="notice not found")
    return _loads(notice.evidence_json, {})


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    total = db.execute(select(func.count(Notice.id))).scalar_one()
    by_category = dict(
        db.execute(
            select(Notice.category, func.count(Notice.id)).group_by(Notice.category)
        ).all()
    )
    ai_done = db.execute(
        select(func.count(Notice.id)).where(Notice.ai_status == "done")
    ).scalar_one()
    return {
        "total": total,
        "by_category": {k or "活动": v for k, v in by_category.items()},
        "ai_done": ai_done,
    }

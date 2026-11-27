"""周视图日历：把通知里的「截止日」与「考试/活动时间」摊到日期上。"""
from __future__ import annotations

import json
from datetime import date, datetime, timedelta

from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import Notice, Source
from app.services.extract import parse_cn_date
from app.services.text_utils import dedupe_key

# extra 里这些键放的是「什么时候发生」，而不是「什么时候截止」
_EVENT_KEYS = (
    "考试时间",
    "活动时间",
    "举办时间",
    "时间",
    "考核时间",
    "面试时间",
    "笔试时间",
    "讲座时间",
    "公示期",
)


class CalendarEvent(BaseModel):
    date: str
    notice_id: int
    title: str
    category: str
    source_name: str
    kind: str  # deadline / event
    time: str | None = None
    label: str = "截止"


class CalendarResponse(BaseModel):
    start: str
    end: str
    events: list[CalendarEvent] = Field(default_factory=list)
    notice_count: int = 0
    disclaimer: str = "日历只收录原文写明了日期的通知；日期缺失的一律标「待核实」，不推测。"


def _week_bounds(anchor: date) -> tuple[date, date]:
    """以周一为一周起点。"""
    monday = anchor - timedelta(days=anchor.weekday())
    return monday, monday + timedelta(days=6)


def _loads(raw: str | None) -> dict:
    try:
        data = json.loads(raw or "{}")
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def _event_dates(extra: dict) -> list[tuple[str, str]]:
    """从 extra 里抽出 (日期, 字段名)，日期必须是原文可解析出来的。"""
    out: list[tuple[str, str]] = []
    for key in _EVENT_KEYS:
        value = extra.get(key)
        candidates = value if isinstance(value, list) else [value]
        for item in candidates:
            if not isinstance(item, str) or not item.strip():
                continue
            iso = parse_cn_date(item)
            if iso:
                out.append((iso, key))
                break
    return out


def week_events(db: Session, start: str | None = None, end: str | None = None) -> CalendarResponse:
    if start:
        anchor = date.fromisoformat(start)
    else:
        anchor = date.today()
    monday, sunday = _week_bounds(anchor)
    if end:
        # 允许前端传入更长的区间（如两周），但仍以周一为起点
        sunday = max(sunday, date.fromisoformat(end))
    start_iso, end_iso = monday.isoformat(), sunday.isoformat()

    # 截止日能直接用 SQL 圈定；extra 里的日期需回表扫，因此限制在近半年的通知上
    since = (monday - timedelta(days=180)).isoformat()
    rows = db.execute(
        select(Notice, Source.name)
        .join(Source, Notice.source_id == Source.id)
        .where(
            or_(
                Notice.deadline_date.between(start_iso, end_iso),
                Notice.published_at >= since,
            )
        )
    ).all()

    events: list[CalendarEvent] = []
    seen: set[tuple[int, str, str]] = set()
    # 同一通知被多个来源转载时，同一天只留一条，否则日历上会出现两条一模一样的卡片
    seen_repost: set[tuple[str, str]] = set()
    notice_ids: set[int] = set()

    for notice, source_name in rows:
        base = dict(
            notice_id=notice.id,
            title=notice.title,
            category=notice.category or "活动",
            source_name=source_name,
        )
        title_key = dedupe_key(notice.title)

        if notice.deadline_date and start_iso <= notice.deadline_date <= end_iso:
            rk = (title_key, notice.deadline_date)
            if title_key and rk in seen_repost:
                continue
            seen_repost.add(rk)
            key = (notice.id, notice.deadline_date, "deadline")
            if key not in seen:
                seen.add(key)
                notice_ids.add(notice.id)
                events.append(
                    CalendarEvent(
                        date=notice.deadline_date,
                        kind="deadline",
                        time=notice.deadline_time,
                        label="截止",
                        **base,
                    )
                )

        extra = _loads(notice.extra_json)
        if not extra:
            continue
        for iso, field in _event_dates(extra):
            if not (start_iso <= iso <= end_iso):
                continue
            rk = (title_key, iso)
            if title_key and rk in seen_repost:
                continue
            seen_repost.add(rk)
            key = (notice.id, iso, "event")
            if key in seen:
                continue
            seen.add(key)
            notice_ids.add(notice.id)
            events.append(CalendarEvent(date=iso, kind="event", label=field, **base))

    events.sort(key=lambda e: (e.date, e.time or "99:99", e.title))
    return CalendarResponse(
        start=start_iso,
        end=end_iso,
        events=events,
        notice_count=len(notice_ids),
    )

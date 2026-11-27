"""周视图日历测试。"""
import json
from datetime import date, timedelta

from app.database import SessionLocal
from app.models import Notice, Source


def _monday() -> date:
    today = date.today()
    return today - timedelta(days=today.weekday())


def _seed(title: str, deadline: str | None, extra: dict | None = None, category: str = "竞赛") -> int:
    db = SessionLocal()
    src = db.query(Source).filter(Source.id == 1).first()
    n = Notice(
        source_id=src.id,
        title=title,
        original_url=f"https://example.com/c/{abs(hash(title)) % 100000}",
        published_at=date.today().isoformat(),
        body_text="正文",
        content_hash=f"c{abs(hash(title)) % 100000}",
        category=category,
        summary="摘要",
        deadline_date=deadline,
        extra_json=json.dumps(extra, ensure_ascii=False) if extra else None,
        ai_status="done",
    )
    db.add(n)
    db.commit()
    nid = n.id
    db.close()
    return nid


def test_calendar_buckets_by_week(client):
    monday = _monday()
    inside = (monday + timedelta(days=2)).isoformat()
    outside = (monday + timedelta(days=20)).isoformat()
    nid_in = _seed("本周截止的通知", inside)
    _seed("下周之后截止的通知", outside)

    resp = client.get("/api/v1/calendar")
    assert resp.status_code == 200
    data = resp.json()
    assert data["start"] == monday.isoformat()
    ids = [e["notice_id"] for e in data["events"]]
    assert nid_in in ids
    assert len(ids) == len(set(ids)), "同一通知同一天不应重复"
    for e in data["events"]:
        assert data["start"] <= e["date"] <= data["end"]


def test_calendar_includes_extra_event_dates(client):
    """extra 里的考试/活动时间也要铺到日历上，且标记为 event 而非 deadline。"""
    monday = _monday()
    exam_day = (monday + timedelta(days=4)).isoformat()
    cn_day = f"{int(exam_day[5:7])}月{int(exam_day[8:10])}日"
    nid = _seed("期末考试安排", None, extra={"考试时间": f"考试定于{cn_day}上午9:00"}, category="考试安排")

    resp = client.get("/api/v1/calendar", params={"start": monday.isoformat()})
    data = resp.json()
    events = [e for e in data["events"] if e["notice_id"] == nid]
    assert events, "extra 中的考试时间应进入日历"
    assert events[0]["date"] == exam_day
    assert events[0]["kind"] == "event"
    assert events[0]["label"] == "考试时间"


def test_calendar_dedupes_reposted_notice(client):
    """同一通知被两个来源转载时，同一天只出现一张卡片。"""
    monday = _monday()
    day = (monday + timedelta(days=1)).isoformat()
    _seed("【学科竞赛】关于举办设计大赛的通知", day)
    _seed("关于举办设计大赛的通知-某某学院", day)

    resp = client.get("/api/v1/calendar", params={"start": monday.isoformat()})
    events = [e for e in resp.json()["events"] if e["date"] == day]
    assert len(events) == 1, f"应合并为 1 条，实际 {[e['title'] for e in events]}"


def test_calendar_week_start_is_monday(client):
    monday = _monday()
    resp = client.get("/api/v1/calendar", params={"start": (monday + timedelta(days=3)).isoformat()})
    data = resp.json()
    assert data["start"] == monday.isoformat(), "任意锚定日期都应回到该周周一"
    assert data["end"] >= data["start"]

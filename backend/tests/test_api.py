"""API 集成测试（内存 SQLite + TestClient）。"""
from datetime import date, timedelta

from app.database import SessionLocal
from app.models import Notice, Source


def _seed_notice(**kw) -> int:
    db = SessionLocal()
    defaults = dict(
        source_id=1,
        title="测试通知",
        original_url=f"https://example.com/n/{kw.get('id', 1)}",
        published_at="2026-11-20",
        body_text="正文",
        content_hash="abc123",
        category="竞赛",
        summary="摘要",
        ai_status="done",
    )
    defaults.update(kw)
    defaults.pop("id", None)
    n = Notice(**defaults)
    db.add(n)
    db.commit()
    db.close()
    return n.id


def test_health(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_sources_seeded(client):
    resp = client.get("/api/v1/sources")
    assert resp.status_code == 200
    names = [s["name"] for s in resp.json()]
    assert any("成都大学官网" in n for n in names)
    assert any("共青团" in n for n in names)


def test_notices_list_shape(client):
    _seed_notice(id=1, title="甲通知", original_url="https://example.com/1")
    resp = client.get("/api/v1/notices")
    data = resp.json()
    assert set(data.keys()) == {"items", "total", "page", "page_size"}
    assert data["total"] >= 1
    item = data["items"][0]
    for key in (
        "id", "title", "source_id", "source_name", "category", "published_at",
        "deadline_date", "deadline_time", "summary", "ai_status", "original_url",
    ):
        assert key in item


def test_notices_filter_by_keyword_and_category(client):
    _seed_notice(title="数学建模竞赛通知", category="竞赛", original_url="https://example.com/2")
    _seed_notice(title="志愿服务招募", category="实践", original_url="https://example.com/3")
    resp = client.get("/api/v1/notices", params={"q": "竞赛"})
    assert all("竞赛" in i["title"] or i["category"] == "竞赛" for i in resp.json()["items"])
    resp2 = client.get("/api/v1/notices", params={"category": "实践"})
    assert all(i["category"] == "实践" for i in resp2.json()["items"])


def test_deadline_status_filters(client):
    today = date.today()
    _seed_notice(
        title="紧急", original_url="https://example.com/4",
        deadline_date=(today + timedelta(days=3)).isoformat(),
    )
    _seed_notice(
        title="已过", original_url="https://example.com/5",
        deadline_date=(today - timedelta(days=3)).isoformat(),
    )
    _seed_notice(title="未知", original_url="https://example.com/6", deadline_date=None)

    assert client.get("/api/v1/notices", params={"deadline_status": "urgent"}).json()["total"] == 1
    assert client.get("/api/v1/notices", params={"deadline_status": "expired"}).json()["total"] == 1
    assert client.get("/api/v1/notices", params={"deadline_status": "unknown"}).json()["total"] == 1


def test_deadline_sort_order(client):
    today = date.today()
    _seed_notice(title="远期", original_url="https://example.com/7",
                 deadline_date=(today + timedelta(days=30)).isoformat())
    _seed_notice(title="近期", original_url="https://example.com/8",
                 deadline_date=(today + timedelta(days=2)).isoformat())
    _seed_notice(title="无日期", original_url="https://example.com/9", deadline_date=None)
    _seed_notice(title="过期", original_url="https://example.com/10",
                 deadline_date=(today - timedelta(days=1)).isoformat())

    titles = [i["title"] for i in client.get("/api/v1/notices", params={"sort": "deadline"}).json()["items"]]
    assert titles.index("近期") < titles.index("远期") < titles.index("过期") < titles.index("无日期")


def test_notice_detail_and_evidence(client):
    nid = _seed_notice(
        title="详情通知", original_url="https://example.com/11",
        audience_json='["在校本科生"]',
        requirements_json='["提交材料"]',
        application_method="官网报名",
        evidence_json='{"deadline_date": "12月10日前"}',
        attachments_json='[{"name": "报名表.docx", "url": "https://example.com/a.docx"}]',
        body_text="正文内容",
    )
    resp = client.get(f"/api/v1/notices/{nid}")
    data = resp.json()
    assert data["title"] == "详情通知"
    assert data["audience"] == ["在校本科生"]
    assert data["attachments"][0]["name"] == "报名表.docx"
    assert data["body_text"] == "正文内容"

    ev = client.get(f"/api/v1/notices/{nid}/evidence").json()
    assert ev["deadline_date"] == "12月10日前"

    assert client.get("/api/v1/notices/99999").status_code == 404

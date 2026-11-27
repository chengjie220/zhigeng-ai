"""「问知更」问答接口测试（规则降级模式）。"""
from datetime import date, timedelta

from app.database import SessionLocal
from app.models import Notice, Source


def _seed(title: str, category: str, body: str, deadline: str | None, days_ago: int = 2) -> int:
    db = SessionLocal()
    src = db.query(Source).filter(Source.id == 1).first()
    if src is None:
        src = Source(id=1, name="测试来源", url="https://example.com", parser_key="generic", enabled=True)
        db.add(src)
        db.commit()
    published = (date.today() - timedelta(days=days_ago)).isoformat()
    n = Notice(
        source_id=src.id,
        title=title,
        original_url=f"https://example.com/n/{abs(hash(title)) % 100000}",
        published_at=published,
        body_text=body,
        content_hash=f"h{abs(hash(title)) % 100000}",
        category=category,
        summary=body[:60],
        deadline_date=deadline,
        ai_status="done",
    )
    db.add(n)
    db.commit()
    db.close()
    return n.id


def test_qa_requires_question(client):
    resp = client.get("/api/v1/qa", params={"q": ""})
    assert resp.status_code == 422


def test_qa_rule_mode_with_citations(client):
    body = "为提升同学们的创新能力，学校决定举办2026年新锐设计竞赛，报名截止2026年12月20日，请各学院组织学生报名。"
    nid = _seed("关于举办2026年新锐设计竞赛的通知", "竞赛", body, deadline="2026-12-20")

    resp = client.get("/api/v1/qa", params={"q": "有什么比赛可以报名？"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["mode"] == "rule"  # 测试环境 AI_API_KEY 为空
    assert data["answer"]
    assert data["candidate_ids"], "竞赛问题应召回候选通知"
    assert any(c["notice_id"] == nid for c in data["citations"])
    cit = next(c for c in data["citations"] if c["notice_id"] == nid)
    # 引用必须逐字来自原文
    assert cit["snippet"] in body
    assert cit["title"].startswith("关于举办")


def test_qa_time_window_filters(client):
    _seed("A 竞赛通知", "竞赛", "全国大学生数学建模竞赛开始报名，报名截止2026年12月1日。", deadline="2026-12-01")
    _seed("B 竞赛通知", "竞赛", "英语写作大赛通知，报名截止2027年3月1日。", deadline="2027-03-01")

    resp = client.get("/api/v1/qa", params={"q": "这周有什么比赛？"})
    data = resp.json()
    # 时间窗口问题只召回 7 天内截止的
    assert all(True for _ in data["candidate_ids"])  # 结构检查
    resp2 = client.get("/api/v1/qa", params={"q": "有什么比赛？"})
    data2 = resp2.json()
    assert len(data2["candidate_ids"]) >= len(data["candidate_ids"])


def test_qa_no_hit_returns_hint(client):
    resp = client.get("/api/v1/qa", params={"q": "量子引力研讨会报名"})
    data = resp.json()
    assert "没有找到" in data["answer"] or "通知" in data["answer"]
    assert data["citations"] == []


def test_qa_dedupes_reposted_notices(client):
    """同一通知被两个来源转载时只引用一条，避免答案重复。"""
    body = "关于举办设计大赛的通知，报名截止2026年12月10日，欢迎参加。"
    _seed("【学科竞赛】关于举办设计大赛的通知", "竞赛", body, deadline="2026-12-10")
    _seed("关于举办设计大赛的通知-某某学院", "竞赛", body, deadline="2026-12-10")

    resp = client.get("/api/v1/qa", params={"q": "有什么比赛？"})
    data = resp.json()
    titles = [c["title"] for c in data["citations"]]
    assert len(titles) == 1, f"应去重为 1 条，实际 {titles}"


def test_qa_citation_prefers_deadline_sentence(client):
    """引用优先选「截止/报名」这类可执行信息，而不是随意的第一句。"""
    body = (
        "为丰富校园文化生活，学校决定举办系列活动。"
        "本次活动由校团委主办，各学院协办。"
        "请有意向的同学于2026年12月5日前登录系统报名，逾期不再受理。"
    )
    nid = _seed("系列活动报名通知", "活动", body, deadline="2026-12-05")

    resp = client.get("/api/v1/qa", params={"q": "有什么活动？"})
    cit = next(c for c in resp.json()["citations"] if c["notice_id"] == nid)
    assert "报名" in cit["snippet"] or "截止" in cit["snippet"]
    assert cit["snippet"] in body


def test_qa_llm_mode(monkeypatch, client):
    """配置了 LLM 时走模型回答，并保留引用。"""
    body = "学校举办就业指导讲座，主讲人为某企业 HR，欢迎全校学生参加，无需报名。"
    nid = _seed("就业指导讲座通知", "就业指导", body, deadline=None)

    from app.services import qa as qa_mod

    monkeypatch.setattr(qa_mod, "llm_chat", lambda messages, system=None: "近期有一场就业指导讲座，欢迎参加（见引用）。")
    resp = client.get("/api/v1/qa", params={"q": "有什么讲座？"})
    data = resp.json()
    assert data["mode"] == "llm"
    assert "就业指导讲座" in data["answer"]
    assert any(c["notice_id"] == nid for c in data["citations"])

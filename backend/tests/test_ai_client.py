"""去重与 AI/规则解析测试。"""
from app.services.ai_client import ParsedNotice, parse_notice, rule_extract, validate_evidence
from app.services.deduplicate import content_hash, normalize_url


def test_normalize_url():
    assert normalize_url("http://News.CDU.EDU.cn/info/1112/49981.htm/") == (
        "http://news.cdu.edu.cn/info/1112/49981.htm"
    )
    assert normalize_url("https://a.b/c?x=1#frag") == "https://a.b/c?x=1"


def test_content_hash_ignores_whitespace():
    assert content_hash("a  b\n c") == content_hash("a b c")


BODY = (
    "根据《关于举办成都大学第七届创新创业大赛的通知》的要求，现将校内选拔赛安排通知如下。"
    "参赛对象为在校本科生和研究生。请各参赛队伍于2026年12月10日18:00前提交报名材料。"
    "报名方式：通过创新创业学院官网提交报名表。"
    "参赛要求：须提交商业计划书一份，附项目介绍PPT。"
)


def test_rule_extract_fields():
    parsed = rule_extract("关于举办第七届创新创业大赛校内选拔赛的通知", BODY, "2026-11-20")
    assert parsed.category == "竞赛"
    assert parsed.deadline_date == "2026-12-10"
    assert parsed.deadline_time == "18:00"
    assert "在校本科生" in parsed.audience
    assert parsed.application_method and "创新创业学院官网" in parsed.application_method
    assert parsed.requirements
    assert "deadline_date" in parsed.evidence


def test_rule_extract_does_not_use_publish_date_as_deadline():
    body = "发布时间：2026年11月17日。本通知自发布之日起施行。"
    parsed = rule_extract("某通知", body, "2026-11-17")
    # 句子无截止提示 → 不应提取截止日期
    assert parsed.deadline_date is None


def test_validate_evidence_drops_unverifiable():
    parsed = ParsedNotice(
        deadline_date="2026-12-10",
        evidence={"deadline_date": "这句在原文里根本不存在"},
    )
    result = validate_evidence(parsed, BODY)
    assert result.deadline_date is None
    assert result.evidence == {}


def test_parse_notice_falls_back_to_rules_without_key():
    result = parse_notice("创新创业大赛通知", BODY, "2026-11-20", "测试来源")
    assert result.status == "ok"
    assert result.model == "rule-fallback"
    assert result.parsed.deadline_date == "2026-12-10"

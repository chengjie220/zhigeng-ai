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


def test_rule_extract_study_and_exam_category():
    """考研、考公类通知不再被兜底成「活动」，专属字段按原文提取。"""
    body = (
        "2027年全国硕士研究生招生考试报名公告。考试科目和考试时间如下。"
        "网上报名截止时间为2026年12月4日22:00。"
        "招录单位：成都大学研究生院。"
        "准考证于12月12日起可自行下载打印。"
    )
    parsed = rule_extract("2027年全国硕士研究生招生考试报名公告", body, "2026-11-22")
    assert parsed.category == "升学就业"
    assert parsed.deadline_date == "2026-12-04"
    assert parsed.extra.get("招录单位") == "成都大学研究生院"
    assert "考试时间" in parsed.extra
    assert "准考证" in parsed.extra["准考证打印"]


def test_rule_extract_civil_service_exam_category():
    parsed = rule_extract("关于2027年度公务员考试报名的通知", "本次招考面向应届毕业生。", "2026-11-22")
    assert parsed.category == "升学就业"


def test_rule_extract_categories_from_two_campus_sites():
    """教务处与学院官网真实栏目内容都能落到对应类别。"""
    cases = [
        ("关于启动第六届萤火虫计划项目的通知", "项目申请截止时间为2026年12月5日。", "创新创业"),
        ("第63期公考1V1公益咨询活动通知", "请扫描二维码在线预约。", "就业指导"),
        ("关于举办第69期分党校培训的通知", "培训面向入党积极分子。", "党团事务"),
        ("关于给予学生严重警告处分的决定", "经研究决定给予处分。", "奖惩处分"),
        ("成都大学智慧课程采购项目比选公告", "比选申请文件截止时间11月27日。", "招投标"),
        ("关于督促智慧树平台选修课学习的通知", "请于12月20日前完成学习。", "选课成绩"),
        ("关于开展2027届本科毕业设计选题工作的通知", "请于12月2日前提交选题。", "学籍毕业"),
    ]
    for title, body, expected in cases:
        parsed = rule_extract(title, body, "2026-11-20")
        assert parsed.category == expected, (title, parsed.category)


def test_rule_extract_keeps_unknown_content_out_of_generic_activity():
    parsed = rule_extract("图书馆关于调整阅览室开放时间的公告", "开放时间临时调整。", "2026-11-24")
    assert parsed.category == "其他通知"


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

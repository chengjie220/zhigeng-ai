"""日期解析与正文清洗测试。"""
from app.services.extract import (
    clean_body,
    extract_published_date,
    parse_cn_date,
)


def test_parse_cn_full_date():
    assert parse_cn_date("请于2026年12月10日前提交") == "2026-12-10"
    assert parse_cn_date("2026-12-05 18:00 截止") == "2026-12-05"
    assert parse_cn_date("2026.11.30 之前") == "2026-11-30"


def test_parse_cn_short_date_uses_default_year():
    assert parse_cn_date("12月10日前完成报名", default_year=2026) == "2026-12-10"


def test_parse_cn_date_invalid():
    assert parse_cn_date("") is None
    assert parse_cn_date("没有日期") is None
    assert parse_cn_date("2026年13月40日") is None


def test_extract_published_date():
    html = '<div>发布时间：2026年11月17日</div>'
    assert extract_published_date(html) == "2026-11-17"
    html2 = '<div>发布时间： 2026-11-23| 浏览人次：3</div>'
    assert extract_published_date(html2) == "2026-11-23"


def test_clean_body_prefers_container():
    html = """
    <html><body>
    <div class="menu">导航导航导航导航导航导航导航导航导航导航</div>
    <div class="v_news_content"><p>正文第一句。正文第二句。这里是足够长的正文内容，用于满足容器文本长度阈值的判断要求。</p></div>
    <script>var x = 1;</script>
    </body></html>
    """
    body = clean_body(html)
    assert "正文第一句" in body
    assert "导航" not in body
    assert "var x" not in body

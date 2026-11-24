"""采集适配器解析测试：使用真实站点 HTML 夹具离线验证。"""
from pathlib import Path

from app.crawlers.cdu_news import CduNewsCrawler
from app.crawlers.cxcyxy import CxcyxySctzCrawler
from app.crawlers.tuanwei import TuanweiCrawler

FIXTURES = Path(__file__).parent / "fixtures"


def _fake_fetch(monkeypatch, crawler, filename: str):
    html = (FIXTURES / filename).read_text(encoding="utf-8", errors="ignore")
    monkeypatch.setattr(crawler, "fetch", lambda url: html)


def test_cdu_news_list(monkeypatch):
    c = CduNewsCrawler()
    _fake_fetch(monkeypatch, c, "cdu_tzgg_list.html")
    entries = c.fetch_list()
    assert len(entries) >= 5
    e = entries[0]
    assert e.title
    assert "info/" in e.url
    assert e.published_at is None or e.published_at.count("-") == 2


def test_cdu_news_article(monkeypatch):
    c = CduNewsCrawler()
    _fake_fetch(monkeypatch, c, "cdu_news_article.html")
    art = c.fetch_article("http://news.cdu.edu.cn/info/1112/49981.htm")
    assert "蓉漂人才荟" in art.title
    assert art.published_at == "2026-11-17"
    assert len(art.body_text) > 100
    assert "根据" in art.body_text


def test_cxcyxy_list_and_article(monkeypatch):
    c = CxcyxySctzCrawler()
    _fake_fetch(monkeypatch, c, "cxcyxy_sctz_list.html")
    entries = c.fetch_list()
    assert len(entries) >= 5
    assert entries[0].published_at == "2026-11-23"
    assert "长廊维修" in entries[0].title
    assert entries[0].url.endswith(".htm")

    _fake_fetch(monkeypatch, c, "cxcyxy_article.html")
    art = c.fetch_article("https://cxcyxy.cdu.edu.cn/info/1016/4480.htm")
    assert "长廊维修" in art.title
    assert art.published_at == "2026-11-23"
    assert len(art.body_text) > 50


def test_tuanwei_list_and_article(monkeypatch):
    c = TuanweiCrawler()
    _fake_fetch(monkeypatch, c, "tuanwei_tzgg_list.html")
    entries = c.fetch_list()
    assert len(entries) >= 5
    assert entries[0].published_at == "2026-11-16"
    assert "青年志愿" in entries[0].title

    _fake_fetch(monkeypatch, c, "tuanwei_article.html")
    art = c.fetch_article("https://tuanwei.cdu.edu.cn/info/1012/3315.htm")
    assert "青年志愿" in art.title
    assert art.published_at == "2026-11-16"
    assert len(art.body_text) > 50

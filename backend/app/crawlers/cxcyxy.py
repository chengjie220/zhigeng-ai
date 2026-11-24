"""创新创业学院（cxcyxy.cdu.edu.cn）：双创通知 / 学科竞赛 两个列表共用本适配器。

列表结构：ul > li > span.sspan(YYYY-MM-DD) + a[href="../info/xxxx/xxxx.htm"]
文章：标题 <title> 去后缀，正文 div.v_news_content，发布时间：YYYY-MM-DD
"""
from __future__ import annotations

import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.crawlers.base import ArticleContent, BaseCrawler, ListEntry, register
from app.services.extract import (
    clean_body,
    extract_attachments,
    extract_published_date,
    to_iso_date,
)

_LIST_URLS = {
    "cxcyxy_sctz": "https://cxcyxy.cdu.edu.cn/xwtz/sctz.htm",
    "cxcyxy_xkjs": "https://cxcyxy.cdu.edu.cn/jyjx/xkjs.htm",
}
_TITLE_SUFFIX = re.compile(r"[-_|].*?(成都大学|创新创业学院).*$")


class _CxcyxyBase(BaseCrawler):
    list_url: str = ""

    def fetch_list(self) -> list[ListEntry]:
        html = self.fetch(self.list_url)
        soup = BeautifulSoup(html, "lxml")
        entries: list[ListEntry] = []
        for li in soup.find_all("li"):
            a = li.find("a", href=True)
            span = li.find("span", class_="sspan")
            if not a or not span:
                continue
            href = a["href"].strip()
            if not href.endswith(".htm") or href.startswith(("javascript", "#")):
                continue
            date_text = span.get_text(strip=True)
            published = None
            m = re.match(r"(20\d{2})-(\d{1,2})-(\d{1,2})", date_text)
            if m:
                published = to_iso_date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            title = a.get_text(" ", strip=True)
            if not title:
                continue
            entries.append(
                ListEntry(title=title, url=urljoin(self.list_url, href), published_at=published)
            )
        return entries

    def fetch_article(self, url: str) -> ArticleContent:
        html = self.fetch(url)
        soup = BeautifulSoup(html, "lxml")
        raw_title = soup.title.get_text(strip=True) if soup.title else ""
        title = _TITLE_SUFFIX.sub("", raw_title).strip() or raw_title
        body = clean_body(html, container_hint=("v_news_content",))
        published = extract_published_date(html)
        attachments = extract_attachments(html, url)
        return ArticleContent(
            title=title, body_text=body, published_at=published, attachments=attachments
        )


@register("cxcyxy_sctz")
class CxcyxySctzCrawler(_CxcyxyBase):
    parser_key = "cxcyxy_sctz"
    list_url = _LIST_URLS["cxcyxy_sctz"]


@register("cxcyxy_xkjs")
class CxcyxyXkjsCrawler(_CxcyxyBase):
    parser_key = "cxcyxy_xkjs"
    list_url = _LIST_URLS["cxcyxy_xkjs"]

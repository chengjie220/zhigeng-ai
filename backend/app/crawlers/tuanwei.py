"""共青团成都大学委员会 · 通知公告（tuanwei.cdu.edu.cn）。

列表结构：div.div_item > div.div_itemtitle > div.other(YYYY-MM-DD) + a[href="../info/..."]
文章：标题 <title> 去后缀，正文 div.v_news_content，发布时间：YYYY年M月D日
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

LIST_URL = "https://tuanwei.cdu.edu.cn/index/tzgg.htm"
_TITLE_SUFFIX = re.compile(r"[-_|].*?(共青团|成都大学).*$")


@register("tuanwei")
class TuanweiCrawler(BaseCrawler):
    parser_key = "tuanwei"

    def fetch_list(self) -> list[ListEntry]:
        html = self.fetch(LIST_URL)
        soup = BeautifulSoup(html, "lxml")
        entries: list[ListEntry] = []
        for item in soup.select("div.div_item"):
            a = item.find("a", href=True)
            date_div = item.find("div", class_="other")
            if not a:
                continue
            title = a.get_text(" ", strip=True)
            href = a["href"].strip()
            if not title or not href:
                continue
            published = None
            if date_div:
                m = re.match(r"(20\d{2})-(\d{1,2})-(\d{1,2})", date_div.get_text(strip=True))
                if m:
                    published = to_iso_date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            entries.append(
                ListEntry(title=title, url=urljoin(LIST_URL, href), published_at=published)
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

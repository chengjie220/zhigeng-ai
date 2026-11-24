"""成都大学官网 · 通知公告（列表在 www.cdu.edu.cn，文章在 news.cdu.edu.cn）。

列表结构：ul.list17 > li > a[title][href]
日期：div.time > h3(日) + h6(YYYY.MM)
文章：标题在 <title>（去掉站点后缀），正文 div.txt，发布时间：YYYY年M月D日
"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from app.crawlers.base import ArticleContent, BaseCrawler, ListEntry, register
from app.services.extract import (
    clean_body,
    extract_attachments,
    extract_published_date,
    to_iso_date,
)

LIST_URL = "https://www.cdu.edu.cn/index/tzgg.htm"
_TITLE_SUFFIX = re.compile(r"[-_|].*?(成都大学|新闻网).*$")


@register("cdu_news")
class CduNewsCrawler(BaseCrawler):
    parser_key = "cdu_news"

    def fetch_list(self) -> list[ListEntry]:
        html = self.fetch(LIST_URL)
        soup = BeautifulSoup(html, "lxml")
        entries: list[ListEntry] = []
        for li in soup.select("ul.list17 li"):
            a = li.find("a", href=True)
            if not a or "info/" not in a["href"]:
                continue
            title = (a.get("title") or a.get_text(" ", strip=True)).strip()
            # 日期：h3=日 h6=YYYY.MM
            published = None
            h6 = li.find("h6")
            h3 = li.find("h3")
            if h6 and h3:
                m = re.match(r"(20\d{2})\.(\d{1,2})", h6.get_text(strip=True))
                if m:
                    published = to_iso_date(
                        int(m.group(1)), int(m.group(2)), int(h3.get_text(strip=True))
                    )
            entries.append(ListEntry(title=title, url=a["href"].strip(), published_at=published))
        return entries

    def fetch_article(self, url: str) -> ArticleContent:
        html = self.fetch(url)
        soup = BeautifulSoup(html, "lxml")
        raw_title = soup.title.get_text(strip=True) if soup.title else ""
        title = _TITLE_SUFFIX.sub("", raw_title).strip() or raw_title
        body = clean_body(html, container_hint=("txt", "con2"))
        published = extract_published_date(html)
        attachments = extract_attachments(html, url)
        return ArticleContent(
            title=title,
            body_text=body,
            published_at=published,
            attachments=attachments,
        )

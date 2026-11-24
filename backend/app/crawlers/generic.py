"""通用列表页采集适配器：给「用户自行添加的信息源」使用。

不依赖某个站点的专有 CSS：找出带日期或文章路径的链接作为列表项，
正文取站点最大文本块。命中率低于专用适配器，但能让新站点立刻进入链路。
"""
from __future__ import annotations

from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from app.crawlers.base import ArticleContent, BaseCrawler, ListEntry, register
from app.services.extract import (
    clean_body,
    extract_attachments,
    extract_published_date,
    parse_cn_date,
)

_ARTICLE_HREF = __import__("re").compile(r"/(?:info|content|article|20\d{4})/|\.htm[l]?$")


@register("generic")
class GenericCrawler(BaseCrawler):
    parser_key = "generic"

    def __init__(self) -> None:
        super().__init__()
        self.list_url = ""

    def configure(self, url: str) -> None:
        self.list_url = url

    def fetch_list(self) -> list[ListEntry]:
        if not self.list_url:
            return []
        html = self.fetch(self.list_url)
        soup = BeautifulSoup(html, "lxml")
        host = urlparse(self.list_url).netloc
        entries: list[ListEntry] = []
        seen: set[str] = set()

        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if href.startswith(("#", "javascript:", "mailto:")):
                continue
            url = urljoin(self.list_url, href)
            if urlparse(url).netloc not in (host, ""):
                continue
            if url in seen:
                continue
            title = (a.get("title") or a.get_text(" ", strip=True)).strip()
            if len(title) < 8:
                continue
            parent_text = a.parent.get_text(" ", strip=True) if a.parent else ""
            published = parse_cn_date(parent_text)
            if not published and not _ARTICLE_HREF.search(href):
                continue
            seen.add(url)
            entries.append(ListEntry(title=title[:200], url=url, published_at=published))
            if len(entries) >= 50:
                break
        return entries

    def fetch_article(self, url: str) -> ArticleContent:
        html = self.fetch(url)
        soup = BeautifulSoup(html, "lxml")
        title = soup.title.get_text(strip=True) if soup.title else ""
        title = title[:200] or url.rsplit("/", 1)[-1]
        return ArticleContent(
            title=title,
            body_text=clean_body(html),
            published_at=extract_published_date(html),
            attachments=extract_attachments(html, url),
        )

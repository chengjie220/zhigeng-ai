"""采集适配器基类：抓取、限速、异常记录（不无限重试）。"""
from __future__ import annotations

import time
from dataclasses import dataclass, field

import httpx

from app.config import get_settings

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36 zhigeng-ai-crawler/1.0"
)


@dataclass
class ListEntry:
    title: str
    url: str
    published_at: str | None = None


@dataclass
class ArticleContent:
    title: str
    body_text: str
    published_at: str | None
    attachments: list[dict[str, str]] = field(default_factory=list)


REGISTRY: dict[str, type["BaseCrawler"]] = {}


def register(parser_key: str):
    def deco(cls: type[BaseCrawler]) -> type[BaseCrawler]:
        REGISTRY[parser_key] = cls
        return cls

    return deco


class BaseCrawler:
    parser_key: str = ""

    def __init__(self) -> None:
        settings = get_settings()
        self.timeout = settings.crawl_timeout
        self.delay = settings.crawl_delay_seconds
        self._last_request_at = 0.0

    # ---- HTTP ----
    def _throttle(self) -> None:
        elapsed = time.time() - self._last_request_at
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)
        self._last_request_at = time.time()

    def fetch(self, url: str) -> str:
        """抓取单页。网络异常直接抛出，由 sync 层记录，不自动重试。"""
        self._throttle()
        with httpx.Client(
            timeout=self.timeout,
            headers={"User-Agent": USER_AGENT},
            follow_redirects=True,
        ) as client:
            resp = client.get(url)
            resp.raise_for_status()
            # 校园站点常见 GBK/UTF-8 混用，httpx 自动识别失败时按 utf-8 容错
            if resp.encoding and resp.encoding.lower() not in ("utf-8", "utf8"):
                try:
                    return resp.content.decode(resp.encoding)
                except (UnicodeDecodeError, LookupError):
                    return resp.content.decode("utf-8", errors="ignore")
            return resp.text

    # ---- 子类实现 ----
    def fetch_list(self) -> list[ListEntry]:
        raise NotImplementedError

    def fetch_article(self, url: str) -> ArticleContent:
        raise NotImplementedError


def get_crawler(parser_key: str) -> BaseCrawler:
    cls = REGISTRY.get(parser_key)
    if cls is None:
        raise ValueError(f"未知的采集适配器: {parser_key}")
    return cls()

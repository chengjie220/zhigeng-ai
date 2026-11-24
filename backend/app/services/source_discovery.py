"""信息源发现：联网关键词搜索 + 网址探测。

只读取公开页面；搜索结果由搜索引擎提供，本系统不做任何内容改写。
探测结果只作为「能不能采」的参考，最终由用户确认后再写入 sources 表。
"""
from __future__ import annotations

import re
from urllib.parse import urlparse, urljoin

import httpx
from bs4 import BeautifulSoup

from app.config import get_settings
from app.crawlers.base import USER_AGENT
from app.services.extract import parse_cn_date

_DOMAIN = re.compile(r"https?://([^/]+)")
_MAX_RESULTS = 8


def _domain_of(url: str) -> str:
    try:
        return urlparse(url).netloc
    except ValueError:
        return ""


def search_sites(keyword: str) -> list[dict[str, str]]:
    """用 Bing 搜索关键词，返回可作为信息源的校园网站候选。"""
    query = f"{keyword.strip()} 通知公告 site:edu.cn"
    settings = get_settings()
    results: list[dict[str, str]] = []
    seen: set[str] = set()

    for endpoint in ("https://cn.bing.com/search", "https://www.bing.com/search"):
        try:
            with httpx.Client(
                timeout=settings.crawl_timeout,
                headers={"User-Agent": USER_AGENT},
                follow_redirects=True,
            ) as client:
                resp = client.get(endpoint, params={"q": query})
                resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")
            for li in soup.select("li.b_algo"):
                a = li.select_one("h2 a[href]")
                if not a:
                    continue
                url = a["href"].strip()
                if not url.startswith("http") or url in seen:
                    continue
                title = a.get_text(" ", strip=True)
                snippet_node = li.select_one(".b_caption p") or li.select_one("p")
                snippet = snippet_node.get_text(" ", strip=True) if snippet_node else ""
                if not title:
                    continue
                seen.add(url)
                results.append(
                    {
                        "title": title[:120],
                        "url": url[:500],
                        "snippet": snippet[:200],
                        "domain": _domain_of(url),
                    }
                )
                if len(results) >= _MAX_RESULTS:
                    break
        except (httpx.HTTPError, ValueError):
            continue
        if results:
            break
    return results


def probe_url(url: str) -> dict:
    """探测一个网址是否像通知列表页，并给出站点名与样例标题。"""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return {
            "ok": False,
            "name": "",
            "reason": "请填写以 http:// 或 https:// 开头的完整网址",
            "sample_count": 0,
            "samples": [],
        }

    settings = get_settings()
    try:
        with httpx.Client(
            timeout=settings.crawl_timeout,
            headers={"User-Agent": USER_AGENT},
            follow_redirects=True,
        ) as client:
            resp = client.get(url)
            resp.raise_for_status()
            html = resp.text
    except httpx.HTTPError as exc:
        return {
            "ok": False,
            "name": "",
            "reason": f"无法访问该网址：{str(exc)[:120]}",
            "sample_count": 0,
            "samples": [],
        }

    soup = BeautifulSoup(html, "lxml")
    raw_title = soup.title.get_text(strip=True) if soup.title else ""
    name = re.sub(r"[-_|].*$", "", raw_title).strip()[:80] or parsed.netloc

    samples: list[str] = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.startswith(("#", "javascript:", "mailto:")):
            continue
        title = (a.get("title") or a.get_text(" ", strip=True)).strip()
        if len(title) < 8:
            continue
        parent_text = a.parent.get_text(" ", strip=True) if a.parent else ""
        if not (parse_cn_date(parent_text) or re.search(r"/(?:info|content|20\d{4})/", href)):
            continue
        if title not in samples:
            samples.append(title[:120])
        if len(samples) >= 5:
            break

    ok = len(samples) >= 2
    reason = (
        f"识别到 {len(samples)} 条疑似通知标题，可以作为列表页添加"
        if ok
        else "没有识别到足够的通知标题，可能不是列表页；仍可添加后手动确认采集效果"
    )
    return {
        "ok": ok,
        "name": name,
        "reason": reason,
        "sample_count": len(samples),
        "samples": samples,
    }

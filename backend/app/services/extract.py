"""正文清洗与日期解析工具。"""
from __future__ import annotations

import re
from datetime import date

from bs4 import BeautifulSoup

# 中文日期：2026年12月10日 / 2026-12-10 / 2026.12.10 / 12月10日（默认今年）
_CN_FULL = re.compile(
    r"(20\d{2})\s*[年./-]\s*(\d{1,2})\s*[月./-]\s*(\d{1,2})\s*日?"
)
_CN_SHORT = re.compile(r"(?<!\d)(\d{1,2})\s*月\s*(\d{1,2})\s*日")
_ISO = re.compile(r"(20\d{2})-(\d{1,2})-(\d{1,2})")

# 发布时间：发布时间：2026年11月17日 / 发布时间： 2026-11-23
_PUBLISHED = re.compile(r"发布时间\s*[:：]?\s*([^\s|<]{6,20})")


def to_iso_date(y: int, m: int, d: int) -> str | None:
    try:
        return date(y, m, d).isoformat()
    except ValueError:
        return None


def parse_cn_date(text: str, default_year: int | None = None) -> str | None:
    """从文本中提取第一个合理日期，返回 YYYY-MM-DD。"""
    if not text:
        return None
    m = _CN_FULL.search(text)
    if m:
        return to_iso_date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    m = _ISO.search(text)
    if m:
        return to_iso_date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    m = _CN_SHORT.search(text)
    if m:
        year = default_year or date.today().year
        return to_iso_date(year, int(m.group(1)), int(m.group(2)))
    return None


def extract_published_date(html: str, default_year: int | None = None) -> str | None:
    """从文章页 HTML 中提取发布时间。"""
    m = _PUBLISHED.search(html)
    if m:
        return parse_cn_date(m.group(1), default_year=default_year)
    return None


def clean_body(html: str, container_hint: tuple[str, ...] = ("v_news_content", "txt", "con2")) -> str:
    """提取正文纯文本：优先站点正文容器，兜底取最大文本块。"""
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    node = None
    for cls in container_hint:
        node = soup.find("div", class_=re.compile(rf"\b{re.escape(cls)}\b"))
        if node and len(node.get_text(strip=True)) > 20:
            break
        node = None

    if node is None:
        # 兜底：取文本量最大的 div
        best, best_len = None, 0
        for div in soup.find_all("div"):
            txt = div.get_text(" ", strip=True)
            if len(txt) > best_len:
                best, best_len = div, len(txt)
        node = best

    if node is None:
        node = soup.body or soup

    text = node.get_text("\n", strip=True)
    # 压缩空行，剔除面包屑/导航残行
    nav_line = re.compile(r"^(当前位置|首页|>>+|>|正文|返回|打印|关闭|网站首页|新闻网)\s*[:：]?$")
    lines = []
    for ln in (x.strip() for x in text.splitlines()):
        if not ln:
            continue
        if nav_line.match(ln):
            continue
        if len(ln) <= 5 and not re.search(r"[。；，！？：:]", ln):
            continue
        lines.append(ln)
    return "\n".join(lines)


def extract_attachments(html: str, base_url: str) -> list[dict[str, str]]:
    """提取正文附件链接（文档类文件）。"""
    from urllib.parse import urljoin

    soup = BeautifulSoup(html, "lxml")
    seen: set[str] = set()
    result: list[dict[str, str]] = []
    pattern = re.compile(r"\.(docx?|pdf|xlsx?|pptx?|zip|rar)(\?|$)", re.I)
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not pattern.search(href):
            continue
        url = urljoin(base_url, href)
        if url in seen:
            continue
        seen.add(url)
        name = a.get_text(" ", strip=True) or href.rsplit("/", 1)[-1]
        result.append({"name": name[:120], "url": url})
    return result

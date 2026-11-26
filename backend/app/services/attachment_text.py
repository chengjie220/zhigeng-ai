"""附件就地读取：能提取文字的直接在详情页展开，不能提取的给出明确提示。

优先使用标准库解析 docx / xlsx / 纯文本，PDF 在安装了 pypdf 的环境里也会尝试读取。
所有下载都有大小上限，避免把超大文件拖进服务。
"""
from __future__ import annotations

import io
import re
import zipfile
import xml.etree.ElementTree as ET
from urllib.parse import urlparse

import httpx

MAX_BYTES = 5 * 1024 * 1024
MAX_CHARS = 12000
_W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
_S = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def _docx_text(data: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
    lines: list[str] = []
    for paragraph in root.iter(f"{_W}p"):
        text = "".join(node.text or "" for node in paragraph.iter(f"{_W}t"))
        if text.strip():
            lines.append(text.strip())
    return "\n".join(lines)


def _xlsx_text(data: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        names = archive.namelist()
        shared: list[str] = []
        if "xl/sharedStrings.xml" in names:
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.iter(f"{_S}si"):
                shared.append("".join(node.text or "" for node in item.iter(f"{_S}t")))
        sheets = [n for n in names if re.match(r"xl/worksheets/sheet\d+\.xml$", n)]
        lines: list[str] = []
        for sheet in sheets[:3]:
            root = ET.fromstring(archive.read(sheet))
            for row in root.iter(f"{_S}row"):
                cells: list[str] = []
                for cell in row.findall(f"{_S}c"):
                    value = cell.find(f"{_S}v")
                    raw = "" if value is None else (value.text or "")
                    if cell.get("t") == "s" and raw.isdigit():
                        index = int(raw)
                        raw = shared[index] if index < len(shared) else ""
                    inline = cell.find(f"{_S}is")
                    if inline is not None:
                        raw = "".join(node.text or "" for node in inline.iter(f"{_S}t"))
                    cells.append(raw.strip())
                if any(cells):
                    lines.append("\t".join(cells))
            if len(lines) >= 200:
                break
    return "\n".join(lines[:200])


def _plain_text(data: bytes) -> str:
    for encoding in ("utf-8", "gb18030"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="ignore")


def _pdf_text(data: bytes) -> str | None:
    try:
        from pypdf import PdfReader
    except ImportError:
        return None
    reader = PdfReader(io.BytesIO(data))
    return "\n".join((page.extract_text() or "") for page in reader.pages[:20])


def read_attachment_text(url: str, name: str) -> dict[str, str]:
    """返回 name / content / unsupported；无法读取时 content 为空并说明原因。"""
    result = {"name": name, "content": "", "unsupported": ""}
    if urlparse(url).scheme not in ("http", "https"):
        result["unsupported"] = "附件地址不是网页链接，无法直接读取"
        return result

    try:
        with httpx.stream(
            "GET",
            url,
            follow_redirects=True,
            timeout=10.0,
            headers={"User-Agent": "Mozilla/5.0 (compatible; ZhiGengAI/1.0)"},
        ) as response:
            response.raise_for_status()
            chunks: list[bytes] = []
            size = 0
            for chunk in response.iter_bytes():
                size += len(chunk)
                if size > MAX_BYTES:
                    result["unsupported"] = "文件较大，请打开原文件查看"
                    return result
                chunks.append(chunk)
        data = b"".join(chunks)
    except (httpx.HTTPError, OSError):
        result["unsupported"] = "附件下载失败，请打开原文件查看"
        return result

    suffix = name.lower().rsplit(".", 1)[-1] if "." in name else ""
    try:
        if suffix == "docx":
            content = _docx_text(data)
        elif suffix in ("xlsx", "xlsm"):
            content = _xlsx_text(data)
        elif suffix == "pdf":
            pdf = _pdf_text(data)
            if pdf is None:
                result["unsupported"] = "PDF 需要额外的解析组件，请打开原文件查看"
                return result
            content = pdf
        else:
            content = _plain_text(data)
    except (zipfile.BadZipFile, ET.ParseError, ValueError, IndexError):
        result["unsupported"] = "文件内容无法解析，请打开原文件查看"
        return result

    content = content.strip()
    if not content:
        result["unsupported"] = "没有提取到可展示的文字，请打开原文件查看"
        return result
    result["content"] = content[:MAX_CHARS]
    return result

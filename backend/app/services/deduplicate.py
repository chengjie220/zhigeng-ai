"""URL 归一化与内容哈希去重。"""
from __future__ import annotations

import hashlib
from urllib.parse import urlparse, urlunparse


def normalize_url(url: str) -> str:
    """归一化 URL：去 fragment、去末尾斜杠、统一 scheme/host 小写。"""
    parts = urlparse(url.strip())
    path = parts.path.rstrip("/") or "/"
    return urlunparse(
        (parts.scheme.lower(), parts.netloc.lower(), path, "", parts.query, "")
    )


def content_hash(text: str) -> str:
    """正文哈希（空白归一后 SHA-256 前 16 位）。"""
    normalized = " ".join((text or "").split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]

"""HTTP 抓取工具：带 SSL 证书失败兜底。

部署沙箱对部分站点（如 *.cdu.edu.cn）证书链校验失败，
首次请求失败且确属证书问题时，降级 verify=False 重试一次。
抓取对象均为公开通知页面，该兜底仅用于读取公开信息。
"""
from __future__ import annotations

import httpx

from app.crawlers.base import USER_AGENT


def get(url: str, timeout: float, params: dict | None = None) -> httpx.Response:
    headers = {"User-Agent": USER_AGENT}
    with httpx.Client(timeout=timeout, headers=headers, follow_redirects=True) as client:
        try:
            return client.get(url, params=params)
        except httpx.ConnectError as exc:
            msg = str(exc)
            if "CERTIFICATE_VERIFY_FAILED" not in msg and "SSL" not in msg:
                raise
    # 证书校验失败 → 降级重试一次
    with httpx.Client(
        timeout=timeout, headers=headers, follow_redirects=True, verify=False
    ) as client:
        return client.get(url, params=params)

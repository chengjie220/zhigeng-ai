"""API 响应 Schema —— 字段名与 frontend/src/types/notice.ts 严格一致。"""
from typing import Any

from pydantic import BaseModel


class NoticeItem(BaseModel):
    id: int
    title: str
    source_id: int
    source_name: str
    category: str
    published_at: str
    deadline_date: str | None = None
    deadline_time: str | None = None
    summary: str
    ai_status: str  # done / pending / failed
    original_url: str


class NoticeAttachment(BaseModel):
    name: str
    url: str


class NoticeDetail(NoticeItem):
    audience: list[str] = []
    requirements: list[str] = []
    application_method: str | None = None
    evidence: dict[str, str] = {}
    attachments: list[NoticeAttachment] = []
    body_text: str = ""
    extra: dict[str, Any] = {}


class NoticeListResp(BaseModel):
    items: list[NoticeItem]
    total: int
    page: int
    page_size: int


class SourceItem(BaseModel):
    id: int
    name: str
    url: str
    content_types: str
    last_synced_at: str | None = None
    enabled: bool
    is_custom: bool = False


class SourceSearchResult(BaseModel):
    title: str
    url: str
    snippet: str
    domain: str


class SourceProbeResult(BaseModel):
    ok: bool
    name: str
    reason: str
    sample_count: int
    samples: list[str]


class SourceCreateRequest(BaseModel):
    name: str
    url: str
    content_types: str = "自定义来源"

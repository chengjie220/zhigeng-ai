"""问答 schema。"""
from __future__ import annotations

from pydantic import BaseModel, Field


class QACitation(BaseModel):
    """引用的原文依据，snippet 必须逐字来自该通知正文。"""

    notice_id: int
    title: str
    category: str
    deadline_date: str | None = None
    deadline_time: str | None = None
    snippet: str
    original_url: str


class QAResponse(BaseModel):
    question: str
    answer: str
    mode: str  # llm / rule
    citations: list[QACitation] = Field(default_factory=list)
    candidate_ids: list[int] = Field(default_factory=list)
    disclaimer: str = "回答由 AI 基于已采集的公开通知整理，仅供参考，请以原文为准。"

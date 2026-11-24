"""通知与采集/AI 运行记录模型。

日期一律存 ISO 文本（YYYY-MM-DD / HH:MM），便于 SQLite 排序比较。
"""
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Notice(Base):
    __tablename__ = "notices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_id: Mapped[int] = mapped_column(Integer, ForeignKey("sources.id"), index=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    original_url: Mapped[str] = mapped_column(String(1024), nullable=False, unique=True)
    published_at: Mapped[str | None] = mapped_column(String(32), nullable=True)
    body_text: Mapped[str] = mapped_column(Text, default="")
    content_hash: Mapped[str] = mapped_column(String(64), index=True)

    # AI / 规则提取结果
    category: Mapped[str | None] = mapped_column(String(32), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    deadline_date: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    deadline_time: Mapped[str | None] = mapped_column(String(16), nullable=True)
    audience_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    requirements_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    application_method: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachments_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    ai_status: Mapped[str] = mapped_column(String(16), default="pending")  # pending/done/failed
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class CrawlRun(Base):
    __tablename__ = "crawl_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_id: Mapped[int] = mapped_column(Integer, ForeignKey("sources.id"))
    started_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="running")  # running/ok/failed
    found: Mapped[int] = mapped_column(Integer, default=0)
    added: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)


class AiRun(Base):
    __tablename__ = "ai_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notice_id: Mapped[int] = mapped_column(Integer, ForeignKey("notices.id"), index=True)
    model: Mapped[str] = mapped_column(String(64))
    prompt_version: Mapped[str] = mapped_column(String(32), default="v1")
    status: Mapped[str] = mapped_column(String(16))  # ok/failed
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)


class NoticeVersion(Base):
    __tablename__ = "notice_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    notice_id: Mapped[int] = mapped_column(Integer, ForeignKey("notices.id"), index=True)
    content_hash: Mapped[str] = mapped_column(String(64))
    processed_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

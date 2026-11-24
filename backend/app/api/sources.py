"""信息源查询、发现与自定义添加 API。"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from urllib.parse import urlparse

from app.database import get_db
from app.models import Source
from app.schemas import SourceCreateRequest, SourceItem, SourceProbeResult, SourceSearchResult
from app.services.source_discovery import probe_url, search_sites

router = APIRouter()


def _to_item(s: Source) -> SourceItem:
    return SourceItem(
        id=s.id,
        name=s.name,
        url=s.url,
        content_types=s.content_types or "",
        last_synced_at=s.last_synced_at.strftime("%Y-%m-%d %H:%M") if s.last_synced_at else None,
        enabled=s.enabled,
        is_custom=bool(s.is_custom),
    )


@router.get("/sources", response_model=list[SourceItem])
def list_sources(db: Session = Depends(get_db)):
    sources = db.execute(select(Source).order_by(Source.id)).scalars().all()
    return [_to_item(s) for s in sources]


@router.get("/sources/search", response_model=list[SourceSearchResult])
def search_source_candidates(q: str):
    """像搜索引擎一样按关键词找校园网站候选（只读，不写入数据库）。"""
    if not q or not q.strip():
        return []
    return [SourceSearchResult(**item) for item in search_sites(q)]


@router.get("/sources/probe", response_model=SourceProbeResult)
def probe_source(url: str):
    """探测网址是否像通知列表页，给添加决策提供依据。"""
    return SourceProbeResult(**probe_url(url))


@router.post("/sources", response_model=SourceItem, status_code=201)
def create_source(payload: SourceCreateRequest, db: Session = Depends(get_db)):
    """添加一个自定义信息源；使用通用适配器，下一次同步生效。"""
    name, url = payload.name.strip(), payload.url.strip()
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(status_code=400, detail="网址必须以 http:// 或 https:// 开头")
    if not name:
        raise HTTPException(status_code=400, detail="请填写信息源名称")

    existing = db.execute(select(Source).where(Source.url == url)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="该网址已在信息源列表中")

    source = Source(
        name=name[:128],
        url=url[:512],
        parser_key="generic",
        content_types=(payload.content_types or "自定义来源")[:128],
        enabled=True,
        is_custom=True,
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return _to_item(source)

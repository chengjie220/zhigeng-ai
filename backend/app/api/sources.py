"""信息源查询 API。"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Source
from app.schemas import SourceItem

router = APIRouter()


@router.get("/sources", response_model=list[SourceItem])
def list_sources(db: Session = Depends(get_db)):
    sources = db.execute(select(Source).order_by(Source.id)).scalars().all()
    return [
        SourceItem(
            id=s.id,
            name=s.name,
            url=s.url,
            content_types=s.content_types or "",
            last_synced_at=s.last_synced_at.strftime("%Y-%m-%d %H:%M") if s.last_synced_at else None,
            enabled=s.enabled,
        )
        for s in sources
    ]

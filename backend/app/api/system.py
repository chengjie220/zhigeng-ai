"""健康检查与手动触发同步。"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.sync import sync_all

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/admin/sync")
def trigger_sync(db: Session = Depends(get_db)):
    """手动触发一次全量同步（演示用；生产环境由定时任务执行）。"""
    return {"results": sync_all(db)}

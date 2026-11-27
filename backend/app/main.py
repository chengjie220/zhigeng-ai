"""FastAPI 应用入口。

启动：uvicorn app.main:app --reload --port 8000
生产（单端口托管前端静态文件）：python run.py
"""
from contextlib import asynccontextmanager
from pathlib import Path
import threading
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.api import calendar_router, notices_router, qa_router, sources_router, system_router
from app.config import get_settings
from app.database import init_db

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


def _sync_loop() -> None:
    """后台定时同步：启动后立即采集一轮，之后按 sync_interval_hours 周期执行。"""
    from app.database import SessionLocal
    from app.services.sync import sync_all

    interval = get_settings().sync_interval_hours * 3600
    while True:
        try:
            db = SessionLocal()
            try:
                sync_all(db)
            finally:
                db.close()
        except Exception as exc:  # noqa: BLE001 —— 同步失败不退出服务
            print(f"[auto-sync] failed: {exc}")
        if interval <= 0:
            return
        time.sleep(interval)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    if get_settings().sync_interval_hours > 0:
        threading.Thread(target=_sync_loop, daemon=True, name="zhigeng-sync").start()
    yield


app = FastAPI(title="知更 AI · 校园机会雷达 API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notices_router, prefix="/api/v1", tags=["notices"])
app.include_router(sources_router, prefix="/api/v1", tags=["sources"])
app.include_router(system_router, prefix="/api/v1", tags=["system"])
app.include_router(qa_router, prefix="/api/v1", tags=["qa"])
app.include_router(calendar_router, prefix="/api/v1", tags=["calendar"])


@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    """托管前端静态文件；未命中的路径回退 index.html（Vue Router history 模式）。"""
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="not found")
    if full_path:
        candidate = STATIC_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
    index = STATIC_DIR / "index.html"
    if index.is_file():
        return FileResponse(index)
    raise HTTPException(status_code=404, detail="frontend not built")

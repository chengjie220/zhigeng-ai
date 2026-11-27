"""FastAPI 应用入口。

启动：uvicorn app.main:app --reload --port 8000
生产（单端口托管前端静态文件）：python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.api import notices_router, sources_router, system_router
from app.database import init_db

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
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

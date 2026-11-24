"""FastAPI 应用入口。

启动：uvicorn app.main:app --reload --port 8000
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import notices_router, sources_router, system_router
from app.database import init_db


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

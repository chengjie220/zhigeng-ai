"""数据库引擎与会话。"""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def _make_engine():
    url = get_settings().database_url
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=connect_args)


engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """建表 + 预置信息源（幂等）。"""
    from app.models import Source  # noqa: F401 确保模型注册
    from app.services.seed import seed_sources

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_sources(db)
    finally:
        db.close()

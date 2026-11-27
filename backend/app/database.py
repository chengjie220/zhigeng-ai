"""数据库引擎与会话。"""
from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def _make_engine():
    url = get_settings().database_url
    # SQLite 默认遇到写锁会立刻报错；给 15s 等待，避免部署重启时两个实例抢锁直接崩
    connect_args = (
        {"check_same_thread": False, "timeout": 15} if url.startswith("sqlite") else {}
    )
    return create_engine(url, connect_args=connect_args)


engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_columns() -> None:
    """轻量迁移：为已有数据库补上新增列，避免重建丢失真实数据。"""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    wanted = {
        "notices": {"extra_json": "TEXT"},
        "sources": {"is_custom": "INTEGER DEFAULT 0"},
    }
    with engine.begin() as conn:
        for table, columns in wanted.items():
            if table not in tables:
                continue
            existing = {c["name"] for c in inspector.get_columns(table)}
            for name, ddl in columns.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))


def init_db() -> None:
    """建表 + 轻量迁移 + 预置信息源（幂等）。"""
    from app.models import Source  # noqa: F401 确保模型注册
    from app.services.seed import seed_sources

    Base.metadata.create_all(bind=engine)
    _ensure_columns()
    db = SessionLocal()
    try:
        seed_sources(db)
    finally:
        db.close()

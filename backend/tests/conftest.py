"""pytest 固件：临时 SQLite 数据库 + FastAPI TestClient。"""
import os
import tempfile

import pytest
from fastapi.testclient import TestClient

# 使用独立临时数据库文件（:memory: 在多连接下不共享），避免污染开发库
_tmpdir = tempfile.mkdtemp(prefix="zhigeng-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmpdir}/test.db"
os.environ["AI_API_KEY"] = ""  # 测试走规则降级，不调用外部 API


from app.database import Base, SessionLocal, engine, init_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def db():
    Base.metadata.create_all(bind=engine)
    init_db()
    session = SessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db):
    return TestClient(app)

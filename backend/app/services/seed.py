"""预置信息源（幂等）。"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Source

SEED_SOURCES = [
    {
        "id": 1,
        "name": "成都大学官网 · 通知公告",
        "url": "https://www.cdu.edu.cn/index/tzgg.htm",
        "parser_key": "cdu_news",
        "content_types": "校级通知、活动",
    },
    {
        "id": 2,
        "name": "创新创业学院 · 双创通知",
        "url": "https://cxcyxy.cdu.edu.cn/xwtz/sctz.htm",
        "parser_key": "cxcyxy_sctz",
        "content_types": "竞赛、创新创业",
    },
    {
        "id": 3,
        "name": "共青团成都大学委员会 · 通知公告",
        "url": "https://tuanwei.cdu.edu.cn/index/tzgg.htm",
        "parser_key": "tuanwei",
        "content_types": "实践、志愿服务",
    },
    {
        "id": 4,
        "name": "创新创业学院 · 学科竞赛",
        "url": "https://cxcyxy.cdu.edu.cn/jyjx/xkjs.htm",
        "parser_key": "cxcyxy_xkjs",
        "content_types": "学科竞赛",
    },
]


def seed_sources(db: Session) -> None:
    for item in SEED_SOURCES:
        existing = db.get(Source, item["id"])
        if existing is None:
            db.add(Source(**item))
        else:
            existing.name = item["name"]
            existing.url = item["url"]
            existing.parser_key = item["parser_key"]
            existing.content_types = item["content_types"]
    db.commit()

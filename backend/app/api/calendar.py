"""周视图日历 API。"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.calendar import CalendarResponse, week_events

router = APIRouter()


@router.get("/calendar", response_model=CalendarResponse)
def get_calendar(
    start: str | None = Query(None, description="锚定日期 YYYY-MM-DD，默认本周"),
    end: str | None = Query(None, description="可选：把区间延长到该日期"),
    db: Session = Depends(get_db),
):
    return week_events(db, start, end)

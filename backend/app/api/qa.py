"""「问知更」AI 问答 API。"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.qa import QAResponse
from app.services.qa import answer_question

router = APIRouter()


@router.get("/qa", response_model=QAResponse)
def ask(
    q: str = Query(..., min_length=1, max_length=200, description="自然语言问题"),
    db: Session = Depends(get_db),
):
    return answer_question(q, db)

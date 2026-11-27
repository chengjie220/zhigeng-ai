from app.api.calendar import router as calendar_router
from app.api.notices import router as notices_router
from app.api.qa import router as qa_router
from app.api.sources import router as sources_router
from app.api.system import router as system_router

__all__ = [
    "calendar_router",
    "notices_router",
    "qa_router",
    "sources_router",
    "system_router",
]

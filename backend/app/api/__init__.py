from app.api.notices import router as notices_router
from app.api.sources import router as sources_router
from app.api.system import router as system_router

__all__ = ["notices_router", "sources_router", "system_router"]

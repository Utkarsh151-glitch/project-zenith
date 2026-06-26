"""Central versioned API router.

All HTTP routers are included here so `main.py` only needs to mount one
versioned router for the public API surface.
"""

from fastapi import APIRouter

from app.routers.health import router as health_router
from app.routers.iss import router as iss_router


api_router = APIRouter(prefix="/api/v1")

# Health endpoints live under `/api/v1` and contain no business logic.
api_router.include_router(health_router)

# ISS endpoints expose live International Space Station telemetry.
api_router.include_router(iss_router)

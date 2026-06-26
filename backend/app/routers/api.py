"""Central versioned API router.

All HTTP routers are included here so `main.py` only needs to mount one
versioned router for the public API surface.
"""

from fastapi import APIRouter

from app.routers.dashboard import router as dashboard_router
from app.routers.health import router as health_router
from app.routers.iss import router as iss_router
from app.routers.narrator import router as narrator_router
from app.routers.planets import router as planets_router
from app.routers.satellites import router as satellites_router
from app.routers.weather import router as weather_router


api_router = APIRouter(prefix="/api/v1")

# Health endpoints live under `/api/v1` and contain no business logic.
api_router.include_router(health_router)

# Dashboard endpoint orchestrates provider data into one observation report.
api_router.include_router(dashboard_router)

# ISS endpoints expose live International Space Station telemetry.
api_router.include_router(iss_router)

# Observation data endpoints feed future astronomy calculations.
api_router.include_router(weather_router)
api_router.include_router(satellites_router)
api_router.include_router(planets_router)
api_router.include_router(narrator_router)

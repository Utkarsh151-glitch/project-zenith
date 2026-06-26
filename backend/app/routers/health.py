"""Health check router module.

This file is reserved for lightweight service health endpoints. Business logic
should remain in service-layer modules.
"""

from fastapi import APIRouter

from app.schemas.response import APIResponse


router = APIRouter(tags=["health"])


@router.get("/health", response_model=APIResponse[dict[str, str]])
async def health_check() -> APIResponse[dict[str, str]]:
    """Return a lightweight service health response."""
    return APIResponse(
        success=True,
        message="Service is healthy.",
        data={"status": "ok"},
    )

"""Satellite observation API router."""

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.config import settings
from app.schemas.response import APIResponse
from app.schemas.satellite import SatelliteTLE
from app.services.satellite_service import SatelliteService, SatelliteServiceError


router = APIRouter(prefix="/satellites", tags=["satellites"])


def get_satellite_service() -> SatelliteService:
    """Create the satellite service dependency."""
    return SatelliteService(base_url=settings.CELESTRAK_URL, fallback_url=settings.ALT_TLE_URL)


@router.get(
    "/active",
    response_model=APIResponse[list[SatelliteTLE]],
    summary="Get active satellite TLE data",
    description=(
        "Download ACTIVE satellite two-line element sets from CelesTrak. "
        "Results are cached in memory for 10 minutes."
    ),
    responses={
        status.HTTP_200_OK: {"description": "Active satellite TLE data returned successfully."},
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "description": "CelesTrak is unavailable or returned invalid data.",
        },
    },
)
async def get_active_satellites(
    request: Request,
    satellite_service: SatelliteService = Depends(get_satellite_service),
) -> APIResponse[list[SatelliteTLE]]:
    """Return cached or freshly downloaded ACTIVE satellite TLE data."""
    try:
        satellites = await satellite_service.get_active_satellites()
    except SatelliteServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return APIResponse(
        success=True,
        message="Active satellite TLE data fetched successfully.",
        data=satellites,
        request_id=getattr(request.state, "request_id", None),
    )

"""ISS tracking API router.

The router handles HTTP concerns for ISS endpoints while delegating provider
communication to the service layer.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.config import settings
from app.schemas.iss import ISSPosition
from app.schemas.response import APIResponse
from app.services.iss_service import ISSService, ISSServiceError


router = APIRouter(prefix="/iss", tags=["iss"])


def get_iss_service() -> ISSService:
    """Create the ISS service dependency."""
    return ISSService(base_url=settings.OPEN_NOTIFY_URL, fallback_url=settings.WHERE_THE_ISS_URL)


@router.get(
    "/live",
    response_model=APIResponse[ISSPosition],
    summary="Get live ISS position",
    description=(
        "Fetch the current International Space Station latitude, longitude, "
        "and provider timestamp from Open Notify."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "Live ISS position returned successfully.",
        },
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "description": "The live ISS provider is unavailable or returned invalid data.",
        },
    },
)
async def get_live_iss_position(
    request: Request,
    iss_service: ISSService = Depends(get_iss_service),
) -> APIResponse[ISSPosition]:
    """Return the current ISS position."""
    try:
        position = await iss_service.get_live_position()
    except ISSServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return APIResponse(
        success=True,
        message="Live ISS position fetched successfully.",
        data=position,
        request_id=getattr(request.state, "request_id", None),
    )

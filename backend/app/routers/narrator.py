"""AI cosmic narrator API router."""

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.config import settings
from app.schemas.narrator import NarratorAnswer, NarratorRequest
from app.schemas.response import APIResponse
from app.services.narrator_service import NarratorService, NarratorServiceError


router = APIRouter(prefix="/narrator", tags=["narrator"])


def get_narrator_service() -> NarratorService:
    """Create the Gemini-backed narrator service dependency."""
    return NarratorService(api_key=settings.GEMINI_API_KEY)


@router.post(
    "/ask",
    response_model=APIResponse[NarratorAnswer],
    summary="Ask the AI cosmic narrator",
    responses={
        status.HTTP_200_OK: {"description": "Narrator answer returned successfully."},
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "description": "The AI provider is not configured or unavailable.",
        },
    },
)
async def ask_narrator(
    payload: NarratorRequest,
    request: Request,
    narrator_service: NarratorService = Depends(get_narrator_service),
) -> APIResponse[NarratorAnswer]:
    """Generate a plain-language astronomy answer for the UI chat panel."""
    try:
        text = await narrator_service.answer(
            query=payload.query,
            lat=payload.lat,
            lon=payload.lon,
            timestamp=payload.timestamp,
        )
    except NarratorServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return APIResponse(
        success=True,
        message="Narrator answer generated successfully.",
        data=NarratorAnswer(text=text),
        request_id=getattr(request.state, "request_id", None),
    )

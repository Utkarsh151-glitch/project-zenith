"""Global FastAPI exception handlers.

Handlers translate framework and application errors into the shared API
response envelope without adding business-specific behavior.
"""

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.schemas.response import APIResponse


logger = logging.getLogger(__name__)


def _request_id(request: Request) -> str | None:
    """Read the request ID attached by middleware."""
    return getattr(request.state, "request_id", None)


def _json_response(
    *,
    status_code: int,
    message: str,
    request: Request,
    errors: list[str] | None = None,
) -> JSONResponse:
    """Build an error response using the standard API envelope."""
    body = APIResponse[None](
        success=False,
        message=message,
        data=None,
        errors=errors,
        request_id=_request_id(request),
    )
    return JSONResponse(status_code=status_code, content=body.model_dump())


def register_exception_handlers(app: FastAPI) -> None:
    """Attach global exception handlers to the FastAPI application."""

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request,
        exc: StarletteHTTPException,
    ) -> JSONResponse:
        return _json_response(
            status_code=exc.status_code,
            message=str(exc.detail),
            request=request,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        errors = [str(error) for error in exc.errors()]
        return _json_response(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message="Request validation failed.",
            request=request,
            errors=errors,
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        logger.exception("Unhandled application error", exc_info=exc)
        return _json_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Internal server error.",
            request=request,
        )

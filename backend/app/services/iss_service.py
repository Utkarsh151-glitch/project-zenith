"""ISS live tracking service.

This module owns all HTTP communication with the Open Notify ISS endpoint and
maps provider payloads into internal Pydantic schemas.
"""

import logging

import httpx

from app.schemas.iss import ISSPosition


logger = logging.getLogger(__name__)


class ISSServiceError(Exception):
    """Raised when live ISS position data cannot be fetched or parsed."""


class ISSService:
    """Async client for Open Notify ISS location data."""

    def __init__(
        self,
        base_url: str,
        fallback_url: str | None = None,
        timeout_seconds: float = 5.0,
    ) -> None:
        self._endpoint = f"{base_url.rstrip('/')}/iss-now.json"
        self._fallback_endpoint = fallback_url
        self._timeout_seconds = timeout_seconds

    async def get_live_position(self) -> ISSPosition:
        """Fetch the current ISS position from Open Notify."""
        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.get(self._endpoint)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("Failed to fetch ISS live position", exc_info=exc)
            return await self._get_fallback_position(exc)

        try:
            payload = response.json()
            position = payload["iss_position"]
            return ISSPosition(
                latitude=float(position["latitude"]),
                longitude=float(position["longitude"]),
                timestamp=int(payload["timestamp"]),
            )
        except (KeyError, TypeError, ValueError) as exc:
            logger.warning("Invalid ISS live position payload", exc_info=exc)
            return await self._get_fallback_position(exc)

    async def _get_fallback_position(self, original_exc: Exception) -> ISSPosition:
        """Fetch ISS coordinates from a secondary provider when Open Notify fails."""
        if not self._fallback_endpoint:
            raise ISSServiceError("Unable to fetch live ISS position.") from original_exc

        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.get(self._fallback_endpoint)
                response.raise_for_status()
            payload = response.json()
            return ISSPosition(
                latitude=float(payload["latitude"]),
                longitude=float(payload["longitude"]),
                timestamp=int(payload["timestamp"]),
            )
        except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
            logger.warning("Failed to fetch fallback ISS live position", exc_info=exc)
            raise ISSServiceError("Unable to fetch live ISS position.") from original_exc

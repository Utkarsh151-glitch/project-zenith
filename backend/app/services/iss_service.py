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

    def __init__(self, base_url: str, timeout_seconds: float = 5.0) -> None:
        self._endpoint = f"{base_url.rstrip('/')}/iss-now.json"
        self._timeout_seconds = timeout_seconds

    async def get_live_position(self) -> ISSPosition:
        """Fetch the current ISS position from Open Notify."""
        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.get(self._endpoint)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("Failed to fetch ISS live position", exc_info=exc)
            raise ISSServiceError("Unable to fetch live ISS position.") from exc

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
            raise ISSServiceError("Invalid live ISS position response.") from exc

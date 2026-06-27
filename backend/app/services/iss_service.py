"""ISS live tracking service.

This module owns all HTTP communication with the Open Notify ISS endpoint and
maps provider payloads into internal Pydantic schemas.
"""

import logging
from datetime import datetime, timedelta, timezone

import httpx

from app.schemas.iss import ISSPosition


logger = logging.getLogger(__name__)


class ISSServiceError(Exception):
    """Raised when live ISS position data cannot be fetched or parsed."""


class ISSService:
    """Async client for Open Notify ISS location data."""

    # Last good fix (shared across instances). Lets a brief upstream hiccup serve
    # a slightly stale position instead of failing the whole request — at ISS
    # speed a few seconds is well under a pixel on the globe.
    _cached_position: ISSPosition | None = None
    _cached_at: datetime | None = None
    _STALE_TTL = timedelta(minutes=3)

    def __init__(
        self,
        base_url: str,
        fallback_url: str | None = None,
        timeout_seconds: float = 3.5,
    ) -> None:
        self._endpoint = f"{base_url.rstrip('/')}/iss-now.json"
        self._fallback_endpoint = fallback_url
        self._timeout_seconds = timeout_seconds

    def _cache(self, position: ISSPosition) -> ISSPosition:
        """Remember the most recent good fix for stale-on-error serving."""
        type(self)._cached_position = position
        type(self)._cached_at = datetime.now(timezone.utc)
        return position

    def _serve_stale(self) -> ISSPosition | None:
        """Return the last good fix if it is still recent enough to be useful."""
        if self._cached_position is None or self._cached_at is None:
            return None
        if datetime.now(timezone.utc) - self._cached_at > self._STALE_TTL:
            return None
        return self._cached_position

    async def get_live_position(self) -> ISSPosition:
        """Fetch the current ISS position from Open Notify.

        Open Notify is a single, occasionally slow public endpoint, so a brief
        timeout is retried once before falling back / serving a recent fix.
        """
        last_exc: Exception | None = None
        for _attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                    response = await client.get(self._endpoint)
                    response.raise_for_status()
                payload = response.json()
                position = payload["iss_position"]
                return self._cache(
                    ISSPosition(
                        latitude=float(position["latitude"]),
                        longitude=float(position["longitude"]),
                        timestamp=int(payload["timestamp"]),
                    )
                )
            except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
                last_exc = exc

        logger.warning("Failed to fetch ISS live position", exc_info=last_exc)
        return await self._get_fallback_position(last_exc or ISSServiceError("unknown"))

    async def _get_fallback_position(self, original_exc: Exception) -> ISSPosition:
        """Try a secondary provider, then a recent cached fix, before failing."""
        if self._fallback_endpoint:
            try:
                async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                    response = await client.get(self._fallback_endpoint)
                    response.raise_for_status()
                payload = response.json()
                return self._cache(
                    ISSPosition(
                        latitude=float(payload["latitude"]),
                        longitude=float(payload["longitude"]),
                        timestamp=int(payload["timestamp"]),
                    )
                )
            except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
                logger.warning("Failed to fetch fallback ISS live position", exc_info=exc)

        # Both live providers failed — serve the last good fix if it is recent.
        stale = self._serve_stale()
        if stale is not None:
            return stale
        raise ISSServiceError("Unable to fetch live ISS position.") from original_exc

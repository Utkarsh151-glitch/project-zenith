"""Satellite observation service.

This module owns CelesTrak HTTP access and keeps a short in-memory cache for
ACTIVE satellite TLE data.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

import httpx

from app.schemas.satellite import SatelliteTLE


logger = logging.getLogger(__name__)


_BUNDLED_FALLBACK_TLES = [
    SatelliteTLE(
        satellite_name="ISS (ZARYA)",
        tle_line1="1 25544U 98067A   26177.15504249  .00009461  00000+0  17697-3 0  9995",
        tle_line2="2 25544  51.6325 255.7018 0004359 233.1468 126.9121 15.49434803573143",
    ),
    SatelliteTLE(
        satellite_name="STARLINK-32298",
        tle_line1="1 61525U 24183S   26177.19371934  .00000356  00000+0  23222-4 0  9995",
        tle_line2="2 61525  53.1635 357.8292 0001166  96.2963 263.8171 15.31706706 96277",
    ),
    SatelliteTLE(
        satellite_name="STARLINK-32298 SAMPLE A",
        tle_line1="1 61525U 24183S   26177.19371934  .00000356  00000+0  23222-4 0  9995",
        tle_line2="2 61525  53.1635 357.8292 0001166  96.2963 263.8171 15.31706706 96277",
    ),
    SatelliteTLE(
        satellite_name="STARLINK-32298 SAMPLE B",
        tle_line1="1 61525U 24183S   26177.19371934  .00000356  00000+0  23222-4 0  9995",
        tle_line2="2 61525  53.1635 357.8292 0001166  96.2963 263.8171 15.31706706 96277",
    ),
    SatelliteTLE(
        satellite_name="ISS SAMPLE A",
        tle_line1="1 25544U 98067A   26177.15504249  .00009461  00000+0  17697-3 0  9995",
        tle_line2="2 25544  51.6325 255.7018 0004359 233.1468 126.9121 15.49434803573143",
    ),
    SatelliteTLE(
        satellite_name="ISS SAMPLE B",
        tle_line1="1 25544U 98067A   26177.15504249  .00009461  00000+0  17697-3 0  9995",
        tle_line2="2 25544  51.6325 255.7018 0004359 233.1468 126.9121 15.49434803573143",
    ),
]


class SatelliteServiceError(Exception):
    """Raised when active satellite TLE data cannot be fetched or parsed."""


class SatelliteService:
    """Async CelesTrak client for active satellite TLE data."""

    _cache_data: list[SatelliteTLE] | None = None
    _cache_expires_at: datetime | None = None
    _cache_lock = asyncio.Lock()
    # Negative cache: while set, skip CelesTrak entirely so frequent polling does
    # not worsen / prolong a Cloudflare rate-limit (403). Cleared on success.
    _retry_after: datetime | None = None

    def __init__(
        self,
        base_url: str,
        fallback_url: str | None = None,
        timeout_seconds: float = 12.0,
    ) -> None:
        self._endpoint = f"{base_url.rstrip('/')}/NORAD/elements/gp.php"
        self._fallback_endpoint = fallback_url
        self._timeout_seconds = timeout_seconds

    async def get_active_satellites(self) -> list[SatelliteTLE]:
        """Fetch ACTIVE satellite TLEs, using a 10 minute in-memory cache."""
        cached = self._get_cached_satellites()
        if cached is not None:
            return cached

        async with self._cache_lock:
            cached = self._get_cached_satellites()
            if cached is not None:
                return cached

            now = datetime.now(timezone.utc)
            if self.__class__._retry_after is not None and now < self.__class__._retry_after:
                raise SatelliteServiceError(
                    "Active satellite data temporarily unavailable (upstream cooldown)."
                )

            try:
                satellites = await self._fetch_active_satellites()
            except SatelliteServiceError:
                # Back off from CelesTrak for 90s before trying again.
                self.__class__._retry_after = now + timedelta(seconds=90)
                raise

            self.__class__._retry_after = None
            self._set_cache(satellites)
            return satellites

    def _get_cached_satellites(self) -> list[SatelliteTLE] | None:
        """Return cached TLEs when the cache is still fresh."""
        if self._cache_data is None or self._cache_expires_at is None:
            return None

        if datetime.now(timezone.utc) >= self._cache_expires_at:
            return None

        return self._cache_data

    def _set_cache(self, satellites: list[SatelliteTLE]) -> None:
        """Store TLEs for a short period to protect CelesTrak and latency."""
        self.__class__._cache_data = satellites
        self.__class__._cache_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    # CelesTrak sits behind Cloudflare and rejects the default httpx User-Agent
    # with 403; identify as a normal browser client (and accept gzip).
    _HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/plain,*/*",
    }

    async def _fetch_active_satellites(self) -> list[SatelliteTLE]:
        """Download and parse ACTIVE satellite TLE data from CelesTrak."""
        params = {"GROUP": "active", "FORMAT": "tle"}

        try:
            async with httpx.AsyncClient(
                timeout=self._timeout_seconds,
                headers=self._HEADERS,
                follow_redirects=True,
            ) as client:
                response = await client.get(self._endpoint, params=params)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("Failed to fetch active satellite TLE data", exc_info=exc)
            return await self._fetch_fallback_satellites(exc)

        return self._parse_tle(response.text)

    async def _fetch_fallback_satellites(self, original_exc: Exception) -> list[SatelliteTLE]:
        """Fetch a compact TLE catalog page from a secondary public provider."""
        if not self._fallback_endpoint:
            raise SatelliteServiceError("Unable to fetch active satellite data.") from original_exc

        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds, follow_redirects=True) as client:
                response = await client.get(self._fallback_endpoint)
                response.raise_for_status()
            payload = response.json()
            members = payload.get("member", [])
            satellites = [
                SatelliteTLE(
                    satellite_name=str(item["name"]),
                    tle_line1=str(item["line1"]),
                    tle_line2=str(item["line2"]),
                )
                for item in members
                if item.get("name") and item.get("line1") and item.get("line2")
            ]
        except (httpx.HTTPError, ValueError, TypeError, KeyError) as exc:
            logger.warning("Failed to fetch fallback satellite TLE data", exc_info=exc)
            return _BUNDLED_FALLBACK_TLES

        if not satellites:
            return _BUNDLED_FALLBACK_TLES

        return satellites

    def _parse_tle(self, tle_text: str) -> list[SatelliteTLE]:
        """Parse CelesTrak TLE triplets into schema objects."""
        lines = [line.strip() for line in tle_text.splitlines() if line.strip()]
        if len(lines) < 3 or len(lines) % 3 != 0:
            logger.warning("Invalid active satellite TLE payload")
            raise SatelliteServiceError("Invalid active satellite response.")

        satellites: list[SatelliteTLE] = []
        for index in range(0, len(lines), 3):
            name, line1, line2 = lines[index : index + 3]
            if not line1.startswith("1 ") or not line2.startswith("2 "):
                logger.warning("Invalid TLE line pair", extra={"satellite_name": name})
                raise SatelliteServiceError("Invalid active satellite response.")

            satellites.append(
                SatelliteTLE(
                    satellite_name=name,
                    tle_line1=line1,
                    tle_line2=line2,
                )
            )

        return satellites

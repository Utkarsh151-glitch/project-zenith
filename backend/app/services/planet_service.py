"""Planetary observation service.

This module owns NASA Horizons HTTP access and returns Earth-relative vectors
that can later feed astronomy calculations without implementing them here.
"""

import asyncio
import csv
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from io import StringIO

import httpx

from app.schemas.planet import PlanetPosition, PlanetPositions


logger = logging.getLogger(__name__)


class PlanetServiceError(Exception):
    """Raised when planetary position data cannot be fetched or parsed."""


@dataclass(frozen=True)
class HorizonsTarget:
    """NASA Horizons target metadata."""

    name: str
    target_id: str


class PlanetService:
    """Async NASA Horizons client for current Solar System positions."""

    TARGETS = (
        HorizonsTarget(name="Moon", target_id="301"),
        HorizonsTarget(name="Mercury", target_id="199"),
        HorizonsTarget(name="Venus", target_id="299"),
        HorizonsTarget(name="Mars", target_id="499"),
        HorizonsTarget(name="Jupiter", target_id="599"),
        HorizonsTarget(name="Saturn", target_id="699"),
    )

    def __init__(self, endpoint: str, timeout_seconds: float = 20.0) -> None:
        self._endpoint = endpoint
        self._timeout_seconds = timeout_seconds

    async def get_current_positions(self) -> PlanetPositions:
        """Return a current shared-timestamp snapshot for supported bodies."""
        timestamp = datetime.now(timezone.utc).replace(microsecond=0)
        return await self.get_positions_at(timestamp)

    async def get_positions_at(self, timestamp: datetime) -> PlanetPositions:
        """Return Earth-relative positions at a timestamp.

        The timestamp parameter is intentionally part of the service API so the
        future Time Travel feature can reuse this data-access path.
        """
        timestamp_utc = timestamp.astimezone(timezone.utc).replace(microsecond=0)
        # NASA Horizons rate-limits concurrent requests from one IP (returning
        # 503), so the bodies are fetched sequentially rather than via gather.
        positions = [
            await self._fetch_position(target, timestamp_utc)
            for target in self.TARGETS
        ]
        return PlanetPositions(
            timestamp_utc=timestamp_utc.isoformat(),
            positions=positions,
        )

    async def _fetch_position(
        self,
        target: HorizonsTarget,
        timestamp_utc: datetime,
    ) -> PlanetPosition:
        """Fetch one body vector from NASA Horizons."""
        params = self._build_vector_params(target, timestamp_utc)

        response = None
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                    response = await client.get(self._endpoint, params=params)
                    response.raise_for_status()
                break
            except httpx.HTTPError as exc:
                # Horizons returns transient 503s under load; retry with backoff.
                if attempt < 2:
                    await asyncio.sleep(0.6 * (attempt + 1))
                    continue
                logger.warning(
                    "Failed to fetch Horizons vector",
                    extra={"target": target.name, "target_id": target.target_id},
                    exc_info=exc,
                )
                raise PlanetServiceError("Unable to fetch planetary position data.") from exc

        try:
            payload = response.json()
            result = payload["result"]
            return self._parse_vector_result(target, timestamp_utc, result)
        except (KeyError, TypeError, ValueError) as exc:
            logger.warning(
                "Invalid Horizons vector payload",
                extra={"target": target.name, "target_id": target.target_id},
                exc_info=exc,
            )
            raise PlanetServiceError("Invalid planetary position response.") from exc

    def _build_vector_params(
        self,
        target: HorizonsTarget,
        timestamp_utc: datetime,
    ) -> dict[str, str]:
        """Build Horizons vector-table parameters for one target body."""
        stop_time = timestamp_utc + timedelta(minutes=1)
        # NASA Horizons rejects unquoted values that contain spaces (e.g. the
        # date/time and step size) with an "INPUT ERROR ... Too many constants"
        # message, so every value below is single-quoted as the API requires.
        return {
            "format": "json",
            "COMMAND": f"'{target.target_id}'",
            "OBJ_DATA": "NO",
            "MAKE_EPHEM": "YES",
            "EPHEM_TYPE": "VECTORS",
            "CENTER": "'500@399'",
            "START_TIME": f"'{timestamp_utc.strftime('%Y-%b-%d %H:%M')}'",
            "STOP_TIME": f"'{stop_time.strftime('%Y-%b-%d %H:%M')}'",
            "STEP_SIZE": "'1 m'",
            "CSV_FORMAT": "YES",
            # VEC_TABLE=3 appends range (RG) at CSV column index 9, which the
            # parser reads as distance; OUT_UNITS returns AU to match the schema.
            "VEC_TABLE": "3",
            "OUT_UNITS": "'AU-D'",
            "REF_PLANE": "ECLIPTIC",
        }

    def _parse_vector_result(
        self,
        target: HorizonsTarget,
        timestamp_utc: datetime,
        result: str,
    ) -> PlanetPosition:
        """Parse the first CSV vector row between Horizons SOE/EOE markers."""
        vector_rows = self._extract_vector_rows(result)
        if not vector_rows:
            raise PlanetServiceError("Planetary position response did not include vector data.")

        row = next(csv.reader(StringIO(vector_rows[0]), skipinitialspace=True))
        if len(row) < 10:
            raise PlanetServiceError("Planetary position vector was incomplete.")

        return PlanetPosition(
            name=target.name,
            target_id=target.target_id,
            timestamp_utc=timestamp_utc.isoformat(),
            x_au=float(row[2]),
            y_au=float(row[3]),
            z_au=float(row[4]),
            distance_au=float(row[9]),
        )

    def _extract_vector_rows(self, result: str) -> list[str]:
        """Extract non-empty data rows from a Horizons result block."""
        in_data_block = False
        rows: list[str] = []

        for line in result.splitlines():
            stripped = line.strip()
            if stripped == "$$SOE":
                in_data_block = True
                continue
            if stripped == "$$EOE":
                break
            if in_data_block and stripped:
                rows.append(stripped)

        return rows

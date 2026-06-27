"""Dashboard API router.

The dashboard endpoint is the HTTP composition boundary for Project Zenith. It
calls provider services, maps provider schemas into engine domain objects, and
then delegates observation assembly to ObservationEngine.

No astronomy, propagation, coordinate, visibility, or zenith calculations are
implemented in this router.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Request, status

from app.config import settings
from app.engine.models import (
    ObservationReport,
    PlanetPosition,
    SatellitePosition,
    WeatherSnapshot,
)
from app.engine.observation import ObservationEngine
from app.engine.observer import Observer
from app.schemas.response import APIResponse
from app.services.iss_service import ISSService, ISSServiceError
from app.services.planet_service import PlanetService, PlanetServiceError
from app.services.satellite_service import SatelliteService, SatelliteServiceError
from app.services.weather_service import WeatherService, WeatherServiceError


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def get_weather_service() -> WeatherService:
    """Create the weather provider dependency."""
    return WeatherService(base_url=settings.OPEN_METEO_URL)


def get_iss_service() -> ISSService:
    """Create the ISS provider dependency."""
    return ISSService(base_url=settings.OPEN_NOTIFY_URL)


def get_satellite_service() -> SatelliteService:
    """Create the satellite catalog provider dependency."""
    return SatelliteService(base_url=settings.CELESTRAK_URL, fallback_url=settings.ALT_TLE_URL)


def get_planet_service() -> PlanetService:
    """Create the planetary ephemeris provider dependency."""
    return PlanetService(endpoint=settings.NASA_HORIZONS_URL)


def get_observation_engine() -> ObservationEngine:
    """Create the observation orchestration dependency."""
    return ObservationEngine()


@router.get(
    "",
    summary="Get dashboard observation report",
    description=(
        "Build a single dashboard-ready observation report for an observer. "
        "The endpoint gathers weather, ISS, active satellite, and planetary "
        "provider data, then delegates scientific orchestration to the "
        "ObservationEngine."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "Observation report generated. Provider failures may be listed in errors.",
        },
        status.HTTP_422_UNPROCESSABLE_ENTITY: {
            "description": "Invalid observer coordinates or datetime.",
        },
    },
)
async def get_dashboard(

    request: Request,
    latitude: float = Query(..., ge=-90, le=90, description="Observer latitude in degrees."),
    longitude: float = Query(..., ge=-180, le=180, description="Observer longitude in degrees."),
    observed_at: datetime | None = Query(
        default=None,
        alias="datetime",
        description="Optional observation datetime. Defaults to the current UTC time.",
    ),
    weather_service: WeatherService = Depends(get_weather_service),
    iss_service: ISSService = Depends(get_iss_service),
    satellite_service: SatelliteService = Depends(get_satellite_service),
    planet_service: PlanetService = Depends(get_planet_service),
    observation_engine: ObservationEngine = Depends(get_observation_engine),
) -> APIResponse[ObservationReport]:
    
    """Return one dashboard-ready observation report.

    The router stays thin: provider calls are delegated to services, scientific
    orchestration is delegated to ObservationEngine, and provider failures are
    collected as non-fatal errors so the dashboard can still render partial data.
    """
    timestamp = _normalize_datetime(observed_at)
    observer = Observer(
        latitude=latitude,
        longitude=longitude,
        elevation=0.0,
        observed_at=timestamp,
    )

    errors: list[str] = []

    weather = await _fetch_weather(weather_service, latitude, longitude, errors)
    iss_position = await _fetch_iss(iss_service, errors)
    satellite_positions = await _fetch_satellites(satellite_service, timestamp, errors)
    planet_positions = await _fetch_planets(planet_service, timestamp, errors)

    report = observation_engine.build_observation_snapshot(
        observer=observer,
        weather=weather,
        satellite_positions=satellite_positions,
        planet_positions=planet_positions,
        iss_position=iss_position,
    )

    return APIResponse(
        success=True,
        message="Dashboard observation report generated.",
        data=report,
        errors=errors or None,
        request_id=getattr(request.state, "request_id", None),
    )


async def _fetch_weather(
    weather_service: WeatherService,
    latitude: float,
    longitude: float,
    errors: list[str],
) -> WeatherSnapshot | None:
    """Fetch weather data and map it into the engine domain model."""
    try:
        weather = await weather_service.get_current_weather(latitude, longitude)
    except WeatherServiceError as exc:
        errors.append(f"weather: {exc}")
        return None

    return WeatherSnapshot(
        temperature=weather.temperature,
        relative_humidity=weather.relative_humidity,
        cloud_cover=weather.cloud_cover,
        wind_speed=weather.wind_speed,
        weather_code=weather.weather_code,
        captured_at=datetime.now(timezone.utc),
    )


async def _fetch_iss(iss_service: ISSService, errors: list[str]) -> SatellitePosition | None:
    """Fetch live ISS data and map provider details into a domain object."""
    try:
        iss = await iss_service.get_live_position()
    except ISSServiceError as exc:
        errors.append(f"iss: {exc}")
        return None

    return SatellitePosition(
        satellite_name="ISS",
        norad_id="25544",
        observed_at=datetime.fromtimestamp(iss.timestamp, tz=timezone.utc),
        metadata={
            "provider_latitude": iss.latitude,
            "provider_longitude": iss.longitude,
            "source": "open_notify",
        },
    )

async def _fetch_satellites(
    satellite_service: SatelliteService,
    timestamp: datetime,
    errors: list[str],
) -> list[SatellitePosition]:
    """Fetch active satellite TLEs and map them into domain objects.

    NOTE:
    For the hackathon dashboard we intentionally limit the number of satellites
    processed. Propagating the entire ACTIVE catalog (thousands of satellites)
    in a single HTTP request would make the dashboard extremely slow.

    This limit can be removed later by introducing background propagation and
    caching.
    """
    try:
        satellites = await satellite_service.get_active_satellites()
    except SatelliteServiceError as exc:
        errors.append(f"satellites: {exc}")
        return []

    # Limit satellites for dashboard performance
    satellites = satellites[:25]

    return [
        SatellitePosition(
            satellite_name=satellite.satellite_name,
            tle_line1=satellite.tle_line1,
            tle_line2=satellite.tle_line2,
            observed_at=timestamp,
        )
        for satellite in satellites
    ]

async def _fetch_planets(
    planet_service: PlanetService,
    timestamp: datetime,
    errors: list[str],
) -> list[PlanetPosition]:
    """Fetch planetary provider data and map it into domain objects.

    PlanetService currently returns Earth-relative Horizons vectors in AU. The
    engine domain object stores those provider values as metadata until a later
    ephemeris-to-ECEF engine is introduced.
    """
    try:
        planets = await planet_service.get_positions_at(timestamp)
    except PlanetServiceError as exc:
        errors.append(f"planets: {exc}")
        return []

    return [
        PlanetPosition(
            name=planet.name,
            target_id=planet.target_id,
            distance_au=planet.distance_au,
            observed_at=timestamp,
            metadata={
                "timestamp_utc": planet.timestamp_utc,
                "x_au": planet.x_au,
                "y_au": planet.y_au,
                "z_au": planet.z_au,
                "source": "nasa_horizons",
            },
        )
        for planet in planets.positions
    ]


def _normalize_datetime(value: datetime | None) -> datetime:
    """Normalize optional query datetime values to UTC."""
    if value is None:
        return datetime.now(timezone.utc)

    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)
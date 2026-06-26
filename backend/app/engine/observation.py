"""Observation orchestration engine.

ObservationEngine is the domain workflow coordinator for Project Zenith. It does
not perform scientific calculations directly. Instead, it wires together the
existing specialized engines and prepares a single ObservationReport that the
Dashboard layer can serialize or display.

Orchestration flow
    1. Create a CelestialContext for the observer.
    2. Attach supplied weather, ISS, satellite, and planet domain objects.
    3. Use PropagationEngine only when a satellite-like object has TLE data but
       no Earth-fixed position yet.
    4. Use CoordinateEngine to convert Earth-fixed positions into local Alt/Az.
    5. Use VisibilityEngine to determine which candidates are observable.
    6. Use ZenithEngine to rank visible objects and identify the closest one to
       the observer's zenith.
    7. Build one ObservationReport for downstream dashboard use.

Why this belongs outside the Dashboard API
    API routers should validate requests and serialize responses. This module is
    application-domain orchestration: it knows how engine outputs feed later
    engines, how CelestialContext is enriched, and how a report is assembled
    without leaking workflow logic into HTTP handlers.
"""

from datetime import datetime, timezone
from typing import Iterable

from app.engine.context import CelestialContext
from app.engine.coordinates import AltAz, Cartesian3, CoordinateEngine
from app.engine.models import (
    ObservationReport,
    PlanetPosition,
    SatellitePosition,
    VisibleObject,
    WeatherSnapshot,
)
from app.engine.observer import Observer
from app.engine.propagation import PropagationEngine, PropagationError, PropagationResult
from app.engine.visibility import VisibilityEngine, VisibilityResult
from app.engine.zenith import ZenithEngine, ZenithResult


class ObservationEngine:
    """Stateless orchestrator for observation report generation.

    Dependencies are injected through the constructor so tests can supply fakes
    or spies for each scientific engine. The class stores only dependency
    references and no per-request state, making it thread-safe for concurrent
    request handling.
    """

    def __init__(
        self,
        propagation_engine: PropagationEngine | None = None,
        coordinate_engine: CoordinateEngine | None = None,
        visibility_engine: VisibilityEngine | None = None,
        zenith_engine: ZenithEngine | None = None,
    ) -> None:
        """Create an ObservationEngine with injectable dependencies."""
        self._coordinate_engine = coordinate_engine or CoordinateEngine()
        self._propagation_engine = propagation_engine or PropagationEngine()
        self._visibility_engine = visibility_engine or VisibilityEngine(self._coordinate_engine)
        self._zenith_engine = zenith_engine or ZenithEngine()

    def build_observation_snapshot(
        self,
        observer: Observer,
        weather: WeatherSnapshot | None = None,
        satellite_positions: Iterable[SatellitePosition] | None = None,
        planet_positions: Iterable[PlanetPosition] | None = None,
        iss_position: SatellitePosition | None = None,
    ) -> ObservationReport:
        """Build a complete observation report for an observer.

        This is the main Dashboard-facing orchestration method. It delegates all
        scientific work to existing engines and returns a pure domain report.
        """
        context = self.build_context(
            observer=observer,
            weather=weather,
            satellite_positions=satellite_positions,
            planet_positions=planet_positions,
            iss_position=iss_position,
        )
        return self.build_report(context)

    def build_context(
        self,
        observer: Observer,
        weather: WeatherSnapshot | None = None,
        satellite_positions: Iterable[SatellitePosition] | None = None,
        planet_positions: Iterable[PlanetPosition] | None = None,
        iss_position: SatellitePosition | None = None,
    ) -> CelestialContext:
        """Populate a CelestialContext by coordinating existing engines.

        The returned context contains supplied raw domain data plus visible
        objects and zenith ranking metadata derived through delegated engines.
        """
        context = CelestialContext(observer=observer)
        context.metadata["skipped_objects"] = []

        if weather is not None:
            context.set_weather(weather)

        if iss_position is not None:
            context.iss_position = iss_position
            self._add_visible_satellite(context, iss_position, object_type="iss")

        for satellite_position in satellite_positions or []:
            context.add_satellite_position(satellite_position)
            self._add_visible_satellite(context, satellite_position, object_type="satellite")

        for planet_position in planet_positions or []:
            context.add_planet_position(planet_position)
            self._add_visible_planet(context, planet_position)

        zenith_result = self._zenith_engine.rank_visible_objects(context.visible_objects)
        if zenith_result.closest_object is not None:
            context.set_zenith_object(zenith_result.closest_object)
        context.metadata["zenith_rankings"] = self._serialize_zenith_rankings(zenith_result)

        report = self.build_report(context)
        context.set_observation_report(report)
        return context

    def build_report(self, context: CelestialContext) -> ObservationReport:
        """Create an ObservationReport from an enriched CelestialContext."""
        visible_count = len(context.visible_objects)
        closest_name = context.zenith_object.name if context.zenith_object else None

        summary = f"{visible_count} visible object(s) identified."
        if closest_name is not None:
            summary = f"{summary} Closest to zenith: {closest_name}."

        return ObservationReport(
            generated_at=context.current_datetime,
            summary=summary,
            visible_objects=list(context.visible_objects),
            upcoming_events=list(context.upcoming_events),
            score=context.observation_score,
            metadata={
                "observer": {
                    "latitude": context.observer.latitude,
                    "longitude": context.observer.longitude,
                    "elevation": context.observer.elevation,
                    "observed_at": context.observer.observed_at.isoformat(),
                },
                "closest_object_id": context.zenith_object.object_id if context.zenith_object else None,
                "closest_object_name": closest_name,
                "zenith_rankings": context.metadata.get("zenith_rankings", []),
                "skipped_objects": context.metadata.get("skipped_objects", []),
            },
        )

    def score_observation_quality(self, observer: Observer) -> None:
        """Reserve observation scoring for the dedicated ScoringEngine.

        ObservationEngine coordinates scoring outputs when they exist, but it
        does not implement scoring algorithms itself.
        """
        raise NotImplementedError("Observation quality scoring belongs in ScoringEngine.")

    def _add_visible_satellite(
        self,
        context: CelestialContext,
        satellite_position: SatellitePosition,
        object_type: str,
    ) -> None:
        """Evaluate one ISS or satellite domain object and append it if visible."""
        evaluated = self._evaluate_satellite(context.observer, satellite_position)
        if evaluated is None:
            self._record_skipped_object(
                context,
                object_type=object_type,
                name=satellite_position.satellite_name,
                reason="missing_position_or_tle",
            )
            return

        alt_az, visibility = evaluated
        if not visibility.visible:
            return

        visible_object = VisibleObject(
            object_id=satellite_position.norad_id or satellite_position.satellite_name,
            name=satellite_position.satellite_name,
            object_type=object_type,
            alt_az=alt_az,
            distance_from_zenith=visibility.zenith_distance,
            visibility=self._visibility_engine.to_domain_visibility_result(visibility),
            metadata={**satellite_position.metadata},
        )
        context.add_visible_object(visible_object)

    def _add_visible_planet(
        self,
        context: CelestialContext,
        planet_position: PlanetPosition,
    ) -> None:
        """Evaluate one planetary domain object and append it if visible."""
        if planet_position.position is None:
            self._record_skipped_object(
                context,
                object_type="planet",
                name=planet_position.name,
                reason="missing_position",
            )
            return

        alt_az = self._coordinate_engine.to_alt_az(planet_position.position, context.observer)
        visibility = self._visibility_engine.evaluate_alt_az(alt_az)
        if not visibility.visible:
            return

        visible_object = VisibleObject(
            object_id=planet_position.target_id,
            name=planet_position.name,
            object_type="planet",
            alt_az=alt_az,
            distance_from_zenith=visibility.zenith_distance,
            visibility=self._visibility_engine.to_domain_visibility_result(visibility),
            metadata={**planet_position.metadata},
        )
        context.add_visible_object(visible_object)

    def _evaluate_satellite(
        self,
        observer: Observer,
        satellite_position: SatellitePosition,
    ) -> tuple[AltAz, VisibilityResult] | None:
        """Evaluate satellite visibility from ECEF position or TLE data."""
        if satellite_position.position is not None:
            alt_az = self._coordinate_engine.to_alt_az(satellite_position.position, observer)
            return alt_az, self._visibility_engine.evaluate_alt_az(alt_az)

        if satellite_position.tle_line1 is None or satellite_position.tle_line2 is None:
            return None

        timestamp = satellite_position.observed_at or observer.observed_at
        try:
            propagation_result = self._propagation_engine.propagate_satellite(
                satellite_position.tle_line1,
                satellite_position.tle_line2,
                self._normalize_timestamp(timestamp),
            )
        except PropagationError:
            return None

        ecef_position = self._ecef_from_propagation_result(propagation_result)
        alt_az = self._coordinate_engine.to_alt_az(ecef_position, observer)
        return alt_az, self._visibility_engine.evaluate_alt_az(alt_az)

    def _ecef_from_propagation_result(self, propagation_result: PropagationResult) -> Cartesian3:
        """Convert PropagationEngine ECEF kilometers into CoordinateEngine meters."""
        return Cartesian3(
            x=propagation_result.ecef_position.x * 1000.0,
            y=propagation_result.ecef_position.y * 1000.0,
            z=propagation_result.ecef_position.z * 1000.0,
        )

    def _serialize_zenith_rankings(self, zenith_result: ZenithResult) -> list[dict[str, object]]:
        """Serialize zenith rankings into report metadata for dashboard use."""
        return [
            {
                "rank": ranking.rank,
                "object_id": ranking.visible_object.object_id,
                "name": ranking.visible_object.name,
                "object_type": ranking.visible_object.object_type,
                "zenith_distance": ranking.zenith_distance,
            }
            for ranking in zenith_result.rankings
        ]

    def _record_skipped_object(
        self,
        context: CelestialContext,
        object_type: str,
        name: str,
        reason: str,
    ) -> None:
        """Record an object skipped during orchestration without failing the report."""
        context.metadata.setdefault("skipped_objects", []).append(
            {
                "object_type": object_type,
                "name": name,
                "reason": reason,
            }
        )

    def _normalize_timestamp(self, timestamp: datetime) -> datetime:
        """Normalize timestamps to UTC before propagation handoff."""
        if timestamp.tzinfo is None or timestamp.utcoffset() is None:
            return timestamp.replace(tzinfo=timezone.utc)

        return timestamp.astimezone(timezone.utc)
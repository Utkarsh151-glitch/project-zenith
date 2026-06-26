"""Visibility evaluation engine.

This module determines whether an already-positioned celestial object is above
an observer's local horizon. It performs no orbital propagation, no HTTP calls,
and no provider communication.

Visibility algorithm
    The engine receives either an Earth-fixed ECEF position, a propagated
    satellite state, or a precomputed altitude/azimuth coordinate. ECEF inputs
    are delegated to CoordinateEngine, which is the project's single source of
    coordinate mathematics. Visibility is then determined with one intentionally
    small rule: an object is visible when its altitude is greater than 0 degrees.

Zenith distance
    Zenith is the point directly overhead at altitude 90 degrees. The angular
    distance from zenith is therefore ``90 - altitude``. A result near 0 degrees
    is close to overhead; a result near 90 degrees is close to the horizon.

Architecture decisions
    VisibilityEngine is stateless and thread-safe. It consumes Observer,
    CoordinateEngine output, and PropagationEngine output without knowing how
    satellites were propagated or how external data was fetched.
"""

from dataclasses import dataclass

from app.engine.coordinates import AltAz, Cartesian3, CoordinateEngine
from app.engine.models import VisibilityResult as DomainVisibilityResult
from app.engine.observer import Observer
from app.engine.propagation import PropagationResult


@dataclass(frozen=True)
class VisibilityResult:
    """Visibility decision for an observer-relative object position.

    Attributes:
        visible: Whether the object is above the observer's horizon.
        altitude: Object altitude above the local horizon in degrees.
        azimuth: Object azimuth in degrees, measured clockwise from true north.
        distance: Slant range from observer to object in kilometers when known.
        zenith_distance: Angular distance from local zenith in degrees.
        horizon_margin: Angular margin above the horizon in degrees.
    """

    visible: bool
    altitude: float
    azimuth: float
    distance: float | None
    zenith_distance: float
    horizon_margin: float


class VisibilityEngine:
    """Stateless engine for horizon-based object visibility.

    The engine delegates coordinate transformations to CoordinateEngine and only
    evaluates visibility from local Alt/Az values. This keeps orbital mechanics,
    coordinate transformations, and visibility policy cleanly separated.
    """

    def __init__(self, coordinate_engine: CoordinateEngine | None = None) -> None:
        """Create a visibility engine.

        Args:
            coordinate_engine: Optional CoordinateEngine dependency. Supplying
                one makes tests straightforward and keeps the engine open to
                dependency injection without storing mutable request state.
        """
        self._coordinate_engine = coordinate_engine or CoordinateEngine()

    def evaluate_ecef(self, observer: Observer, ecef_position: Cartesian3) -> VisibilityResult:
        """Evaluate visibility for an ECEF object position in meters.

        Args:
            observer: Observer location used as the local horizon origin.
            ecef_position: Earth-centered, Earth-fixed object position in
                meters. This is the native input expected by CoordinateEngine.

        Returns:
            A VisibilityResult derived from CoordinateEngine Alt/Az output.
        """
        alt_az = self._coordinate_engine.to_alt_az(ecef_position, observer)
        return self.evaluate_alt_az(alt_az)

    def evaluate_propagation_result(
        self,
        observer: Observer,
        propagation_result: PropagationResult,
    ) -> VisibilityResult:
        """Evaluate visibility from a propagated satellite state.

        PropagationEngine returns ECEF position in kilometers. CoordinateEngine
        expects Earth-fixed Cartesian coordinates in meters, so this method only
        performs unit conversion before delegating the coordinate transformation.
        """
        ecef_position_meters = Cartesian3(
            x=propagation_result.ecef_position.x * 1000.0,
            y=propagation_result.ecef_position.y * 1000.0,
            z=propagation_result.ecef_position.z * 1000.0,
        )
        return self.evaluate_ecef(observer, ecef_position_meters)

    def evaluate_alt_az(self, alt_az: AltAz) -> VisibilityResult:
        """Evaluate visibility from precomputed altitude/azimuth coordinates.

        This method contains the complete visibility rule for the current
        engine: altitude greater than 0 degrees means the object is above the
        horizon and therefore geometrically visible.
        """
        altitude = float(alt_az.altitude)
        azimuth = float(alt_az.azimuth)
        distance = self._distance_meters_to_kilometers(alt_az.distance)

        return VisibilityResult(
            visible=self.is_above_horizon(alt_az),
            altitude=altitude,
            azimuth=azimuth,
            distance=distance,
            zenith_distance=self.zenith_distance(altitude),
            horizon_margin=self.horizon_margin(altitude),
        )

    def is_above_horizon(self, alt_az: AltAz) -> bool:
        """Return whether an Alt/Az position is above the horizon.

        The rule is intentionally strict: altitude must be greater than 0
        degrees. Objects exactly on the mathematical horizon are not considered
        visible by this engine.
        """
        return alt_az.altitude > 0.0

    def is_visible(
        self,
        observer: Observer,
        object_position: AltAz | Cartesian3 | PropagationResult,
    ) -> bool:
        """Return a boolean visibility decision for supported position inputs.

        Args:
            observer: Observer location. Used when ``object_position`` is ECEF
                or a propagated satellite state.
            object_position: Either an AltAz coordinate already produced by
                CoordinateEngine, an ECEF Cartesian3 position in meters, or a
                PropagationResult from PropagationEngine.

        Returns:
            ``True`` when the object's altitude is greater than 0 degrees.
        """
        if isinstance(object_position, AltAz):
            return self.evaluate_alt_az(object_position).visible

        if isinstance(object_position, PropagationResult):
            return self.evaluate_propagation_result(observer, object_position).visible

        return self.evaluate_ecef(observer, object_position).visible

    def zenith_distance(self, altitude: float) -> float:
        """Compute angular distance from local zenith in degrees.

        Zenith is altitude 90 degrees, so the distance from zenith is the
        remaining angular separation between the object altitude and 90 degrees.
        """
        return 90.0 - float(altitude)

    def horizon_margin(self, altitude: float) -> float:
        """Compute angular margin above the horizon in degrees.

        The horizon is altitude 0 degrees. The margin above that horizon is the
        altitude itself; negative values indicate the object is below horizon.
        """
        return float(altitude)

    def to_domain_visibility_result(self, result: VisibilityResult) -> DomainVisibilityResult:
        """Convert this engine result into the shared domain visibility model.

        The richer local result keeps geometry fields explicit for callers that
        need them. This adapter lets later domain models reuse the existing
        ``app.engine.models.VisibilityResult`` without changing that model now.
        """
        limiting_factors: list[str] = [] if result.visible else ["below_horizon"]
        return DomainVisibilityResult(
            is_visible=result.visible,
            reason="Object is above the horizon." if result.visible else "Object is below the horizon.",
            limiting_factors=limiting_factors,
            metadata={
                "altitude": result.altitude,
                "azimuth": result.azimuth,
                "distance": result.distance,
                "zenith_distance": result.zenith_distance,
                "horizon_margin": result.horizon_margin,
            },
        )

    def _distance_meters_to_kilometers(self, distance_meters: float | None) -> float | None:
        """Convert CoordinateEngine slant range from meters to kilometers."""
        if distance_meters is None:
            return None

        return float(distance_meters) / 1000.0
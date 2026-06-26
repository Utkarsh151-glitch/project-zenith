/**
 * Shared domain types for the Project Zenith frontend.
 *
 * These mirror the backend's response envelope and the logical shapes the UI
 * consumes. Where the live backend is a skeleton, the UI synthesizes the same
 * shapes from mock data so every view stays fully populated.
 */

/** Generic backend response envelope (matches FastAPI `APIResponse`). */
export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: string[] | null;
  request_id: string | null;
}

export interface GeoLocation {
  lat: number;
  lon: number;
  label: string;
}

export interface ISSPosition {
  lat: number;
  lon: number;
  altitudeKm: number;
  velocityKmh: number;
  timestamp: number; // epoch ms
}

export interface ISSPass {
  id: string;
  risesAt: number; // epoch ms
  duration: number; // seconds
  maxAltitude: number; // degrees
  magnitude: number;
}

export type SkyObjectType =
  | "planet"
  | "satellite"
  | "iss"
  | "star"
  | "constellation"
  | "moon";

export interface SkyObject {
  id: string;
  name: string;
  type: SkyObjectType;
  altitude: number; // degrees above horizon
  azimuth: number; // degrees from north (clockwise)
  magnitude?: number;
  color?: string;
}

export interface Constellation {
  id: string;
  name: string;
  stars: { az: number; alt: number; mag: number }[];
  /** Index pairs into `stars` describing the constellation lines. */
  lines: [number, number][];
}

export interface SatelliteTrack {
  id: string;
  name: string;
  noradId: string;
  /** Sub-satellite ground track points [lon, lat] for globe polylines. */
  track: [number, number][];
}

export interface PlanetInfo {
  id: string;
  name: string;
  altitude: number;
  azimuth: number;
  magnitude: number;
  distanceAu: number;
  color: string;
}

export interface SkySnapshot {
  timestamp: number;
  zenith: { ra: number; dec: number };
  objects: SkyObject[];
  constellations: Constellation[];
}

export type EventType =
  | "iss_flyover"
  | "meteor_shower"
  | "planetary_conjunction"
  | "satellite_pass";

export interface CelestialEvent {
  id: string;
  type: EventType;
  name: string;
  startsAt: number; // epoch ms
  location: string;
  description: string;
}

export interface ScoreBreakdown {
  moonInterference: number; // 0-100 (higher = better, i.e. less interference)
  cloudCover: number;
  lightPollution: number;
  visibility: number;
}

export interface ObservationScore {
  score: number; // 0-100 overall
  breakdown: ScoreBreakdown;
  recommendation: string;
  bestAfter: string; // local time hint
}

export interface DashboardStats {
  activeSatellites: number;
  nextISSPass: number; // epoch ms
  moonPhase: string;
  moonIllumination: number; // 0-1
  seeingQuality: string;
}

export interface NarratorResponse {
  text: string;
  source: "live" | "mock";
}

/** Globe / sky overlay layer toggles. */
export interface LayerFilters {
  satellites: boolean;
  iss: boolean;
  constellations: boolean;
  planets: boolean;
}

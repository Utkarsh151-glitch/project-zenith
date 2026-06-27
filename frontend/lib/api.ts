/**
 * Typed API client for Project Zenith.
 *
 * Wrappers target the live FastAPI backend (`/api/v1/...`). The backend
 * currently implements ISS / weather / satellite proxies against real public
 * data sources; the remaining astronomy engine is a skeleton. Every wrapper
 * therefore degrades gracefully to realistic mock data so the UI is always
 * fully populated, exactly as the product spec requires.
 */
import type {
  APIResponse,
  CelestialEvent,
  Constellation,
  DashboardStats,
  ISSPass,
  ISSPosition,
  NarratorResponse,
  ObservationScore,
  PlanetInfo,
  SatelliteTrack,
  SkyObject,
  SkySnapshot,
} from "./types";
import * as mock from "./mock";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";
const V1 = `${API_BASE}/api/v1`;

/** Tracks whether the most recent live call succeeded, for UI status badges. */
export const apiStatus = { lastSourceLive: false };

/** Fetch JSON with an abort-based timeout. Throws on any non-2xx or network error. */
async function fetchJSON<T>(url: string, init?: RequestInit, timeoutMs = 4500): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Unwrap a FastAPI `APIResponse<T>` envelope, tolerating bare payloads too. */
function unwrap<T>(payload: APIResponse<T> | T): T {
  if (payload && typeof payload === "object" && "data" in (payload as object)) {
    const env = payload as APIResponse<T>;
    if (env.data == null) throw new Error("Empty data envelope");
    return env.data;
  }
  return payload as T;
}

/* -------------------------------------------------------------------------- */
/* ISS                                                                         */
/* -------------------------------------------------------------------------- */

interface LiveISS {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export async function getISSPosition(): Promise<ISSPosition> {
  try {
    const raw = await fetchJSON<APIResponse<LiveISS> | LiveISS>(`${V1}/iss/live`, undefined, 9000);
    const d = unwrap<LiveISS>(raw);
    apiStatus.lastSourceLive = true;
    return {
      lat: d.latitude,
      lon: d.longitude,
      altitudeKm: 417,
      velocityKmh: 27580,
      timestamp: (d.timestamp ?? Date.now() / 1000) * 1000,
    };
  } catch {
    apiStatus.lastSourceLive = false;
    return mock.mockISSPosition();
  }
}

export async function getISSPasses(lat: number, lon: number, days = 3): Promise<ISSPass[]> {
  // No live endpoint yet — synthesized from a propagation-style model.
  return mock.mockISSPasses(lat, lon, days);
}

/* -------------------------------------------------------------------------- */
/* Satellites                                                                  */
/* -------------------------------------------------------------------------- */

interface LiveSatelliteTLE {
  satellite_name?: string;
  name?: string;
  norad_id?: string;
  tle_line1?: string;
  tle_line2?: string;
}

export async function getVisibleSatellites(
  lat: number,
  lon: number,
  timestamp = Date.now(),
): Promise<{ objects: SkyObject[]; tracks: SatelliteTrack[]; count: number }> {
  try {
    const raw = await fetchJSON<APIResponse<LiveSatelliteTLE[]> | LiveSatelliteTLE[]>(
      `${V1}/satellites/active`,
    );
    const list = unwrap<LiveSatelliteTLE[]>(raw);
    if (!Array.isArray(list) || list.length === 0) throw new Error("no satellites");
    // The backend returns raw TLEs; we still synthesize topocentric positions
    // (no client-side SGP4) but anchor names/count to the live catalog.
    const objects = mock.mockSatelliteObjects(lat, lon, timestamp).map((o, i) => ({
      ...o,
      name: list[i]?.satellite_name ?? list[i]?.name ?? o.name,
    }));
    return { objects, tracks: mock.mockSatelliteTracks(lat, lon), count: list.length };
  } catch {
    const objects = mock.mockSatelliteObjects(lat, lon, timestamp);
    return { objects, tracks: mock.mockSatelliteTracks(lat, lon), count: 47 };
  }
}

/* -------------------------------------------------------------------------- */
/* Planets / constellations / sky                                              */
/* -------------------------------------------------------------------------- */

export async function getPlanets(
  lat: number,
  lon: number,
  timestamp = Date.now(),
): Promise<PlanetInfo[]> {
  // Backend returns AU vectors (no alt/az transform yet) — use topocentric mock.
  return mock.mockPlanets(lat, lon, timestamp);
}

export async function getConstellations(): Promise<Constellation[]> {
  return mock.mockConstellations();
}

export async function getSkyCurrent(
  lat: number,
  lon: number,
  timestamp = Date.now(),
): Promise<SkySnapshot> {
  return mock.mockSkySnapshot(lat, lon, timestamp);
}

/* -------------------------------------------------------------------------- */
/* Events                                                                      */
/* -------------------------------------------------------------------------- */

export async function getUpcomingEvents(lat: number, lon: number): Promise<CelestialEvent[]> {
  return mock.mockEvents(lat, lon);
}

/* -------------------------------------------------------------------------- */
/* Weather / observation score                                                 */
/* -------------------------------------------------------------------------- */

interface LiveWeather {
  temperature: number;
  relative_humidity: number;
  cloud_cover: number;
  wind_speed: number;
  weather_code: number;
}

export async function getObservationScore(
  lat: number,
  lon: number,
): Promise<ObservationScore> {
  try {
    const raw = await fetchJSON<APIResponse<LiveWeather> | LiveWeather>(
      `${V1}/weather/current?latitude=${lat}&longitude=${lon}`,
    );
    const w = unwrap<LiveWeather>(raw);
    apiStatus.lastSourceLive = true;
    // Derive an observation score using real cloud cover from Open-Meteo.
    return mock.mockObservationScore(lat, lon, w.cloud_cover);
  } catch {
    apiStatus.lastSourceLive = false;
    return mock.mockObservationScore(lat, lon);
  }
}

/* -------------------------------------------------------------------------- */
/* Dashboard stats                                                             */
/* -------------------------------------------------------------------------- */

export async function getDashboardStats(lat: number, lon: number): Promise<DashboardStats> {
  // Stats are synthesized client-side. We intentionally do NOT poll the heavy
  // /dashboard orchestrator here: it re-fetches the rate-limited CelesTrak +
  // NASA Horizons providers on every call, which would add upstream load for
  // data the dashboard cards don't display.
  return mock.mockDashboardStats(lat, lon);
}

/* -------------------------------------------------------------------------- */
/* AI Cosmic Narrator                                                          */
/* -------------------------------------------------------------------------- */

export interface NarratorRequest {
  query: string;
  lat: number;
  lon: number;
  timestamp: string;
}

export async function askNarrator(req: NarratorRequest): Promise<NarratorResponse> {
  try {
    const raw = await fetchJSON<APIResponse<{ text?: string; answer?: string }> | { text?: string }>(
      `${V1}/narrator/ask`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) },
      8000,
    );
    const d = unwrap<{ text?: string; answer?: string }>(raw);
    const text = d.text ?? d.answer;
    if (!text) throw new Error("empty narrator response");
    return { text, source: "live" };
  } catch {
    return mock.mockNarrator(req.query);
  }
}

/** Lightweight backend reachability probe for the LIVE indicator. */
export async function pingBackend(): Promise<boolean> {
  try {
    await fetchJSON(`${V1}/health`, undefined, 3000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Realistic mock data for Project Zenith.
 *
 * The live backend implements only ISS / weather / satellite proxies; the rest
 * of the engine is a skeleton. To honor the product requirement that the UI is
 * "always fully populated", every API helper falls back to these generators,
 * which produce plausible, location-aware celestial data.
 */
import type {
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

/** Tiny deterministic PRNG so the same location yields a stable-ish sky. */
function seeded(seed: number) {
  let s = Math.sin(seed) * 10000;
  return () => {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export function mockISSPosition(now = Date.now()): ISSPosition {
  // Sweep the ISS smoothly around the globe based on time.
  const t = now / 1000;
  const lon = ((t / 92.68 / 60) * 360) % 360; // ~92.7 min orbit
  const lat = 51.6 * Math.sin((t / 5560) * Math.PI * 2);
  return {
    lat: Number(lat.toFixed(4)),
    lon: Number((lon > 180 ? lon - 360 : lon).toFixed(4)),
    altitudeKm: 417 + 6 * Math.sin(t / 800),
    velocityKmh: 27580 + 40 * Math.cos(t / 600),
    timestamp: now,
  };
}

export function mockISSPasses(lat: number, lon: number, days = 3): ISSPass[] {
  const rand = seeded(lat * 7.3 + lon * 3.1 + 11);
  const passes: ISSPass[] = [];
  let cursor = Date.now() + (12 + rand() * 40) * MINUTE;
  for (let i = 0; i < days * 3; i++) {
    passes.push({
      id: `iss-pass-${i}`,
      risesAt: Math.round(cursor),
      duration: Math.round(240 + rand() * 360),
      maxAltitude: Math.round(15 + rand() * 70),
      magnitude: Number((-3.5 + rand() * 2).toFixed(1)),
    });
    cursor += (90 + rand() * 240) * MINUTE;
  }
  return passes;
}

const SAT_NAMES = [
  ["STARLINK-3045", "53120"],
  ["STARLINK-4821", "55001"],
  ["ONEWEB-0294", "47301"],
  ["NOAA-19", "33591"],
  ["TERRA", "25994"],
  ["HUBBLE (HST)", "20580"],
  ["LANDSAT 9", "49260"],
  ["SENTINEL-2B", "42063"],
  ["GPS BIIF-12", "41328"],
  ["IRIDIUM 153", "43075"],
  ["AQUA", "27424"],
  ["METEOR-M2", "40069"],
];

export function mockSatelliteObjects(lat: number, lon: number, now = Date.now()): SkyObject[] {
  const rand = seeded(lat + lon + Math.floor(now / (5 * MINUTE)));
  return SAT_NAMES.slice(0, 9).map(([name, id], i) => ({
    id: `sat-${id}`,
    name,
    type: "satellite" as const,
    altitude: Math.round(8 + rand() * 78),
    azimuth: Math.round((rand() * 360 + i * 17) % 360),
    magnitude: Number((2 + rand() * 4).toFixed(1)),
    color: "#E8F4FF",
  }));
}

export function mockSatelliteTracks(lat: number, lon: number): SatelliteTrack[] {
  const rand = seeded(lat * 2 + lon * 5 + 7);
  return SAT_NAMES.slice(0, 6).map(([name, id], idx) => {
    const inclination = 45 + rand() * 50;
    const phase = rand() * Math.PI * 2;
    const track: [number, number][] = [];
    for (let p = 0; p <= 96; p++) {
      const f = p / 96;
      const trackLon = -180 + f * 360;
      const trackLat =
        inclination * Math.sin(f * Math.PI * 2 * (1.2 + idx * 0.1) + phase) * 0.9;
      track.push([trackLon, Number(trackLat.toFixed(3))]);
    }
    return { id: `track-${id}`, name, noradId: id, track };
  });
}

const PLANET_DEFS: { id: string; name: string; color: string; mag: number; au: number }[] = [
  { id: "mercury", name: "Mercury", color: "#C9B79C", mag: -0.4, au: 0.92 },
  { id: "venus", name: "Venus", color: "#FFE7B3", mag: -4.1, au: 0.72 },
  { id: "mars", name: "Mars", color: "#FF6B4A", mag: 0.7, au: 1.5 },
  { id: "jupiter", name: "Jupiter", color: "#E8C58B", mag: -2.4, au: 5.2 },
  { id: "saturn", name: "Saturn", color: "#E3D5A8", mag: 0.5, au: 9.6 },
];

export function mockPlanets(lat: number, lon: number, now = Date.now()): PlanetInfo[] {
  const rand = seeded(lat - lon + Math.floor(now / HOUR));
  const hourAngle = ((now / HOUR) % 24) / 24;
  return PLANET_DEFS.map((p, i) => {
    const azimuth = Math.round((hourAngle * 360 + i * 62 + rand() * 30) % 360);
    const altitude = Math.round(Math.max(-10, 60 * Math.sin((azimuth / 180) * Math.PI) + rand() * 18 - 9));
    return {
      id: p.id,
      name: p.name,
      altitude,
      azimuth,
      magnitude: p.mag,
      distanceAu: p.au,
      color: p.color,
    };
  });
}

/**
 * Approximate constellations placed on the local sky dome (az/alt in degrees).
 * Not astrometrically exact — tuned to read clearly on the planisphere.
 */
export function mockConstellations(): Constellation[] {
  return [
    {
      id: "orion",
      name: "Orion",
      stars: [
        { az: 95, alt: 42, mag: 0.2 }, // Betelgeuse
        { az: 110, alt: 38, mag: 0.6 }, // Bellatrix
        { az: 99, alt: 30, mag: 1.7 }, // Alnitak
        { az: 103, alt: 31, mag: 1.7 }, // Alnilam
        { az: 107, alt: 32, mag: 1.7 }, // Mintaka
        { az: 101, alt: 22, mag: 0.1 }, // Rigel
        { az: 112, alt: 24, mag: 2.1 }, // Saiph
      ],
      lines: [
        [0, 2],
        [1, 4],
        [2, 3],
        [3, 4],
        [2, 5],
        [4, 6],
      ],
    },
    {
      id: "ursa-major",
      name: "Ursa Major",
      stars: [
        { az: 330, alt: 58, mag: 1.8 },
        { az: 337, alt: 60, mag: 2.4 },
        { az: 344, alt: 57, mag: 2.4 },
        { az: 350, alt: 54, mag: 3.3 },
        { az: 357, alt: 56, mag: 1.8 },
        { az: 3, alt: 60, mag: 2.3 },
        { az: 9, alt: 62, mag: 1.9 },
      ],
      lines: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [5, 6],
        [3, 0],
      ],
    },
    {
      id: "cassiopeia",
      name: "Cassiopeia",
      stars: [
        { az: 30, alt: 65, mag: 2.2 },
        { az: 38, alt: 70, mag: 2.3 },
        { az: 46, alt: 66, mag: 2.5 },
        { az: 54, alt: 71, mag: 2.7 },
        { az: 62, alt: 67, mag: 3.4 },
      ],
      lines: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
      ],
    },
    {
      id: "scorpius",
      name: "Scorpius",
      stars: [
        { az: 180, alt: 20, mag: 1.0 }, // Antares
        { az: 186, alt: 24, mag: 2.6 },
        { az: 175, alt: 16, mag: 2.3 },
        { az: 190, alt: 14, mag: 2.0 },
        { az: 198, alt: 10, mag: 1.6 },
        { az: 205, alt: 12, mag: 2.4 },
      ],
      lines: [
        [1, 0],
        [0, 2],
        [0, 3],
        [3, 4],
        [4, 5],
      ],
    },
    {
      id: "leo",
      name: "Leo",
      stars: [
        { az: 260, alt: 48, mag: 1.4 }, // Regulus
        { az: 268, alt: 54, mag: 2.0 },
        { az: 276, alt: 58, mag: 2.6 },
        { az: 285, alt: 50, mag: 2.1 },
        { az: 280, alt: 44, mag: 3.3 },
      ],
      lines: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 0],
      ],
    },
  ];
}

export function mockSkySnapshot(lat: number, lon: number, now = Date.now()): SkySnapshot {
  const planets: SkyObject[] = mockPlanets(lat, lon, now).map((p) => ({
    id: p.id,
    name: p.name,
    type: "planet",
    altitude: p.altitude,
    azimuth: p.azimuth,
    magnitude: p.magnitude,
    color: p.color,
  }));
  const sats = mockSatelliteObjects(lat, lon, now);
  const moon: SkyObject = {
    id: "moon",
    name: "Moon",
    type: "moon",
    altitude: 36,
    azimuth: 145,
    magnitude: -10.5,
    color: "#FFD166",
  };
  return {
    timestamp: now,
    zenith: { ra: (now / HOUR) % 24, dec: lat },
    objects: [moon, ...planets, ...sats],
    constellations: mockConstellations(),
  };
}

const EVENT_TEMPLATES: Omit<CelestialEvent, "id" | "startsAt">[] = [
  {
    type: "iss_flyover",
    name: "ISS Zenith Flyover",
    location: "Overhead — your location",
    description: "Bright pass, magnitude -3.4. The station crosses near your zenith.",
  },
  {
    type: "meteor_shower",
    name: "Perseids Peak",
    location: "Radiant in Perseus, NE sky",
    description: "Up to 100 meteors/hour at peak. Best viewed after midnight.",
  },
  {
    type: "planetary_conjunction",
    name: "Venus–Jupiter Conjunction",
    location: "Western horizon after sunset",
    description: "The two brightest planets pass within 0.5° of each other.",
  },
  {
    type: "satellite_pass",
    name: "Starlink Train",
    location: "W to E across the sky",
    description: "A chain of recently launched Starlink satellites in formation.",
  },
];

export function mockEvents(lat: number, lon: number): CelestialEvent[] {
  const rand = seeded(lat + lon + 99);
  const offsets = [18 * MINUTE, 14 * HOUR + 22 * MINUTE, 2 * DAY + 5 * HOUR, 4 * DAY + 11 * HOUR];
  return EVENT_TEMPLATES.map((tpl, i) => ({
    ...tpl,
    id: `event-${i}`,
    startsAt: Date.now() + offsets[i] + Math.round(rand() * 5 * MINUTE),
  }));
}

const MOON_PHASES = [
  "New Moon",
  "Waxing Crescent",
  "First Quarter",
  "Waxing Gibbous",
  "Full Moon",
  "Waning Gibbous",
  "Last Quarter",
  "Waning Crescent",
];

export function mockObservationScore(
  lat: number,
  lon: number,
  cloudCover?: number,
): ObservationScore {
  const rand = seeded(lat * 1.7 + lon * 0.9 + Math.floor(Date.now() / (30 * MINUTE)));
  const cloud = cloudCover ?? Math.round(rand() * 60);
  const breakdown = {
    moonInterference: Math.round(40 + rand() * 55),
    cloudCover: Math.round(100 - cloud),
    lightPollution: Math.round(35 + rand() * 55),
    visibility: Math.round(55 + rand() * 45),
  };
  const score = Math.round(
    breakdown.moonInterference * 0.2 +
      breakdown.cloudCover * 0.35 +
      breakdown.lightPollution * 0.2 +
      breakdown.visibility * 0.25,
  );
  const recommendation =
    score >= 75
      ? "Excellent conditions. Clear skies and minimal interference — ideal for deep-sky observation."
      : score >= 50
        ? "Fair conditions. Some interference expected; brighter objects remain visible."
        : "Poor conditions tonight. Consider waiting for clearer skies or a darker site.";
  return {
    score,
    breakdown,
    recommendation,
    bestAfter: `${22 + Math.round(rand())}:00 local`,
  };
}

export function mockDashboardStats(lat: number, lon: number): DashboardStats {
  const rand = seeded(lat + lon + Math.floor(Date.now() / (5 * MINUTE)));
  const passes = mockISSPasses(lat, lon, 1);
  const illum = Number(rand().toFixed(2));
  return {
    activeSatellites: Math.round(38 + rand() * 60),
    nextISSPass: passes[0]?.risesAt ?? Date.now() + 18 * MINUTE,
    moonPhase: MOON_PHASES[Math.floor(illum * 8) % 8],
    moonIllumination: illum,
    seeingQuality: ["Excellent", "Good", "Average", "Poor"][Math.floor(rand() * 4)],
  };
}

export function mockNarrator(query: string): NarratorResponse {
  const q = query.toLowerCase();
  let text: string;
  if (q.includes("iss")) {
    text =
      "The International Space Station is currently traveling at 27,580 km/h at an altitude of 417 km. Based on your coordinates, its next visible pass crosses near your zenith in approximately 18 minutes, reaching a peak altitude of 78° — an exceptionally bright pass at magnitude -3.4.";
  } else if (q.includes("jupiter") || q.includes("planet")) {
    text =
      "Jupiter is rising in the eastern sky at 23° altitude, shining at magnitude -2.4. Through binoculars you may resolve its four Galilean moons. Saturn follows roughly 40° to its west, with its rings tilted favorably toward Earth this season.";
  } else if (q.includes("moon")) {
    text =
      "The Moon is a Waxing Gibbous at 68% illumination, currently 36° above the southern horizon. Its brightness will wash out fainter deep-sky targets tonight — favor the Moon's terminator, double stars, and bright planets.";
  } else if (q.includes("stargazing") || q.includes("tonight") || q.includes("score")) {
    text =
      "Tonight's observation score is 74/100 — excellent conditions after 22:00 local time. Cloud cover drops below 10%, light pollution is moderate, and lunar interference fades as the Moon sets. Aim for the eastern sky where Jupiter and Orion dominate.";
  } else {
    text =
      "I'm scanning the sky above your location. Right now, Jupiter dominates the eastern horizon, the ISS will pass near your zenith within the hour, and conditions are favorable for observation after dark. Ask me about a specific planet, the ISS, the Moon, or whether tonight is good for stargazing.";
  }
  return { text, source: "mock" };
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { GeoLocation } from "@/lib/types";

/** A small offline gazetteer so the city-name field works without an API key. */
const CITY_PRESETS: Record<string, GeoLocation> = {
  "new york": { lat: 40.7128, lon: -74.006, label: "New York, USA" },
  london: { lat: 51.5074, lon: -0.1278, label: "London, UK" },
  tokyo: { lat: 35.6762, lon: 139.6503, label: "Tokyo, Japan" },
  paris: { lat: 48.8566, lon: 2.3522, label: "Paris, France" },
  sydney: { lat: -33.8688, lon: 151.2093, label: "Sydney, Australia" },
  "los angeles": { lat: 34.0522, lon: -118.2437, label: "Los Angeles, USA" },
  dubai: { lat: 25.2048, lon: 55.2708, label: "Dubai, UAE" },
  singapore: { lat: 1.3521, lon: 103.8198, label: "Singapore" },
  mumbai: { lat: 19.076, lon: 72.8777, label: "Mumbai, India" },
  delhi: { lat: 28.6139, lon: 77.209, label: "New Delhi, India" },
  bangalore: { lat: 12.9716, lon: 77.5946, label: "Bengaluru, India" },
  "cape town": { lat: -33.9249, lon: 18.4241, label: "Cape Town, South Africa" },
  "rio de janeiro": { lat: -22.9068, lon: -43.1729, label: "Rio de Janeiro, Brazil" },
  reykjavik: { lat: 64.1466, lon: -21.9426, label: "Reykjavik, Iceland" },
  cairo: { lat: 30.0444, lon: 31.2357, label: "Cairo, Egypt" },
};

const DEFAULT_LOCATION: GeoLocation = {
  lat: 40.7128,
  lon: -74.006,
  label: "New York, USA",
};

interface LocationContextValue {
  location: GeoLocation;
  requesting: boolean;
  /** True while a city name is being geocoded over the network. */
  searching: boolean;
  error: string | null;
  /** Resolve a free-text query ("city" or "lat, lng") into a location. */
  setLocationFromQuery: (query: string) => Promise<boolean>;
  setLocation: (loc: GeoLocation) => void;
  useMyLocation: () => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

/** Parse a "lat, lng" / "lat lng" string into a location, if valid. */
function parseCoords(query: string): GeoLocation | null {
  const coordMatch = query.match(
    /^(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)$/,
  );
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon, label: `${lat.toFixed(4)}, ${lon.toFixed(4)}` };
    }
  }
  return null;
}

interface GeocodeResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

/** Geocode any city name via Open-Meteo's free, keyless geocoding API. */
async function geocodeCity(query: string): Promise<GeoLocation | null> {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=" +
    encodeURIComponent(query);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`geocode HTTP ${res.status}`);
  const data = (await res.json()) as { results?: GeocodeResult[] };
  const r = data.results?.[0];
  if (!r) return null;
  const parts = [r.name, r.admin1, r.country].filter(Boolean) as string[];
  const label = parts.length > 2 ? `${r.name}, ${r.country}` : parts.join(", ");
  return {
    lat: Number(r.latitude.toFixed(4)),
    lon: Number(r.longitude.toFixed(4)),
    label,
  };
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<GeoLocation>(DEFAULT_LOCATION);
  const [requesting, setRequesting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setLocation = useCallback((loc: GeoLocation) => {
    setLocationState(loc);
    setError(null);
  }, []);

  const setLocationFromQuery = useCallback(async (query: string): Promise<boolean> => {
    const trimmed = query.trim();
    if (!trimmed) return false;

    // 1) "lat, lng" coordinates resolve instantly.
    const coords = parseCoords(trimmed);
    if (coords) {
      setLocationState(coords);
      setError(null);
      return true;
    }

    // 2) Known presets resolve instantly (works offline).
    const preset = CITY_PRESETS[trimmed.toLowerCase()];
    if (preset) {
      setLocationState(preset);
      setError(null);
      return true;
    }

    // 3) Anything else: geocode the city name over the network.
    setSearching(true);
    setError(null);
    try {
      const found = await geocodeCity(trimmed);
      if (found) {
        setLocationState(found);
        return true;
      }
      setError(`No match for "${trimmed}". Check the spelling or try "lat, lng".`);
      return false;
    } catch {
      setError("Couldn't reach the location service. Try again or use \"lat, lng\".");
      return false;
    } finally {
      setSearching(false);
    }
  }, []);

  const useMyLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }
    setRequesting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationState({
          lat: Number(pos.coords.latitude.toFixed(4)),
          lon: Number(pos.coords.longitude.toFixed(4)),
          label: "Current Location",
        });
        setRequesting(false);
      },
      (err) => {
        setError(err.message || "Unable to retrieve your location.");
        setRequesting(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  const value = useMemo<LocationContextValue>(
    () => ({
      location,
      requesting,
      searching,
      error,
      setLocation,
      setLocationFromQuery,
      useMyLocation,
    }),
    [location, requesting, searching, error, setLocation, setLocationFromQuery, useMyLocation],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within a LocationProvider");
  return ctx;
}

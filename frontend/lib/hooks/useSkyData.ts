"use client";

import useSWR from "swr";
import {
  getDashboardStats,
  getObservationScore,
  getSkyCurrent,
  getUpcomingEvents,
  getVisibleSatellites,
} from "@/lib/api";
import type {
  CelestialEvent,
  DashboardStats,
  ObservationScore,
  SkySnapshot,
} from "@/lib/types";

/**
 * Aggregated sky data for a location/timestamp. Each slice uses the refresh
 * cadence from the product spec:
 *   - satellites: every 30s
 *   - weather / observation score: every 5 minutes
 */
export function useSkyData(lat: number, lon: number, timestamp: number) {
  // Bucket the timestamp so "time travel" changes refetch, but the live clock
  // ticking second-by-second does not thrash SWR.
  const bucket = Math.floor(timestamp / 60000);

  const { data: sky } = useSWR<SkySnapshot>(
    ["sky", lat, lon, bucket],
    () => getSkyCurrent(lat, lon, timestamp),
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  const { data: satellites } = useSWR(
    ["satellites", lat, lon, bucket],
    () => getVisibleSatellites(lat, lon, timestamp),
    { refreshInterval: 30_000, revalidateOnFocus: false, keepPreviousData: true },
  );

  const { data: score } = useSWR<ObservationScore>(
    ["score", lat, lon],
    () => getObservationScore(lat, lon),
    { refreshInterval: 5 * 60_000, revalidateOnFocus: false, keepPreviousData: true },
  );

  const { data: events } = useSWR<CelestialEvent[]>(
    ["events", lat, lon],
    () => getUpcomingEvents(lat, lon),
    { refreshInterval: 5 * 60_000, revalidateOnFocus: false, keepPreviousData: true },
  );

  const { data: stats } = useSWR<DashboardStats>(
    ["dashboard-stats", lat, lon, bucket],
    () => getDashboardStats(lat, lon),
    { refreshInterval: 60_000, revalidateOnFocus: false, keepPreviousData: true },
  );

  return { sky, satellites, score, events, stats };
}

export function useObservationScore(lat: number, lon: number) {
  const { data, isLoading } = useSWR<ObservationScore>(
    ["score", lat, lon],
    () => getObservationScore(lat, lon),
    { refreshInterval: 5 * 60_000, revalidateOnFocus: false, keepPreviousData: true },
  );
  return { score: data, isLoading };
}

export function useEvents(lat: number, lon: number) {
  const { data, isLoading } = useSWR<CelestialEvent[]>(
    ["events", lat, lon],
    () => getUpcomingEvents(lat, lon),
    { refreshInterval: 5 * 60_000, revalidateOnFocus: false, keepPreviousData: true },
  );
  return { events: data ?? [], isLoading };
}

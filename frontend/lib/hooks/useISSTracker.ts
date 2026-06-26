"use client";

import useSWR from "swr";
import { getISSPasses, getISSPosition } from "@/lib/api";
import type { ISSPass, ISSPosition } from "@/lib/types";

/**
 * Live ISS telemetry. Position refreshes every 5 seconds (per spec) against the
 * backend's Open-Notify proxy, falling back to a synthesized orbit when offline.
 */
export function useISSTracker(lat: number, lon: number) {
  const { data: position, isLoading: positionLoading } = useSWR<ISSPosition>(
    "iss-position",
    getISSPosition,
    {
      refreshInterval: 5000,
      revalidateOnFocus: false,
      keepPreviousData: true,
      dedupingInterval: 4000,
    },
  );

  const { data: passes } = useSWR<ISSPass[]>(
    ["iss-passes", lat, lon],
    () => getISSPasses(lat, lon, 3),
    { revalidateOnFocus: false, refreshInterval: 5 * 60 * 1000, keepPreviousData: true },
  );

  const nextPass = passes && passes.length > 0 ? passes[0] : null;

  return { position, passes: passes ?? [], nextPass, positionLoading };
}

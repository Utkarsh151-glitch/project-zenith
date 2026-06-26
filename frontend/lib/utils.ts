import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names with conflict resolution (shadcn convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Clamp a number into the inclusive [min, max] range. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Pad a number to two digits, e.g. 7 -> "07". */
export function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

/** Format a latitude/longitude pair as a mono-friendly coordinate string. */
export function formatCoords(lat: number, lon: number) {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${latDir}  ${Math.abs(lon).toFixed(4)}°${lonDir}`;
}

/**
 * Break a future timestamp into a live countdown structure. Returns zeros once
 * the target time has passed.
 */
export function countdownParts(target: number, now: number = Date.now()) {
  let diff = Math.max(0, Math.floor((target - now) / 1000));
  const days = Math.floor(diff / 86400);
  diff -= days * 86400;
  const hours = Math.floor(diff / 3600);
  diff -= hours * 3600;
  const minutes = Math.floor(diff / 60);
  const seconds = diff - minutes * 60;
  return { days, hours, minutes, seconds, expired: target - now <= 0 };
}

/** Compact human-readable countdown, e.g. "2d 04h 11m" or "18m 22s". */
export function formatCountdown(target: number, now: number = Date.now()) {
  const { days, hours, minutes, seconds, expired } = countdownParts(target, now);
  if (expired) return "now";
  if (days > 0) return `${days}d ${pad2(hours)}h ${pad2(minutes)}m`;
  if (hours > 0) return `${pad2(hours)}h ${pad2(minutes)}m ${pad2(seconds)}s`;
  return `${pad2(minutes)}m ${pad2(seconds)}s`;
}

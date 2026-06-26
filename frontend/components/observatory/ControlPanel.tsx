"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Loader2,
  LocateFixed,
  Moon,
  Orbit,
  Radar,
  Rocket,
  Satellite,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ObservationScore } from "./ObservationScore";
import { useLocation } from "@/lib/hooks/useLocation";
import { useSkyData } from "@/lib/hooks/useSkyData";
import { useISSTracker } from "@/lib/hooks/useISSTracker";
import type { LayerFilters } from "@/lib/types";
import { cn, formatCountdown, pad2 } from "@/lib/utils";

const HOUR = 3_600_000;
const DAY = 86_400_000;

const FILTERS: { key: keyof LayerFilters; label: string; icon: typeof Satellite }[] = [
  { key: "satellites", label: "Satellites", icon: Satellite },
  { key: "iss", label: "ISS", icon: Rocket },
  { key: "constellations", label: "Constellations", icon: Star },
  { key: "planets", label: "Planets", icon: Orbit },
];

interface ControlPanelProps {
  timestamp: number;
  isLive: boolean;
  onShift: (deltaMs: number) => void;
  onSetTime: (absMs: number) => void;
  onResetNow: () => void;
  filters: LayerFilters;
  onToggleFilter: (key: keyof LayerFilters) => void;
}

export default function ControlPanel({
  timestamp,
  isLive,
  onShift,
  onSetTime,
  onResetNow,
  filters,
  onToggleFilter,
}: ControlPanelProps) {
  const { location, setLocationFromQuery, useMyLocation, requesting, searching, error } =
    useLocation();
  const { score, stats } = useSkyData(location.lat, location.lon, timestamp);
  const { nextPass } = useISSTracker(location.lat, location.lon);

  const [query, setQuery] = useState("");
  const [now, setNow] = useState(0);
  const [showPicker, setShowPicker] = useState(false);

  // Live clock + per-second re-render for countdowns. `now` starts at 0 so the
  // server and the first client render match (no hydration mismatch); the real
  // time arrives in the effect after mount.
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const mounted = now !== 0;
  const clockTime = isLive ? now : timestamp;
  const d = new Date(clockTime || 0);
  const timeStr = mounted
    ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
    : "--:--:--";
  const dateStr = mounted
    ? d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    : "";

  const nextPassMs = nextPass?.risesAt ?? stats?.nextISSPass;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await setLocationFromQuery(query);
    if (ok) setQuery("");
  };

  return (
    <div className="flex flex-col gap-4" data-no-drag>
      {/* Location */}
      <Card>
        <CardContent className="p-4">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-ui-gray">
            Observer Location
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ui-gray" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any city or lat, lng"
                className="pl-9"
                disabled={searching}
              />
            </div>
            <Button
              type="submit"
              size="icon"
              variant="outline"
              aria-label="Search location"
              disabled={searching || !query.trim()}
            >
              {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            </Button>
          </form>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={useMyLocation}
            disabled={requesting}
            className="mt-2 w-full"
          >
            <LocateFixed className="size-4" />
            {requesting ? "Locating…" : "Use My Location"}
          </Button>
          {error && <p className="mt-2 text-[11px] text-alert">{error}</p>}
          <div className="mt-3 rounded-lg border border-white/5 bg-white/5 p-2.5">
            <p className="text-sm text-star">{location.label}</p>
            <p className="font-mono text-[11px] text-plasma">
              {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Clock + Time Travel */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-ui-gray">
              <Clock className="size-3.5" /> {isLive ? "Local Time" : "Time Travel"}
            </p>
            {!isLive && (
              <button
                onClick={onResetNow}
                className="font-mono text-[10px] text-plasma underline-offset-2 hover:underline"
              >
                RESET TO NOW
              </button>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "font-mono text-3xl font-semibold tabular-nums",
                isLive ? "text-star" : "text-solar",
              )}
            >
              {timeStr}
            </span>
            <span className="font-mono text-xs text-ui-gray">{dateStr}</span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "+1hr", delta: HOUR },
              { label: "+24hr", delta: DAY },
              { label: "+7d", delta: 7 * DAY },
            ].map((b) => (
              <Button
                key={b.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onShift(b.delta)}
                className="font-mono"
              >
                {b.label}
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPicker((s) => !s)}
            className="mt-2 w-full font-mono text-xs"
          >
            Custom datetime…
          </Button>
          {showPicker && (
            <input
              type="datetime-local"
              aria-label="Custom observation date and time"
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-star [color-scheme:dark] focus:border-plasma/50 focus:outline-none"
              onChange={(e) => {
                const v = e.target.value;
                if (v) onSetTime(new Date(v).getTime());
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Observation Score */}
      <Card>
        <CardContent className="p-4">
          <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-ui-gray">
            <Sparkles className="size-3.5" /> Observation Readiness
          </p>
          <ObservationScore score={score} />
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <p className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-ui-gray">
            <Radar className="size-3.5" /> Sky Layers
          </p>
          <div className="grid grid-cols-2 gap-2">
            {FILTERS.map(({ key, label, icon: Icon }) => {
              const active = filters[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggleFilter(key)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-all duration-200",
                    active
                      ? "border-plasma/50 bg-plasma/15 text-plasma shadow-plasma-sm"
                      : "border-white/10 bg-white/5 text-ui-gray hover:text-star",
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Mini stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Satellite className="size-4 text-plasma" />}
          label="Active Satellites"
          value={stats ? String(stats.activeSatellites) : "—"}
          sub="visible now"
        />
        <StatCard
          icon={<Rocket className="size-4 text-plasma" />}
          label="Next ISS Pass"
          value={mounted && nextPassMs ? formatCountdown(nextPassMs, now) : "—"}
          sub="until rise"
          highlight
        />
        <StatCard
          icon={<Moon className="size-4 text-solar" />}
          label="Moon Phase"
          value={stats?.moonPhase ?? "—"}
          sub={stats ? `${Math.round(stats.moonIllumination * 100)}% lit` : ""}
        />
        <StatCard
          icon={<Star className="size-4 text-solar" />}
          label="Seeing Quality"
          value={stats?.seeingQuality ?? "—"}
          sub="atmosphere"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <motion.div variants={undefined} className="glass rounded-xl p-3">
      <div className="flex items-center gap-1.5">{icon}</div>
      <p className="mt-1.5 text-[10px] uppercase tracking-wider text-ui-gray">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-display text-base font-semibold leading-tight",
          highlight ? "text-plasma" : "text-star",
        )}
      >
        {value}
      </p>
      {sub && <p className="font-mono text-[10px] text-ui-gray">{sub}</p>}
    </motion.div>
  );
}

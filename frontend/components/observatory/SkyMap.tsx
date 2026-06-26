"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Compass } from "lucide-react";
import { fadeInUp, staggerContainer } from "@/components/SectionWrapper";
import { useSkyData } from "@/lib/hooks/useSkyData";
import { useLocation } from "@/lib/hooks/useLocation";
import type { SkyObject } from "@/lib/types";

const SIZE = 600;
const C = SIZE / 2;
const R = 270;

const COMPASS = [
  { label: "N", az: 0 },
  { label: "NE", az: 45 },
  { label: "E", az: 90 },
  { label: "SE", az: 135 },
  { label: "S", az: 180 },
  { label: "SW", az: 225 },
  { label: "W", az: 270 },
  { label: "NW", az: 315 },
];

/** Azimuthal projection: zenith at centre, horizon at the outer ring. */
function project(az: number, alt: number) {
  const r = ((90 - alt) / 90) * R;
  const a = (az * Math.PI) / 180;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
}

interface MovingSat {
  id: string;
  name: string;
  az: number;
  alt: number;
  speed: number;
  phase: number;
}

export default function SkyMap() {
  const { location } = useLocation();
  const { sky } = useSkyData(location.lat, location.lon, Date.now());
  const [, setTick] = useState(0);

  // Seed moving satellites from the sky snapshot, then glide them locally.
  const satsRef = useRef<MovingSat[]>([]);
  useEffect(() => {
    if (!sky) return;
    satsRef.current = sky.objects
      .filter((o) => o.type === "satellite")
      .map((o, i) => ({
        id: o.id,
        name: o.name,
        az: o.azimuth,
        alt: Math.max(2, o.altitude),
        speed: 6 + (i % 4) * 2.5, // deg/sec of azimuth
        phase: i,
      }));
  }, [sky]);

  // Advance satellites once per second; CSS transition glides between updates.
  useEffect(() => {
    const id = setInterval(() => {
      satsRef.current = satsRef.current.map((s) => {
        const az = (s.az + s.speed) % 360;
        const alt = 30 + 28 * Math.sin((az / 180) * Math.PI + s.phase);
        return { ...s, az, alt: Math.max(3, alt) };
      });
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const planets = useMemo(
    () => (sky?.objects ?? []).filter((o) => o.type === "planet" || o.type === "moon"),
    [sky],
  );
  const constellations = sky?.constellations ?? [];
  const sats = satsRef.current;

  return (
    <motion.section
      id="sky-map"
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      className="relative mx-auto w-full max-w-7xl scroll-mt-20 px-5 py-20 md:px-8 md:py-28"
    >
      <motion.div variants={fadeInUp} className="mb-8 flex flex-col gap-2">
        <span className="flex items-center gap-2 font-mono text-xs tracking-[0.25em] text-plasma">
          <Compass className="size-3.5" /> SECTION 04 · SKY MAP
        </span>
        <h2 className="font-display text-3xl font-bold text-star sm:text-4xl md:text-5xl">
          Full-Sky Planisphere
        </h2>
        <p className="max-w-2xl text-ui-gray">
          A live dome of the entire visible sky above {location.label}. Zenith at the centre, the
          horizon at the outer ring.
        </p>
      </motion.div>

      <motion.div
        variants={fadeInUp}
        className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_280px]"
      >
        {/* Planisphere */}
        <div className="mx-auto w-full max-w-[560px]">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-full">
            <defs>
              <radialGradient id="dome-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0a1740" stopOpacity="0.7" />
                <stop offset="70%" stopColor="#050D2E" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#03000A" stopOpacity="0.95" />
              </radialGradient>
              <radialGradient id="sweep-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Dome background */}
            <circle cx={C} cy={C} r={R} fill="url(#dome-grad)" stroke="#00E5FF33" strokeWidth="2" />

            {/* Radar sweep */}
            <g>
              <path d={`M ${C} ${C} L ${C} ${C - R} A ${R} ${R} 0 0 1 ${C + R * Math.sin(Math.PI / 4)} ${C - R * Math.cos(Math.PI / 4)} Z`} fill="url(#sweep-grad)" />
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`0 ${C} ${C}`}
                to={`360 ${C} ${C}`}
                dur="8s"
                repeatCount="indefinite"
              />
            </g>

            {/* Altitude rings */}
            {[30, 60].map((alt) => {
              const r = ((90 - alt) / 90) * R;
              return (
                <g key={alt}>
                  <circle cx={C} cy={C} r={r} fill="none" stroke="#E8F4FF1a" strokeWidth="1" strokeDasharray="2 5" />
                  <text x={C + 4} y={C - r + 14} fill="#8892A4" fontSize="11" fontFamily="JetBrains Mono, monospace">
                    {alt}°
                  </text>
                </g>
              );
            })}

            {/* Compass spokes + labels */}
            {COMPASS.map((c) => {
              const a = (c.az * Math.PI) / 180;
              const x2 = C + R * Math.sin(a);
              const y2 = C - R * Math.cos(a);
              const lx = C + (R + 22) * Math.sin(a);
              const ly = C - (R + 22) * Math.cos(a);
              return (
                <g key={c.label}>
                  <line x1={C} y1={C} x2={x2} y2={y2} stroke="#E8F4FF0d" strokeWidth="1" />
                  <text
                    x={lx}
                    y={ly}
                    fill={c.label.length === 1 ? "#00E5FF" : "#8892A4"}
                    fontSize={c.label.length === 1 ? 16 : 12}
                    fontWeight={c.label.length === 1 ? 700 : 400}
                    fontFamily="Space Grotesk, sans-serif"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {c.label}
                  </text>
                </g>
              );
            })}

            {/* Constellations */}
            {constellations.map((con) => (
              <g key={con.id}>
                {con.lines.map(([a, b], i) => {
                  const p1 = project(con.stars[a].az, con.stars[a].alt);
                  const p2 = project(con.stars[b].az, con.stars[b].alt);
                  return (
                    <line
                      key={i}
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="#E8F4FF55"
                      strokeWidth="1"
                    />
                  );
                })}
                {con.stars.map((st, i) => {
                  const p = project(st.az, st.alt);
                  return <circle key={i} cx={p.x} cy={p.y} r={Math.max(1.2, 3 - st.mag * 0.4)} fill="#E8F4FF" />;
                })}
                {(() => {
                  const anchor = project(con.stars[0].az, con.stars[0].alt);
                  return (
                    <text x={anchor.x + 6} y={anchor.y - 6} fill="#8892A4" fontSize="9" fontFamily="JetBrains Mono, monospace">
                      {con.name}
                    </text>
                  );
                })()}
              </g>
            ))}

            {/* Satellites (gliding) */}
            {sats.map((s) => {
              const p = project(s.az, s.alt);
              return (
                <g key={s.id} style={{ transform: `translate(${p.x}px, ${p.y}px)`, transition: "transform 1s linear" }}>
                  <circle r="3" fill="#00E5FF" />
                  <circle r="6" fill="none" stroke="#00E5FF" strokeOpacity="0.4" strokeWidth="1" />
                </g>
              );
            })}

            {/* Planets / Moon */}
            {planets.map((obj: SkyObject) => {
              if (obj.altitude < 0) return null;
              const p = project(obj.azimuth, obj.altitude);
              return (
                <g key={obj.id}>
                  <circle cx={p.x} cy={p.y} r="6" fill={obj.color ?? "#FFD166"} />
                  <circle cx={p.x} cy={p.y} r="11" fill="none" stroke={obj.color ?? "#FFD166"} strokeOpacity="0.35" />
                  <text x={p.x + 12} y={p.y + 4} fill={obj.color ?? "#FFD166"} fontSize="11" fontFamily="JetBrains Mono, monospace">
                    {obj.name}
                  </text>
                </g>
              );
            })}

            {/* Zenith crosshair */}
            <g stroke="#00E5FF" strokeWidth="1.5">
              <line x1={C - 12} y1={C} x2={C + 12} y2={C} />
              <line x1={C} y1={C - 12} x2={C} y2={C + 12} />
              <circle cx={C} cy={C} r="5" fill="none" />
            </g>
            <text x={C + 14} y={C - 10} fill="#00E5FF" fontSize="10" fontFamily="JetBrains Mono, monospace">
              ZENITH
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="glass rounded-2xl p-5">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-ui-gray">Legend</p>
          <ul className="space-y-3 text-sm">
            <LegendItem color="#00E5FF" label="Satellites" sub={`${sats.length} tracked · moving live`} />
            <LegendItem color="#FFD166" label="Planets & Moon" sub={`${planets.length} above horizon`} />
            <LegendItem color="#E8F4FF" label="Constellations" sub={`${constellations.length} mapped`} />
            <LegendItem color="#00E5FF" label="Zenith" sub="directly overhead" ring />
          </ul>
          <div className="mt-5 rounded-lg border border-white/5 bg-white/5 p-3">
            <p className="font-mono text-[11px] text-ui-gray">OBSERVER</p>
            <p className="mt-1 text-sm text-star">{location.label}</p>
            <p className="font-mono text-[11px] text-plasma">
              {location.lat.toFixed(2)}°, {location.lon.toFixed(2)}°
            </p>
          </div>
        </div>
      </motion.div>
    </motion.section>
  );
}

function LegendItem({
  color,
  label,
  sub,
  ring,
}: {
  color: string;
  label: string;
  sub: string;
  ring?: boolean;
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
        style={ring ? { border: `2px solid ${color}` } : { background: color, boxShadow: `0 0 10px ${color}` }}
      />
      <div>
        <p className="text-star">{label}</p>
        <p className="font-mono text-[10px] text-ui-gray">{sub}</p>
      </div>
    </li>
  );
}

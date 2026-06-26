"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Orbit, Rocket, Satellite, Sparkles, type LucideIcon } from "lucide-react";
import type { CelestialEvent, EventType } from "@/lib/types";
import { countdownParts, pad2 } from "@/lib/utils";
import { fadeInUp } from "@/components/SectionWrapper";

const STYLES: Record<
  EventType,
  { color: string; label: string; icon: LucideIcon }
> = {
  iss_flyover: { color: "#00E5FF", label: "ISS Flyover", icon: Rocket },
  meteor_shower: { color: "#FFD166", label: "Meteor Shower", icon: Sparkles },
  planetary_conjunction: { color: "#9b6bff", label: "Planetary Conjunction", icon: Orbit },
  satellite_pass: { color: "#E8F4FF", label: "Satellite Pass", icon: Satellite },
};

export function EventCard({ event }: { event: CelestialEvent }) {
  const style = STYLES[event.type];
  const Icon = style.icon;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { days, hours, minutes, seconds, expired } = countdownParts(event.startsAt, now);
  const when = new Date(event.startsAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.article
      variants={fadeInUp}
      whileHover={{ y: -6 }}
      className="group relative flex w-[280px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-white/[0.03] p-5 backdrop-blur-md transition-shadow"
      style={{
        borderColor: `${style.color}40`,
        boxShadow: `0 0 0 1px ${style.color}10, 0 18px 40px -20px ${style.color}80`,
      }}
    >
      {/* Glow accent */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-30 blur-2xl transition-opacity group-hover:opacity-60"
        style={{ background: style.color }}
      />

      <div className="flex items-center justify-between">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: `${style.color}1a`, color: style.color }}
        >
          <Icon className="size-5" />
        </span>
        <span
          className="rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider"
          style={{ borderColor: `${style.color}50`, color: style.color }}
        >
          {style.label}
        </span>
      </div>

      <h3 className="mt-4 font-display text-lg font-semibold text-star">{event.name}</h3>
      <p className="mt-1 line-clamp-2 text-xs text-ui-gray">{event.description}</p>

      {/* Countdown */}
      <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-3">
        {expired ? (
          <p className="text-center font-mono text-sm" style={{ color: style.color }}>
            ✦ Happening now
          </p>
        ) : (
          <div className="flex items-center justify-between font-mono">
            {(days > 0
              ? [
                  { v: days, l: "DAY" },
                  { v: hours, l: "HRS" },
                  { v: minutes, l: "MIN" },
                ]
              : [
                  { v: hours, l: "HRS" },
                  { v: minutes, l: "MIN" },
                  { v: seconds, l: "SEC" },
                ]
            ).map((seg) => (
              <div key={seg.l} className="flex flex-col items-center">
                <span
                  className="text-xl font-semibold tabular-nums"
                  style={{ color: style.color }}
                >
                  {pad2(seg.v)}
                </span>
                <span className="text-[9px] tracking-widest text-ui-gray">{seg.l}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-[11px] text-ui-gray">{when}</span>
      </div>
      <span className="mt-2 inline-flex w-fit items-center rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-ui-gray">
        📍 {event.location}
      </span>
    </motion.article>
  );
}

export default EventCard;

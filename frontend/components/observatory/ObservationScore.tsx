"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import type { ObservationScore as ObservationScoreType } from "@/lib/types";
import { cn } from "@/lib/utils";

const BREAKDOWN_LABELS: { key: keyof ObservationScoreType["breakdown"]; label: string }[] = [
  { key: "moonInterference", label: "Moon Interference" },
  { key: "cloudCover", label: "Cloud Cover" },
  { key: "lightPollution", label: "Light Pollution" },
  { key: "visibility", label: "Visibility" },
];

function scoreColor(v: number) {
  if (v >= 75) return "#34d399"; // emerald/green
  if (v >= 50) return "#FFD166"; // solar gold
  return "#FF4D6D"; // alert red
}

const R = 70;
const CIRC = 2 * Math.PI * R;
const SWEEP = 0.75; // 270° gauge

export function ObservationScore({ score }: { score?: ObservationScoreType }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);
  const target = score?.score ?? 0;

  // Count-up animation on mount / when in view.
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const duration = 1200;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);

  const filled = inView ? (target / 100) * SWEEP * CIRC : 0;
  const color = scoreColor(target);

  return (
    <div ref={ref} className="flex flex-col items-center">
      <div className="relative h-44 w-44">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-[135deg]">
          <defs>
            <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF4D6D" />
              <stop offset="50%" stopColor="#FFD166" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx="90"
            cy="90"
            r={R}
            fill="none"
            stroke="rgba(232,244,255,0.08)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${SWEEP * CIRC} ${CIRC}`}
          />
          {/* Progress */}
          <circle
            cx="90"
            cy="90"
            r={R}
            fill="none"
            stroke="url(#gauge-grad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRC}`}
            style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.22,1,0.36,1)" }}
          />
        </svg>
        {/* Center readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display text-5xl font-bold tabular-nums"
            style={{ color, textShadow: `0 0 24px ${color}66` }}
          >
            {display}
          </span>
          <span className="font-mono text-[10px] tracking-widest text-ui-gray">/ 100</span>
          <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ui-gray">
            Observation
          </span>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="mt-4 w-full space-y-2.5">
        {BREAKDOWN_LABELS.map(({ key, label }, i) => {
          const value = score?.breakdown[key] ?? 0;
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] text-ui-gray">{label}</span>
                <span className="font-mono text-[11px] text-star tabular-nums">{value}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={inView ? { width: `${value}%` } : { width: 0 }}
                  transition={{ duration: 0.9, delay: 0.3 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full"
                  style={{ background: scoreColor(value) }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {score?.recommendation && (
        <p className={cn("mt-4 text-center text-xs leading-relaxed text-ui-gray")}>
          {score.recommendation}
        </p>
      )}
    </div>
  );
}

export default ObservationScore;

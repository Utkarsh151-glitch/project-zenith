"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import ControlPanel from "./ControlPanel";
import { LoadingOrbit } from "@/components/LoadingOrbit";
import { fadeInUp, staggerContainer } from "@/components/SectionWrapper";
import type { LayerFilters } from "@/lib/types";

const GlobeView = dynamic(() => import("./GlobeView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-2xl border border-white/10 bg-cosmic/30">
      <LoadingOrbit size={56} />
    </div>
  ),
});

export default function Observatory() {
  const [isLive, setIsLive] = useState(true);
  const [travelTime, setTravelTime] = useState(() => Date.now());
  const [filters, setFilters] = useState<LayerFilters>({
    satellites: true,
    iss: true,
    constellations: true,
    planets: true,
  });

  const timestamp = isLive ? Date.now() : travelTime;

  const onShift = useCallback(
    (delta: number) => {
      setTravelTime((prev) => (isLive ? Date.now() : prev) + delta);
      setIsLive(false);
    },
    [isLive],
  );
  const onSetTime = useCallback((abs: number) => {
    setTravelTime(abs);
    setIsLive(false);
  }, []);
  const onResetNow = useCallback(() => setIsLive(true), []);
  const onToggleFilter = useCallback(
    (key: keyof LayerFilters) => setFilters((f) => ({ ...f, [key]: !f[key] })),
    [],
  );

  return (
    <motion.section
      id="observatory"
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      className="relative mx-auto w-full max-w-7xl scroll-mt-20 px-5 py-20 md:px-8 md:py-28"
    >
      <motion.div variants={fadeInUp} className="mb-8 flex flex-col gap-2">
        <span className="flex items-center gap-2 font-mono text-xs tracking-[0.25em] text-plasma">
          <Radio className="size-3.5" /> SECTION 01 · LIVE OBSERVATORY
        </span>
        <h2 className="font-display text-3xl font-bold text-star sm:text-4xl md:text-5xl">
          The Observatory Dashboard
        </h2>
        <p className="max-w-2xl text-ui-gray">
          A real-time, time-travelable window on the sky above your location — satellites, the
          ISS, planets and constellations rendered over an interactive ECEF globe.
        </p>
      </motion.div>

      <motion.div
        variants={fadeInUp}
        className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(300px,30%)_1fr]"
      >
        {/* Left sidebar — controls */}
        <div className="order-2 lg:order-1">
          <ControlPanel
            timestamp={timestamp}
            isLive={isLive}
            onShift={onShift}
            onSetTime={onSetTime}
            onResetNow={onResetNow}
            filters={filters}
            onToggleFilter={onToggleFilter}
          />
        </div>

        {/* Main — Cesium globe. On desktop it stretches to match the control
            panel's height (no dead space); on mobile it has a fixed height. */}
        <div className="order-1 h-[460px] lg:order-2 lg:h-auto lg:min-h-[620px]">
          <GlobeView timestamp={timestamp} filters={filters} />
        </div>
      </motion.div>
    </motion.section>
  );
}

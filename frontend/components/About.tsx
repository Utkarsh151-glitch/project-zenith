"use client";

import { motion } from "framer-motion";
import { Brain, Cpu, Orbit, Radar, Satellite, Telescope } from "lucide-react";
import { fadeInUp, staggerContainer } from "@/components/SectionWrapper";

const FEATURES = [
  {
    icon: Satellite,
    title: "Real-Time Telemetry",
    body: "Live ISS position from Open-Notify, active-satellite TLEs from CelesTrak, and weather from Open-Meteo.",
  },
  {
    icon: Orbit,
    title: "Predictive Simulation",
    body: "SGP4 propagation and Skyfield/Astropy compute future satellite and planetary positions across time.",
  },
  {
    icon: Brain,
    title: "AI Cosmic Narrator",
    body: "Complex telemetry translated into plain-language, location-aware explanations of your sky.",
  },
  {
    icon: Radar,
    title: "Observation Readiness",
    body: "A dynamic score blends cloud cover, lunar interference, light pollution and visibility.",
  },
  {
    icon: Telescope,
    title: "Zenith-Focused View",
    body: "A transparent observation cone projected through your local East-North-Up reference frame.",
  },
  {
    icon: Cpu,
    title: "Built for the Browser",
    body: "Next.js 14, Three.js and CesiumJS render an interactive 3D operations centre at 60fps.",
  },
];

const DATA_SOURCES = ["NASA Horizons", "Open-Notify", "CelesTrak", "Open-Meteo", "Skyfield", "SGP4"];

export default function About() {
  return (
    <motion.section
      id="about"
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      className="relative mx-auto w-full max-w-7xl scroll-mt-20 px-5 py-20 md:px-8 md:py-28"
    >
      <motion.div variants={fadeInUp} className="mb-10 flex flex-col gap-2 text-center">
        <span className="mx-auto flex items-center gap-2 font-mono text-xs tracking-[0.25em] text-plasma">
          <Telescope className="size-3.5" /> SECTION 05 · ABOUT
        </span>
        <h2 className="font-display text-3xl font-bold text-star sm:text-4xl md:text-5xl">
          An Intelligent Digital Observatory
        </h2>
        <p className="mx-auto max-w-2xl text-ui-gray">
          Project Zenith transforms passive observers into active explorers of the dynamic sky —
          combining authoritative telemetry, scientific astronomy and AI-generated insight.
        </p>
      </motion.div>

      <motion.div variants={fadeInUp} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="glass group rounded-2xl p-6 transition-colors hover:border-plasma/30"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-plasma/10 text-plasma transition-transform group-hover:scale-110">
              <f.icon className="size-5" />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-star">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ui-gray">{f.body}</p>
          </div>
        ))}
      </motion.div>

      <motion.div
        variants={fadeInUp}
        className="mt-8 flex flex-wrap items-center justify-center gap-3"
      >
        <span className="font-mono text-[11px] uppercase tracking-widest text-ui-gray">
          Powered by
        </span>
        {DATA_SOURCES.map((s) => (
          <span
            key={s}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-star"
          >
            {s}
          </span>
        ))}
      </motion.div>
    </motion.section>
  );
}

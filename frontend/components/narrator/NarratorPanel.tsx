"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Brain, CornerDownLeft, Sparkles } from "lucide-react";
import { TypewriterText } from "./TypewriterText";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fadeInUp, staggerContainer } from "@/components/SectionWrapper";
import { askNarrator } from "@/lib/api";
import { useLocation } from "@/lib/hooks/useLocation";

const AIOrb = dynamic(() => import("@/components/3d/AIOrb"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

const DEFAULT_MESSAGE =
  "Jupiter is rising in the eastern sky at 23° altitude. The ISS will cross your zenith in approximately 18 minutes. Tonight's observation score is 74/100 — excellent conditions after 22:00 local time.";

const SUGGESTIONS = [
  "When is the next ISS pass?",
  "Where is Jupiter right now?",
  "Is tonight good for stargazing?",
];

interface Entry {
  role: "user" | "ai";
  text: string;
}

export default function NarratorPanel() {
  const { location } = useLocation();
  const [entries, setEntries] = useState<Entry[]>([{ role: "ai", text: DEFAULT_MESSAGE }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const send = async (raw: string) => {
    const query = raw.trim();
    if (!query || thinking) return;
    setInput("");
    setEntries((e) => [...e, { role: "user", text: query }]);
    setThinking(true);

    const res = await askNarrator({
      query,
      lat: location.lat,
      lon: location.lon,
      timestamp: new Date().toISOString(),
    });

    setThinking(false);
    setEntries((e) => [...e, { role: "ai", text: res.text }]);
    requestAnimationFrame(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  return (
    <motion.section
      id="narrator"
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      className="relative mx-auto w-full max-w-7xl scroll-mt-20 px-5 py-20 md:px-8 md:py-28"
    >
      <motion.div variants={fadeInUp} className="mb-8 flex flex-col gap-2">
        <span className="flex items-center gap-2 font-mono text-xs tracking-[0.25em] text-plasma">
          <Brain className="size-3.5" /> SECTION 02 · AI COSMIC NARRATOR
        </span>
        <h2 className="font-display text-3xl font-bold text-star sm:text-4xl md:text-5xl">
          Ask the Celestial Eye
        </h2>
        <p className="max-w-2xl text-ui-gray">
          The narrator translates raw telemetry and astronomical computation into plain language —
          ask anything about the sky above you.
        </p>
      </motion.div>

      <motion.div
        variants={fadeInUp}
        className="grid grid-cols-1 gap-5 lg:grid-cols-[30%_1fr]"
      >
        {/* AI brain orb */}
        <div className="glass relative flex min-h-[260px] flex-col items-center justify-center overflow-hidden rounded-2xl">
          <div className="absolute inset-0">
            <AIOrb />
          </div>
          <div className="pointer-events-none absolute bottom-4 left-0 right-0 text-center">
            <p className="font-mono text-[10px] tracking-[0.3em] text-plasma">NEURAL CORE</p>
            <p className="font-mono text-[10px] text-ui-gray">
              {thinking ? "processing query…" : "online · listening"}
            </p>
          </div>
        </div>

        {/* Terminal */}
        <div data-no-drag className="glass-strong flex flex-col overflow-hidden rounded-2xl">
          {/* Terminal title bar */}
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-alert/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-solar/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            <span className="ml-2 font-mono text-[11px] tracking-widest text-ui-gray">
              celestial-eye://narrator
            </span>
          </div>

          {/* Log */}
          <div
            ref={logRef}
            className="h-[320px] flex-1 space-y-4 overflow-y-auto p-5 font-mono text-sm leading-relaxed"
          >
            {entries.map((entry, i) => {
              const isLast = i === entries.length - 1;
              if (entry.role === "user") {
                return (
                  <p key={i} className="text-solar">
                    <span className="text-ui-gray">user@zenith ~ $ </span>
                    {entry.text}
                  </p>
                );
              }
              return (
                <p key={i} className="text-plasma/90">
                  <span className="mr-1 text-plasma">◈</span>
                  {isLast ? (
                    <TypewriterText text={entry.text} speed={60} />
                  ) : (
                    entry.text
                  )}
                </p>
              );
            })}
            {thinking && (
              <p className="flex items-center gap-2 text-ui-gray">
                <Sparkles className="size-3.5 animate-pulse text-plasma" />
                <span className="animate-pulse">analyzing telemetry…</span>
              </p>
            )}
          </div>

          {/* Suggestions */}
          <div className="flex flex-wrap gap-2 px-5 pb-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={thinking}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-ui-gray transition-colors hover:border-plasma/40 hover:text-plasma disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-white/10 p-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the Celestial Eye anything…"
              className="font-mono"
              disabled={thinking}
            />
            <Button type="submit" variant="primary" disabled={thinking || !input.trim()}>
              <CornerDownLeft className="size-4" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </form>
        </div>
      </motion.div>
    </motion.section>
  );
}

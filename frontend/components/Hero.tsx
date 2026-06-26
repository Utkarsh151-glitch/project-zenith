"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Telescope } from "lucide-react";
import { Button } from "@/components/ui/button";

const MiniEarth = dynamic(() => import("@/components/3d/MiniEarth"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

const TAGLINES = [
  "What is above you right now?",
  "When will the ISS pass your zenith?",
  "Is tonight perfect for stargazing?",
];

export default function Hero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % TAGLINES.length), 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 pt-24 text-center"
    >
      {/* Eyebrow */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-plasma shadow-plasma-sm" />
        <span className="font-mono text-xs tracking-[0.25em] text-ui-gray">
          ASTRALWEB&apos;26 · TEAM DO BRONXS
        </span>
      </motion.div>

      {/* Orbiting Earth visual */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none mb-2 h-56 w-full max-w-md sm:h-64 md:h-72"
      >
        <MiniEarth />
      </motion.div>

      {/* Wordmark */}
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="font-display text-[18vw] font-bold leading-none tracking-[0.12em] text-star text-glow-plasma sm:text-7xl md:text-8xl lg:text-9xl"
      >
        ZENITH
      </motion.h1>

      {/* Subheading */}
      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7 }}
        className="mt-5 max-w-xl text-balance text-base text-ui-gray sm:text-lg"
      >
        The Celestial Eye —{" "}
        <span className="text-star">AI-Powered Digital Observatory</span>
      </motion.p>

      {/* Cycling tagline */}
      <div className="mt-6 flex h-8 items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
            transition={{ duration: 0.5 }}
            className="font-mono text-sm text-plasma sm:text-base"
          >
            {TAGLINES[index]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.7 }}
        className="mt-10"
      >
        <Button asChild size="lg" variant="primary" data-no-drag>
          <a href="#observatory">
            <Telescope className="size-5" />
            Open Observatory
          </a>
        </Button>
      </motion.div>

      {/* Scroll hint */}
      <motion.a
        href="#observatory"
        aria-label="Scroll to observatory"
        data-no-drag
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-ui-gray"
      >
        <motion.span
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="block"
        >
          <ChevronDown size={26} />
        </motion.span>
      </motion.a>
    </section>
  );
}

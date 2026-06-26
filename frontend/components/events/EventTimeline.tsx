"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { EventCard } from "./EventCard";
import { fadeInUp, staggerContainer } from "@/components/SectionWrapper";
import { useEvents } from "@/lib/hooks/useSkyData";
import { useLocation } from "@/lib/hooks/useLocation";

export default function EventTimeline() {
  const { location } = useLocation();
  const { events } = useEvents(location.lat, location.lon);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: number) => {
    scrollerRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <motion.section
      id="events"
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      className="relative mx-auto w-full max-w-7xl scroll-mt-20 px-5 py-20 md:px-8 md:py-28"
    >
      <motion.div variants={fadeInUp} className="mb-8 flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-2 font-mono text-xs tracking-[0.25em] text-plasma">
            <CalendarClock className="size-3.5" /> SECTION 03 · UPCOMING EVENTS
          </span>
          <h2 className="font-display text-3xl font-bold text-star sm:text-4xl md:text-5xl">
            Celestial Events Timeline
          </h2>
          <p className="max-w-2xl text-ui-gray">
            Predicted flyovers, conjunctions and meteor peaks for your location — counting down in
            real time.
          </p>
        </div>
        <div className="hidden gap-2 md:flex">
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            data-no-drag
            className="rounded-full border border-white/10 bg-white/5 p-2.5 text-star transition-colors hover:border-plasma/50 hover:text-plasma"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            data-no-drag
            className="rounded-full border border-white/10 bg-white/5 p-2.5 text-star transition-colors hover:border-plasma/50 hover:text-plasma"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <div
          ref={scrollerRef}
          data-no-drag
          className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4"
        >
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </motion.div>
    </motion.section>
  );
}

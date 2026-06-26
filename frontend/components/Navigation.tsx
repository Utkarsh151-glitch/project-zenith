"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, X } from "lucide-react";
import { pingBackend } from "@/lib/api";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Observatory", href: "#observatory" },
  { label: "Sky Map", href: "#sky-map" },
  { label: "Events", href: "#events" },
  { label: "AI Narrator", href: "#narrator" },
  { label: "About", href: "#about" },
];

export default function Navigation() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [live, setLive] = useState(true);

  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 24);
  });

  useEffect(() => {
    let active = true;
    const check = async () => {
      const ok = await pingBackend();
      if (active) setLive(ok);
    };
    check();
    const id = setInterval(check, 30000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-all duration-300",
        scrolled
          ? "border-white/10 bg-space/60 backdrop-blur-xl shadow-glass"
          : "border-white/5 bg-white/[0.02] backdrop-blur-md",
      )}
    >
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 md:px-8">
        {/* Logo */}
        <a href="#top" className="group flex items-center gap-2">
          <span className="text-xl text-plasma transition-transform duration-300 group-hover:rotate-90">
            ⊕
          </span>
          <span className="font-display text-lg font-bold tracking-[0.2em] text-star">
            ZENITH
          </span>
        </a>

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="relative rounded-lg px-3 py-2 text-sm font-medium text-ui-gray transition-colors hover:text-star"
              >
                <span className="relative z-10">{link.label}</span>
              </a>
            </li>
          ))}
        </ul>

        {/* Right cluster */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 sm:flex">
            <span className="relative flex h-2 w-2">
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                  live ? "bg-emerald-400" : "bg-solar",
                )}
              />
              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  live ? "bg-emerald-400" : "bg-solar",
                )}
              />
            </span>
            <span className="font-mono text-xs tracking-widest text-star">
              {live ? "LIVE" : "MOCK"}
            </span>
          </div>

          <button
            aria-label="Toggle menu"
            data-no-drag
            className="rounded-lg p-2 text-star transition-colors hover:bg-white/10 md:hidden"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <motion.ul
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden border-t border-white/10 bg-space/80 backdrop-blur-xl md:hidden"
        >
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block px-6 py-3 text-sm text-ui-gray transition-colors hover:bg-white/5 hover:text-star"
              >
                {link.label}
              </a>
            </li>
          ))}
        </motion.ul>
      )}
    </motion.header>
  );
}

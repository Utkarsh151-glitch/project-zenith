"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { LocationProvider } from "@/lib/hooks/useLocation";

// The global 3D star field is heavy and browser-only — load it client-side and
// keep it mounted in the layout so it persists across every section/route.
const StarField = dynamic(() => import("@/components/3d/StarField"), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{ background: "radial-gradient(125% 125% at 50% 10%, #050D2E 0%, #03000A 55%)" }}
    />
  ),
});

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <LocationProvider>
      {/* Persistent interactive star field + nebula behind everything */}
      <StarField />
      {/* Subtle vignette layer to deepen the UI contrast */}
      <div aria-hidden className="vignette pointer-events-none fixed inset-0 z-0" />
      {/* Floating UI layer */}
      <div className="relative z-10">{children}</div>
    </LocationProvider>
  );
}

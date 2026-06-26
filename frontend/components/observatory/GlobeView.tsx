"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Globe2 } from "lucide-react";
import { LoadingOrbit } from "@/components/LoadingOrbit";
import { useSkyData } from "@/lib/hooks/useSkyData";
import { useISSTracker } from "@/lib/hooks/useISSTracker";
import { useLocation } from "@/lib/hooks/useLocation";
import type { LayerFilters } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Cesium: any;
    CESIUM_BASE_URL: string;
  }
}

const CESIUM_VERSION = "1.118";
const CDN = `https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VERSION}/Build/Cesium`;

/** Load the Cesium UMD bundle + CSS from the CDN exactly once. */
let cesiumPromise: Promise<any> | null = null;
function loadCesium(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.Cesium) return Promise.resolve(window.Cesium);
  if (cesiumPromise) return cesiumPromise;

  cesiumPromise = new Promise((resolve, reject) => {
    window.CESIUM_BASE_URL = `${CDN}/`;

    if (!document.getElementById("cesium-css")) {
      const link = document.createElement("link");
      link.id = "cesium-css";
      link.rel = "stylesheet";
      link.href = `${CDN}/Widgets/widgets.css`;
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.src = `${CDN}/Cesium.js`;
    script.async = true;
    script.onload = () => (window.Cesium ? resolve(window.Cesium) : reject(new Error("Cesium missing")));
    script.onerror = () => reject(new Error("Failed to load CesiumJS"));
    document.head.appendChild(script);
  });
  return cesiumPromise;
}

/** Convert local azimuth/altitude (degrees) to an ECEF Cartesian above an observer. */
function azAltToCartesian(C: any, lon: number, lat: number, az: number, alt: number, range: number) {
  const origin = C.Cartesian3.fromDegrees(lon, lat, 0);
  const transform = C.Transforms.eastNorthUpToFixedFrame(origin);
  const azR = C.Math.toRadians(az);
  const altR = C.Math.toRadians(alt);
  const local = new C.Cartesian3(
    Math.sin(azR) * Math.cos(altR) * range,
    Math.cos(azR) * Math.cos(altR) * range,
    Math.sin(altR) * range,
  );
  return C.Matrix4.multiplyByPoint(transform, local, new C.Cartesian3());
}

/** Generate a small glowing ISS billboard icon as a data URL. */
function makeISSIcon(): string {
  const s = 48;
  const cv = document.createElement("canvas");
  cv.width = s;
  cv.height = s;
  const ctx = cv.getContext("2d")!;
  ctx.translate(s / 2, s / 2);
  // glow
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s / 2);
  g.addColorStop(0, "rgba(0,229,255,0.9)");
  g.addColorStop(1, "rgba(0,229,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-s / 2, -s / 2, s, s);
  // body
  ctx.fillStyle = "#E8F4FF";
  ctx.fillRect(-3, -3, 6, 6);
  // solar panels
  ctx.fillStyle = "#00E5FF";
  ctx.fillRect(-12, -2, 7, 4);
  ctx.fillRect(5, -2, 7, 4);
  return cv.toDataURL();
}

export default function GlobeView({
  timestamp,
  filters,
}: {
  timestamp: number;
  filters: LayerFilters;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const issIconRef = useRef<string>("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const { location } = useLocation();
  const { sky, satellites } = useSkyData(location.lat, location.lon, timestamp);
  const { position: iss } = useISSTracker(location.lat, location.lon);

  // Initialise the viewer once.
  useEffect(() => {
    let cancelled = false;
    loadCesium()
      .then((C) => {
        if (cancelled || !containerRef.current || viewerRef.current) return;

        const token = process.env.NEXT_PUBLIC_CESIUM_TOKEN;
        if (token && token !== "your_cesium_token") C.Ion.defaultAccessToken = token;

        // Offline Natural Earth imagery — no Ion account required.
        const baseLayer = C.ImageryLayer.fromProviderAsync(
          C.TileMapServiceImageryProvider.fromUrl(
            C.buildModuleUrl("Assets/Textures/NaturalEarthII"),
          ),
          {},
        );

        const viewer = new C.Viewer(containerRef.current, {
          baseLayer,
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          selectionIndicator: false,
          infoBox: false,
          creditContainer: document.createElement("div"),
          contextOptions: { webgl: { alpha: true } },
        });

        issIconRef.current = makeISSIcon();

        // Transparent canvas so the page star field shows through behind Earth.
        viewer.scene.backgroundColor = C.Color.TRANSPARENT;
        viewer.scene.skyBox.show = false;
        viewer.scene.sun.show = true;
        viewer.scene.moon.show = false;
        viewer.scene.globe.baseColor = C.Color.fromCssColorString("#0a1330");
        viewer.scene.globe.showGroundAtmosphere = true;
        viewer.scene.highDynamicRange = false;
        viewer.canvas.setAttribute("data-cesium", "");

        viewer.camera.flyTo({
          destination: C.Cartesian3.fromDegrees(location.lon, location.lat, 1.4e7),
          duration: 0,
        });

        viewerRef.current = viewer;
        if (!cancelled) setStatus("ready");
      })
      .catch((err) => {
        console.warn("[GlobeView]", err);
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      if (viewerRef.current && !viewerRef.current.isDestroyed?.()) {
        viewerRef.current.destroy();
      }
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fly the camera when the observer location changes.
  useEffect(() => {
    const C = window.Cesium;
    const viewer = viewerRef.current;
    if (!C || !viewer || status !== "ready") return;
    viewer.camera.flyTo({
      destination: C.Cartesian3.fromDegrees(location.lon, location.lat, 1.2e7),
      duration: 1.6,
    });
  }, [location.lat, location.lon, status]);

  // Rebuild overlay entities when data or filters change.
  useEffect(() => {
    const C = window.Cesium;
    const viewer = viewerRef.current;
    if (!C || !viewer || status !== "ready") return;

    viewer.entities.removeAll();
    const cyan = C.Color.fromCssColorString("#00E5FF");
    const space = C.Color.fromCssColorString("#03000A");
    const starWhite = C.Color.fromCssColorString("#E8F4FF");

    // Shared, high-legibility label style: dark outline + translucent plate so
    // names read clearly against both the bright Earth and deep space, and fade
    // gracefully as the camera pulls away to avoid clutter.
    const labelBase = {
      font: "11px 'JetBrains Mono', monospace",
      style: C.LabelStyle.FILL_AND_OUTLINE,
      outlineColor: space.withAlpha(0.95),
      outlineWidth: 3,
      showBackground: true,
      backgroundColor: space.withAlpha(0.5),
      backgroundPadding: new C.Cartesian2(6, 3),
      verticalOrigin: C.VerticalOrigin.BOTTOM,
      pixelOffset: new C.Cartesian2(0, -12),
      translucencyByDistance: new C.NearFarScalar(3.0e6, 1.0, 6.0e7, 0.3),
    };

    // Zenith observation cone projected upward in the local ENU frame.
    const coneLength = 1.6e6;
    viewer.entities.add({
      position: C.Cartesian3.fromDegrees(location.lon, location.lat, coneLength / 2),
      cylinder: {
        length: coneLength,
        topRadius: coneLength * 0.55,
        bottomRadius: 0,
        material: cyan.withAlpha(0.12),
        outline: true,
        outlineColor: cyan.withAlpha(0.5),
        numberOfVerticalLines: 8,
      },
    });
    // Observer marker.
    viewer.entities.add({
      position: C.Cartesian3.fromDegrees(location.lon, location.lat, 0),
      point: { pixelSize: 9, color: cyan, outlineColor: C.Color.WHITE, outlineWidth: 1 },
      label: { ...labelBase, text: location.label, fillColor: starWhite, pixelOffset: new C.Cartesian2(0, -16) },
    });

    // Satellites: faint orbital paths for context + named markers for the
    // satellites currently above the observer (so the view stays readable).
    if (filters.satellites) {
      if (satellites?.tracks) {
        const glow = new C.PolylineGlowMaterialProperty({
          glowPower: 0.15,
          color: cyan.withAlpha(0.5),
        });
        for (const track of satellites.tracks) {
          const positions = track.track.map(([lon, lat]) =>
            C.Cartesian3.fromDegrees(lon, lat, 5.5e5),
          );
          viewer.entities.add({
            polyline: { positions, width: 1.5, material: glow, arcType: C.ArcType.GEODESIC },
          });
        }
      }

      const overhead = (satellites?.objects ?? [])
        .filter((o) => o.altitude > 0)
        .sort((a, b) => b.altitude - a.altitude)
        .slice(0, 7);
      const satRange = 1.7e6;
      for (const sat of overhead) {
        const pos = azAltToCartesian(C, location.lon, location.lat, sat.azimuth, sat.altitude, satRange);
        viewer.entities.add({
          position: pos,
          point: { pixelSize: 5, color: cyan, outlineColor: space.withAlpha(0.8), outlineWidth: 1 },
          label: {
            ...labelBase,
            text: sat.name,
            fillColor: cyan,
            font: "10px 'JetBrains Mono', monospace",
            pixelOffset: new C.Cartesian2(0, -10),
          },
        });
      }
    }

    // ISS billboard + label.
    if (filters.iss && iss) {
      viewer.entities.add({
        position: C.Cartesian3.fromDegrees(iss.lon, iss.lat, 4.2e5),
        billboard: {
          image: issIconRef.current,
          scale: 0.9,
          verticalOrigin: C.VerticalOrigin.CENTER,
        },
        label: {
          ...labelBase,
          text: "ISS",
          font: "bold 12px 'JetBrains Mono', monospace",
          fillColor: cyan,
          pixelOffset: new C.Cartesian2(0, -22),
        },
      });
      // Faint ISS ground track ellipse for context.
      viewer.entities.add({
        position: C.Cartesian3.fromDegrees(iss.lon, iss.lat, 4.2e5),
        point: { pixelSize: 6, color: cyan.withAlpha(0.5) },
      });
    }

    // Constellation line overlay in the observer's local sky.
    if (filters.constellations && sky?.constellations) {
      const range = 2.2e6;
      for (const con of sky.constellations) {
        const pts = con.stars.map((st) =>
          azAltToCartesian(C, location.lon, location.lat, st.az, st.alt, range),
        );
        for (const [a, b] of con.lines) {
          viewer.entities.add({
            polyline: {
              positions: [pts[a], pts[b]],
              width: 1.5,
              material: C.Color.fromCssColorString("#E8F4FF").withAlpha(0.45),
            },
          });
        }
        // Star points.
        con.stars.forEach((st, idx) => {
          viewer.entities.add({
            position: pts[idx],
            point: {
              pixelSize: Math.max(3, 7 - st.mag),
              color: starWhite,
            },
          });
        });
        // Constellation name label at the star-cluster centroid.
        const centroid = pts.reduce(
          (acc, p) => {
            acc.x += p.x / pts.length;
            acc.y += p.y / pts.length;
            acc.z += p.z / pts.length;
            return acc;
          },
          new C.Cartesian3(0, 0, 0),
        );
        viewer.entities.add({
          position: centroid,
          label: {
            ...labelBase,
            text: con.name,
            fillColor: starWhite.withAlpha(0.92),
            verticalOrigin: C.VerticalOrigin.CENTER,
            pixelOffset: new C.Cartesian2(0, 0),
          },
        });
      }
    }

    // Planet billboards in the local sky.
    if (filters.planets && sky?.objects) {
      const range = 2.6e6;
      for (const obj of sky.objects.filter((o) => o.type === "planet" || o.type === "moon")) {
        if (obj.altitude < 0) continue;
        const pos = azAltToCartesian(C, location.lon, location.lat, obj.azimuth, obj.altitude, range);
        const color = C.Color.fromCssColorString(obj.color ?? "#FFD166");
        viewer.entities.add({
          position: pos,
          point: { pixelSize: 11, color, outlineColor: C.Color.WHITE.withAlpha(0.5), outlineWidth: 1 },
          label: { ...labelBase, text: obj.name, fillColor: color, pixelOffset: new C.Cartesian2(0, -14) },
        });
      }
    }
  }, [status, location.lat, location.lon, location.label, filters, satellites, sky, iss]);

  return (
    <div data-no-drag className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10">
      <div ref={containerRef} className="h-full w-full [&_.cesium-widget-credits]:hidden" />

      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-cosmic/40 backdrop-blur-sm">
          <LoadingOrbit size={56} />
          <p className="font-mono text-xs tracking-widest text-ui-gray">INITIALIZING GLOBE…</p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <AlertTriangle className="size-8 text-solar" />
          <p className="font-display text-sm text-star">3D globe unavailable</p>
          <p className="max-w-xs text-xs text-ui-gray">
            CesiumJS could not load (offline or WebGL disabled). All other observatory data
            remains live in the panels around this view.
          </p>
          <Globe2 className="size-16 text-white/10" />
        </div>
      )}

      {/* Corner HUD label */}
      {status === "ready" && (
        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-lg border border-white/10 bg-space/50 px-3 py-1.5 backdrop-blur-md">
          <Globe2 className="size-3.5 text-plasma" />
          <span className="font-mono text-[10px] tracking-widest text-ui-gray">
            CESIUM · ECEF VIEW
          </span>
        </div>
      )}
    </div>
  );
}

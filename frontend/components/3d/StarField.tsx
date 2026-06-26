"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* -------------------------------------------------------------------------- */
/* Shared interaction state (mutated outside React to avoid re-renders).       */
/* -------------------------------------------------------------------------- */

const pointer = {
  // smoothed parallax target from mouse position
  px: 0,
  py: 0,
  // accumulated drag rotation target
  dragX: 0,
  dragY: 0,
  dragging: false,
  lastX: 0,
  lastY: 0,
};

const STAR_COUNT = 8500;

/** Soft radial sprite used for the nebula clouds, generated on the client. */
function makeNebulaTexture(r: number, g: number, b: number) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, `rgba(${r},${g},${b},0.9)`);
  grd.addColorStop(0.35, `rgba(${r},${g},${b},0.35)`);
  grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const starVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vColor = aColor;
    // Per-star twinkle driven by a sine wave offset by the star's phase.
    float tw = 0.55 + 0.45 * sin(uTime * 1.6 + aPhase);
    vTwinkle = tw;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * tw * uPixelRatio * (260.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const starFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    // Soft circular point with a glowing core.
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, d);
    float core = smoothstep(0.25, 0.0, d) * 0.6;
    gl_FragColor = vec4(vColor + core, alpha * vTwinkle);
  }
`;

function Stars() {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { size, gl } = useThree();

  const { geometry, uniforms } = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const phases = new Float32Array(STAR_COUNT);
    const colors = new Float32Array(STAR_COUNT * 3);

    const palette = [
      new THREE.Color("#E8F4FF"), // star white (most common)
      new THREE.Color("#E8F4FF"),
      new THREE.Color("#Bcdfff"),
      new THREE.Color("#00E5FF"), // plasma cyan accents
      new THREE.Color("#FFD166"), // solar gold accents
      new THREE.Color("#c5a8ff"), // faint purple
    ];

    for (let i = 0; i < STAR_COUNT; i++) {
      // Distribute on a spherical shell around the camera at origin.
      const radius = 30 + Math.random() * 110;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      sizes[i] = 0.6 + Math.pow(Math.random(), 3) * 4.2; // mostly small, few large
      phases[i] = Math.random() * Math.PI * 2;

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));

    const u = {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
    };
    return { geometry: geo, uniforms: u };
  }, []);

  // Nebula clouds — large additive planes tinted with brand colors.
  const nebulae = useMemo(() => {
    const defs = [
      { tex: makeNebulaTexture(120, 40, 200), pos: [-40, 18, -70], scale: 130, op: 0.22 },
      { tex: makeNebulaTexture(0, 150, 255), pos: [55, -25, -85], scale: 150, op: 0.16 },
      { tex: makeNebulaTexture(60, 30, 120), pos: [10, 40, -100], scale: 170, op: 0.18 },
    ];
    return defs;
  }, []);

  useEffect(() => {
    uniforms.uPixelRatio.value = Math.min(gl.getPixelRatio(), 2);
  }, [gl, uniforms, size]);

  useFrame((state, delta) => {
    uniforms.uTime.value = state.clock.elapsedTime;

    const g = groupRef.current;
    if (!g) return;

    // Ease the group rotation toward (drag + parallax) targets. Polar (X) is
    // clamped so the user can only tilt the sky slightly.
    const targetY = pointer.dragX + pointer.px * 0.25;
    const targetX = THREE.MathUtils.clamp(pointer.dragY + pointer.py * 0.18, -0.4, 0.4);
    g.rotation.y += (targetY - g.rotation.y) * Math.min(1, delta * 3);
    g.rotation.x += (targetX - g.rotation.x) * Math.min(1, delta * 3);

    // Idle drift so the sky is always subtly alive.
    pointer.dragX += delta * 0.012;
  });

  return (
    <group ref={groupRef}>
      <points geometry={geometry}>
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={starVertexShader}
          fragmentShader={starFragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {nebulae.map((n, i) => (
        <NebulaCloud key={i} {...n} index={i} />
      ))}
    </group>
  );
}

function NebulaCloud({
  tex,
  pos,
  scale,
  op,
  index,
}: {
  tex: THREE.Texture;
  pos: number[];
  scale: number;
  op: number;
  index: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    m.rotation.z = t * 0.01 * (index % 2 === 0 ? 1 : -1);
    m.position.x = pos[0] + Math.sin(t * 0.05 + index) * 4;
    m.position.y = pos[1] + Math.cos(t * 0.04 + index) * 3;
  });
  return (
    <mesh ref={ref} position={pos as [number, number, number]}>
      <planeGeometry args={[scale, scale]} />
      <meshBasicMaterial
        map={tex}
        transparent
        opacity={op}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Attaches window-level pointer listeners (mouse only, to preserve scroll). */
function useGlobalPointer() {
  useEffect(() => {
    const isInteractive = (el: EventTarget | null) =>
      el instanceof Element &&
      el.closest(
        'button, a, input, textarea, select, [role="slider"], [data-no-drag], canvas[data-cesium]',
      );

    const onMove = (e: PointerEvent) => {
      pointer.px = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.py = -((e.clientY / window.innerHeight) * 2 - 1);
      if (pointer.dragging) {
        const dx = e.clientX - pointer.lastX;
        const dy = e.clientY - pointer.lastY;
        pointer.dragX += dx * 0.0022;
        pointer.dragY += dy * 0.0022;
        pointer.lastX = e.clientX;
        pointer.lastY = e.clientY;
      }
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return; // touch keeps native scroll
      if (isInteractive(e.target)) return;
      pointer.dragging = true;
      pointer.lastX = e.clientX;
      pointer.lastY = e.clientY;
    };
    const onUp = () => {
      pointer.dragging = false;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);
}

function PointerBridge() {
  useGlobalPointer();
  return null;
}

export default function StarField() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{ background: "radial-gradient(125% 125% at 50% 10%, #050D2E 0%, #03000A 55%)" }}
    >
      <Canvas
        camera={{ position: [0, 0, 0.1], fov: 75, near: 0.1, far: 400 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <PointerBridge />
        <Stars />
        <fog attach="fog" args={["#03000A", 90, 240]} />
      </Canvas>
    </div>
  );
}

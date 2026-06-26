"use client";

/* drei's MeshDistortMaterial has no exported instance type; ref is loosely typed. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import * as THREE from "three";

function Brain() {
  const mesh = useRef<THREE.Mesh>(null);
  const matRef = useRef<any>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (mesh.current) {
      mesh.current.rotation.y = t * 0.25;
      mesh.current.rotation.z = Math.sin(t * 0.3) * 0.15;
    }
    if (matRef.current) {
      // Slowly cycle the emissive between plasma cyan and nebula violet.
      const hue = 0.5 + Math.sin(t * 0.25) * 0.08;
      matRef.current.emissive = new THREE.Color().setHSL(hue, 1, 0.55);
      matRef.current.distort = 0.32 + Math.sin(t * 0.8) * 0.12;
    }
  });

  return (
    <Float speed={1.4} rotationIntensity={0.6} floatIntensity={0.8}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.25, 12]} />
        <MeshDistortMaterial
          ref={matRef}
          color="#0a1140"
          emissive="#00E5FF"
          emissiveIntensity={0.9}
          roughness={0.15}
          metalness={0.6}
          distort={0.35}
          speed={2.2}
        />
      </mesh>

      {/* Inner glow core */}
      <mesh scale={0.55}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#00E5FF" transparent opacity={0.35} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Outer atmosphere halo */}
      <mesh scale={1.7}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#9b6bff"
          transparent
          opacity={0.07}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </Float>
  );
}

export default function AIOrb() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.2], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 3, 3]} intensity={3} color="#00E5FF" />
      <pointLight position={[-3, -2, 1]} intensity={2} color="#9b6bff" />
      <Brain />
      <Sparkles count={60} scale={5} size={2.4} speed={0.4} color="#00E5FF" opacity={0.7} />
    </Canvas>
  );
}

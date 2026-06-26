"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function HoloEarth() {
  const earth = useRef<THREE.Mesh>(null);
  const wire = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (earth.current) earth.current.rotation.y += delta * 0.18;
    if (wire.current) wire.current.rotation.y -= delta * 0.06;
  });
  return (
    <group>
      {/* Solid ocean body */}
      <mesh ref={earth}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color="#0a1f4d"
          emissive="#04122e"
          emissiveIntensity={0.6}
          roughness={0.45}
          metalness={0.2}
        />
      </mesh>
      {/* Holographic cyan wireframe overlay */}
      <mesh ref={wire} scale={1.004}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#00E5FF" wireframe transparent opacity={0.18} />
      </mesh>
      {/* Atmosphere rim glow */}
      <mesh scale={1.18}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial
          color="#00E5FF"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function OrbitingISS() {
  const ring = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ring.current) ring.current.rotation.z += delta * 0.9;
  });
  return (
    <group rotation={[Math.PI / 2.6, 0.2, 0]}>
      {/* Orbit path */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.7, 0.006, 12, 120]} />
        <meshBasicMaterial color="#00E5FF" transparent opacity={0.35} />
      </mesh>
      {/* ISS marker travelling along the orbit */}
      <group ref={ring}>
        <group position={[1.7, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.12, 0.05, 0.05]} />
            <meshStandardMaterial color="#E8F4FF" emissive="#00E5FF" emissiveIntensity={2} />
          </mesh>
          {/* solar panels */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.04, 0.02, 0.22]} />
            <meshStandardMaterial color="#1a2a6c" emissive="#FFD166" emissiveIntensity={0.6} />
          </mesh>
          <pointLight color="#00E5FF" intensity={6} distance={2.5} />
        </group>
      </group>
    </group>
  );
}

export default function MiniEarth() {
  return (
    <Canvas
      camera={{ position: [0, 0.4, 4.6], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 2, 4]} intensity={1.6} color="#E8F4FF" />
      <pointLight position={[-3, -1, -2]} intensity={1.2} color="#9b6bff" />
      <HoloEarth />
      <OrbitingISS />
    </Canvas>
  );
}

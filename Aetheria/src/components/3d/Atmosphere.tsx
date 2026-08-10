import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cloud, Stars, Environment } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Optimized Atmospheric celestial cosmos lighting:
 * - High-performance 1024x1024 shadow map with tight frustum and minimal GPU draw passes.
 * - Environment preset "apartment" with background={false} for crisp PBR reflections.
 * - Drifting celestial clouds and lightweight particle motes.
 */
export default function Atmosphere(): React.ReactElement {
  const particlesRef = useRef<THREE.Points>(null);

  // Lightweight particle motes (90 particles for minimal CPU update cost)
  const particleCount = 90;
  const particlePositions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 90;
      pos[i * 3 + 1] = Math.random() * 20 + 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      const time = state.clock.getElapsedTime() * 0.12;
      particlesRef.current.rotation.y = time * 0.03;
    }
  });

  return (
    <>
      {/* 3D Cosmic Space Background & Atmospheric Fog */}
      <color attach="background" args={['#070d18']} />
      <fog attach="fog" args={['#070d18', 90, 320]} />

      {/* ── Environment Reflections (background=false) ── */}
      <Environment preset="apartment" background={false} />

      {/* High-efficiency Ambient Illumination */}
      <ambientLight intensity={1.4} color="#ffffff" />

      {/* Primary Key Sun Light with Optimized 1024 Shadow Map */}
      <directionalLight
        position={[25, 42, 20]}
        intensity={2.4}
        castShadow
        color="#fff8eb"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={100}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-bias={-0.0004}
      />

      {/* Cool Sky Fill Light (No Shadows = 60 FPS) */}
      <directionalLight
        position={[-20, 25, -20]}
        intensity={1.0}
        color="#38bdf8"
      />

      {/* Top Ambient Bounce */}
      <directionalLight
        position={[0, 30, 0]}
        intensity={0.6}
        color="#f1f5f9"
      />

      {/* Starfield in high celestial dome */}
      <Stars radius={95} depth={40} count={2000} factor={3} saturation={1} fade speed={0.8} />

      {/* Drifting Clouds beneath the islands */}
      <group position={[0, -14, 0]}>
        <Cloud
          opacity={0.3}
          speed={0.12}
          segments={10}
          color="#0f172a"
        />
      </group>

      {/* Floating Dust / Pollen Motes */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.12}
          color="#38bdf8"
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  );
}

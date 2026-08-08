import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cloud, Stars, Environment } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Atmospheric celestial cosmos lighting:
 * - Rich deep cosmic background '#070d18' (preventing bright white HDRI background overrides).
 * - Environment preset "apartment" for realistic PBR metalness & gloss reflections (with background={false}).
 * - 3-point daylight balance (key sun, cool sky fill, top ambient bounce).
 * - Drifting celestial ether clouds beneath the islands and gentle floating firefly pollen.
 */
export default function Atmosphere(): React.ReactElement {
  const particlesRef = useRef<THREE.Points>(null);

  // Generate hovering dust & pollen motes around the archipelago
  const particleCount = 160;
  const particlePositions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 110;
      pos[i * 3 + 1] = Math.random() * 24 + 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 110;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      const time = state.clock.getElapsedTime() * 0.15;
      particlesRef.current.rotation.y = time * 0.04;
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += Math.sin(time + i) * 0.005;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <>
      {/* 3D Cosmic Space Background & Distant Atmospheric Fog */}
      <color attach="background" args={['#070d18']} />
      <fog attach="fog" args={['#070d18', 80, 350]} />

      {/* ── Environment Reflections (background=false to prevent white apartment photo override) ── */}
      <Environment preset="apartment" background={false} />

      {/* Natural Ambient Illumination */}
      <ambientLight intensity={1.3} color="#ffffff" />

      {/* Primary Key Sun Light with Crisp Shadows */}
      <directionalLight
        position={[25, 45, 20]}
        intensity={2.6}
        castShadow
        color="#fff8eb"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={120}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-bias={-0.0001}
      />

      {/* Cool Sky Fill Light */}
      <directionalLight
        position={[-20, 25, -20]}
        intensity={1.1}
        color="#38bdf8"
      />

      {/* Top Ambient Bounce */}
      <directionalLight
        position={[0, 30, 0]}
        intensity={0.7}
        color="#f1f5f9"
      />

      {/* Starfield in high celestial dome */}
      <Stars radius={95} depth={45} count={2800} factor={4} saturation={1} fade speed={1.2} />

      {/* Drifting Clouds beneath the islands at Y = -14 */}
      <group position={[0, -14, 0]}>
        <Cloud
          opacity={0.35}
          speed={0.15}
          segments={15}
          color="#0f172a"
        />
      </group>
      <group position={[-22, -18, 12]}>
        <Cloud
          opacity={0.25}
          speed={0.2}
          segments={12}
          color="#1e293b"
        />
      </group>

      {/* Magical Floating Pollen & Fireflies */}
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
          size={0.35}
          color="#38bdf8"
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </>
  );
}

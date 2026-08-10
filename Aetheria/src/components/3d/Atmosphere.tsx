import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cloud, Stars, Environment } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Luminous Atmospheric celestial cosmos lighting:
 * - Bright ambient and directional lighting ensuring clear visibility.
 * - Soft sky bounce and warm celestial sun.
 * - Drifting clouds and particles.
 */
export default function Atmosphere(): React.ReactElement {
  const particlesRef = useRef<THREE.Points>(null);

  // Lightweight particle motes
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
      {/* Rich Celestial Cosmic Sky & Open Fog */}
      <color attach="background" args={['#101e38']} />
      <fog attach="fog" args={['#101e38', 140, 450]} />

      {/* ── Environment Reflections ── */}
      <Environment preset="apartment" background={false} />

      {/* Bright Primary Ambient Illumination */}
      <ambientLight intensity={2.6} color="#ffffff" />

      {/* Primary Key Sun Light with Warm Luminous Gold */}
      <directionalLight
        position={[25, 42, 20]}
        intensity={3.8}
        castShadow
        color="#fffbf0"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={100}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-bias={-0.0004}
      />

      {/* Vibrant Cyan Sky Fill Light (Brightens all shadows) */}
      <directionalLight
        position={[-20, 25, -20]}
        intensity={2.2}
        color="#38bdf8"
      />

      {/* Soft Top Sky Bounce */}
      <directionalLight
        position={[0, 30, 0]}
        intensity={1.4}
        color="#f8fafc"
      />

      {/* High Celestial Dome Starfield */}
      <Stars radius={95} depth={40} count={2200} factor={3.5} saturation={1} fade speed={0.8} />

      {/* Drifting Clouds beneath the archipelago */}
      <group position={[0, -14, 0]}>
        <Cloud
          opacity={0.35}
          speed={0.12}
          segments={10}
          color="#1e293b"
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
          size={0.14}
          color="#38bdf8"
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  );
}

'use client';

import React, { useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import WorldScene from './WorldScene';
import CharacterController from './CharacterController';

/**
 * IslandCanvas
 * 
 * Root 3D WebGL Canvas entry point for Aetheria.
 * 
 * Architecture & Performance Highlights:
 * - High-Performance WebGL: Configured with dpr=1, powerPreference='high-performance', ACESFilmic tonemapping.
 * - Rapier 3D Physics: Runs an asynchronous, deterministic physics world at locked 60Hz.
 * - Zero Shadow Overheads: Global atmospheric lighting uses baked-feel directional & hemisphere lights without expensive shadow map passes.
 * - Dynamic Sky & Stars: Drei Sky & lightweight procedural starfield creating a moody twilight graveyard atmosphere.
 */
export default function IslandCanvas(): React.ReactElement {
  const playerPosRef = useRef<THREE.Vector3 | null>(null);

  return (
    <Canvas
      dpr={1}
      camera={{ position: [0, 2, 17.2], fov: 45, far: 400 }}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15
      }}
      performance={{ min: 0.5 }}
    >
      {/* ── Dark Night Sky Background ── */}
      <color attach="background" args={['#0c0817']} />

      {/* ── Dramatic Sunset Sky Dome ── */}
      <Sky
        distance={450000}
        sunPosition={[-80, 4, -90]}
        inclination={0.52}
        azimuth={0.25}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
        rayleigh={3.8}
        turbidity={10}
      />

      {/* ── Lightweight Twilight Stars ── */}
      <Stars radius={90} depth={40} count={500} factor={3.0} saturation={1} fade speed={0.4} />

      {/* ── High-Performance Global Lighting (No heavy shadow buffers) ── */}
      <directionalLight position={[-40, 14, -50]} intensity={2.2} color="#ff7336" />
      <directionalLight position={[35, 20, 40]} intensity={0.9} color="#8b5cf6" />
      <ambientLight intensity={0.7} color="#4c1d95" />
      <hemisphereLight args={['#f59e0b', '#0c0817', 1.0]} />

      {/* ── High-Speed Rapier 3D Physics Simulation with Fixed 60Hz Timestep ── */}
      <Suspense fallback={null}>
        <Physics gravity={[0, -19.6, 0]} timeStep={1 / 60} interpolate={true}>
          {/* Seamless Solid Ground Foundation aligned with surface plane (Y=0.55) */}
          <RigidBody type="fixed" colliders={false} position={[0, -4.45, 0]}>
            <CuboidCollider args={[45, 5.0, 45]} friction={0.8} />
          </RigidBody>

          {/* 379 Optimized Modular Map Objects */}
          <WorldScene playerPosRef={playerPosRef} />

          {/* 3rd-Person Playable Animated Character */}
          <CharacterController playerPosRef={playerPosRef} spawnPoint={[0.0, 1.4, 14.0]} />
        </Physics>
      </Suspense>
    </Canvas>
  );
}

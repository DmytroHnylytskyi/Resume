'use client';

import React, { useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
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
 * - Dual-Theme Atmosphere: Switches between moody twilight graveyard and sunlit daytime island.
 */
export default function IslandCanvas(): React.ReactElement {
  const playerPosRef = useRef<THREE.Vector3 | null>(null);
  const { theme } = useGameStore();
  const isLight = theme === 'light';

  return (
    <Canvas
      dpr={1}
      camera={{ position: [-18, 22, 36], fov: 45, far: 400 }}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: isLight ? 1.05 : 1.15
      }}
      performance={{ min: 0.5 }}
    >
      {/* ── Sky Background ── */}
      <color attach="background" args={[isLight ? '#dbeafe' : '#0c0817']} />

      {/* ── Dynamic Sky Dome ── */}
      <Sky
        distance={450000}
        sunPosition={isLight ? [50, 70, 40] : [-80, 4, -90]}
        inclination={isLight ? 0.6 : 0.52}
        azimuth={0.25}
        mieCoefficient={isLight ? 0.002 : 0.005}
        mieDirectionalG={0.8}
        rayleigh={isLight ? 0.8 : 3.8}
        turbidity={isLight ? 2 : 10}
      />

      {/* ── Lightweight Twilight Stars (Dark theme only) ── */}
      {!isLight && (
        <Stars radius={90} depth={40} count={500} factor={3.0} saturation={1} fade speed={0.4} />
      )}

      {/* ── High-Performance Global Lighting ── */}
      {isLight ? (
        <>
          <directionalLight position={[40, 50, 30]} intensity={2.6} color="#fffbeb" />
          <directionalLight position={[-30, 30, -30]} intensity={1.2} color="#93c5fd" />
          <ambientLight intensity={1.0} color="#f8fafc" />
          <hemisphereLight args={['#bae6fd', '#cbd5e1', 1.2]} />
        </>
      ) : (
        <>
          <directionalLight position={[-40, 14, -50]} intensity={2.2} color="#ff7336" />
          <directionalLight position={[35, 20, 40]} intensity={0.9} color="#8b5cf6" />
          <ambientLight intensity={0.7} color="#4c1d95" />
          <hemisphereLight args={['#f59e0b', '#0c0817', 1.0]} />
        </>
      )}

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

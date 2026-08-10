'use client';

import React, { useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import Atmosphere from './Atmosphere';
import WorldScene from './WorldScene';
import CharacterController from './CharacterController';
import CameraNavigationController from './CameraNavigationController';
import rawIslandSceneData from '../../data/islandScene.json';
import { IslandSceneData } from '../../types/scene';
import { useGameStore } from '../../store/useGameStore';

const islandSceneData = rawIslandSceneData as unknown as IslandSceneData;

/**
 * Full-screen WebGL Canvas Container:
 * - Resilient independent Suspense boundaries for Atmosphere, World, and Avatar.
 * - Dynamic Day/Night atmosphere with high-performance 3-point lighting.
 * - Seamless switching between 3rd-Person Cyber Avatar and Cinematic Flight Camera.
 */
export default function IslandCanvas(): React.ReactElement {
  const playerPosRef = useRef<THREE.Vector3 | null>(null);
  const { cameraMode } = useGameStore();

  // Safe spawn position on the central island lawn
  const spawnPoint: [number, number, number] = islandSceneData.spawnPoint || [0.5, 9.8, -0.5];

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [14, 12, 18], fov: 45, far: 1000 }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
        depth: true,
        stencil: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15
      }}
    >
      <AdaptiveDpr pixelated />

      {/* Atmosphere & Celestial Lighting */}
      <Suspense fallback={null}>
        <Atmosphere />
      </Suspense>

      {/* ── Rapier 3D Physics Simulation ── */}
      <Physics gravity={[0, -19.6, 0]}>
        {/* Walkable Archipelago Terrain, Bridges, Stairs, and Props */}
        <Suspense fallback={null}>
          <WorldScene playerPosRef={playerPosRef} />
        </Suspense>

        {/* 3rd Person Character Controller */}
        {cameraMode === 'third_person' && (
          <Suspense fallback={null}>
            <CharacterController
              playerPosRef={playerPosRef}
              spawnPoint={spawnPoint}
            />
          </Suspense>
        )}
      </Physics>

      {/* Cinematic Drone / Flight Navigation Mode (from 3D Furniture Store) */}
      {cameraMode === 'bird_eye' && (
        <CameraNavigationController
          initialPosition={[18, 14, 22]}
          targetPosition={[0, 6, 0]}
        />
      )}
    </Canvas>
  );
}

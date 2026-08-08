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
 * - High-performance WebGL options ported from 3D Furniture Configurator.
 * - Dynamic Day/Night atmosphere with Environment preset "apartment".
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
      <Atmosphere />

      {/* ── Rapier 3D Physics Simulation ── */}
      <Suspense fallback={null}>
        <Physics gravity={[0, -19.6, 0]}>
          {/* Walkable Archipelago Terrain, Bridges, Stairs, and Props */}
          <WorldScene playerPosRef={playerPosRef} />

          {/* 3rd Person Character Controller */}
          {cameraMode === 'third_person' && (
            <CharacterController
              playerPosRef={playerPosRef}
              spawnPoint={spawnPoint}
            />
          )}
        </Physics>
      </Suspense>

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

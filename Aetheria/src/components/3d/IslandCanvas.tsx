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
 * High-Performance Full-Screen WebGL Canvas Container:
 * - DPR calibrated to [1, 1.5] for buttery-smooth 60+ FPS on all displays.
 * - Interpolated physics loop (timeStep="vary") for zero micro-stutters.
 * - Independent Suspense boundaries.
 */
export default function IslandCanvas(): React.ReactElement {
  const playerPosRef = useRef<THREE.Vector3 | null>(null);
  const { cameraMode } = useGameStore();

  // Safe spawn position on the central island lawn
  const spawnPoint: [number, number, number] = islandSceneData.spawnPoint || [0.5, 9.8, -0.5];

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [14, 12, 18], fov: 45, far: 500 }}
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

      {/* ── High-Speed Rapier 3D Physics Simulation (60+ FPS) ── */}
      <Physics gravity={[0, -19.6, 0]} timeStep="vary" interpolate={true}>
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

      {/* Cinematic Drone / Flight Navigation Mode */}
      {cameraMode === 'bird_eye' && (
        <CameraNavigationController
          initialPosition={[18, 14, 22]}
          targetPosition={[0, 6, 0]}
        />
      )}
    </Canvas>
  );
}

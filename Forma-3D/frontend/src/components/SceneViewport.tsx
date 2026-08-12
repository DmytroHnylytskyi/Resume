'use client';

/**
 * @file SceneViewport.tsx
 * @module components/SceneViewport
 * @description Dedicated, memoized WebGL 3D Canvas Viewport component.
 * Isolates 3D scene rendering, environment presets, Unreal Engine style camera controls,
 * surface snap placement ghosts, and placed 3D objects from 2D DOM React UI re-renders (language changes, modals, search inputs).
 * 
 * @author 3D Furniture Configurator Team
 */

import { memo, Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, AdaptiveDpr } from '@react-three/drei';
import { useStore } from '../store/useStore';
import PlaceableObject from './PlaceableObject';
import CameraNavigationController from './CameraNavigationController';
import InteractivePlacementGhost from './InteractivePlacementGhost';

/**
 * 3D Scene Content Container.
 * Subscribes to 3D scene state in Zustand and renders environment & object nodes.
 */
function SceneContent() {
  const lightMode = useStore((state) => state.lightMode);
  const snapToGrid = useStore((state) => state.snapToGrid);
  const placedObjects = useStore((state) => state.placedObjects);

  return (
    <>
      {/* Adaptive Pixel Ratio for 60 FPS lock during fast camera rotations */}
      <AdaptiveDpr pixelated />

      {/* Dynamic 3D Scene Background & Infinite Atmosphere Fog */}
      <color attach="background" args={[lightMode === 'day' ? '#142721' : '#020608']} />
      <fog attach="fog" args={[lightMode === 'day' ? '#142721' : '#020608', 120, 500]} />

      {/* Day / Night Dynamic Lighting Config */}
      {lightMode === 'day' ? (
        <>
          <ambientLight intensity={1.4} color="#ffffff" />
          <directionalLight 
            position={[25, 45, 20]} 
            intensity={2.8} 
            castShadow 
            color="#fff8eb" 
            shadow-mapSize={[1024, 1024]}
            shadow-camera-far={80}
            shadow-camera-left={-35}
            shadow-camera-right={35}
            shadow-camera-top={35}
            shadow-camera-bottom={-35}
            shadow-bias={-0.0001}
          />
          <directionalLight position={[-20, 25, -20]} intensity={1.2} color="#e0f2fe" />
          <directionalLight position={[0, 30, 0]} intensity={0.8} color="#f1f5f9" />
          <Environment preset="apartment" />
        </>
      ) : (
        <>
          <ambientLight intensity={0.18} color="#1e293b" />
          <directionalLight 
            position={[15, 25, 10]} 
            intensity={0.6} 
            color="#38bdf8" 
            castShadow 
            shadow-mapSize={[1024, 1024]}
            shadow-camera-far={60}
          />
          <directionalLight position={[-10, 10, -10]} intensity={0.2} color="#1e1b4b" />
          <Environment preset="night" />
        </>
      )}

      {/* 3D Floor Grid Visualizer (Expanded 60x60m area with 0.5m grid step) */}
      {snapToGrid && (
        <gridHelper 
          args={[60, 120, lightMode === 'day' ? "#1ed760" : "#38bdf8", lightMode === 'day' ? "#0c3b28" : "#0f2942"]} 
          position={[0, -0.01, 0]} 
        />
      )}

      {/* Camera Navigation Controller (Unreal Engine 5 RMB + WASD Fly-cam) */}
      <CameraNavigationController />

      {/* Render Active 3D Objects & Placement Ghost */}
      <Suspense fallback={null}>
        <InteractivePlacementGhost />
        {placedObjects.map((obj) => (
          <PlaceableObject 
            key={obj.id} 
            id={obj.id}
            modelPath={obj.modelPath}
            scale={obj.scale}
            position={obj.position}
            rotation={obj.rotation}
            hiddenParts={obj.hiddenParts}
            objectColors={obj.colors}
          />
        ))}
      </Suspense>
    </>
  );
}

/**
 * SceneViewport Component.
 */
function SceneViewportComponent() {
  const setSelectedObjectId = useStore((state) => state.setSelectedObjectId);
  const setSelectedObjectPart = useStore((state) => state.setSelectedObjectPart);
  const setSelectedPart = useStore((state) => state.setSelectedPart);

  const handlePointerMissed = useCallback((e: MouseEvent | PointerEvent) => {
    if (e.type === 'click') {
      setSelectedObjectId(null);
      setSelectedObjectPart(null);
      setSelectedPart(null);
    }
  }, [setSelectedObjectId, setSelectedObjectPart, setSelectedPart]);

  return (
    <Canvas 
      camera={{ position: [8, 6, 8], fov: 45, far: 1000 }} 
      onPointerMissed={handlePointerMissed as any}
      dpr={[1, 2]}
      gl={{ 
        antialias: true, 
        alpha: false, 
        powerPreference: 'high-performance', 
        stencil: false, 
        depth: true 
      }}
    >
      <SceneContent />
    </Canvas>
  );
}

export default memo(SceneViewportComponent);

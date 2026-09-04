/**
 * @file Globe.jsx
 * @description Main React Three Fiber (R3F) WebGL Canvas entrypoint.
 * Mounts ambient/directional lights, OrbitControls, 3D Earth mesh, post-processing,
 * FPS counter, and dynamic camera Lerp controller.
 */

'use client';

import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import Earth from './Earth';
import Atmosphere from './Atmosphere';
import CountryBordersLayer from './CountryBordersLayer';
import useStore from '../../store/useStore';
import EarthquakeLayer from '../layers/EarthquakeLayer';
import FlightLayer from '../layers/FlightLayer';
import NeoLayer from '../layers/NeoLayer';
import WeatherLayer from '../layers/WeatherLayer';
import CapitalsLayer from '../layers/CapitalsLayer';
import PostProcessing from '../effects/PostProcessing';
import { latLngToVector3 } from '../../hooks/useGeoConvert';

/**
 * FPS Counter component measuring rendering performance and updating global Zustand store.
 * @returns {null}
 */
function FPSCounter() {
  const setFps = useStore((state) => state.setFps);
  const frames = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frames.current++;
    const time = performance.now();
    if (time >= lastTime.current + 1000) {
      setFps(Math.round((frames.current * 1000) / (time - lastTime.current)));
      frames.current = 0;
      lastTime.current = time;
    }
  });

  return null;
}

/**
 * Smooth Camera Controller interpolating 3D camera position towards targeted geographic coordinates.
 * @param {{controlsRef: React.RefObject}} props
 * @returns {null}
 */
function SmoothCameraController({ controlsRef }) {
  const cameraTarget = useStore((state) => state.cameraTarget);
  const { camera } = useThree();
  const targetVec = useRef(new THREE.Vector3());

  useFrame(() => {
    if (cameraTarget && controlsRef.current) {
      const { lat, lng, zoom = 2.2 } = cameraTarget;
      const [x, y, z] = latLngToVector3(lat, lng, zoom);
      targetVec.current.set(x, y, z);
      camera.position.lerp(targetVec.current, 0.05);
      controlsRef.current.update();
    }
  });

  return null;
}

/**
 * Root 3D WebGL Globe Canvas component.
 * @returns {JSX.Element} Fullscreen WebGL Canvas viewport.
 */
export default function Globe() {
  const autoRotate = useStore((state) => state.autoRotate);
  const setGlobeReady = useStore((state) => state.setGlobeReady);
  const controlsRef = useRef();

  useEffect(() => {
    setGlobeReady(true);
  }, [setGlobeReady]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0, touchAction: 'none' }}>
      <Canvas 
        dpr={[1, 1.5]}
        gl={{ 
          antialias: true, 
          alpha: false, 
          powerPreference: 'high-performance',
          stencil: false,
          depth: true
        }}
        camera={{ position: [0, 0, 2.5], fov: 45 }}
      >
        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} color="#ffffff" />
        
        {/* 3D Scene Layers */}
        <Suspense fallback={null}>
          <Earth />
          <Atmosphere />
          <CountryBordersLayer />
          <EarthquakeLayer />
          <FlightLayer />
          <WeatherLayer />
          <NeoLayer />
          <CapitalsLayer />
        </Suspense>

        {/* Cinematic PostProcessing (Bloom + Vignette) */}
        <PostProcessing />

        {/* Deep Space Starfield Background */}
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

        {/* Orbit Camera Controls */}
        <OrbitControls
          ref={controlsRef}
          autoRotate={autoRotate}
          autoRotateSpeed={0.3}
          enableZoom={true}
          minDistance={1.2}
          maxDistance={5}
          enablePan={false}
        />
        
        <SmoothCameraController controlsRef={controlsRef} />
        <FPSCounter />
      </Canvas>
    </div>
  );
}

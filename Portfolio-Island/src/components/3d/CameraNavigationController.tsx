'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import * as THREE from 'three';

interface CameraNavigationControllerProps {
  initialPosition?: [number, number, number];
  targetPosition?: [number, number, number];
}

/**
 * Cinematic Unreal Engine 5 style camera controller from 3D Furniture Configurator:
 * - Built on top of @react-three/drei CameraControls.
 * - Smooth velocity lerping for WASD flight (soft acceleration & deceleration).
 * - Elevation control (Q/E) and Shift speed boost.
 * - Smooth dampening for zero-jank orbit & pan.
 */
export default function CameraNavigationController({
  initialPosition = [14, 12, 18],
  targetPosition = [0, 6, 0]
}: CameraNavigationControllerProps): React.ReactElement {
  const controlsRef = useRef<CameraControls>(null);
  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3());
  const targetVelocity = useRef(new THREE.Vector3());

  // Initialize camera position on first mount
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.setLookAt(
        initialPosition[0],
        initialPosition[1],
        initialPosition[2],
        targetPosition[0],
        targetPosition[1],
        targetPosition[2],
        true
      );
    }
  }, [initialPosition, targetPosition]);

  // Keyboard event listeners for WASD, Q/E, and Shift
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      keys.current[e.code] = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('contextmenu', onContextMenu);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('contextmenu', onContextMenu);
    };
  }, []);

  // Frame loop for smooth velocity lerping
  useFrame((state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const k = keys.current;
    const boost = k['ShiftLeft'] || k['ShiftRight'] ? 2.2 : 1.0;
    const baseSpeed = 0.09 * delta * 60 * boost;

    let fwd = 0;
    let trk = 0;
    let elv = 0;

    if (k['KeyW'] || k['ArrowUp']) fwd += baseSpeed;
    if (k['KeyS'] || k['ArrowDown']) fwd -= baseSpeed;
    if (k['KeyD'] || k['ArrowRight']) trk += baseSpeed;
    if (k['KeyA'] || k['ArrowLeft']) trk -= baseSpeed;
    if (k['KeyE']) elv += baseSpeed;
    if (k['KeyQ']) elv -= baseSpeed;

    targetVelocity.current.set(trk, elv, fwd);
    velocity.current.lerp(targetVelocity.current, 0.15);

    if (velocity.current.lengthSq() > 0.00001) {
      controls.forward(velocity.current.z, false);
      controls.truck(velocity.current.x, velocity.current.y, false);
    }
  });

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      smoothTime={0.45}
      draggingSmoothTime={0.12}
      azimuthRotateSpeed={0.4}
      polarRotateSpeed={0.4}
      dollySpeed={0.5}
      truckSpeed={0.5}
      minDistance={1.0}
      maxDistance={250}
      maxPolarAngle={Math.PI * 0.92}
    />
  );
}

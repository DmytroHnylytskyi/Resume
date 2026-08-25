'use client';

/**
 * @file CameraNavigationController.tsx
 * @module components/CameraNavigationController
 * @description Cinematic Unreal Engine 5 style camera controller component built on top of `@react-three/drei` CameraControls.
 * Features smooth dampening lerp vectors for WASD flight, elevation control (Q/E), Shift speed boost,
 * and automatic bounding-box fitting (fitToBox) upon selecting objects in 3D space.
 * 
 * @author Forma-3D Team
 */

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

/**
 * Cinematic Silky-Smooth Camera Navigation Controller Component.
 * 
 * Key Features:
 * - `smoothTime = 0.45s` for zero-jank cinematic camera dampening.
 * - Velocity Lerping for WASD keyboard flight (soft acceleration & deceleration).
 * - Reduced rotate & zoom speed for precise, non-twitchy rotation.
 * - Auto-fit to box framing when clicking objects with safe matrix guards.
 * 
 * @returns {JSX.Element} CameraControls R3F element.
 */
export default function CameraNavigationController() {
  /** @type {React.RefObject<any>} Ref to underlying CameraControls instance */
  const controlsRef = useRef<any>(null);

  /** Extract Three.js scene instance from R3F context */
  const { scene } = useThree();

  /** Extract selected object UUID from Zustand store */
  const selectedObjectId = useStore((state) => state.selectedObjectId);

  /** @type {React.MutableRefObject<Record<string, boolean>>} Active key state map */
  const keys = useRef<Record<string, boolean>>({});

  /** @type {React.MutableRefObject<THREE.Vector3>} Velocity vector for camera movement interpolation */
  const velocity = useRef<THREE.Vector3>(new THREE.Vector3());

  /** @type {React.MutableRefObject<THREE.Vector3>} Target velocity vector derived from user key inputs */
  const targetVelocity = useRef<THREE.Vector3>(new THREE.Vector3());

  /**
   * Effect hook binding keyboard event listeners for WASD, Q/E, Shift flight controls,
   * and 'F' key to safely focus on the selected object.
   */
  useEffect(() => {
    /** @param {KeyboardEvent} e */
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      keys.current[e.code] = true;

      // 'F' key: Focus camera on currently selected object with safe bounding validation
      if (e.code === 'KeyF' && selectedObjectId && controlsRef.current) {
        let targetGroup: THREE.Object3D | null = null;
        scene.traverse((child: THREE.Object3D) => {
          if (child.userData && child.userData.id === selectedObjectId) {
            targetGroup = child;
          }
        });

        const finalTarget = targetGroup as THREE.Object3D | null;
        if (finalTarget) {
          try {
            const box = new THREE.Box3().setFromObject(finalTarget);
            if (!box.isEmpty() && isFinite(box.min.x) && isFinite(box.max.x)) {
              const size = new THREE.Vector3();
              box.getSize(size);
              if (size.lengthSq() > 0.001) {
                finalTarget.updateMatrixWorld(true);
                controlsRef.current.fitToBox(finalTarget, true, {
                  paddingLeft: 0.4,
                  paddingRight: 0.4,
                  paddingTop: 0.4,
                  paddingBottom: 0.4
                });
              }
            }
          } catch {
            // Safe guard against transient unmounted nodes
          }
        }
      }
    };

    /** @param {KeyboardEvent} e */
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    /** Prevents native right-click context menu when holding RMB for fly-cam */
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
  }, [selectedObjectId, scene]);

  /**
   * Per-frame animation loop hook for smooth velocity lerping.
   * Calculates WASD direction vectors and interpolates camera movement.
   */
  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const k = keys.current;
    const boost = k['ShiftLeft'] || k['ShiftRight'] ? 2.0 : 1.0;
    const baseSpeed = 0.08 * delta * 60 * boost;

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

    // Smoothly interpolate current velocity to target velocity (soft start & soft stop)
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
      minDistance={0.5}
      maxDistance={200}
      maxPolarAngle={Math.PI * 0.92}
    />
  );
}

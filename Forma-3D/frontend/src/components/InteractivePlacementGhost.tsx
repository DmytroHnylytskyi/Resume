'use client';

/**
 * @file InteractivePlacementGhost.tsx
 * @module components/InteractivePlacementGhost
 * @description Interactive 3D placement ghost preview component with automatic Surface Snapping.
 * Tracks pointer movement against both the Y=0 floor plane AND existing 3D scene objects (tables, desks, walls, roofs)
 * using R3F raycasting. Snaps ghost to top surface heights, applies magnet grid snapping, and commits placement on Left Click.
 * Uses centralized normalizeModelGeometry for 100% pixel-perfect pivot alignment and scale synchronization with placed objects.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { normalizeModelGeometry } from '../utils/modelNormalization';

/**
 * InteractivePlacementGhost Component.
 * Renders a glowing green placement preview object under mouse pointer during placement mode.
 * 
 * @returns {JSX.Element | null} R3F ghost group element or null when placement inactive.
 */
export default function InteractivePlacementGhost() {
  const placingModelPath = useStore((state) => state.placingModelPath);
  const placingObjectScale = useStore((state) => state.placingObjectScale);
  const snapToGrid = useStore((state) => state.snapToGrid);
  const gridSize = useStore((state) => state.gridSize);
  const commitPlacement = useStore((state) => state.commitPlacement);
  const cancelPlacement = useStore((state) => state.cancelPlacement);
  
  const { scene } = useGLTF(placingModelPath || '/model/kaykit_halloween/Crypt.glb');
  
  /** Ref to main ghost group element for zero-rerender direct frame mutation */
  const ghostRef = useRef<THREE.Group>(null!);

  /** Current floor coordinate vector ref */
  const posRef = useRef<[number, number, number]>([0, 0, 0]);

  /** Y-axis rotation angle in radians */
  const [ghostRotY, setGhostRotY] = useState<number>(0);

  const { raycaster, camera, mouse } = useThree();

  /** Clones model scene, normalizes geometry/pivot, and applies semi-transparent green hologram materials */
  const { clonedWrapper, finalScale } = useMemo(() => {
    const defaultScale: [number, number, number] = [1, 1, 1];
    if (!scene || !placingModelPath) return { clonedWrapper: null, finalScale: defaultScale };
    const clone = scene.clone(true);
    
    // Unified pivot centering and scale normalization
    const { wrapper, normalizedScale } = normalizeModelGeometry(clone, placingModelPath);
    const s = placingObjectScale || 1;
    const scaleVector: [number, number, number] = Array.isArray(s)
      ? [normalizedScale * s[0], normalizedScale * s[1], normalizedScale * s[2]]
      : [normalizedScale * s, normalizedScale * s, normalizedScale * s];

    // Apply semi-transparent green ghost material and disable raycasting on ghost meshes
    clone.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.raycast = () => null; // Ghost never blocks pointer raycast from seeing underlying surfaces!
        mesh.material = new THREE.MeshStandardMaterial({
          color: '#1ed760',
          emissive: '#1ed760',
          emissiveIntensity: 0.35,
          transparent: true,
          opacity: 0.65,
          roughness: 0.3,
          wireframe: false
        });
      }
    });

    return { clonedWrapper: wrapper, finalScale: scaleVector };
  }, [scene, placingModelPath, placingObjectScale]);


  /** BUG FIX: Cleanup ghost materials on unmount */
  useEffect(() => {
    return () => {
      if (clonedWrapper) {
        clonedWrapper.traverse((child: THREE.Object3D) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else if (mesh.material) {
              (mesh.material as THREE.Material).dispose();
            }
          }
        });
      }
    };
  }, [clonedWrapper]);

  /** Per-frame surface raycast calculation against all scene objects (tables, desks, walls, floor) */
  useFrame(({ scene: threeScene }) => {
    if (!placingModelPath || !ghostRef.current) return;
    
    raycaster.setFromCamera(mouse, camera);

    // Raycast against all objects in scene
    const intersects = raycaster.intersectObjects(threeScene.children, true);

    // Filter out ghost's own meshes and grid helper
    const validHits = intersects.filter(hit => {
      let curr: THREE.Object3D | null = hit.object;
      while (curr) {
        if (curr === ghostRef.current || curr.type === 'GridHelper' || curr.userData?.isCatchPlane) return false;
        curr = curr.parent;
      }
      return true;
    });

    let targetX = 0;
    let targetY = 0;
    let targetZ = 0;

    if (validHits.length > 0) {
      const hit = validHits[0];
      targetX = hit.point.x;
      targetY = hit.point.y;
      targetZ = hit.point.z;
    } else {
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const target = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, target)) {
        targetX = target.x;
        targetY = 0;
        targetZ = target.z;
      }
    }

    if (snapToGrid) {
      targetX = Math.round(targetX / gridSize) * gridSize;
      targetZ = Math.round(targetZ / gridSize) * gridSize;
      targetY = Math.max(0, Math.round(targetY / (gridSize / 2)) * (gridSize / 2));
    }

    ghostRef.current.position.set(targetX, targetY, targetZ);
    posRef.current = [targetX, targetY, targetZ];
  });

  /** Keyboard listener hook for placement rotation (R) and cancellation (Escape) */
  useEffect(() => {
    if (!placingModelPath) return;

    /** @param {KeyboardEvent} e */
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
        setGhostRotY((prev) => (prev + Math.PI / 2) % (Math.PI * 2));
      } else if (e.key === 'Escape') {
        cancelPlacement();
      }
    };

    /** @param {MouseEvent} e */
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      cancelPlacement();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [placingModelPath, cancelPlacement]);

  if (!placingModelPath || !clonedWrapper) return null;

  /** Commits object placement at current pointer position */
  const handleCommitClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    commitPlacement(posRef.current, [0, ghostRotY, 0]);
  };

  return (
    <>
      {/* Invisible 3D catch plane intercepting placement clicks smoothly */}
      <mesh 
        userData={{ isCatchPlane: true }}
        position={[0, 0, 0]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        onClick={handleCommitClick}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <group 
        ref={ghostRef}
        rotation={[0, ghostRotY, 0]}
        scale={finalScale}
        onClick={handleCommitClick}
      >

        <primitive object={clonedWrapper} />
      </group>
    </>
  );
}

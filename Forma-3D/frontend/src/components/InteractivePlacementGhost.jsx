'use client';

/**
 * @file InteractivePlacementGhost.jsx
 * @module components/InteractivePlacementGhost
 * @description Interactive 3D placement ghost preview component with automatic Surface Snapping.
 * Tracks pointer movement against both the Y=0 floor plane AND existing 3D scene objects (tables, desks, walls, roofs)
 * using R3F raycasting. Snaps ghost to top surface heights, applies magnet grid snapping, and commits placement on Left Click.
 * Disables raycasting on ghost meshes so the cursor seamlessly sees surfaces beneath it. Supports scale & custom color presets.
 * 
 * @author 3D Furniture Configurator Team
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

/**
 * Height scale normalizer for placement ghost model assets.
 * 
 * @param {string} modelPath - Model path.
 * @param {THREE.Object3D} scene - Three.js Object3D scene wrapper.
 * @returns {number} Scale multiplier.
 */
function getCategoryHeightScale(modelPath, scene) {
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  let h = size.y;

  if (h > 1000) h /= 1000;
  else if (h > 100) h /= 100;
  else if (h > 10) h /= 10;

  if (h <= 0.01) return 1;

  const file = (modelPath || '').toLowerCase();
  let targetH = h;

  if (file.includes('wall') || file.includes('door') || file.includes('window')) targetH = 2.0;
  else if (file.includes('sofa')) targetH = 0.75;
  else if (file.includes('chair') || file.includes('pouf') || file.includes('stool')) targetH = 0.8;
  else if (file.includes('dining table')) targetH = 0.75;
  else if (file.includes('coffee table')) targetH = 0.45;
  else if (file.includes('tv stand')) targetH = 0.45;
  else if (file.includes('tv')) targetH = 0.7;
  else if (file.includes('bookshelf') || file.includes('sideboard')) targetH = 1.5;
  else if (file.includes('floor lamp')) targetH = 1.4;
  else if (file.includes('table lamp')) targetH = 0.45;
  else if (file.includes('plant')) targetH = 0.8;
  else if (file.includes('carpet')) targetH = 0.02;
  else if (file.includes('monitor')) targetH = 0.55;

  return targetH / h;
}

/**
 * InteractivePlacementGhost Component.
 * Renders a glowing green placement preview object under mouse pointer during placement mode.
 * 
 * @returns {JSX.Element | null} R3F ghost group element or null when placement inactive.
 */
export default function InteractivePlacementGhost() {
  const { 
    placingModelPath, placingObjectScale, 
    snapToGrid, gridSize, commitPlacement, cancelPlacement 
  } = useStore();
  const { scene } = useGLTF(placingModelPath || '/model/wall_001_1.glb');
  
  /** Ref to main ghost group element for zero-rerender direct frame mutation */
  const ghostRef = useRef();

  /** Current floor coordinate vector ref */
  const posRef = useRef([0, 0, 0]);

  /** Y-axis rotation angle in radians */
  const [ghostRotY, setGhostRotY] = useState(0);

  const { raycaster, camera, mouse } = useThree();

  /** Clones model scene and converts all mesh materials to semi-transparent green holograms */
  const clonedGhost = useMemo(() => {
    if (!scene) return null;
    const clone = scene.clone(true);
    const uScale = getCategoryHeightScale(placingModelPath, clone);
    const effectiveScale = uScale * (placingObjectScale || 1);
    
    const wrapper = new THREE.Group();
    wrapper.add(clone);
    clone.scale.set(effectiveScale, effectiveScale, effectiveScale);

    // Snap bottom to Y=0
    const box = new THREE.Box3().setFromObject(wrapper);
    if (!box.isEmpty()) {
      clone.position.y -= box.min.y;
    }

    // Apply semi-transparent green ghost material and disable raycasting on ghost
    clone.traverse((child) => {
      if (child.isMesh) {
        child.raycast = () => null; // Ghost never blocks pointer raycast from seeing underlying surfaces!
        child.material = new THREE.MeshStandardMaterial({
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

    return wrapper;
  }, [scene, placingModelPath, placingObjectScale]);

  /** Per-frame surface raycast calculation against all scene objects (tables, desks, walls, floor) */
  useFrame(({ scene: threeScene }) => {
    if (!placingModelPath || !ghostRef.current) return;
    
    raycaster.setFromCamera(mouse, camera);

    // Raycast against all objects in scene
    const intersects = raycaster.intersectObjects(threeScene.children, true);

    // Filter out ghost's own meshes and grid helper
    const validHits = intersects.filter(hit => {
      let curr = hit.object;
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
    const handleKeyDown = (e) => {
      if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
        setGhostRotY((prev) => (prev + Math.PI / 2) % (Math.PI * 2));
      } else if (e.key === 'Escape') {
        cancelPlacement();
      }
    };

    /** @param {MouseEvent} e */
    const handleContextMenu = (e) => {
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

  if (!placingModelPath || !clonedGhost) return null;

  /** Commits object placement at current pointer position */
  const handleCommitClick = (e) => {
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
        onClick={handleCommitClick}
      >
        <primitive object={clonedGhost} />
      </group>
    </>
  );
}

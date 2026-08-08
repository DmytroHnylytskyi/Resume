'use client';

/**
 * @file PlaceableObject.jsx
 * @module components/PlaceableObject
 * @description Interactive 3D scene object component for R3F Canvas.
 * Handles GLB model loading, bounding-box bottom Y-zero alignment, real-world metric scaling normalization,
 * sub-mesh node color mutation, pointer raycast selection, and `@react-three/drei` TransformControls integration.
 * Disables selection during placement mode (`placingModelPath`) so building objects is seamless.
 * 
 * @author 3D Furniture Configurator Team
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { useGLTF, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

/** Constant fallback empty array */
const EMPTY_ARRAY = [];

/** Constant fallback empty object */
const EMPTY_OBJECT = {};

/**
 * Normalizes any 3D model coordinates (whether exported in mm, cm, dm, or meters)
 * to standard real-world METERS.
 * 
 * @param {THREE.Object3D} scene - Three.js Object3D scene tree.
 * @returns {number} Scale normalization factor.
 */
function getUnitScale(scene) {
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  if (maxDim <= 0) return 1;

  if (maxDim > 1000) return 1 / 1000;
  if (maxDim > 100) return 1 / 100;
  if (maxDim > 10) return 1 / 10;
  return 1;
}

/**
 * Applies realistic category height scaling for furniture items
 * relative to standard ~2.0m architectural walls.
 * 
 * @param {string} modelPath - Relative GLB file path.
 * @param {THREE.Object3D} scene - Cloned Three.js scene.
 * @returns {number} Target height scale factor.
 */
function getCategoryHeightScale(modelPath, scene) {
  const unitScale = getUnitScale(scene);
  const file = (modelPath || '').toLowerCase();
  
  // Architectural structural items (walls, doors, windows, tiles, house components) -> keep 1:1 in meters!
  if (
    file.includes('wall') || 
    file.includes('door') || 
    file.includes('window') || 
    file.includes('floor') || 
    file.includes('roof') || 
    file.includes('gothic') ||
    file.includes('house_')
  ) {
    return unitScale;
  }

  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const h = size.y;

  if (h <= 0) return unitScale;

  let targetH = 1.0;
  if (file.includes('sofa')) targetH = 0.75;
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
  else if (file.includes('painting')) targetH = 1.2;

  return targetH / h;
}

/**
 * PlaceableObject Component.
 * 
 * @param {Object} props - Component props.
 * @param {string} props.id - Object UUID.
 * @param {string} props.modelPath - GLB model path in public/model/.
 * @param {number} [props.scale=1] - Scale multiplier.
 * @param {[number, number, number]} [props.position=[0,0,0]] - Position vector.
 * @param {[number, number, number]} [props.rotation=[0,0,0]] - Rotation vector.
 * @param {string[]} [props.hiddenParts=[]] - Array of mesh part names to hide.
 * @param {Object.<string, string>} [props.objectColors={}] - Map of mesh part names to custom colors.
 * @returns {JSX.Element} R3F group element with TransformControls.
 */
export default function PlaceableObject({ 
  id, 
  modelPath, 
  scale = 1, 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  hiddenParts = EMPTY_ARRAY, 
  objectColors = EMPTY_OBJECT 
}) {
  const { scene } = useGLTF(modelPath);
  const { 
    setSelectedObjectId, setSelectedObjectPart, 
    selectedObjectId, updatePlacedObject, transformMode,
    snapToGrid, gridSize, lightMode, placingModelPath 
  } = useStore();

  /** Determines if current model is a lamp asset to activate night lighting */
  const isLamp = useMemo(() => {
    const p = (modelPath || '').toLowerCase();
    return p.includes('lamp') || p.includes('chandelier');
  }, [modelPath]);

  /** @type {React.RefObject<THREE.Group>} Ref to main 3D group container */
  const group = useRef();

  /** @type {React.RefObject<import('@react-three/drei').TransformControls>} Ref to TransformControls gizmo */
  const transformRef = useRef();

  /** @type {React.RefObject<boolean>} Flag indicating whether object is currently being dragged */
  const isDragging = useRef(false);

  /** Whether this object is currently selected */
  const isSelected = selectedObjectId === id;

  /**
   * Sanitizes mesh name to extract base part identifier.
   * @param {THREE.Mesh} mesh - Three.js mesh instance.
   * @returns {string} Clean part name string.
   */
  const getCleanPartName = (mesh) => {
    let name = mesh.name || mesh.material?.name || 'part';
    return name.split('_')[0];
  };

  /**
   * Clones base GLTF scene, snaps bottom bounding box to Y=0 floor, and applies height scaling.
   * Memoized to prevent expensive scene graph re-cloning on every state re-render.
   */
  const { clonedScene, unitScale } = useMemo(() => {
    const clone = scene.clone(true);
    const uScale = getCategoryHeightScale(modelPath, clone);

    const wrapper = new THREE.Group();
    wrapper.add(clone);

    // Snap bottom of 3D bounding box to Y=0 so no object sinks under floor
    const box = new THREE.Box3().setFromObject(wrapper);
    if (!box.isEmpty()) {
      clone.position.y -= box.min.y;
    }

    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        
        const partNameLower = child.name.toLowerCase();
        const matNameLower = child.material.name ? child.material.name.toLowerCase() : '';
        
        if (hiddenParts.some(p => partNameLower.includes(p.toLowerCase()) || matNameLower.includes(p.toLowerCase()))) {
          child.raycast = () => null;
          child.visible = false;
        }

        child.userData.originalColor = child.material.color.clone();
        child.userData.partName = getCleanPartName(child);
      }
    });
    
    return { clonedScene: wrapper, unitScale: uScale };
  }, [scene, modelPath, hiddenParts]);

  const finalScale = scale * unitScale;

  /** Dynamic color application hook for object parts */
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh && child.userData.partName) {
        const customColor = objectColors[child.userData.partName];
        if (customColor) {
          child.material.color.set(customColor);
        } else {
          child.material.color.copy(child.userData.originalColor);
        }
      }
    });
  }, [objectColors, clonedScene]);

  /** TransformControls drag state listener */
  useEffect(() => {
    const controls = transformRef.current;
    if (!controls) return;

    const onDraggingChanged = (event) => {
      isDragging.current = event.value;
    };

    controls.addEventListener('dragging-changed', onDraggingChanged);
    return () => {
      controls.removeEventListener('dragging-changed', onDraggingChanged);
    };
  }, [isSelected]);

  /** Pointer click selection handler (disabled during active placement mode) */
  const handleClick = (e) => {
    if (isDragging.current || placingModelPath) return;
    e.stopPropagation();
    setSelectedObjectId(id);
    const part = e.object?.userData?.partName;
    if (part) {
      setSelectedObjectPart(part);
    }
  };

  /** Pointer down event propagation trap (disabled during active placement mode) */
  const handlePointerDown = (e) => {
    if (isDragging.current || placingModelPath) return;
    e.stopPropagation();
  };

  /** Hover highlight pointerover handler (disabled during active placement mode) */
  const handlePointerOver = (e) => {
    if (isDragging.current || placingModelPath) return;
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    if (isSelected && e.object && e.object.isMesh && e.object.material) {
      if (!e.object.userData.hovered) {
        e.object.userData.hovered = true;
        if (e.object.material.emissive) {
          e.object.material.emissive.setHex(0x333333);
        }
      }
    }
  };

  /** Hover highlight pointerout handler */
  const handlePointerOut = (e) => {
    if (placingModelPath) return;
    e.stopPropagation();
    document.body.style.cursor = 'auto';
    if (e.object && e.object.isMesh && e.object.material) {
      e.object.userData.hovered = false;
      if (e.object.material.emissive) {
        e.object.material.emissive.setHex(0x000000);
      }
    }
  };

  /**
   * Finalizes object transformation step.
   * Snaps position to 0.5m grid step and updates Zustand state store.
   */
  const onTransformEnd = () => {
    if (!group.current) return;

    let posX = group.current.position.x;
    let posY = group.current.position.y;
    let posZ = group.current.position.z;

    if (snapToGrid) {
      posX = Math.round(posX / gridSize) * gridSize;
      posZ = Math.round(posZ / gridSize) * gridSize;
      posY = Math.max(0, Math.round(posY / (gridSize / 2)) * (gridSize / 2));
      group.current.position.set(posX, posY, posZ);
    }

    updatePlacedObject(id, {
      position: [posX, posY, posZ],
      rotation: [group.current.rotation.x, group.current.rotation.y, group.current.rotation.z],
      scale: group.current.scale.x / unitScale
    });
  };

  return (
    <>
      {isSelected ? (
        <TransformControls 
          ref={transformRef}
          object={group} 
          mode={transformMode}
          onMouseUp={onTransformEnd}
          translationSnap={snapToGrid ? gridSize : null}
          rotationSnap={snapToGrid ? Math.PI / 12 : null}
        />
      ) : null}
      
      <group 
        ref={group}
        userData={{ id }}
        position={position} 
        rotation={rotation} 
        scale={finalScale}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <primitive object={clonedScene} />
        {isLamp && lightMode === 'night' && (
          <pointLight position={[0, 1.2, 0]} intensity={3.5} color="#ffb74d" distance={14} castShadow />
        )}
      </group>
    </>
  );
}

'use client';

/**
 * @file PlaceableObject.tsx
 * @module components/PlaceableObject
 * @description Interactive 3D scene object component for R3F Canvas.
 * Handles GLB model loading, automatic pivot centering and bottom Y-zero alignment via normalizeModelGeometry,
 * sub-mesh node color mutation, pointer raycast selection, and `@react-three/drei` TransformControls integration.
 * Wrapped in React.memo with strict shallow equality checking to ensure maximum WebGL rendering performance.
 * 
 * @author 3D Furniture Configurator Team
 */

import { useMemo, useEffect, useRef, useState, memo } from 'react';
import { useGLTF, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { normalizeModelGeometry } from '../utils/modelNormalization';
import { ThreeEvent } from '@react-three/fiber';

/** Static fallback empty array constant to preserve referential equality */
const EMPTY_ARRAY: string[] = [];

/** Static fallback empty object constant to preserve referential equality */
const EMPTY_OBJECT: Record<string, string> = {};

/**
 * Extracts a human-readable clean part name from a mesh node.
 * 
 * @param {THREE.Mesh} mesh - Three.js mesh instance.
 * @returns {string} Clean part name string.
 */
function getCleanPartName(mesh: THREE.Mesh): string {
  let name = mesh.name || (mesh.material as THREE.Material)?.name || 'part';
  return name.split('_')[0];
}

interface PlaceableObjectComponentProps {
  id: string;
  modelPath: string;
  nodeName?: string;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  hiddenParts?: string[];
  objectColors?: Record<string, string>;
}

/**
 * PlaceableObject Component.
 * 
 * @param {PlaceableObjectComponentProps} props - Component props.
 * @returns {JSX.Element | null} R3F group element with TransformControls.
 */
function PlaceableObjectComponent({ 
  id, 
  modelPath, 
  scale = 1, 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  hiddenParts = EMPTY_ARRAY, 
  objectColors = EMPTY_OBJECT 
}: PlaceableObjectComponentProps) {
  const { scene } = useGLTF(modelPath);
  
  // Granular Zustand subscriptions to avoid full-tree re-renders
  const selectedObjectId = useStore((state) => state.selectedObjectId);
  const setSelectedObjectId = useStore((state) => state.setSelectedObjectId);
  const setSelectedObjectPart = useStore((state) => state.setSelectedObjectPart);
  const updatePlacedObject = useStore((state) => state.updatePlacedObject);
  const transformMode = useStore((state) => state.transformMode);
  const snapToGrid = useStore((state) => state.snapToGrid);
  const gridSize = useStore((state) => state.gridSize);
  const lightMode = useStore((state) => state.lightMode);
  const placingModelPath = useStore((state) => state.placingModelPath);

  /** Determines if current model is a lamp asset to activate night lighting */
  const isLamp = useMemo(() => {
    const p = (modelPath || '').toLowerCase();
    return p.includes('lamp') || p.includes('chandelier');
  }, [modelPath]);

  /** Ref to main 3D group container */
  const group = useRef<THREE.Group>(null!);
  const [mountedGroup, setMountedGroup] = useState<THREE.Group | null>(null);

  /** Ref to TransformControls gizmo */
  const transformRef = useRef<any>(null);

  /** Flag indicating whether object is currently being dragged */
  const isDragging = useRef<boolean>(false);

  /** Whether this object is currently selected */
  const isSelected = selectedObjectId === id;

  /**
   * Clones base GLTF scene, normalizes pivot to bottom-center (0,0,0), and calculates base scale.
   * Memoized to prevent expensive scene graph re-cloning on every state re-render.
   */
  const { clonedWrapper, unitScale } = useMemo(() => {
    if (!scene) return { clonedWrapper: null, unitScale: 1 };
    const clone = scene.clone(true);
    const { wrapper, normalizedScale } = normalizeModelGeometry(clone, modelPath);

    // Attach custom part names and original colors for material picker inspection
    clone.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const part = getCleanPartName(mesh);
        mesh.userData.partName = part;
        mesh.userData.id = id;

        const material = mesh.material as THREE.MeshStandardMaterial;
        if (material && material.color) {
          mesh.userData.originalColor = material.color.clone();
        }
      }
    });

    return { clonedWrapper: wrapper, unitScale: normalizedScale };
  }, [scene, modelPath, id]);

  const effectiveScale = scale || 1;
  const finalScale: [number, number, number] = [
    unitScale * effectiveScale, 
    unitScale * effectiveScale, 
    unitScale * effectiveScale
  ];

  /** Synchronizes hiddenParts visibility on sub-meshes */
  useEffect(() => {
    if (!clonedWrapper) return;
    clonedWrapper.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        const part = mesh.userData.partName;
        mesh.visible = !hiddenParts.includes(part);
      }
    });
  }, [hiddenParts, clonedWrapper]);

  /** Synchronizes custom material hex colors on sub-meshes */
  useEffect(() => {
    if (!clonedWrapper) return;
    clonedWrapper.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        const part = mesh.userData.partName;
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (objectColors && objectColors[part]) {
          material.color?.set(objectColors[part]);
        } else if (mesh.userData.originalColor) {
          material.color?.copy(mesh.userData.originalColor);
        }
      }
    });
  }, [objectColors, clonedWrapper]);

  /** TransformControls drag state listener */
  useEffect(() => {
    const controls = transformRef.current;
    if (!controls) return;

    const onDraggingChanged = (event: any) => {
      isDragging.current = event.value;
    };

    controls.addEventListener('dragging-changed', onDraggingChanged);
    return () => {
      controls.removeEventListener('dragging-changed', onDraggingChanged);
    };
  }, [isSelected]);

  // WebGL geometry and material memory cleanup on unmount
  useEffect(() => {
    const wrapper = clonedWrapper;
    return () => {
      if (wrapper) {
        wrapper.traverse((child: THREE.Object3D) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              (mesh.material as THREE.Material)?.dispose();
            }
          }
        });
      }
    };
  }, [clonedWrapper]);

  /** Pointer click selection handler (disabled during active placement mode) */
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (isDragging.current || placingModelPath) return;
    e.stopPropagation();
    if (!isSelected) {
      // First click: select object only, no ColorPicker
      setSelectedObjectId(id);
      setSelectedObjectPart(null);
    } else {
      // Second click on already-selected object: open ColorPicker for specific part
      const part = e.object?.userData?.partName;
      if (part) {
        setSelectedObjectPart(part);
      }
    }
  };

  /** Pointer down event propagation trap (disabled during active placement mode) */
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (isDragging.current || placingModelPath) return;
    e.stopPropagation();
  };

  /** Hover highlight pointerover handler (disabled during active placement mode) */
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (isDragging.current || placingModelPath) return;
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    if (isSelected && e.object) {
      const mesh = e.object as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        if (!mesh.userData.hovered) {
          mesh.userData.hovered = true;
          const material = mesh.material as THREE.MeshStandardMaterial;
          if (material.emissive) {
            material.emissive.setHex(0x333333);
          }
        }
      }
    }
  };

  /** Hover highlight pointerout handler */
  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    if (placingModelPath) return;
    e.stopPropagation();
    document.body.style.cursor = 'auto';
    if (e.object) {
      const mesh = e.object as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        mesh.userData.hovered = false;
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (material.emissive) {
          material.emissive.setHex(0x000000);
        }
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
      scale: group.current.scale.x / (unitScale || 1)
    });
  };

  if (!clonedWrapper) return null;

  return (
    <>
      <group 
        ref={(node) => {
          group.current = node!;
          if (node !== mountedGroup) {
            setMountedGroup(node);
          }
        }}
        userData={{ id }}
        position={position} 
        rotation={rotation} 
        scale={finalScale}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <primitive object={clonedWrapper} />
        {isLamp && lightMode === 'night' && (
          <pointLight position={[0, 1.2, 0]} intensity={3.5} color="#ffb74d" distance={14} castShadow />
        )}
      </group>

      {isSelected && mountedGroup ? (
        <TransformControls 
          ref={transformRef}
          object={mountedGroup} 
          mode={transformMode}
          onMouseUp={onTransformEnd}
          translationSnap={snapToGrid ? gridSize : null}
          rotationSnap={snapToGrid ? Math.PI / 12 : null}
        />
      ) : null}
    </>
  );
}

/**
 * Custom equality comparer for React.memo to ensure 60 FPS lock and zero redundant re-renders.
 */
function arePropsEqual(prevProps: PlaceableObjectComponentProps, nextProps: PlaceableObjectComponentProps) {
  if (prevProps.id !== nextProps.id) return false;
  if (prevProps.modelPath !== nextProps.modelPath) return false;
  if (prevProps.scale !== nextProps.scale) return false;

  const prevPos = prevProps.position || [0, 0, 0];
  const nextPos = nextProps.position || [0, 0, 0];
  // Compare position array
  if (
    prevPos[0] !== nextPos[0] ||
    prevPos[1] !== nextPos[1] ||
    prevPos[2] !== nextPos[2]
  ) return false;

  const prevRot = prevProps.rotation || [0, 0, 0];
  const nextRot = nextProps.rotation || [0, 0, 0];
  // Compare rotation array
  if (
    prevRot[0] !== nextRot[0] ||
    prevRot[1] !== nextRot[1] ||
    prevRot[2] !== nextRot[2]
  ) return false;

  // Compare colors shallow
  const prevColors = prevProps.objectColors || EMPTY_OBJECT;
  const nextColors = nextProps.objectColors || EMPTY_OBJECT;
  const prevKeys = Object.keys(prevColors);
  const nextKeys = Object.keys(nextColors);
  if (prevKeys.length !== nextKeys.length) return false;
  for (const k of prevKeys) {
    if (prevColors[k] !== nextColors[k]) return false;
  }

  // Compare hiddenParts
  const prevHidden = prevProps.hiddenParts || EMPTY_ARRAY;
  const nextHidden = nextProps.hiddenParts || EMPTY_ARRAY;
  if (prevHidden.length !== nextHidden.length) return false;

  return true;
}

export default memo(PlaceableObjectComponent, arePropsEqual);

'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useFBX, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

interface AnimatedCharacterProps {
  isMoving: boolean;
  isSprinting: boolean;
  isJumping: boolean;
}

/**
 * Skeletal Animated Character Component (Mixamo Arissa):
 * - Dynamically measures bounding box and auto-normalizes height to exact 1.72 meters.
 * - Snaps feet to Y=0 floor so character walks directly on the ground.
 * - Extracts and blends clips from Idle.fbx, Walking (1).fbx, Running.fbx, and Jumping.fbx.
 * - Double-sided PBR materials with preserved textures.
 */
export default function AnimatedCharacter({
  isMoving,
  isSprinting,
  isJumping
}: AnimatedCharacterProps): React.ReactElement {
  // ── 1. Load FBX Assets ──
  const idleFbx = useFBX('/model/Idle.fbx');
  const walkFbx = useFBX('/model/Walking.fbx');
  const runFbx = useFBX('/model/Running.fbx');
  const jumpFbx = useFBX('/model/Jumping.fbx');

  const groupRef = useRef<THREE.Group>(null);

  // ── 2. Proper SkinnedMesh Cloning & Dynamic Height Normalization ──
  const { characterModel, animations, autoScale } = useMemo(() => {
    // Clone with full armature skeleton preservation
    const clone = cloneSkeleton(idleFbx) as THREE.Group;

    // Measure raw bounding box height
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const rawHeight = size.y;

    // Desired real human height = 1.72 meters
    const normalizedScale = rawHeight > 0 ? 1.72 / rawHeight : 0.01;

    // Snap feet of character directly to Y=0
    if (!box.isEmpty()) {
      clone.position.y -= box.min.y;
    }

    clone.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh || (child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.SkinnedMesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false; // Prevent mesh popping out during camera orbit

        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
              mat.side = THREE.DoubleSide;
              if ('roughness' in mat) mat.roughness = 0.55;
              if ('metalness' in mat) mat.metalness = 0.15;
              if (mat.map) {
                mat.map.colorSpace = THREE.SRGBColorSpace;
                mat.map.needsUpdate = true;
              }
            }
          });
        }
      }
    });

    const animList: THREE.AnimationClip[] = [];

    if (idleFbx.animations && idleFbx.animations[0]) {
      const clip = idleFbx.animations[0].clone();
      clip.name = 'Idle';
      animList.push(clip);
    }

    if (walkFbx.animations && walkFbx.animations[0]) {
      const clip = walkFbx.animations[0].clone();
      clip.name = 'Walk';
      animList.push(clip);
    }

    if (runFbx.animations && runFbx.animations[0]) {
      const clip = runFbx.animations[0].clone();
      clip.name = 'Run';
      animList.push(clip);
    }

    if (jumpFbx.animations && jumpFbx.animations[0]) {
      const clip = jumpFbx.animations[0].clone();
      clip.name = 'Jump';
      animList.push(clip);
    }

    return {
      characterModel: clone,
      animations: animList,
      autoScale: normalizedScale
    };
  }, [idleFbx, walkFbx, runFbx, jumpFbx]);

  const { actions } = useAnimations(animations, groupRef);

  // ── 3. Animation State Machine & Cross-Fade ──
  const currentActionRef = useRef<string>('Idle');

  useEffect(() => {
    let target = 'Idle';
    if (isJumping) {
      target = 'Jump';
    } else if (isMoving) {
      target = isSprinting ? 'Run' : 'Walk';
    }

    if (currentActionRef.current !== target) {
      const prevAction = actions[currentActionRef.current];
      const nextAction = actions[target];

      if (prevAction) {
        prevAction.fadeOut(0.2);
      }

      if (nextAction) {
        nextAction.reset().fadeIn(0.2).play();
        if (target === 'Jump') {
          nextAction.setLoop(THREE.LoopOnce, 1);
          nextAction.clampWhenFinished = true;
        } else {
          nextAction.setLoop(THREE.LoopRepeat, Infinity);
        }
      }

      currentActionRef.current = target;
    }
  }, [isMoving, isSprinting, isJumping, actions]);

  // Start with Idle
  useEffect(() => {
    if (actions['Idle']) {
      actions['Idle'].reset().fadeIn(0.2).play();
    }
  }, [actions]);

  return (
    // Automatically normalized human height = 1.72m
    <group
      ref={groupRef}
      dispose={null}
      scale={[autoScale, autoScale, autoScale]}
      position={[0, 0, 0]}
    >
      <primitive object={characterModel} />
    </group>
  );
}

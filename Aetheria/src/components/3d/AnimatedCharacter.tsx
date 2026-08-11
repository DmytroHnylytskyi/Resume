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

const TARGET_AVATAR_HEIGHT = 0.82;

/**
 * Enhanced Skeletal Animated Character Component (Mixamo Arissa):
 * - Smooth animation blending between Idle, Walk, Run, and Jump.
 * - Clean non-stuttering jump animation playback with instant landing recovery.
 * - Ground-level boot alignment.
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

  // ── 2. SkinnedMesh Cloning & Ground Height Snapping ──
  const { characterModel, animations, autoScale } = useMemo(() => {
    const clone = cloneSkeleton(idleFbx) as THREE.Group;

    // Measure raw bounding box height
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const rawHeight = size.y;

    const normalizedScale = rawHeight > 0 ? TARGET_AVATAR_HEIGHT / rawHeight : 0.005;

    // Snap feet of character directly to ground level Y=0
    if (!box.isEmpty()) {
      clone.position.y -= box.min.y;
    }

    clone.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isMesh || (child as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = child as THREE.SkinnedMesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;

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

  // ── 3. Animation Cadence & Speeds ──
  useEffect(() => {
    if (actions['Walk']) {
      actions['Walk'].timeScale = 1.15;
    }
    if (actions['Run']) {
      actions['Run'].timeScale = 1.10;
    }
    if (actions['Idle']) {
      actions['Idle'].timeScale = 1.0;
    }
    if (actions['Jump']) {
      actions['Jump'].timeScale = 1.25;
    }
  }, [actions]);

  // ── 4. Robust Animation State Machine ──
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
        prevAction.fadeOut(0.15);
      }

      if (nextAction) {
        nextAction.reset().fadeIn(0.15).play();
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

  return (
    <group ref={groupRef} scale={autoScale} position={[0, 0, 0]}>
      <primitive object={characterModel} />
    </group>
  );
}

'use client';

/**
 * AnimatedCharacter — the playable sci-fi astronaut/android avatar.
 *
 * Renders the KayKit Mannequin_Medium GLB and drives a skeletal animation state
 * machine: locomotion flags are polled from the shared `characterAnimState` buffer
 * inside useFrame (zero React re-renders) and crossfaded on the AnimationMixer
 * (Idle_A, Walking_A, Running_A loop, Jump_Full_Short plays once).
 * The model is auto-scaled to TARGET_HEIGHT (0.55m) to fit inside the 0.54m capsule collider.
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { characterAnimState } from '../../store/characterAnimState';
import { useGameStore } from '../../store/useGameStore';
import { visualQuality } from '../../store/debugState';
import { makeCheapMaterial, mergeSkinnedMeshes } from './kitAssets';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

const TARGET_HEIGHT = 0.55; // kaykit catalog proportions: pickup ~0.69 m, module ~1 m
const DEGENERATE_SCALE_FALLBACK = 0.34;

export default function AnimatedCharacter(): React.ReactElement {
  const setCharacterLoaded = useGameStore((s) => s.setCharacterLoaded);

  useEffect(() => {
    setCharacterLoaded(true);
    return () => setCharacterLoaded(false);
  }, [setCharacterLoaded]);

  // ── 1. Load Mannequin Model & Animation GLBs ──
  const { scene: mannequinScene } = useGLTF('/model/kaykit_space/Mannequin_Medium.glb');
  const { animations: movementAnims } = useGLTF('/model/kaykit_space/Rig_Medium_MovementBasic.glb');
  const { animations: generalAnims } = useGLTF('/model/kaykit_space/Rig_Medium_General.glb');

  // ── 2. Build Skeletal Mesh & Animation Mixer ──
  const { characterModel, mixer, actionsMap, autoScale } = useMemo(() => {
    const clone = cloneSkeleton(mannequinScene) as THREE.Group;
    clone.rotation.y = 0;

    // Measure raw bounding box height (~2.2036m)
    const box = new THREE.Box3().setFromObject(clone);
    const rawHeight = box.getSize(new THREE.Vector3()).y;
    const scaleFactor = rawHeight > 0 ? TARGET_HEIGHT / rawHeight : DEGENERATE_SCALE_FALLBACK;

    // KayKit's 6 skinned primitives (arms/legs/body/head) mean 6 draw calls
    // per character. We merge them into one SkinnedMesh on the same skeleton;
    // animations target bones, so the mixer keeps working unchanged.
    mergeSkinnedMeshes(clone);

    // Optimize materials for clean sci-fi astronaut aesthetic
    clone.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh || (child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.SkinnedMesh;
        mesh.castShadow = true; // the character gets a shadow from the sun key — shape context
        mesh.receiveShadow = false;
        mesh.frustumCulled = false; // Required for skinned mesh animation stability

        if (mesh.material) {
          const src = mesh.material as THREE.MeshStandardMaterial;
          if (visualQuality.cheapMaterials) {
            mesh.material = makeCheapMaterial(src);
          } else {
            const mat = src.clone();
            mat.roughness = 0.65;
            mat.metalness = 0.35;
            mesh.material = mat;
          }
        }
      }
    });

    const animMixer = new THREE.AnimationMixer(clone);
    const actions: Record<string, THREE.AnimationAction> = {};

    // Map KayKit animation clips to canonical locomotion states
    const idleClip = generalAnims.find((c) => c.name === 'Idle_A') || generalAnims[0];
    const walkClip = movementAnims.find((c) => c.name === 'Walking_A');
    const runClip = movementAnims.find((c) => c.name === 'Running_A');
    const jumpClip =
      movementAnims.find((c) => c.name === 'Jump_Full_Short') ||
      movementAnims.find((c) => c.name === 'Jump_Start');

    if (idleClip) {
      const act = animMixer.clipAction(idleClip);
      act.setLoop(THREE.LoopRepeat, Infinity);
      actions['Idle'] = act;
    }
    if (walkClip) {
      const act = animMixer.clipAction(walkClip);
      act.timeScale = 1.15;
      act.setLoop(THREE.LoopRepeat, Infinity);
      actions['Walk'] = act;
    }
    if (runClip) {
      const act = animMixer.clipAction(runClip);
      act.timeScale = 1.10;
      act.setLoop(THREE.LoopRepeat, Infinity);
      actions['Run'] = act;
    }
    if (jumpClip) {
      const act = animMixer.clipAction(jumpClip);
      act.timeScale = 1.25;
      act.setLoop(THREE.LoopOnce, 1);
      act.clampWhenFinished = true;
      actions['Jump'] = act;
    }

    // Default to Idle
    actions['Idle']?.play();

    return {
      characterModel: clone,
      mixer: animMixer,
      actionsMap: actions,
      autoScale: scaleFactor
    };
  }, [mannequinScene, movementAnims, generalAnims]);

  const currentActionRef = useRef<string>('Idle');

  // ── 3. Smooth State Machine Crossfading (frame-driven, zero React re-renders) ──
  useFrame((_, delta) => {
    const anim = characterAnimState;
    const target = anim.isJumping
      ? 'Jump'
      : anim.isMoving
        ? (anim.isSprinting ? 'Run' : 'Walk')
        : 'Idle';

    if (currentActionRef.current !== target && actionsMap[target]) {
      const prevAction = actionsMap[currentActionRef.current];
      const nextAction = actionsMap[target];

      if (prevAction) prevAction.fadeOut(0.18);
      if (nextAction) nextAction.reset().fadeIn(0.18).play();

      currentActionRef.current = target;
    }

    mixer.update(Math.min(delta, 0.1));
  });

  return (
    <group scale={autoScale} position={[0, 0, 0]}>
      <primitive object={characterModel} />
    </group>
  );
}

useGLTF.preload('/model/kaykit_space/Mannequin_Medium.glb');
useGLTF.preload('/model/kaykit_space/Rig_Medium_MovementBasic.glb');
useGLTF.preload('/model/kaykit_space/Rig_Medium_General.glb');

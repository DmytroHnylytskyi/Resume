'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

interface AnimatedCharacterProps {
  isMoving: boolean;
  isSprinting: boolean;
  isJumping: boolean;
}

const TARGET_HEIGHT = 1.65;

export default function AnimatedCharacter({
  isMoving,
  isSprinting,
  isJumping
}: AnimatedCharacterProps): React.ReactElement {
  // ── 1. Load Character Textures ──
  const [diffuseMap, normalMap, specularMap] = useTexture([
    '/model/kaykit_halloween/Arissa_diffuse.png',
    '/model/kaykit_halloween/Arissa_normal.png',
    '/model/kaykit_halloween/Arissa_specular.png'
  ]);

  // Configure texture color space and filtering
  diffuseMap.colorSpace = THREE.SRGBColorSpace;
  diffuseMap.generateMipmaps = true;
  diffuseMap.minFilter = THREE.LinearMipmapLinearFilter;
  diffuseMap.magFilter = THREE.LinearFilter;

  // ── 2. Load FBX Animation Clips ──
  const idleFbx = useFBX('/model/kaykit_halloween/Idle.fbx');
  const walkFbx = useFBX('/model/kaykit_halloween/Walking.fbx');
  const runFbx = useFBX('/model/kaykit_halloween/Running.fbx');
  const jumpFbx = useFBX('/model/kaykit_halloween/Jumping.fbx');

  // ── 3. Build Skeletal Mesh with Authentic Texturing & AnimationMixer ──
  const { characterModel, mixer, actionsMap, autoScale } = useMemo(() => {
    const clone = cloneSkeleton(idleFbx) as THREE.Group;

    // Rotation is controlled by avatarGroupRef in CharacterController
    clone.rotation.y = 0;

    // Measure raw bounding box height
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const rawHeight = size.y;
    const scaleFactor = rawHeight > 0 ? TARGET_HEIGHT / rawHeight : 0.0092;

    // Optimized material: FrontSide only, no shadows (shadows disabled globally)
    const characterMaterial = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      normalMap: normalMap,
      roughnessMap: specularMap,
      roughness: 0.5,
      metalness: 0.25,
      side: THREE.FrontSide
    });

    clone.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh || (child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.SkinnedMesh;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.frustumCulled = false; // Required for skinned mesh animation
        mesh.material = characterMaterial;
      }
    });

    const animMixer = new THREE.AnimationMixer(clone);
    const actions: Record<string, THREE.AnimationAction> = {};

    if (idleFbx.animations?.[0]) {
      const a = animMixer.clipAction(idleFbx.animations[0]);
      a.setLoop(THREE.LoopRepeat, Infinity);
      actions['Idle'] = a;
    }

    if (walkFbx.animations?.[0]) {
      const a = animMixer.clipAction(walkFbx.animations[0]);
      a.timeScale = 1.15;
      a.setLoop(THREE.LoopRepeat, Infinity);
      actions['Walk'] = a;
    }

    if (runFbx.animations?.[0]) {
      const a = animMixer.clipAction(runFbx.animations[0]);
      a.timeScale = 1.10;
      a.setLoop(THREE.LoopRepeat, Infinity);
      actions['Run'] = a;
    }

    if (jumpFbx.animations?.[0]) {
      const a = animMixer.clipAction(jumpFbx.animations[0]);
      a.timeScale = 1.25;
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = true;
      actions['Jump'] = a;
    }

    // Start playing default Idle
    actions['Idle']?.play();

    return {
      characterModel: clone,
      mixer: animMixer,
      actionsMap: actions,
      autoScale: scaleFactor
    };
  }, [idleFbx, walkFbx, runFbx, jumpFbx, diffuseMap, normalMap, specularMap]);

  const currentActionRef = useRef<string>('Idle');

  // ── 4. Smooth State Machine Crossfading ──
  useEffect(() => {
    let target = 'Idle';
    if (isJumping) {
      target = 'Jump';
    } else if (isMoving) {
      target = isSprinting ? 'Run' : 'Walk';
    }

    if (currentActionRef.current !== target && actionsMap[target]) {
      const prevAction = actionsMap[currentActionRef.current];
      const nextAction = actionsMap[target];

      if (prevAction) prevAction.fadeOut(0.18);
      if (nextAction) nextAction.reset().fadeIn(0.18).play();

      currentActionRef.current = target;
    }
  }, [isMoving, isSprinting, isJumping, actionsMap]);

  // ── 5. Frame Update ──
  useFrame((_, delta) => {
    mixer.update(Math.min(delta, 0.1));
  });

  return (
    <group scale={autoScale} position={[0, 0, 0]}>
      <primitive object={characterModel} />
    </group>
  );
}

useTexture.preload('/model/kaykit_halloween/Arissa_diffuse.png');
useTexture.preload('/model/kaykit_halloween/Arissa_normal.png');
useTexture.preload('/model/kaykit_halloween/Arissa_specular.png');
useFBX.preload('/model/kaykit_halloween/Idle.fbx');
useFBX.preload('/model/kaykit_halloween/Walking.fbx');
useFBX.preload('/model/kaykit_halloween/Running.fbx');
useFBX.preload('/model/kaykit_halloween/Jumping.fbx');

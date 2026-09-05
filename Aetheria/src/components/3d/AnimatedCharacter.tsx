'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { characterAnimState } from '../../store/characterAnimState';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

const TARGET_HEIGHT = 1.65;

/**
 * AnimatedCharacter
 * 
 * 3D Skinned Skeletal Mesh character with authentic PBR texturing and smooth animation crossfading.
 * 
 * Optimized Architecture:
 * - Unified GLB Container: Packed 4 animations into a single 3.1MB GLB (down from 28.5MB across 4 FBX files).
 * - SkeletonUtils Cloning: Safely clones GLTF skeletal hierarchies to prevent bone-binding collisions.
 * - AnimationMixer State Machine: Implements smooth 0.18s crossfades between Idle, Walk, Run, Jump.
 * - Exact Bounding Normalization: Maintains exact 1.65m character height.
 * - Zero Re-render Loop: Locomotion flags are read from characterAnimState inside useFrame.
 */
export default function AnimatedCharacter(): React.ReactElement {
  // ── 1. Load Character Textures ──
  const [diffuseMap, normalMap, specularMap] = useTexture([
    '/model/kaykit_halloween/Arissa_diffuse.png',
    '/model/kaykit_halloween/Arissa_normal.png',
    '/model/kaykit_halloween/Arissa_specular.png'
  ]);

  // Configure texture color space, wrapping, and filtering
  [diffuseMap, normalMap, specularMap].forEach((tex) => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
  });
  diffuseMap.colorSpace = THREE.SRGBColorSpace;
  diffuseMap.minFilter = THREE.LinearMipmapLinearFilter;
  diffuseMap.magFilter = THREE.LinearFilter;

  // ── 2. Load Unified GLB Character & Animations ──
  const { scene, animations } = useGLTF('/model/kaykit_halloween/character.glb');

  // ── 3. Build Skeletal Mesh with Authentic Texturing & AnimationMixer ──
  const { characterModel, mixer, actionsMap, autoScale } = useMemo(() => {
    const clone = cloneSkeleton(scene) as THREE.Group;

    // Rotation is controlled by avatarGroupRef in CharacterController
    clone.rotation.y = 0;

    // Measure raw bounding box height
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const rawHeight = size.y;
    const scaleFactor = rawHeight > 0 ? TARGET_HEIGHT / rawHeight : 0.0092;

    // Optimized material: FrontSide only, no shadows (shadows disabled globally).
    // Matte cloth finish: the phong specular map must NOT be wired as a
    // roughness map (its bright = shiny regions inverted into low roughness,
    // producing wet plastic highlights), and low metalness keeps the stencil
    // costume from glinting under the key light.
    const characterMaterial = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughness: 0.88,
      metalness: 0.02,
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

    animations.forEach((clip) => {
      const action = animMixer.clipAction(clip);
      if (clip.name === 'Idle') {
        action.setLoop(THREE.LoopRepeat, Infinity);
      } else if (clip.name === 'Walk') {
        action.timeScale = 1.15;
        action.setLoop(THREE.LoopRepeat, Infinity);
      } else if (clip.name === 'Run') {
        action.timeScale = 1.10;
        action.setLoop(THREE.LoopRepeat, Infinity);
      } else if (clip.name === 'Jump') {
        action.timeScale = 1.25;
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      actions[clip.name] = action;
    });

    // Start playing default Idle
    actions['Idle']?.play();

    return {
      characterModel: clone,
      mixer: animMixer,
      actionsMap: actions,
      autoScale: scaleFactor
    };
  }, [scene, animations, diffuseMap, normalMap, specularMap]);

  const currentActionRef = useRef<string>('Idle');

  // ── 4. Smooth State Machine Crossfading (frame-driven, zero React re-renders) ──
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

useTexture.preload('/model/kaykit_halloween/Arissa_diffuse.png');
useTexture.preload('/model/kaykit_halloween/Arissa_normal.png');
useTexture.preload('/model/kaykit_halloween/Arissa_specular.png');
useGLTF.preload('/model/kaykit_halloween/character.glb');

'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { characterAnimState } from '../../store/characterAnimState';
import { useGameStore } from '../../store/useGameStore';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

const TARGET_HEIGHT = 1.65;

export default function AnimatedCharacter(): React.ReactElement {
  const setCharacterLoaded = useGameStore((s) => s.setCharacterLoaded);

  useEffect(() => {
    setCharacterLoaded(true);
    return () => setCharacterLoaded(false);
  }, [setCharacterLoaded]);

  // ── 1. Load Character Textures (Optimized WebP, 85% bandwidth reduction) ──
  const [diffuseMap, normalMap, specularMap] = useTexture([
    '/model/kaykit_halloween/Arissa_diffuse.webp',
    '/model/kaykit_halloween/Arissa_normal.webp',
    '/model/kaykit_halloween/Arissa_specular.webp'
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

useTexture.preload('/model/kaykit_halloween/Arissa_diffuse.webp');
useTexture.preload('/model/kaykit_halloween/Arissa_normal.webp');
useTexture.preload('/model/kaykit_halloween/Arissa_specular.webp');
useGLTF.preload('/model/kaykit_halloween/character.glb');

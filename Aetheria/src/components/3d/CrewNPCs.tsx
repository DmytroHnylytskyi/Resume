'use client';

/**
 * CrewNPCs — 6 interactive animated NPC crew members across the Aetheria space outpost.
 *
 * Each crew member features:
 * - Independent cloned Mannequin_Medium skeletal mesh
 * - Sector-specific skeletal animation (Waving, Work_A, Interact, Cheering)
 * - Sector colored ground aura disc and point lighting
 * - Smooth dynamic look-at rotation turning toward the player on approach
 * - Rapier 3D capsule collider preventing player clipping
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { NPC_DIALOGUES, NPCDialogueDef } from '../../data/npcDialogues';
import { NPCId } from '../../types/store';
import rawIslandSceneData from '../../data/islandScene.json';
import { IslandSceneData } from '../../types/scene';

const islandSceneData = rawIslandSceneData as unknown as IslandSceneData;

const TARGET_HEIGHT = 0.75;
const DEGENERATE_SCALE_FALLBACK = 0.34;

interface SingleNPCProps {
  def: NPCDialogueDef;
  pos: [number, number, number];
  rot: [number, number, number];
  playerPosRef?: React.MutableRefObject<THREE.Vector3 | null>;
  mannequinScene: THREE.Group;
  simulationAnims: THREE.AnimationClip[];
  toolsAnims: THREE.AnimationClip[];
  generalAnims: THREE.AnimationClip[];
}

function SingleNPC({
  def,
  pos,
  rot,
  playerPosRef,
  mannequinScene,
  simulationAnims,
  toolsAnims,
  generalAnims
}: SingleNPCProps): React.ReactElement {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const defaultYaw = rot[1];

  const { clone, mixer, autoScale } = useMemo(() => {
    const cl = cloneSkeleton(mannequinScene) as THREE.Group;

    const box = new THREE.Box3().setFromObject(cl);
    const rawHeight = box.getSize(new THREE.Vector3()).y;
    const scale = rawHeight > 0 ? TARGET_HEIGHT / rawHeight : DEGENERATE_SCALE_FALLBACK;

    // Apply sector color tint to materials
    cl.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh || (child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.SkinnedMesh;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.frustumCulled = false;

        if (mesh.material) {
          // Clone material so each NPC can have its own sector emissive accent
          const originalMat = mesh.material as THREE.MeshStandardMaterial;
          const tintedMat = originalMat.clone();
          tintedMat.roughness = 0.65;
          tintedMat.metalness = 0.35;
          tintedMat.emissive = new THREE.Color(def.hexColor);
          tintedMat.emissiveIntensity = 0.18;
          mesh.material = tintedMat;
        }
      }
    });

    const m = new THREE.AnimationMixer(cl);

    // Pick gesture animation based on definition
    let targetClip: THREE.AnimationClip | undefined;
    if (def.gesture === 'Waving') {
      targetClip = simulationAnims.find((c) => c.name === 'Waving');
    } else if (def.gesture === 'Cheering') {
      targetClip = simulationAnims.find((c) => c.name === 'Cheering');
    } else if (def.gesture === 'Work_A') {
      targetClip = toolsAnims.find((c) => c.name === 'Work_A');
    } else if (def.gesture === 'Interact') {
      targetClip = generalAnims.find((c) => c.name === 'Interact');
    }

    if (!targetClip) {
      targetClip = generalAnims.find((c) => c.name === 'Idle_A') || generalAnims[0];
    }

    if (targetClip) {
      const act = m.clipAction(targetClip);
      act.setLoop(THREE.LoopRepeat, Infinity);
      act.play();
    }

    return { clone: cl, mixer: m, autoScale: scale };
  }, [mannequinScene, simulationAnims, toolsAnims, generalAnims, def]);

  // Dynamic look-at player rotation & ground ring pulse
  useFrame(({ clock }, delta) => {
    mixer.update(Math.min(delta, 0.1));

    if (ringRef.current) {
      ringRef.current.rotation.z = clock.getElapsedTime() * 0.4;
    }

    if (!groupRef.current) return;

    let targetAngle = defaultYaw;

    if (playerPosRef && playerPosRef.current) {
      const p = playerPosRef.current;
      const dx = p.x - pos[0];
      const dz = p.z - pos[2];
      const distSq = dx * dx + dz * dz;

      // When player is within 4.5m, rotate smoothly to face the player
      if (distSq < 20.25) {
        targetAngle = Math.atan2(dx, dz);
      }
    }

    let diff = (targetAngle - groupRef.current.rotation.y) % (Math.PI * 2);
    if (diff < -Math.PI) diff += Math.PI * 2;
    if (diff > Math.PI) diff -= Math.PI * 2;
    groupRef.current.rotation.y += diff * Math.min(1, delta * 4.5);
  });

  return (
    <group position={pos}>
      {/* ── Rapier 3D Solid Collider ── */}
      <RigidBody type="fixed" colliders={false} position={pos}>
        <CapsuleCollider args={[0.20, 0.17]} position={[0, 0.37, 0]} />
      </RigidBody>

      {/* ── Ground Sector Aura Halo ── */}
      <mesh
        ref={ringRef}
        position={[0, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.20, 0.55, 32]} />
        <meshBasicMaterial
          color={def.hexColor}
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* ── Ground Outer Soft Spread ── */}
      <mesh
        position={[0, 0.04, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.50, 0.85, 32]} />
        <meshBasicMaterial
          color={def.hexColor}
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* ── Sector Glow Light ── */}
      <pointLight
        position={[0, 0.85, 0]}
        color={def.hexColor}
        intensity={2.2}
        distance={3.0}
        decay={2.0}
      />

      {/* ── Animated Skinned Mannequin Mesh ── */}
      <group ref={groupRef} rotation={rot}>
        <group scale={autoScale} position={[0, 0, 0]}>
          <primitive object={clone} />
        </group>
      </group>
    </group>
  );
}

interface CrewNPCsProps {
  playerPosRef?: React.MutableRefObject<THREE.Vector3 | null>;
}

export default function CrewNPCs({ playerPosRef }: CrewNPCsProps): React.ReactElement {
  const { scene: mannequinScene } = useGLTF('/model/kaykit_space/Mannequin_Medium.glb');
  const { animations: simulationAnims } = useGLTF('/model/kaykit_space/Rig_Medium_Simulation.glb');
  const { animations: toolsAnims } = useGLTF('/model/kaykit_space/Rig_Medium_Tools.glb');
  const { animations: generalAnims } = useGLTF('/model/kaykit_space/Rig_Medium_General.glb');

  const npcKeys = useMemo(() => Object.keys(NPC_DIALOGUES) as NPCId[], []);

  return (
    <group name="CrewNPCsGroup">
      {npcKeys.map((key) => {
        const def = NPC_DIALOGUES[key];
        const modelSubstr = `npc_${key.toLowerCase()}`;
        const placed = islandSceneData.placedObjects?.find((p) => p.modelPath.toLowerCase().includes(modelSubstr));
        const pos: [number, number, number] = placed ? placed.position : def.position;
        const rot: [number, number, number] = placed ? (placed.rotation as [number, number, number]) : def.rotation;

        return (
          <SingleNPC
            key={def.id}
            def={def}
            pos={pos}
            rot={rot}
            playerPosRef={playerPosRef}
            mannequinScene={mannequinScene}
            simulationAnims={simulationAnims}
            toolsAnims={toolsAnims}
            generalAnims={generalAnims}
          />
        );
      })}
    </group>
  );
}

useGLTF.preload('/model/kaykit_space/Mannequin_Medium.glb');
useGLTF.preload('/model/kaykit_space/Rig_Medium_Simulation.glb');
useGLTF.preload('/model/kaykit_space/Rig_Medium_Tools.glb');
useGLTF.preload('/model/kaykit_space/Rig_Medium_General.glb');

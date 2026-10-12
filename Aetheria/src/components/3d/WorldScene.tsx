'use client';

/**
 * WorldScene — 3-Tier Sci-Fi Space Outpost environment module for Aetheria.
 *
 * Owns everything that is NOT the player character:
 * - High-performance GPU instancing via `THREE.InstancedMesh` for 300+ modular pieces
 * - Compound static Rapier 3D colliders for base modules, rovers, cargo, and perimeter rocks
 * - Solid plateau foundations (Tier 2 Hub at Y=2.0m, Tier 3 Energy Ridge at Y=4.0m)
 * - Low-friction angled slope colliders for smooth, snag-free ramp climbing
 * - Subspace plasma excavation particle simulation over the deep core mining drill
 * - 6 interactive animated NPC crew members with dynamic look-at rotation
 * - Proximity interaction manager dispatching holographic dialogue HUD prompts
 */

import React, { useMemo, useRef, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import rawIslandSceneData from '../../data/islandScene.json';
import { IslandSceneData, PlacedObject } from '../../types/scene';
import { useGameStore } from '../../store/useGameStore';
import { NPC_DIALOGUES, NPCDialogueDef } from '../../data/npcDialogues';
import { getGlobalCyberAudio } from '../../hooks/cyberAudio';
import CrewNPCs from './CrewNPCs';

const islandSceneData = rawIslandSceneData as unknown as IslandSceneData;

// Preload all unique scene assets in parallel on initial evaluation
if (typeof window !== 'undefined') {
  const uniquePaths = Array.from(new Set(islandSceneData.placedObjects.map((o) => o.modelPath)));
  uniquePaths.forEach((path) => {
    try {
      useGLTF.preload(path);
    } catch (_) {}
  });
}

function getUnitScale(scene: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim <= 0) return 1;
  if (maxDim > 1000) return 1 / 1000;
  if (maxDim > 100) return 1 / 100;
  if (maxDim > 10) return 1 / 10;
  return 1;
}

// ══════════════════════════════════════════════════════
// 1. HIGH-PERF INSTANCED RENDERER FOR REPEATED PROPS
// ══════════════════════════════════════════════════════
interface InstancedModelGroupProps {
  modelPath: string;
  instances: PlacedObject[];
}

function InstancedModelGroup({ modelPath, instances }: InstancedModelGroupProps): React.ReactElement | null {
  const { scene } = useGLTF(modelPath);
  const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);

  const meshData = useMemo(() => {
    const uScale = getUnitScale(scene);
    const box = new THREE.Box3().setFromObject(scene);
    const minY = box.isEmpty() ? 0 : box.min.y;

    scene.updateMatrixWorld(true);

    const meshes: {
      geometry: THREE.BufferGeometry;
      material: THREE.Material | THREE.Material[];
      localMatrix: THREE.Matrix4;
    }[] = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        meshes.push({
          geometry: m.geometry,
          material: m.material,
          localMatrix: m.matrixWorld.clone()
        });
      }
    });

    return { meshes, uScale, minY };
  }, [scene]);

  const placementMatrices = useMemo(() => {
    const result: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();

    for (let i = 0; i < instances.length; i++) {
      const obj = instances[i];
      const rawScale = Array.isArray(obj.scale) ? obj.scale[0] : (obj.scale || 1);
      const fs = rawScale * meshData.uScale;

      dummy.position.set(
        obj.position[0],
        obj.position[1] - meshData.minY * fs,
        obj.position[2]
      );
      dummy.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2]);
      dummy.scale.set(fs, fs, fs);
      dummy.updateMatrix();
      result.push(dummy.matrix.clone());
    }
    return result;
  }, [instances, meshData]);

  useEffect(() => {
    const composed = new THREE.Matrix4();

    meshRefs.current.forEach((instMesh, meshIdx) => {
      if (!instMesh) return;
      const localMat = meshData.meshes[meshIdx]?.localMatrix;

      for (let i = 0; i < placementMatrices.length; i++) {
        if (localMat) {
          composed.multiplyMatrices(placementMatrices[i], localMat);
          instMesh.setMatrixAt(i, composed);
        } else {
          instMesh.setMatrixAt(i, placementMatrices[i]);
        }
      }
      instMesh.instanceMatrix.needsUpdate = true;
      instMesh.computeBoundingSphere();
    });
  }, [placementMatrices, meshData]);

  if (meshData.meshes.length === 0) return null;

  return (
    <group>
      {meshData.meshes.map((data, idx) => (
        <instancedMesh
          key={idx}
          name={`${modelPath}#${idx}`}
          ref={(el) => {
            meshRefs.current[idx] = el;
          }}
          args={[data.geometry, data.material as THREE.Material, instances.length]}
          frustumCulled={true}
          receiveShadow={false}
          castShadow={false}
        />
      ))}
    </group>
  );
}

// ══════════════════════════════════════════════════════
// 2. SUBSPACE MINING DRILL PLASMA PARTICLES (EASTER EGG PIT)
// ══════════════════════════════════════════════════════
const DRILL_PARTICLE_COUNT = 36;

function SubspaceExcavationParticles(): React.ReactElement {
  const pointsRef = useRef<THREE.Points | null>(null);

  const particleTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(192, 132, 252, 0.9)');
      grad.addColorStop(0.65, 'rgba(168, 85, 247, 0.35)');
      grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const { positions, speeds, offsets } = useMemo(() => {
    const pos = new Float32Array(DRILL_PARTICLE_COUNT * 3);
    const spd = new Float32Array(DRILL_PARTICLE_COUNT);
    const off = new Float32Array(DRILL_PARTICLE_COUNT * 2);

    for (let i = 0; i < DRILL_PARTICLE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2.2;
      pos[i * 3 + 1] = Math.random() * 3.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2.2;

      spd[i] = 0.5 + Math.random() * 0.6;
      off[i * 2] = Math.random() * Math.PI * 2;
      off[i * 2 + 1] = Math.random() * Math.PI * 2;
    }

    return { positions: pos, speeds: spd, offsets: off };
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;
    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
    if (!posAttr) return;
    const arr = posAttr.array as Float32Array;

    const t = performance.now() * 0.0015;

    for (let i = 0; i < DRILL_PARTICLE_COUNT; i++) {
      const idx = i * 3;
      arr[idx + 1] += speeds[i] * delta;

      arr[idx] += Math.sin(t * 1.5 + offsets[i * 2]) * 0.003;
      arr[idx + 2] += Math.cos(t * 1.5 + offsets[i * 2 + 1]) * 0.003;

      if (arr[idx + 1] > 4.2) {
        arr[idx + 1] = 0.1 + Math.random() * 0.2;
        arr[idx] = (Math.random() - 0.5) * 2.0;
        arr[idx + 2] = (Math.random() - 0.5) * 2.0;
      }
    }

    posAttr.needsUpdate = true;
  });

  return (
    <group position={[14.0, 2.5, -12.0]}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.42}
          map={particleTexture || undefined}
          color="#c084fc"
          transparent
          opacity={0.92}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

// ══════════════════════════════════════════════════════
// 3. PROXIMITY INTERACTION MANAGER
// ══════════════════════════════════════════════════════
function ProximityManager({
  playerPosRef
}: {
  playerPosRef?: React.MutableRefObject<THREE.Vector3 | null>;
}): null {
  const { setActiveDialogue, setInteractionPrompt, setEasterEggToast, language } = useGameStore();
  const currentPromptTitleRef = useRef<string | null>(null);
  const lastEasterEggTriggerRef = useRef<number>(0);

  const npcList = useMemo(() => Object.values(NPC_DIALOGUES), []);

  useFrame(() => {
    if (!playerPosRef || !playerPosRef.current) return;
    const p = playerPosRef.current;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return;

    // ── 1. Interactive NPC Crew Proximity ──
    let closestNpc: NPCDialogueDef | null = null;
    let closestDistSq = Infinity;

    for (let i = 0; i < npcList.length; i++) {
      const npc = npcList[i];
      const modelSubstr = `npc_${npc.id.toLowerCase()}`;
      const placed = islandSceneData.placedObjects?.find((po) => po.modelPath.toLowerCase().includes(modelSubstr));
      const targetPos = placed ? placed.position : npc.position;
      const dx = p.x - targetPos[0];
      const dz = p.z - targetPos[2];
      const distSq = dx * dx + dz * dz;

      // Interaction radius threshold ~3.8m (distSq 14.5)
      if (distSq < 14.5 && distSq < closestDistSq) {
        closestDistSq = distSq;
        closestNpc = npc;
      }
    }

    if (closestNpc) {
      const title =
        language === 'uk'
          ? `[E] Поговорити: ${closestNpc.name.uk}`
          : `[E] Speak with: ${closestNpc.name.en}`;

      if (currentPromptTitleRef.current !== title) {
        currentPromptTitleRef.current = title;
        setInteractionPrompt({
          title,
          action: () => {
            getGlobalCyberAudio().play('interact');
            setActiveDialogue({ npcId: closestNpc!.id });
          }
        });
      }
    } else {
      if (currentPromptTitleRef.current !== null) {
        currentPromptTitleRef.current = null;
        setInteractionPrompt(null);
      }
    }

    // ── 2. Easter Egg Deep Mining Drill Trigger ──
    const now = performance.now();
    const gx = p.x - 14.0;
    const gz = p.z - (-12.0);
    if (gx * gx + gz * gz < 9.0) {
      if (now - lastEasterEggTriggerRef.current > 6000) {
        lastEasterEggTriggerRef.current = now;
        setEasterEggToast({
          title: language === 'uk' ? 'Вам ще зарано!' : 'Not your time yet!',
          text:
            language === 'uk'
              ? 'Глибинний видобуток триває — попереду ще багато крутого коду та проєктів.'
              : 'Deep core extraction in progress — plenty of great code and projects ahead.'
        });

        setTimeout(() => {
          setEasterEggToast(null);
        }, 4000);
      }
    }
  });

  return null;
}

// ══════════════════════════════════════════════════════
// 4. PRECISE MODEL COLLISION BOUNDS DICTIONARY
// ══════════════════════════════════════════════════════
interface ModelBound {
  halfExtents: [number, number, number];
  offset?: [number, number, number];
}

const MODEL_COLLIDER_DEFS: Record<string, ModelBound> = {
  'landingpad_large.gltf': { halfExtents: [1.25, 0.25, 1.25], offset: [0, 0.25, 0] },
  'lander_A.gltf': { halfExtents: [0.68, 0.6, 0.68], offset: [0, 0.6, 0] },
  'basemodule_A.gltf': { halfExtents: [1.12, 0.5, 1.09], offset: [0, 0.5, 0] },
  'basemodule_B.gltf': { halfExtents: [1.04, 0.5, 1.16], offset: [0, 0.5, 0] },
  'basemodule_C.gltf': { halfExtents: [1.1, 0.5, 1.1], offset: [0, 0.5, 0] },
  'basemodule_garage.gltf': { halfExtents: [1.0, 0.5, 1.19], offset: [0, 0.5, 0] },
  'cargodepot_A.gltf': { halfExtents: [0.75, 0.5, 0.75], offset: [0, 0.5, 0] },
  'cargodepot_B.gltf': { halfExtents: [0.75, 0.5, 0.75], offset: [0, 0.5, 0] },
  'cargo_B_stacked.gltf': { halfExtents: [0.6, 0.45, 0.6], offset: [0, 0.45, 0] },
  'cargo_A_packed.gltf': { halfExtents: [0.55, 0.4, 0.55], offset: [0, 0.4, 0] },
  'containers_A.gltf': { halfExtents: [0.55, 0.5, 0.55], offset: [0, 0.5, 0] },
  'containers_B.gltf': { halfExtents: [0.55, 0.5, 0.55], offset: [0, 0.5, 0] },
  'containers_C.gltf': { halfExtents: [0.55, 0.5, 0.55], offset: [0, 0.5, 0] },
  'containers_D.gltf': { halfExtents: [0.55, 0.5, 0.55], offset: [0, 0.5, 0] },
  'drill_structure.gltf': { halfExtents: [0.85, 1.4, 0.85], offset: [0, 1.4, 0] },
  'windturbine_tall.gltf': { halfExtents: [0.4, 1.1, 0.4], offset: [0, 1.1, 0] },
  'windturbine_low.gltf': { halfExtents: [0.4, 0.7, 0.4], offset: [0, 0.7, 0] },
  'spacetruck.gltf': { halfExtents: [0.35, 0.35, 0.55], offset: [0, 0.35, 0] },
  'spacetruck_large.gltf': { halfExtents: [0.45, 0.45, 0.75], offset: [0, 0.45, 0] },
  'spacetruck_trailer.gltf': { halfExtents: [0.45, 0.35, 0.75], offset: [0, 0.35, 0] },
  'solarpanel.gltf': { halfExtents: [0.45, 0.25, 0.22], offset: [0, 0.25, 0] },
  'lights.gltf': { halfExtents: [0.25, 0.9, 0.25], offset: [0, 0.9, 0] },
  'structure_tall.gltf': { halfExtents: [0.75, 1.0, 0.75], offset: [0, 1.0, 0] },
  'structure_low.gltf': { halfExtents: [0.75, 0.5, 0.75], offset: [0, 0.5, 0] },
  'rocks_A.gltf': { halfExtents: [0.65, 0.4, 0.75], offset: [0, 0.4, 0] },
  'rocks_B.gltf': { halfExtents: [0.65, 0.4, 0.75], offset: [0, 0.4, 0] },
  'tunnel_straight_A.gltf': { halfExtents: [0.9, 0.35, 0.45], offset: [0, 0.35, 0] },
  'tunnel_straight_B.gltf': { halfExtents: [0.9, 0.35, 0.45], offset: [0, 0.35, 0] },
  'tunnel_diagonal_long_A.gltf': { halfExtents: [1.2, 0.35, 1.2], offset: [0, 0.35, 0] },
  'tunnel_diagonal_long_B.gltf': { halfExtents: [1.2, 0.35, 1.2], offset: [0, 0.35, 0] }
};

interface ObstacleColliderItem {
  id: string;
  halfExtents: [number, number, number];
  position: [number, number, number];
  rotation: [number, number, number];
}

// ══════════════════════════════════════════════════════
// 5. WORLD SCENE ROOT
// ══════════════════════════════════════════════════════
interface WorldSceneProps {
  playerPosRef?: React.MutableRefObject<THREE.Vector3 | null>;
}

export default function WorldScene({ playerPosRef }: WorldSceneProps): React.ReactElement {
  const { instancedGroups, obstacleColliders } = useMemo(() => {
    const groups: Record<string, PlacedObject[]> = {};
    const colliders: ObstacleColliderItem[] = [];

    islandSceneData.placedObjects.forEach((obj: PlacedObject) => {
      const lower = obj.modelPath.toLowerCase();
      const filename = obj.modelPath.split('/').pop() || '';
      const isFloor = lower.includes('terrain') && !lower.includes('mining');

      // NPCs are rendered exclusively by CrewNPCs with skeletal animation rigs
      if (lower.includes('npc_') || lower.includes('mannequin')) {
        return;
      }

      if (!groups[obj.modelPath]) groups[obj.modelPath] = [];
      groups[obj.modelPath].push(obj);

      // Add obstacle collider if defined
      if (!isFloor) {
        const def = MODEL_COLLIDER_DEFS[filename];
        if (def) {
          const rawScale = Array.isArray(obj.scale) ? obj.scale[0] : (obj.scale || 1);
          const off = def.offset ?? [0, 0, 0];
          const yaw = (obj.rotation || [0, 0, 0])[1];
          const cy = Math.cos(yaw);
          const sy = Math.sin(yaw);
          const rotXZ = (ox: number, oz: number): [number, number] => [
            ox * cy + oz * sy,
            -ox * sy + oz * cy
          ];
          const [mainOx, mainOz] = rotXZ(off[0], off[2]);

          colliders.push({
            id: obj.id,
            halfExtents: [
              def.halfExtents[0] * rawScale,
              def.halfExtents[1] * rawScale,
              def.halfExtents[2] * rawScale
            ],
            position: [
              obj.position[0] + mainOx * rawScale,
              obj.position[1] + off[1] * rawScale,
              obj.position[2] + mainOz * rawScale
            ],
            rotation: obj.rotation || [0, 0, 0]
          });
        }
      }
    });

    return {
      instancedGroups: groups,
      obstacleColliders: colliders
    };
  }, []);

  return (
    <group>
      {/* ── Proximity Interaction Manager for NPC Dialogues & Easter Egg ── */}
      <ProximityManager playerPosRef={playerPosRef} />

      {/* ── 6 Interactive Animated Crew NPCs with Look-At & Halos ── */}
      <Suspense fallback={null}>
        <CrewNPCs playerPosRef={playerPosRef} />
      </Suspense>

      {/* ── Deep Mining Drill Ethereal Plasma Particles ── */}
      <SubspaceExcavationParticles />

      {/* ── Instanced Batched Meshes (GPU instanced in single draw calls) ── */}
      {Object.entries(instancedGroups).map(([modelPath, instances]) => (
        <Suspense key={modelPath} fallback={null}>
          <InstancedModelGroup modelPath={modelPath} instances={instances} />
        </Suspense>
      ))}

      {/* ── Unified Compound Static Physics Body ── */}
      <RigidBody type="fixed" colliders={false}>
        {/* Outer Perimeter Containment Walls */}
        <CuboidCollider args={[28, 4.0, 0.6]} position={[0, 4.0, -25.5]} />
        <CuboidCollider args={[28, 4.0, 0.6]} position={[0, 4.0, 25.5]} />
        <CuboidCollider args={[0.6, 4.0, 28]} position={[-25.5, 4.0, 0]} />
        <CuboidCollider args={[0.6, 4.0, 28]} position={[25.5, 4.0, 0]} />

        {/* ── Solid Multi-Tier Plateau Foundations ── */}
        {/* Tier 2: Mid Command Hub Plateau Foundation (Y = 2.0m) */}
        <CuboidCollider args={[15.0, 1.0, 6.0]} position={[0, 1.0, -1.0]} friction={0.8} />

        {/* Tier 3: High Vantage Energy Ridge Plateau Foundation (Y = 4.0m) */}
        <CuboidCollider args={[13.0, 2.0, 5.0]} position={[0, 2.0, -14.0]} friction={0.8} />

        {/* ── Low-Friction Angled Slope Colliders (Smooth, Snag-Free Ramps) ── */}
        {/* Ramp 1: Tier 1 -> Tier 2 (Rise 1.45m from Z=9.5 to Z=5.5) */}
        <CuboidCollider
          args={[1.5, 0.15, 2.2]}
          position={[-2.0, 1.28, 7.5]}
          rotation={[-0.347, 0, 0]}
          friction={0.1}
        />
        <CuboidCollider
          args={[1.5, 0.15, 2.2]}
          position={[2.0, 1.28, 7.5]}
          rotation={[-0.347, 0, 0]}
          friction={0.1}
        />

        {/* Ramp 2: Tier 2 -> Tier 3 (Rise 2.0m from Z=-6.0 to Z=-10.0) */}
        <CuboidCollider
          args={[1.5, 0.15, 2.3]}
          position={[-2.0, 3.0, -8.0]}
          rotation={[-0.4636, 0, 0]}
          friction={0.1}
        />
        <CuboidCollider
          args={[1.5, 0.15, 2.3]}
          position={[2.0, 3.0, -8.0]}
          rotation={[-0.4636, 0, 0]}
          friction={0.1}
        />

        {/* ── All Modular Buildings, Cargo, Vehicles, and Perimeter Rocks ── */}
        {obstacleColliders.map((item) => (
          <CuboidCollider
            key={item.id}
            args={item.halfExtents}
            position={item.position}
            rotation={item.rotation}
          />
        ))}
      </RigidBody>
    </group>
  );
}

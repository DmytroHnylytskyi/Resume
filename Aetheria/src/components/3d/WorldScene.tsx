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
    <group position={[0.0, 2.0, 0.0]}>
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

      // Interaction radius threshold ~2.5m (distSq 6.25)
      if (distSq < 6.25 && distSq < closestDistSq) {
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
    const gx = p.x - 0.0;
    const gz = p.z - 0.0;
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
  'landingpad_large.gltf': { halfExtents: [1.25, 0.35, 1.25], offset: [0, 0.35, 0] },
  'landingpad_small.gltf': { halfExtents: [1.05, 0.35, 1.05], offset: [0, 0.35, 0] },
  'lander_A.gltf': { halfExtents: [0.75, 0.75, 0.75], offset: [0, 0.75, 0] },
  'lander_base.gltf': { halfExtents: [0.95, 0.65, 0.95], offset: [0, 0.65, 0] },
  'basemodule_A.gltf': { halfExtents: [1.15, 0.65, 1.15], offset: [0, 0.65, 0] },
  'basemodule_B.gltf': { halfExtents: [1.15, 0.65, 1.15], offset: [0, 0.65, 0] },
  'basemodule_C.gltf': { halfExtents: [1.15, 0.65, 1.15], offset: [0, 0.65, 0] },
  'basemodule_D.gltf': { halfExtents: [1.15, 0.65, 1.15], offset: [0, 0.65, 0] },
  'basemodule_E.gltf': { halfExtents: [1.15, 0.65, 1.15], offset: [0, 0.65, 0] },
  'basemodule_garage.gltf': { halfExtents: [1.10, 0.65, 1.20], offset: [0, 0.65, 0] },
  'roofmodule_cargo_A.gltf': { halfExtents: [0.95, 0.40, 0.95], offset: [0, 0.40, 0] },
  'roofmodule_cargo_C.gltf': { halfExtents: [0.95, 0.40, 0.95], offset: [0, 0.40, 0] },
  'cargodepot_A.gltf': { halfExtents: [0.85, 0.65, 0.85], offset: [0, 0.65, 0] },
  'cargodepot_B.gltf': { halfExtents: [0.85, 0.65, 0.85], offset: [0, 0.65, 0] },
  'cargo_A.gltf': { halfExtents: [0.55, 0.45, 0.55], offset: [0, 0.45, 0] },
  'cargo_B_stacked.gltf': { halfExtents: [0.65, 0.55, 0.65], offset: [0, 0.55, 0] },
  'cargo_A_packed.gltf': { halfExtents: [0.60, 0.50, 0.60], offset: [0, 0.50, 0] },
  'containers_A.gltf': { halfExtents: [0.60, 0.60, 0.60], offset: [0, 0.60, 0] },
  'containers_B.gltf': { halfExtents: [0.60, 0.60, 0.60], offset: [0, 0.60, 0] },
  'containers_C.gltf': { halfExtents: [0.60, 0.60, 0.60], offset: [0, 0.60, 0] },
  'containers_D.gltf': { halfExtents: [0.60, 0.60, 0.60], offset: [0, 0.60, 0] },
  'drill_structure.gltf': { halfExtents: [0.95, 2.20, 0.95], offset: [0, 1.20, 0] },
  'windturbine_tall.gltf': { halfExtents: [0.45, 2.20, 0.45], offset: [0, 2.00, 0] },
  'windturbine_low.gltf': { halfExtents: [0.45, 1.20, 0.45], offset: [0, 1.00, 0] },
  'spacetruck.gltf': { halfExtents: [0.35, 0.45, 0.55], offset: [0, 0.45, 0] },
  'spacetruck_large.gltf': { halfExtents: [0.45, 0.55, 0.75], offset: [0, 0.55, 0] },
  'spacetruck_trailer.gltf': { halfExtents: [0.45, 0.45, 0.75], offset: [0, 0.45, 0] },
  'terrain_mining.gltf': { halfExtents: [1.05, 0.60, 1.05], offset: [0, 0.50, 0] },
  'solarpanel.gltf': { halfExtents: [0.55, 0.45, 0.35], offset: [0, 0.40, 0] },
  'lights.gltf': { halfExtents: [0.30, 1.20, 0.30], offset: [0, 1.20, 0] },
  'structure_tall.gltf': { halfExtents: [0.85, 1.50, 0.85], offset: [0, 1.50, 0] },
  'structure_low.gltf': { halfExtents: [0.85, 0.75, 0.85], offset: [0, 0.75, 0] },
  'rocks_A.gltf': { halfExtents: [0.75, 0.65, 0.80], offset: [0, 0.55, 0] },
  'rocks_B.gltf': { halfExtents: [0.75, 0.65, 0.80], offset: [0, 0.55, 0] },
  'rock_A.gltf': { halfExtents: [0.65, 0.55, 0.65], offset: [0, 0.45, 0] },
  'rock_B.gltf': { halfExtents: [0.65, 0.55, 0.65], offset: [0, 0.45, 0] },
  'tunnel_straight_A.gltf': { halfExtents: [0.95, 0.45, 0.50], offset: [0, 0.45, 0] },
  'tunnel_straight_B.gltf': { halfExtents: [0.95, 0.45, 0.50], offset: [0, 0.45, 0] },
  'tunnel_diagonal_short_A.gltf': { halfExtents: [0.95, 0.45, 0.95], offset: [0, 0.45, 0] },
  'tunnel_diagonal_long_A.gltf': { halfExtents: [1.25, 0.45, 1.25], offset: [0, 0.45, 0] },
  'tunnel_diagonal_long_B.gltf': { halfExtents: [1.25, 0.45, 1.25], offset: [0, 0.45, 0] }
};

interface ObstacleColliderItem {
  id: string;
  halfExtents: [number, number, number];
  position: [number, number, number];
  rotation: [number, number, number];
  friction?: number;
}

// ══════════════════════════════════════════════════════
// 5. WORLD SCENE ROOT
// ══════════════════════════════════════════════════════
interface WorldSceneProps {
  playerPosRef?: React.MutableRefObject<THREE.Vector3 | null>;
}

export default function WorldScene({ playerPosRef }: WorldSceneProps): React.ReactElement {
  const { instancedGroups, obstacleColliders, slopeColliders } = useMemo(() => {
    const groups: Record<string, PlacedObject[]> = {};
    const colliders: ObstacleColliderItem[] = [];
    const slopes: ObstacleColliderItem[] = [];

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

      const rawScale = Array.isArray(obj.scale) ? obj.scale[0] : (obj.scale || 1);
      const yaw = (obj.rotation || [0, 0, 0])[1];

      // ── Generate low-friction, snag-free ramp colliders for all 14 slopes/corners ──
      if (lower.includes('slope')) {
        if (lower.includes('terrain_slope_outer_corner')) {
          // Outer corner pyramid: angled ramp along the diagonal (-45° yaw, ~19.5° pitch)
          const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
          const qCornerYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 4);
          const qTilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.340);
          const qFinal = qYaw.multiply(qCornerYaw).multiply(qTilt);
          const euler = new THREE.Euler().setFromQuaternion(qFinal, 'XYZ');

          slopes.push({
            id: `slope_corner_${obj.id}`,
            halfExtents: [1.42 * rawScale, 0.14 * rawScale, 0.72 * rawScale],
            position: [obj.position[0], 1.48 * rawScale, obj.position[2]],
            rotation: [euler.x, euler.y, euler.z],
            friction: 0.15
          });
          // Solid base block beneath the ramp to prevent tunneling into terrain void
          slopes.push({
            id: `slope_corner_base_${obj.id}`,
            halfExtents: [0.65 * rawScale, 0.25 * rawScale, 0.65 * rawScale],
            position: [obj.position[0], 1.25 * rawScale, obj.position[2]],
            rotation: [0, yaw, 0],
            friction: 0.8
          });
        } else if (lower.includes('terrain_slope_inner_corner')) {
          // Inner corner plateau transition
          slopes.push({
            id: `slope_inner_${obj.id}`,
            halfExtents: [0.95 * rawScale, 0.45 * rawScale, 0.95 * rawScale],
            position: [obj.position[0], 1.45 * rawScale, obj.position[2]],
            rotation: [0, yaw, 0],
            friction: 0.2
          });
        } else {
          // Straight ramp: rises along local X by ~26.56°
          const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
          const qTilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.4636476);
          const qFinal = qYaw.multiply(qTilt);
          const euler = new THREE.Euler().setFromQuaternion(qFinal, 'XYZ');

          slopes.push({
            id: `slope_straight_${obj.id}`,
            halfExtents: [1.15 * rawScale, 0.14 * rawScale, 1.0 * rawScale],
            position: [obj.position[0], 1.48 * rawScale, obj.position[2]],
            rotation: [euler.x, euler.y, euler.z],
            friction: 0.15
          });
        }
        return;
      }

      // Add obstacle collider if defined
      if (!isFloor) {
        const def = MODEL_COLLIDER_DEFS[filename];
        if (def) {
          const off = def.offset ?? [0, 0, 0];
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
            rotation: obj.rotation || [0, 0, 0],
            friction: 0.8
          });
        }
      }
    });

    return {
      instancedGroups: groups,
      obstacleColliders: colliders,
      slopeColliders: slopes
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
        <CuboidCollider args={[8.0, 4.0, 0.5]} position={[-3.0, 4.0, -11.0]} />
        <CuboidCollider args={[8.0, 4.0, 0.5]} position={[-3.0, 4.0, 8.5]} />
        <CuboidCollider args={[0.5, 4.0, 10.0]} position={[-10.5, 4.0, -1.25]} />
        <CuboidCollider args={[0.5, 4.0, 10.0]} position={[4.5, 4.0, -1.25]} />

        {/* ── Solid Multi-Tier Plateau Foundations (Prevent clipping through hill cores) ── */}
        {/* Elevated Solar Terrace Foundation (Y = 2.0m) */}
        <CuboidCollider args={[1.8, 0.5, 2.5]} position={[-6.0, 1.5, 5.0]} friction={0.8} />

        {/* Central Mining Drill Plaza Foundation (Y = 2.0m) */}
        <CuboidCollider args={[1.6, 0.5, 1.6]} position={[0.0, 1.5, 0.0]} friction={0.8} />

        {/* ── Low-Friction Angled Slope Colliders for Smooth Multi-Tier Ramp Navigation ── */}
        {slopeColliders.map((item) => (
          <CuboidCollider
            key={item.id}
            args={item.halfExtents}
            position={item.position}
            rotation={item.rotation}
            friction={item.friction ?? 0.15}
          />
        ))}

        {/* ── All Modular Buildings, Cargo, Vehicles, and Perimeter Rocks ── */}
        {obstacleColliders.map((item) => (
          <CuboidCollider
            key={item.id}
            args={item.halfExtents}
            position={item.position}
            rotation={item.rotation}
            friction={item.friction ?? 0.8}
          />
        ))}
      </RigidBody>
    </group>
  );
}

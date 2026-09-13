'use client';

/**
 * WorldScene — static environment module for the Aetheria island.
 *
 * Owns everything that is NOT the character: instanced prop batching,
 * landmark/tree colliders, the glow manager, grave-pit particles, the
 * proximity interaction tracker, and the compound obstacle physics body.
 * Rendering strategy: repeated props are grouped by model and drawn as
 * `THREE.InstancedMesh` batches; unique interactive landmarks get measured
 * compound colliders (`LANDMARK_COLLIDER_DEFS`, `MODEL_COLLIDER_DEFS`) so
 * hitboxes match the visible silhouettes.
 */

import React, { useMemo, useRef, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import * as THREE from 'three';
import rawIslandSceneData from '../../data/islandScene.json';
import { IslandSceneData, PlacedObject } from '../../types/scene';
import { useGameStore } from '../../store/useGameStore';
import { translations } from '../../data/resumeData';
import { getNightFactor } from '../../store/dayNightState';

const islandSceneData = rawIslandSceneData as unknown as IslandSceneData;

// Preload all 39 unique scene assets in parallel on initial evaluation
if (typeof window !== 'undefined') {
  const uniquePaths = Array.from(new Set(islandSceneData.placedObjects.map((o) => o.modelPath)));
  uniquePaths.forEach((path) => {
    try {
      useGLTF.preload(path);
    } catch (_) {}
  });
}

/**
 * getUnitScale — normalizes an authored GLTF's unit system to meters.
 * Downloaded assets arrive in wildly different scales (cm, mm, raw units);
 * the largest bbox dimension is snapped to the [1, 10) band so downstream
 * code can place every prop with the same intuitive numbers.
 */
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
          ref={(el) => { meshRefs.current[idx] = el; }}
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
// 2. GLOW MANAGER: Single useFrame drives ALL 6 glows
// ══════════════════════════════════════════════════════
interface GlowTarget {
  color: string;
  radius: number;
  height: number;
  intensity: number;
  position: [number, number, number];
  offsetZ: number;
}

const GLOW_TARGETS: GlowTarget[] = [
  // Bio Statue (Vivid Gold)
  { color: '#fbbf24', radius: 2.8, height: 1.8, intensity: 4.8, position: [-6, 0, -6], offsetZ: 0 },
  // Skills Altar (Vivid Violet)
  { color: '#c084fc', radius: 2.8, height: 1.8, intensity: 4.8, position: [2.5, 0, 10], offsetZ: 0 },
  // Contacts Statue (Vivid Cyan)
  { color: '#38bdf8', radius: 2.8, height: 2.0, intensity: 4.8, position: [7, 0, -6], offsetZ: 0 },
  // Forma Portal Crypt (Vivid Emerald)
  { color: '#34d399', radius: 3.6, height: 2.2, intensity: 5.8, position: [0, 0, -16], offsetZ: 2.5 },
  // TerraScope Portal Crypt (Vivid Sapphire)
  { color: '#60a5fa', radius: 3.6, height: 2.2, intensity: 5.8, position: [-16, 0, -8.5], offsetZ: 2.5 },
  // Lumina Portal Crypt (Vivid Coral Rose)
  { color: '#fb7185', radius: 3.6, height: 2.2, intensity: 5.8, position: [16, 0, -8], offsetZ: 2.5 },
];

// Night glow boost quantized into steps: writing light intensity/material
// opacity every frame would dirty the uniform cache constantly (the static
// pointLights are deliberately zero-dirtiness at noon). ~10 steps across the
// whole dusk→midnight span is visually smooth at scrubbing speed.
const NIGHT_BOOST_STEPS = 10;
const NIGHT_BOOST_MAX = 0.45; // +45% intensity & ring opacity at deep night

function GlowManager(): React.ReactElement {
  const ringsRef = useRef<(THREE.Mesh | null)[]>([]);
  const lightsRef = useRef<(THREE.PointLight | null)[]>([]);
  const nightStepRef = useRef(-1);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // ── Night boost (quantized): step only when the night factor moved by
    // ~1/10th, so resting frames write nothing into the uniform cache. ──
    const step = Math.round(getNightFactor() * NIGHT_BOOST_STEPS);
    if (step !== nightStepRef.current) {
      nightStepRef.current = step;
      const boost = (step / NIGHT_BOOST_STEPS) * NIGHT_BOOST_MAX;
      for (let i = 0; i < GLOW_TARGETS.length; i++) {
        const light = lightsRef.current[i];
        if (light) light.intensity = GLOW_TARGETS[i].intensity * (1 + boost);

        const inner = ringsRef.current[i];
        if (inner && inner.material) {
          (inner.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 + boost);
        }
        const outer = ringsRef.current[i + GLOW_TARGETS.length];
        if (outer && outer.material) {
          (outer.material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 + boost);
        }
      }
    }

    // ── Constant pulse animation (cheap per-frame rotation only) ──
    for (let i = 0; i < GLOW_TARGETS.length; i++) {
      const ring = ringsRef.current[i];
      if (ring) {
        ring.rotation.z = t * 0.3;
      }
    }
  });

  return (
    <group>
      {GLOW_TARGETS.map((gt, i) => (
        <group
          key={i}
          position={[gt.position[0], gt.position[1], gt.position[2] + gt.offsetZ]}
        >
          {/* Ground Halo Disc */}
          <mesh
            ref={(el) => { ringsRef.current[i] = el; }}
            position={[0, 0.09, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[gt.radius * 0.35, gt.radius, 32]} />
            <meshBasicMaterial
              color={gt.color}
              transparent
              opacity={0.7}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Outer Spread */}
          <mesh
            ref={(el) => { ringsRef.current[i + GLOW_TARGETS.length] = el; }}
            position={[0, 0.08, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[gt.radius * 0.85, gt.radius * 1.45, 32]} />
            <meshBasicMaterial
              color={gt.color}
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Static Point Light with constrained sphere radius (zero uniform cache dirtiness) */}
          <pointLight
            ref={(el) => { lightsRef.current[i] = el; }}
            position={[0, gt.height, 0]}
            color={gt.color}
            intensity={gt.intensity}
            distance={gt.radius * 1.5}
            decay={2.0}
          />
        </group>
      ))}
    </group>
  );
}

// ══════════════════════════════════════════════════════
// 2.5 GRAVE PIT ETHEREAL FLOATING PARTICLES
// ══════════════════════════════════════════════════════
const GRAVE_PARTICLE_COUNT = 30;

function GraveFloatingParticles(): React.ReactElement {
  const pointsRef = useRef<THREE.Points | null>(null);

  // Soft glowing radial texture
  const particleTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(216, 180, 254, 0.85)');
      grad.addColorStop(0.65, 'rgba(168, 85, 247, 0.3)');
      grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const { positions, speeds, offsets } = useMemo(() => {
    const pos = new Float32Array(GRAVE_PARTICLE_COUNT * 3);
    const spd = new Float32Array(GRAVE_PARTICLE_COUNT);
    const off = new Float32Array(GRAVE_PARTICLE_COUNT * 2);

    for (let i = 0; i < GRAVE_PARTICLE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 1.5;     // X within pit
      pos[i * 3 + 1] = Math.random() * 2.8;         // Initial Y spread
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1.7; // Z within pit

      spd[i] = 0.35 + Math.random() * 0.45;         // Float speed
      off[i * 2] = Math.random() * Math.PI * 2;     // Sway X phase
      off[i * 2 + 1] = Math.random() * Math.PI * 2; // Sway Z phase
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

    for (let i = 0; i < GRAVE_PARTICLE_COUNT; i++) {
      const idx = i * 3;
      arr[idx + 1] += speeds[i] * delta; // rise upwards

      // Gentle magical sway
      arr[idx] += Math.sin(t * 1.5 + offsets[i * 2]) * 0.0025;
      arr[idx + 2] += Math.cos(t * 1.5 + offsets[i * 2 + 1]) * 0.0025;

      // Loop back to bottom of pit
      if (arr[idx + 1] > 3.0) {
        arr[idx + 1] = 0.05 + Math.random() * 0.15;
        arr[idx] = (Math.random() - 0.5) * 1.4;
        arr[idx + 2] = (Math.random() - 0.5) * 1.6;
      }
    }

    posAttr.needsUpdate = true;
  });

  return (
    <group position={[14, 0.1, 18]}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.32}
          map={particleTexture || undefined}
          color="#d8b4fe"
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
// 2b. STATUE COLLIDER COMPOUNDS — measured from the GLB vertex profiles
// (pedestal + figure volumes), so hitboxes hug the visible silhouette:
// no more walking into the mesh, no floating above the pedestal after a
// jump. Offsets are in the statue's local space, base at y=0 (the clone
// is base-shifted in usePreparedSceneClone). Boxes rotate with the placed
// statue.
// ══════════════════════════════════════════════════════
interface LandmarkBox {
  halfExtents: [number, number, number];
  offset: [number, number, number];
}

const LANDMARK_COLLIDER_DEFS: Record<string, LandmarkBox[]> = {
  // AngelStatue: plinth 0–1.27, body+wings 1.27–2.86, head 2.86–3.81 (H 3.81)
  'AngelStatue by Zsky - 6v4CL0nKfT.glb': [
    { halfExtents: [1.25, 0.64, 1.76], offset: [0.03, 0.64, -0.24] },
    { halfExtents: [0.9, 0.8, 1.28], offset: [0.03, 2.07, -0.35] },
    { halfExtents: [0.74, 0.48, 1.09], offset: [0.03, 3.34, -0.16] }
  ],
  // Stag Statue: rock base 0–1.93, torso 1.93–3.09, head+antlers 3.09–4.63 (H 4.63)
  'Stag Statue by Quaternius - cKloIsNcT8.glb': [
    { halfExtents: [0.57, 0.97, 0.57], offset: [0, 0.97, 0] },
    { halfExtents: [0.45, 0.58, 0.31], offset: [0.07, 2.51, 0.04] },
    { halfExtents: [1.08, 0.77, 0.64], offset: [-0.63, 3.86, 0.04] }
  ],
  // Fox Statue: plinth 0–1.56, body 1.56–2.19, head/tail 2.19–3.75 (H 3.75)
  'Fox Statue by Quaternius - abxyXID5EA.glb': [
    { halfExtents: [0.54, 0.78, 0.54], offset: [0, 0.78, 0] },
    { halfExtents: [0.68, 0.32, 0.75], offset: [0.08, 1.88, -0.15] },
    { halfExtents: [0.34, 0.78, 0.62], offset: [0.05, 2.97, 0.17] }
  ]
};

/**
 * usePreparedSceneClone — shared prep pipeline for unique (non-instanced)
 * props (landmarks, trees): clones the GLTF scene, normalizes its unit
 * scale, base-shifts it to y=0, freezes matrices (the prop is static), and
 * measures the fallback collider box that hugs the resulting geometry.
 */
function usePreparedSceneClone(
  modelPath: string,
  rawScale: number
): { clonedScene: THREE.Group; finalScale: number; fallbackBox: LandmarkBox } {
  const { scene } = useGLTF(modelPath);

  return useMemo(() => {
    const clone = scene.clone(true);
    const uScale = getUnitScale(scene);

    const wrapper = new THREE.Group();
    wrapper.add(clone);

    const box = new THREE.Box3().setFromObject(wrapper);
    if (!box.isEmpty()) {
      clone.position.y -= box.min.y;
    }

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.frustumCulled = true;
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
      }
    });

    wrapper.matrixAutoUpdate = false;
    wrapper.updateMatrix();

    // Post-shift the visible mesh spans y 0..size.y — the fallback collider
    // hugs exactly that box (sizes are translation-invariant).
    const size = box.getSize(new THREE.Vector3()).multiplyScalar(rawScale * uScale);
    return {
      clonedScene: wrapper,
      finalScale: rawScale * uScale,
      fallbackBox: {
        halfExtents: [size.x / 2, size.y / 2, size.z / 2] as [number, number, number],
        offset: [0, size.y / 2, 0] as [number, number, number]
      }
    };
  }, [scene, rawScale]);
}

// ══════════════════════════════════════════════════════
// 3. LANDMARK PROPS (Unique interactive objects with solid colliders)
// ══════════════════════════════════════════════════════
function LandmarkProp({ obj }: { obj: PlacedObject }): React.ReactElement {
  const rawScale = Array.isArray(obj.scale) ? obj.scale[0] : (obj.scale || 1);
  const { clonedScene, finalScale, fallbackBox } = usePreparedSceneClone(obj.modelPath, rawScale);

  const lowerPath = obj.modelPath.toLowerCase();
  const isCrypt = lowerPath.includes('crypt');

  if (isCrypt) {
    return (
      <group position={obj.position} rotation={obj.rotation}>
        {/* Measured Crypt.glb footprint: 6 × 8 (x/z); collider top stays at
            the roofline (5.0) — the spire above is not walkable surface. */}
        <RigidBody type="fixed" colliders={false} position={[0, 2.5, 0]}>
          <CuboidCollider args={[3.0, 2.5, 4.0]} />
        </RigidBody>
        <group scale={finalScale}>
          <primitive object={clonedScene} />
        </group>
      </group>
    );
  }

  // Statues: compound boxes measured from the model's vertex profile
  // (LANDMARK_COLLIDER_DEFS), falling back to a single bbox-fit box for
  // any unmeasured statue. Boxes live inside the rotated group, so they
  // turn with the placement exactly like the visible mesh.
  const filename = obj.modelPath.split('/').pop() || '';
  const boxes: LandmarkBox[] = LANDMARK_COLLIDER_DEFS[filename] ?? [fallbackBox];

  return (
    <group position={obj.position} rotation={obj.rotation}>
      <RigidBody type="fixed" colliders={false}>
        {boxes.map((b, i) => (
          <CuboidCollider key={i} args={b.halfExtents} position={b.offset} />
        ))}
      </RigidBody>
      <group scale={finalScale}>
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}

// ══════════════════════════════════════════════════════
// 4. TREE PROP (Trunk colliders)
// ══════════════════════════════════════════════════════
function TreeProp({ obj }: { obj: PlacedObject }): React.ReactElement {
  const rawScale = Array.isArray(obj.scale) ? obj.scale[0] : (obj.scale || 1);
  const { clonedScene, finalScale } = usePreparedSceneClone(obj.modelPath, rawScale);

  return (
    <group position={obj.position} rotation={obj.rotation}>
      <RigidBody type="fixed" colliders={false} position={[0, 1.8, 0]}>
        <CylinderCollider args={[1.8, 0.65]} />
      </RigidBody>
      <group scale={finalScale}>
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}

// ══════════════════════════════════════════════════════
// 5. PROXIMITY MANAGER (Interaction detection)
// ══════════════════════════════════════════════════════
interface InteractiveTarget {
  id: string;
  title: string;
  position: [number, number, number];
  radiusSq: number;
  action: () => void;
}

const GRAVE_PITS: [number, number, number][] = [
  [14, 0.5, 18]
];

function ProximityManager({
  playerPosRef
}: {
  playerPosRef?: React.MutableRefObject<THREE.Vector3 | null>;
}): null {
  const { setActiveModal, setSelectedProject, setInteractionPrompt, setEasterEggToast, language } = useGameStore();
  const currentPromptTitleRef = useRef<string | null>(null);
  const lastEasterEggTriggerRef = useRef<number>(0);

  const targets = useMemo<InteractiveTarget[]>(() => {
    const t = translations[language].interaction;

    return [
      {
        id: 'statue-bio',
        title: t.statueBio,
        position: [-6, 0.5, -6],
        radiusSq: 14.0,
        action: () => setActiveModal('bio')
      },
      {
        id: 'statue-skills',
        title: t.statueSkills,
        position: [2.5, 0.5, 10],
        radiusSq: 14.0,
        action: () => setActiveModal('skills')
      },
      {
        id: 'statue-contacts',
        title: t.statueContacts,
        position: [7, 0.5, -6],
        radiusSq: 14.0,
        action: () => setActiveModal('contacts')
      },
      {
        id: 'portal-forma',
        title: t.portalForma,
        position: [0, 0.5, -16],
        radiusSq: 20.0,
        action: () => setSelectedProject('forma')
      },
      {
        id: 'portal-terrascope',
        title: t.portalTerrascope,
        position: [-16, 0.5, -8.5],
        radiusSq: 20.0,
        action: () => setSelectedProject('terrascope')
      },
      {
        id: 'portal-lumina',
        title: t.portalLumina,
        position: [16, 0.5, -8],
        radiusSq: 20.0,
        action: () => setSelectedProject('lumina')
      }
    ];
  }, [setActiveModal, setSelectedProject, language]);

  useFrame(() => {
    if (!playerPosRef || !playerPosRef.current) return;
    const p = playerPosRef.current;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return;

    // ── 1. Interactive Landmark Targets ──
    let closestTarget: InteractiveTarget | null = null;
    let closestDistSq = Infinity;

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const dx = p.x - target.position[0];
      const dz = p.z - target.position[2];
      const distSq = dx * dx + dz * dz;

      if (distSq < target.radiusSq && distSq < closestDistSq) {
        closestDistSq = distSq;
        closestTarget = target;
      }
    }

    if (closestTarget) {
      if (currentPromptTitleRef.current !== closestTarget.title) {
        currentPromptTitleRef.current = closestTarget.title;
        setInteractionPrompt({
          title: closestTarget.title,
          action: closestTarget.action
        });
      }
    } else {
      if (currentPromptTitleRef.current !== null) {
        currentPromptTitleRef.current = null;
        setInteractionPrompt(null);
      }
    }

    // ── 2. Easter Egg Grave Pit Levitation Trigger ──
    const now = performance.now();
    let overGrave = false;
    for (let g = 0; g < GRAVE_PITS.length; g++) {
      const gx = p.x - GRAVE_PITS[g][0];
      const gz = p.z - GRAVE_PITS[g][2];
      if (gx * gx + gz * gz < 4.5) {
        overGrave = true;
        break;
      }
    }

    if (overGrave) {
      if (now - lastEasterEggTriggerRef.current > 6000) {
        lastEasterEggTriggerRef.current = now;
        setEasterEggToast({
          title: language === 'uk' ? 'Вам ще зарано!' : 'Not your time yet!',
          text: language === 'uk'
            ? 'Ви не впадете — попереду ще багато крутого коду та проєктів.'
            : "You won't fall — there's still plenty of great code to write."
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
// 6. EXACT MODEL COLLISION BOUNDS DICTIONARY
//    Derived from authentic 3D model geometry measurements
// ══════════════════════════════════════════════════════
interface ColliderBox {
  halfExtents: [number, number, number];
  offset: [number, number, number];
}

interface ModelBound {
  halfExtents: [number, number, number];
  /** Legacy single-height form; ignored when offset is present. */
  heightOffset?: number;
  /** Full center offset in model space (default: [0, heightOffset, 0]). */
  offset?: [number, number, number];
  /** Additional boxes for composite props (skull/lantern baked into a bench, etc.). */
  extraBoxes?: ColliderBox[];
}

const MODEL_COLLIDER_DEFS: Record<string, ModelBound> = {
  // Benches (Accurate seat surface alignment: 0.5m total height, halfExtents.y = 0.25)
  'Bench.glb': { halfExtents: [1.0, 0.25, 0.38], heightOffset: 0.25 },
  // Composite prop: bench + skull-with-candles + lantern baked into one GLB.
  // Offsets measured from the LIVE render (instanced world AABB): the model is
  // centered on its origin — seat slab at world y 0.92..1.06 (x ±1.0, z ±0.5),
  // skull-with-candles on the -x end up to y 2.0, lantern on the +x end to 1.92.
  'Bench-cp2QnHh7bf.glb': {
    halfExtents: [1.0, 0.07, 0.5],
    offset: [0, 0.49, 0],
    extraBoxes: [
      { halfExtents: [0.43, 0.47, 0.5], offset: [-0.58, 1.03, 0] },
      { halfExtents: [0.33, 0.43, 0.4], offset: [0.62, 0.99, 0] }
    ]
  },

  // Fences (Perimeter and internal dividers)
  'Fence.glb': { halfExtents: [2.05, 1.1, 0.3], heightOffset: 1.1 },
  'Fence Broken.glb': { halfExtents: [2.05, 1.1, 0.3], heightOffset: 1.1 },
  'Fence Gate.glb': { halfExtents: [2.05, 1.1, 0.3], heightOffset: 1.1 },
  'Iron Fence.glb': { halfExtents: [2.05, 1.1, 0.09], heightOffset: 1.1 },
  'Damaged Iron fence.glb': { halfExtents: [2.05, 1.1, 0.09], heightOffset: 1.1 },
  'Fence Pillar.glb': { halfExtents: [0.35, 1.1, 0.35], heightOffset: 1.1 },
  'Broken Fence Pillar.glb': { halfExtents: [0.35, 0.7, 0.35], heightOffset: 0.7 },

  // Coffins
  'Coffin.glb': { halfExtents: [1.05, 0.7, 1.55], heightOffset: 0.7 },
  'Coffin-ySERERWPgE.glb': { halfExtents: [1.05, 0.45, 1.55], heightOffset: 0.45 },

  // Graves & Gravestones
  'Grave.glb': { halfExtents: [1.05, 1.1, 0.55], heightOffset: 1.1 },
  'Damaged Grave.glb': { halfExtents: [1.05, 1.1, 0.55], heightOffset: 1.1 },
  'Gravestone.glb': { halfExtents: [0.75, 0.85, 0.3], heightOffset: 0.85 },
  'Gravestone-lrEHKjTy29.glb': { halfExtents: [1.0, 1.1, 0.5], heightOffset: 1.1 },
  'Grave Marker.glb': { halfExtents: [0.45, 0.65, 0.3], heightOffset: 0.65 },

  // Shrines, Plaques & Altars
  'Shrine.glb': { halfExtents: [0.65, 0.95, 0.65], heightOffset: 0.95 },
  'Shrine-Qq8M5LSXQ2.glb': { halfExtents: [0.65, 0.95, 0.65], heightOffset: 0.95 },
  'Plaque.glb': { halfExtents: [1.0, 0.2, 1.0], heightOffset: 0.2 },
  'Plaque Candles.glb': { halfExtents: [1.0, 0.57, 1.0], heightOffset: 0.57 },

  // Arch & Gates
  'Arch.glb': { halfExtents: [1.3, 1.4, 0.4], heightOffset: 1.4 },
  'Arch Gate.glb': { halfExtents: [1.3, 1.4, 0.4], heightOffset: 1.4 },

  // Pillars & Posts
  'Pillar.glb': { halfExtents: [0.35, 1.1, 0.35], heightOffset: 1.1 },
  'Post.glb': { halfExtents: [0.35, 1.1, 0.35], heightOffset: 1.1 },
  'Post Lantern.glb': { halfExtents: [0.35, 1.2, 0.35], heightOffset: 1.2 },
  'Post With Skull.glb': { halfExtents: [0.35, 1.2, 0.35], heightOffset: 1.2 },
  'Hanging Lantern.glb': { halfExtents: [0.35, 0.7, 0.35], heightOffset: 0.7 },
  'Lantern.glb': { halfExtents: [0.3, 0.5, 0.3], heightOffset: 0.5 },

  // Pumpkins & Ground Scatter
  'Jackolantern.glb': { halfExtents: [0.75, 0.65, 0.7], heightOffset: 0.65 },
  'Pumpkin Orange Jacko.glb': { halfExtents: [0.75, 0.65, 0.7], heightOffset: 0.65 },
  'Pumpkin.glb': { halfExtents: [0.5, 0.35, 0.5], heightOffset: 0.35 },
  'Small Pumpkin.glb': { halfExtents: [0.5, 0.35, 0.5], heightOffset: 0.35 },
  'Small Pumpkin-KnfqSrTtUX.glb': { halfExtents: [0.3, 0.3, 0.3], heightOffset: 0.3 },
  'Yellow pumpkin.glb': { halfExtents: [0.3, 0.28, 0.3], heightOffset: 0.28 },
  'Skull.glb': { halfExtents: [0.46, 0.45, 0.46], heightOffset: 0.45 },
  'Skull Candle.glb': { halfExtents: [0.46, 0.6, 0.47], heightOffset: 0.6 },
  'Candles.glb': { halfExtents: [0.23, 0.4, 0.18], heightOffset: 0.4 },
  'Candle Melted.glb': { halfExtents: [0.3, 0.3, 0.3], heightOffset: 0.3 },
  // Bones & flat Rocks: ground scatter with FLAT colliders matching the
  // measured model heights — the capsule auto-steps them, so the character
  // walks over naturally (no invisible platform, no pass-through).
  'Bone.glb': { halfExtents: [0.36, 0.14, 0.1], heightOffset: 0.14 },
  'Bone-gVT6iydSY6.glb': { halfExtents: [0.31, 0.09, 0.15], heightOffset: 0.09 },
  'Bone-2jLwMoAb2y.glb': { halfExtents: [0.56, 0.14, 0.1], heightOffset: 0.14 },
  'Ribcage.glb': { halfExtents: [0.43, 0.43, 0.38], heightOffset: 0.43 },
  'Rocks.glb': { halfExtents: [0.83, 0.05, 0.86], heightOffset: 0.05 },
};

interface ObstacleColliderItem {
  id: string;
  halfExtents: [number, number, number];
  position: [number, number, number];
  rotation: [number, number, number];
}

// ══════════════════════════════════════════════════════
// 7. WORLD SCENE ROOT
// ══════════════════════════════════════════════════════
interface WorldSceneProps {
  playerPosRef?: React.MutableRefObject<THREE.Vector3 | null>;
}

/**
 * WorldScene
 * 
 * Master 3D environment graph rendering 379 placed objects on the Aetheria island.
 * 
 * Architectural Highlights:
 * - GPU Instancing Batching: Repeated props (fences, gravestones, ground tiles, scatter props) are grouped by GLTF model and rendered via `THREE.InstancedMesh` (~300 objects in ~15 draw calls).
 * - Compound Physics Body: All static obstacle colliders are assembled into a single rigid body (`type="fixed"`), eliminating individual component overhead.
 * - Single-Loop Glow Manager: Drives all 6 landmark pulsars and glowing rings in a single synchronized frame update.
 * - Particle Levitation: Simulates upward ethereal light particles over the secret grave pit.
 * - Proximity Interaction Tracker: Monitors player distance squared to landmark triggers without complex physics raycasts.
 */
export default function WorldScene({ playerPosRef }: WorldSceneProps): React.ReactElement {
  const { instancedGroups, landmarks, trees, obstacleColliders } = useMemo(() => {
    const groups: Record<string, PlacedObject[]> = {};
    const landmarkList: PlacedObject[] = [];
    const treeList: PlacedObject[] = [];
    const colliders: ObstacleColliderItem[] = [];

    islandSceneData.placedObjects.forEach((obj: PlacedObject) => {
      const lower = obj.modelPath.toLowerCase();
      const filename = obj.modelPath.split('/').pop() || '';
      const isLandmark = lower.includes('crypt') || lower.includes('statue') || obj.type === 'statue';
      const isTree = lower.includes('tree') || lower.includes('pine');
      const isFloor = lower.includes('floor') || lower.includes('tile') || lower.includes('path');

      if (isLandmark) {
        landmarkList.push(obj);
      } else if (isTree) {
        treeList.push(obj);
      } else {
        if (!groups[obj.modelPath]) groups[obj.modelPath] = [];
        groups[obj.modelPath].push(obj);

        if (!isFloor) {
          const def = MODEL_COLLIDER_DEFS[filename];
          if (def) {
            const rawScale = Array.isArray(obj.scale) ? obj.scale[0] : (obj.scale || 1);
            const off = def.offset ?? [0, def.heightOffset ?? 0, 0];
            // XZ offsets live in the MODEL's local frame — rotate them by the
            // placement yaw, or rotated instances (π etc.) get mirrored
            // colliders hanging in the air next to the visible prop.
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
            (def.extraBoxes ?? []).forEach((box, bi) => {
              const [ex, ez] = rotXZ(box.offset[0], box.offset[2]);
              colliders.push({
                id: `${obj.id}-x${bi}`,
                halfExtents: [
                  box.halfExtents[0] * rawScale,
                  box.halfExtents[1] * rawScale,
                  box.halfExtents[2] * rawScale
                ],
                position: [
                  obj.position[0] + ex * rawScale,
                  obj.position[1] + box.offset[1] * rawScale,
                  obj.position[2] + ez * rawScale
                ],
                rotation: obj.rotation || [0, 0, 0]
              });
            });
          }
        }
      }
    });

    return {
      instancedGroups: groups,
      landmarks: landmarkList,
      trees: treeList,
      obstacleColliders: colliders
    };
  }, []);

  return (
    <group>
      {/* ── Proximity Interaction Manager (1 useFrame) ── */}
      <ProximityManager playerPosRef={playerPosRef} />

      {/* ── Unified Glow Manager for all 6 landmarks (1 useFrame) ── */}
      <GlowManager />

      {/* ── Grave Pit Levitation Ethereal Floating Particles ── */}
      <GraveFloatingParticles />

      {/* ── Instanced Batched Meshes (~300 objects in ~15 draw calls) ── */}
      {Object.entries(instancedGroups).map(([modelPath, instances]) => (
        <Suspense key={modelPath} fallback={null}>
          <InstancedModelGroup modelPath={modelPath} instances={instances} />
        </Suspense>
      ))}

      {/* ── Interactive Landmarks (6 objects with individual colliders) ── */}
      {landmarks.map((obj) => (
        <Suspense key={obj.id} fallback={null}>
          <LandmarkProp obj={obj} />
        </Suspense>
      ))}

      {/* ── Trees with trunk colliders (22 objects) ── */}
      {trees.map((obj) => (
        <Suspense key={obj.id} fallback={null}>
          <TreeProp obj={obj} />
        </Suspense>
      ))}

      {/* ── Unified Compound Static Obstacle Body (100% Solid & Precise) ── */}
      <RigidBody type="fixed" colliders={false}>
        {/* Outer Perimeter Walls */}
        <CuboidCollider args={[25, 1.8, 0.5]} position={[0, 1.8, -24.5]} />
        <CuboidCollider args={[25, 1.8, 0.5]} position={[0, 1.8, 24.5]} />
        <CuboidCollider args={[0.5, 1.8, 25]} position={[-24.5, 1.8, 0]} />
        <CuboidCollider args={[0.5, 1.8, 25]} position={[24.5, 1.8, 0]} />

        {/* All Cemetery Obstacles (Benches, Fences, Graves, Coffins, Shrines, Pillars, Pumpkins) */}
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

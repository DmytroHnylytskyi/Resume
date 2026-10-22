'use client';

/**
 * WorldScene — 3-Tier Sci-Fi Space Outpost environment module for Aetheria.
 *
 * Owns everything that is NOT the player character:
 * - High-performance GPU instancing via `THREE.InstancedMesh` for 900+ modular pieces
 * - Physics colliders built from MEASURED mesh bounds (src/data/modelBounds.generated.ts)
 *   via src/data/sceneColliders.ts — terrain boxes + low invisible perimeter walls
 *   at the island edge (props and ramps get exact physics from their own mesh triangles)
 * - 6 interactive animated NPC crew members with dynamic look-at rotation
 * - Proximity interaction manager dispatching holographic dialogue HUD prompts
 */

import React, { useMemo, useRef, useEffect, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider, TrimeshCollider } from '@react-three/rapier';
import * as THREE from 'three';
import rawIslandSceneData from '../../data/islandScene.json';
import { IslandSceneData, PlacedObject } from '../../types/scene';
import { MODEL_BOUNDS } from '../../data/modelBounds.generated';
import { buildSceneColliders, UNIT_SCALE } from '../../data/sceneColliders';
import { NPC_POSITIONS } from '../../data/npcPlacements';
import { useGameStore } from '../../store/useGameStore';
import { NPC_DIALOGUES, NPCDialogueDef } from '../../data/npcDialogues';
import { getGlobalCyberAudio } from '../../hooks/cyberAudio';
import { debugBridge, DebugColliderSnapshot } from '../../store/debugState';
import CrewNPCs from './CrewNPCs';
import CrewMarkers from './CrewMarkers';
import LampGlow from './LampGlow';
import { getNightFactor } from '../../store/dayNightState';
import {
  buildLampEmissiveMask,
  disposeKitSourceMaterials,
  makeCheapMaterial,
  mergeSceneGeometry,
  useKitMaterial
} from './kitAssets';

const islandSceneData = rawIslandSceneData as unknown as IslandSceneData;

// Preload all unique scene assets in parallel on initial evaluation.
// Skip NPC and Mannequin files (filter 1:1 with the render groups below):
// WorldScene never renders them — CrewNPCs loads and preloads
// its own Mannequin clones and rigs, while npc_*.glb (~2.4 MB) here only
// inflated the drei useProgress queue and traffic.
if (typeof window !== 'undefined') {
  const uniquePaths = Array.from(new Set(islandSceneData.placedObjects.map((o) => o.modelPath)));
  uniquePaths
    .filter((path) => {
      const lower = path.toLowerCase();
      return !lower.includes('npc_') && !lower.includes('mannequin');
    })
    .forEach((path) => {
      try {
        useGLTF.preload(path);
      } catch (_) {}
    });
}

// NPC positions for ProximityManager come from ../../data/npcPlacements —
// one resolver for the whole game (physics, radar, overhead markers, this
// manager). Per frame only coordinates are read, no find() over 997 objects.

// ══════════════════════════════════════════════════════
// 1. HIGH-PERF INSTANCED RENDERER FOR REPEATED PROPS
// ══════════════════════════════════════════════════════
interface InstancedModelGroupProps {
  modelPath: string;
  instances: PlacedObject[];
  /** Shared catalog atlas material (one for all static geometry — see kitAssets.ts). */
  material: THREE.Material;
}

function isTerrainSurfaceModel(filenameLower: string): boolean {
  return filenameLower.startsWith('terrain_') || filenameLower.startsWith('rock');
}

// Ground detail texture (256²): large mottling + fine grain + gravel
// speckles. Applied in the shader in WORLD coordinates (vWorldXZ), so the
// pattern continues seamlessly across slab seams — instead of "smearing in
// bands" you see real rocky ground.
function getTerrainDetailTexture(): THREE.CanvasTexture {
  const w = window as unknown as Record<string, THREE.CanvasTexture | undefined>;
  const cacheKey = '__aetheriaTerrainDetail';
  const existing = w[cacheKey];
  if (existing) return existing;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Base large mottling: 16×16 noise → upscale (soft spots 0.35..0.8)
    const l1 = document.createElement('canvas');
    l1.width = l1.height = 16;
    const c1 = l1.getContext('2d');
    if (c1) {
      const img = c1.createImageData(16, 16);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = (90 + Math.random() * 115) | 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      c1.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(l1, 0, 0, 256, 256);
    }
    // Mid octave: 64×64 noise, semi-transparent (varies the tone locally)
    const l2 = document.createElement('canvas');
    l2.width = l2.height = 64;
    const c2 = l2.getContext('2d');
    if (c2) {
      const img = c2.createImageData(64, 64);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = (110 + Math.random() * 100) | 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 130;
      }
      c2.putImageData(img, 0, 0);
      ctx.drawImage(l2, 0, 0, 256, 256);
    }
    // Fine dense grain: 128×128 on top
    const l3 = document.createElement('canvas');
    l3.width = l3.height = 128;
    const c3 = l3.getContext('2d');
    if (c3) {
      const img = c3.createImageData(128, 128);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = (120 + Math.random() * 110) | 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 110;
      }
      c3.putImageData(img, 0, 0);
      ctx.drawImage(l3, 0, 0, 256, 256);
    }
    // Gravel speckles: dark pebbles and light flecks
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 0.6 + Math.random() * 1.6;
      const dark = Math.random() < 0.55;
      ctx.fillStyle = dark ? `rgba(30, 24, 20, ${0.25 + Math.random() * 0.4})` : `rgba(235, 228, 215, ${0.2 + Math.random() * 0.35})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  w[cacheKey] = tex;
  return tex;
}

function InstancedModelGroup({ modelPath, instances, material }: InstancedModelGroupProps): React.ReactElement | null {
  const { scene } = useGLTF(modelPath);
  const gl = useThree((s) => s.gl);
  const instRef = useRef<THREE.InstancedMesh>(null);
  const filenameLower = (modelPath.split('/').pop() || '').toLowerCase();
  // Adjacent floor slabs cast nothing on each other — sending them into
  // the shadow pass is wasted; shape shadows come from props and terrain_tall rocks.
  const isGroundPlate = filenameLower.startsWith('terrain_low');
  const isTerrainSurface = isTerrainSurfaceModel(filenameLower);
  // Lamps get their own variant of the shared material with emissive:
  // the heads glow from the atlas, the stem metal stays dark. This is not a new
  // material per lamp — one clone for the whole instanced group.
  const isLamp = filenameLower.startsWith('lights');
  const lampMask = useMemo(
    () => (isLamp ? buildLampEmissiveMask(scene) : null),
    [isLamp, scene]
  );
  const lampMaterial = useMemo(() => {
    if (!isLamp) return null;
    const clone = material.clone() as THREE.MeshStandardMaterial | THREE.MeshLambertMaterial;
    clone.emissive = new THREE.Color('#ffcf8a');
    // Only the UV islands of the two heads; without the mask there is no emissive at all,
    // so the whole stem does not glow again.
    clone.emissiveMap = lampMask;
    clone.emissiveIntensity = 0.5;
    clone.needsUpdate = true;
    return clone;
  }, [isLamp, material, lampMask]);
  useEffect(() => () => lampMaterial?.dispose(), [lampMaterial]);
  useEffect(() => () => lampMask?.dispose(), [lampMask]);
  useFrame(() => {
    if (lampMaterial) lampMaterial.emissiveIntensity = 0.5 + 0.9 * getNightFactor();
  });

  // The model's submeshes (up to 5 primitives for trucks/drills) are baked into one
  // geometry: one InstancedMesh per model instead of N draw calls.
  const geometry = useMemo(() => mergeSceneGeometry(scene), [scene]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  // Atlas copies inside the GLTF are no longer needed — release them.
  useEffect(() => disposeKitSourceMaterials(scene), [scene]);

  const meshData = useMemo(() => {
    // Single source of dimensions shared with physics: both the visual and the colliders
    // are scaled by one UNIT_SCALE and anchored to the same
    // measured mesh minimum Y (MODEL_BOUNDS). The previous getUnitScale
    // heuristic based on maxDim thresholds removed the desync only by chance —
    // all 72 catalog models have maxDim < 10 and it always returned 1.
    const filename = modelPath.split('/').pop() || '';
    const bounds = MODEL_BOUNDS[filename];
    if (bounds) return { uScale: UNIT_SCALE, minY: bounds.min[1] };

    // Safety fallback for models outside the extractModelBounds catalog
    // (its test guarantees an entry, so this path is dead, but without it
    // a new model without bounds would break the visuals).
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    let uScale = 1;
    if (maxDim <= 0) uScale = 1;
    else if (maxDim > 1000) uScale = 1 / 1000;
    else if (maxDim > 100) uScale = 1 / 100;
    else if (maxDim > 10) uScale = 1 / 10;
    const minY = box.isEmpty() ? 0 : box.min.y;
    return { uScale, minY };
  }, [scene, modelPath]);

  const placementMatrices = useMemo(() => {
    const result: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();

    for (let i = 0; i < instances.length; i++) {
      const obj = instances[i];
      const rawScale = Array.isArray(obj.scale) ? obj.scale[0] : (obj.scale || 1);
      const fs = rawScale * meshData.uScale;

      // The terrain_low floor slab is a perfect 2×2×1 cube: a 90° rotation around Y
      // changes neither the silhouette nor the fit with neighbors (the side faces are equivalent).
      // But it does rotate the linear gradient baked into the atlas on the top
      // face (a 22% brightness drop along v went the same way on EVERY slab) —
      // without this all 728 slabs carried the same shading and folded into
      // even bands every 2 m.
      const plateYaw = isGroundPlate
        ? (((Math.round(obj.position[0] / 2) * 5 + Math.round(obj.position[2] / 2) * 11) % 4) + 4) % 4 *
          (Math.PI / 2)
        : 0;

      dummy.position.set(
        obj.position[0],
        obj.position[1] - meshData.minY * fs,
        obj.position[2]
      );
      dummy.rotation.set(obj.rotation[0], obj.rotation[1] + plateYaw, obj.rotation[2]);
      dummy.scale.set(fs, fs, fs);
      dummy.updateMatrix();
      result.push(dummy.matrix.clone());
    }
    return result;
  }, [instances, meshData, isGroundPlate]);

  useEffect(() => {
    const instMesh = instRef.current;
    if (!instMesh) return;
    // Node local matrices are already baked into the merged geometry.
    for (let i = 0; i < placementMatrices.length; i++) {
      instMesh.setMatrixAt(i, placementMatrices[i]);
    }
    instMesh.instanceMatrix.needsUpdate = true;
    instMesh.computeBoundingSphere();
  }, [placementMatrices]);

  // ── Ground: fully matte diffuse material + world-tiled detail ──
  //
  // "White highlights in even bands" on the ground came from two things, both about
  // grazing angles (2×2 m slabs receding to the horizon):
  //  1. Dielectric specular of MeshStandardMaterial: F0 = 0.04, but at
  //     grazing angles Fresnel pulls reflection almost to 1. roughness = 1
  //     does not remove the highlight, only smears it — slabs stretched by perspective
  //     shine in bands. The ground needs no highlight at all, so the material
  //     is swapped for MeshLambertMaterial: it has no specular branch in the shader,
  //     its response to light is purely diffuse.
  //  2. Mip-level selection at grazing angles: anisotropy raised 4 → 8, and
  //     the two fine detail-texture octaves fade with distance (toward their
  //     average, not to zero — otherwise the ground at the horizon would darken).
  // The diffuse part is the same (catalog atlas × world-tiled detail), so the ground
  // look is preserved — only its response to light changes.
  // ── Ground: fully matte diffuse material + world-tiled detail ──
  //
  // "White highlights in even bands" on the ground came from two things, both about
  // grazing angles (2×2 m slabs receding to the horizon):
  //  1. Dielectric specular of MeshStandardMaterial: F0 = 0.04, but at
  //     grazing angles Fresnel pulls reflection almost to 1. roughness = 1
  //     does not remove the highlight, only smears it — slabs stretched by perspective
  //     shine in bands. The ground needs no highlight at all, so the material
  //     is swapped for MeshLambertMaterial: it has no specular branch in the shader,
  //     its response to light is purely diffuse.
  //  2. Mip-level selection at grazing angles: anisotropy raised 4 → 8, and
  //     the two fine detail-texture octaves fade with distance (toward their
  //     average, not to zero — otherwise the ground at the horizon would darken).
  // The diffuse part is the same (catalog atlas × world-tiled detail), so the ground
  // look is preserved — only its response to light changes.
  //
  // The material is derivative: the map is shared with kitMaterial (one texture for the whole
  // scene), so there are still no atlas copies.
  const terrainMaterial = useMemo(() => {
    if (!isTerrainSurface) return null;

    const mat = makeCheapMaterial(material, {
      name: 'terrain_matte',
      // Floor slabs are perfect cubes and already have per-face normals: flat
      // adds nothing, while its normal derived from screen-space derivatives
      // is unstable at grazing angles. Slopes and rocks need the faceting —
      // flatShading stays on for them.
      flatShading: !isGroundPlate
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTerrainDetail = { value: getTerrainDetailTexture() };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWorldXZ;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          #ifdef USE_INSTANCING
            vWorldXZ = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
          #else
            vWorldXZ = (modelMatrix * vec4(transformed, 1.0)).xyz;
          #endif`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWorldXZ;\nuniform sampler2D uTerrainDetail;')
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          // World-tiled detail: periods 2 m / 0.69 m / 0.23 m — the pattern
          // continues across slab seams without joints.
          float detA = texture2D(uTerrainDetail, vWorldXZ.xz * 0.50).r;
          float detB = texture2D(uTerrainDetail, vWorldXZ.xz * 1.45 + 0.37).r;
          float detC = texture2D(uTerrainDetail, vWorldXZ.xz * 4.30 + 0.71).r;
          // Fine octaves fade with distance toward their average (0.25), not
          // to zero: the average ground brightness does not change, while the ripple at
          // a grazing angle fades before it starts to alias.
          float detailFade = 1.0 - smoothstep(7.0, 30.0, length(vViewPosition));
          float fine = detB * 0.35 + detC * 0.15;
          float detail = detA * 0.50 + mix(0.25, fine, detailFade);
          diffuseColor.rgb *= (0.78 + 0.44 * detail);
          // Slight warm-cool hue variation (the ground is not monochrome)
          float tint = (detB - 0.5) * 0.12 * detailFade;
          diffuseColor.rgb *= vec3(1.0 + tint, 1.0 + tint * 0.35, 1.0 - tint);`
        );
    };
    mat.customProgramCacheKey = () => 'terrain-detail-v2';
    mat.needsUpdate = true;
    return mat;
  }, [material, isTerrainSurface, isGroundPlate]);

  useEffect(() => () => terrainMaterial?.dispose(), [terrainMaterial]);

  // Anisotropy of the shared map — once per scene, not per model.
  useEffect(() => {
    const map = (material as THREE.MeshStandardMaterial).map;
    if (!map) return;
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    map.anisotropy = aniso;
    const detailTex = getTerrainDetailTexture();
    detailTex.anisotropy = aniso;
  }, [gl, material]);

  if (!geometry) return null;

  return (
    <instancedMesh
      ref={instRef}
      name={modelPath}
      args={[geometry, terrainMaterial ?? lampMaterial ?? material, instances.length]}
      frustumCulled={true}
      receiveShadow
      castShadow={!isGroundPlate}
    />
  );
}

// ══════════════════════════════════════════════════════
// 1b. EXACT PHYSICS OF SLOPES AND PROPS — MESH TRIANGLES (TrimeshCollider)
// ══════════════════════════════════════════════════════
/**
 * ModelShapeColliders — exact physics of non-convex shapes from their triangles.
 *
 * The mechanism was proven on ramps: an AABB box for antennas/turbines with blades/rocks/slabs
 * with curbs drifted from the mesh — the player jumped onto the empty box space and hit
 * invisible walls. The placement matrix is identical to the InstancedModelGroup visual
 * (scale·UNIT_SCALE, anchored to the measured minimum Y from MODEL_BOUNDS,
 * rotation, position × GLTF node world matrix) — trimesh physics is bit-for-bit
 * with the visual. In ?debug=1 a wireframe of the bodies is drawn over them to check
 * "mesh vs collider" by eye.
 */
interface ModelShapeCollidersProps {
  modelPath: string;
  instances: PlacedObject[];
  debugColor: number;
}

function ModelShapeColliders({ modelPath, instances, debugColor }: ModelShapeCollidersProps): React.ReactElement | null {
  const { scene } = useGLTF(modelPath);

  const bodies = useMemo(() => {
    scene.updateMatrixWorld(true);
    const meshes: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
    });

    const mat4 = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const composed = new THREE.Matrix4();
    const vertex = new THREE.Vector3();

    return instances.map((obj) => {
      const filename = obj.modelPath.split('/').pop() || '';
      const bounds = MODEL_BOUNDS[filename];
      const fs = (Array.isArray(obj.scale) ? obj.scale[0] : obj.scale || 1) * UNIT_SCALE;
      // Same placement matrix as InstancedModelGroup: pivot at the
      // measured minimum Y, scale fs, yaw from islandScene.json.
      mat4.compose(
        new THREE.Vector3(
          obj.position[0],
          obj.position[1] - bounds.min[1] * fs,
          obj.position[2]
        ),
        quat.setFromEuler(new THREE.Euler(obj.rotation[0], obj.rotation[1], obj.rotation[2], 'XYZ')),
        new THREE.Vector3(fs, fs, fs)
      );

      const vertices: number[] = [];
      const indices: number[] = [];
      meshes.forEach((m) => {
        const geometry = m.geometry;
        const position = geometry.getAttribute('position');
        if (!position) return;
        composed.multiplyMatrices(mat4, m.matrixWorld);
        const base = vertices.length / 3;
        for (let i = 0; i < position.count; i++) {
          vertex.fromBufferAttribute(position, i).applyMatrix4(composed);
          vertices.push(vertex.x, vertex.y, vertex.z);
        }
        const index = geometry.getIndex();
        if (index) {
          for (let i = 0; i < index.count; i++) indices.push(base + index.getX(i));
        } else {
          for (let i = 0; i < position.count; i++) indices.push(base + i);
        }
      });

      let debugGeometry: THREE.BufferGeometry | undefined;
      if (IS_DEBUG) {
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geom.setIndex(indices);
        // Edges only (not a triangle mesh) — a readable wireframe over the world.
        debugGeometry = new THREE.EdgesGeometry(geom, 1);
        geom.dispose();
      }

      return {
        id: obj.id,
        vertices: new Float32Array(vertices),
        indices: new Uint32Array(indices),
        debugGeometry
      };
    });
  }, [scene, instances]);

  useEffect(() => {
    return () => {
      bodies.forEach((b) => b.debugGeometry?.dispose());
    };
  }, [bodies]);

  if (bodies.length === 0) return null;

  // One fixed body per model instead of one per placement: the vertices
  // are already in world coordinates, so the body sits at zero and the trimesh colliders
  // simply stack into a compound. On the map that is ~44 bodies instead of ~300 —
  // exactly the difference the profile showed in the forEach over rigid body
  // states on every physics step.
  return (
    <RigidBody type="fixed" colliders={false}>
      {bodies.map((b) => (
        <TrimeshCollider args={[b.vertices, b.indices]} key={b.id} friction={0.8} restitution={0} />
      ))}
      {bodies.map((b) =>
        b.debugGeometry ? (
          <lineSegments key={`dbg-${b.id}`} geometry={b.debugGeometry}>
            <lineBasicMaterial color={debugColor} transparent opacity={0.45} />
          </lineSegments>
        ) : null
      )}
    </RigidBody>
  );
}

/**
 * Merging slabs lying at the same height into large boxes.
 *
 * sceneColliders (and its gate) remain exact "one slab — one box":
 * that is the source of truth for verification. But there is no need to send 871 separate boxes
 * into the physics world — they are all static, axis-aligned and laid out on a
 * 2×2 m grid. We merge consecutive slabs of one row into one long box:
 * the volume is the same bit-for-bit, while the Rapier broad phase traverses far fewer
 * colliders. We leave slopes and tall/mining alone (they have a different size).
 */
function mergeGroundColliders(colliders: ReturnType<typeof buildSceneColliders>['colliders']): typeof colliders {
  const merged: typeof colliders = [];
  const rows = new Map<string, typeof colliders>();

  for (const c of colliders) {
    const isPlate =
      c.kind === 'terrain' &&
      Math.abs(c.rotation[0]) < 1e-4 &&
      Math.abs(c.rotation[1]) < 1e-4 &&
      Math.abs(c.rotation[2]) < 1e-4 &&
      Math.abs(c.halfExtents[0] - 1) < 1e-3 &&
      Math.abs(c.halfExtents[1] - 0.5) < 1e-3 &&
      Math.abs(c.halfExtents[2] - 1) < 1e-3;

    if (!isPlate) {
      merged.push(c);
      continue;
    }
    const top = c.position[1] + c.halfExtents[1];
    const key = `${top.toFixed(3)}|${c.position[2].toFixed(3)}`;
    const list = rows.get(key);
    if (list) list.push(c);
    else rows.set(key, [c]);
  }

  rows.forEach((list) => {
    list.sort((a, b) => a.position[0] - b.position[0]);
    let start = list[0];
    let end = list[0];
    const flush = (): void => {
      const centerX = (start.position[0] + end.position[0]) / 2;
      const halfX = (end.position[0] - start.position[0]) / 2 + start.halfExtents[0];
      merged.push({
        ...start,
        id: `merged_${start.id}_${end.id}`,
        halfExtents: [halfX, start.halfExtents[1], start.halfExtents[2]],
        position: [centerX, start.position[1], start.position[2]]
      });
    };

    for (let i = 1; i < list.length; i++) {
      const next = list[i];
      if (Math.abs(next.position[0] - end.position[0] - 2) < 1e-3) {
        end = next;
      } else {
        flush();
        start = next;
        end = next;
      }
    }
    flush();
  });

  return merged;
}

// ══════════════════════════════════════════════════════
// 2. PROXIMITY INTERACTION MANAGER
// ══════════════════════════════════════════════════════
function ProximityManager({
  playerPosRef
}: {
  playerPosRef?: React.MutableRefObject<THREE.Vector3 | null>;
}): null {
  // Granular Zustand subscriptions: whole-store subscription would re-render
  // this subtree (inside Canvas) on ANY store change (prompt edge, toast,
  // day/night theme sync) — the same pattern as in CharacterController.tsx.
  const language = useGameStore((s) => s.language);
  const currentPromptTitleRef = useRef<string | null>(null);

  const npcList = useMemo(() => Object.values(NPC_DIALOGUES), []);

  useFrame(() => {
    if (!playerPosRef || !playerPosRef.current) return;
    const p = playerPosRef.current;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return;

    // We read actions via getState(): subscribing to them is unnecessary — the references are
    // stable, while subscribing to interactionPrompt would re-render the scene
    // subtree on every proximity edge.
    const { setActiveDialogue, setInteractionPrompt } = useGameStore.getState();

    // ── 1. Interactive NPC Crew Proximity ──
    let closestNpc: NPCDialogueDef | null = null;
    let closestDistSq = Infinity;

    for (let i = 0; i < npcList.length; i++) {
      const npc = npcList[i];
      // Position from the prebuilt NPC_POSITIONS (Map) — no
      // placedObjects.find() with toLowerCase() over 114 objects every frame.
      const targetPos = NPC_POSITIONS.get(npc.id) ?? npc.position;
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
  });

  return null;
}

// ══════════════════════════════════════════════════════
// 3. SCENE COLLIDERS BUILT FROM MEASURED MESH BOUNDS
// ══════════════════════════════════════════════════════
// All physics is moved into the pure module ../../data/sceneColliders.ts:
// it builds colliders from islandSceneData + MODEL_BOUNDS without three.js,
// so the same list is recomputed by the independent gate
// scripts/checkColliders.mjs (Node strips types without a build).

// ══════════════════════════════════════════════════════
// 5. WORLD SCENE ROOT
// ══════════════════════════════════════════════════════
interface WorldSceneProps {
  playerPosRef?: React.MutableRefObject<THREE.Vector3 | null>;
}

// ?debug=1: physics wireframe over the world — a tool to check "mesh vs collider"
const IS_DEBUG =
  typeof window !== 'undefined' && window.location.search.includes('debug');

if (IS_DEBUG) {
  (window as unknown as Record<string, unknown>).__aetheriaDebug = debugBridge;
}

const DEBUG_KIND_COLORS: Record<string, number> = {
  terrain: 0x34d399,
  slope: 0xfb923c,
  obstacle: 0x60a5fa,
  support: 0xf472b6,
  perimeter: 0xfacc15,
  safetyFloor: 0xa78bfa
};

/** Wireframe overlay of all static colliders + the __aetheriaDebug console bridge. */
function PhysicsDebugOverlay({
  colliders,
  playerPosRef
}: {
  colliders: ReturnType<typeof buildSceneColliders>['colliders'];
  playerPosRef?: React.MutableRefObject<THREE.Vector3 | null>;
}): React.ReactElement | null {
  const group = useMemo(() => {
    const g = new THREE.Group();
    g.name = 'PhysicsDebugOverlay';
    const records: { snap: DebugColliderSnapshot; reach: number; cx: number; cy: number; cz: number }[] = [];
    colliders.forEach((c) => {
      const geo = new THREE.BoxGeometry(c.halfExtents[0] * 2, c.halfExtents[1] * 2, c.halfExtents[2] * 2);
      const edges = new THREE.EdgesGeometry(geo);
      geo.dispose();
      const box = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: DEBUG_KIND_COLORS[c.kind] ?? 0xffffff })
      );
      box.name = c.id;
      box.position.set(c.position[0], c.position[1], c.position[2]);
      box.rotation.set(c.rotation[0], c.rotation[1], c.rotation[2]);
      g.add(box);
      records.push({
        snap: { id: c.id, kind: c.kind, halfExtents: [...c.halfExtents], position: [...c.position] },
        reach: Math.max(c.halfExtents[0], c.halfExtents[1], c.halfExtents[2]),
        cx: c.position[0],
        cy: c.position[1],
        cz: c.position[2]
      });
    });

    const bridge = debugBridge as unknown as Record<string, unknown>;
    bridge.showColliders = (on: boolean) => {
      g.visible = on;
    };
    bridge.listNear = (radius = 2.2) =>
      records
        .filter((r) => {
          const dx = debugBridge.x - r.cx;
          const dy = debugBridge.y - r.cy;
          const dz = debugBridge.z - r.cz;
          return Math.sqrt(dx * dx + dy * dy + dz * dz) <= radius + r.reach;
        })
        .map((r) => r.snap);
    // Inventory of placements near the player (model name + position) — for
    // field verification of the layout without rendering.
    bridge.propsNear = (radius = 4) => {
      const out: { name: string; x: number; y: number; z: number }[] = [];
      islandSceneData.placedObjects.forEach((o) => {
        const dx = debugBridge.x - o.position[0];
        const dy = debugBridge.y - o.position[1];
        const dz = debugBridge.z - o.position[2];
        if (Math.hypot(dx, dy, dz) <= radius) out.push({ name: (o.modelPath.split('/').pop() || ''), x: +o.position[0].toFixed(2), y: +o.position[1].toFixed(2), z: +o.position[2].toFixed(2) });
      });
      return out;
    };

    return g;
  }, [colliders]);

  useEffect(
    () => () => {
      debugBridge.showColliders = null;
      debugBridge.listNear = null;
      group.traverse((obj) => {
        const lines = obj as THREE.LineSegments;
        if (lines.isLineSegments) {
          lines.geometry.dispose();
          (lines.material as THREE.Material).dispose();
        }
      });
    },
    [group]
  );

  useFrame(() => {
    if (!playerPosRef?.current) return;
    debugBridge.x = playerPosRef.current.x;
    debugBridge.y = playerPosRef.current.y;
    debugBridge.z = playerPosRef.current.z;
  });

  return <primitive object={group} />;
}

export default function WorldScene({ playerPosRef }: WorldSceneProps): React.ReactElement {
  // One atlas + one material for all static geometry (see kitAssets.ts).
  const kitMaterial = useKitMaterial();

  const { instancedGroups, shapeGroups, sceneColliders } = useMemo(() => {
    // GPU instancing groups objects by model (one draw call per
    // model). Physics has two streams: ground volumes — the pure module
    // sceneColliders (axis-aligned boxes for slabs/quarry/walls, source of truth —
    // modelBounds.generated.ts), slopes and ALL PROPS — exact trimesh from
    // their own triangles (ModelShapeColliders) — one per
    // placement, the folding is recomputed by the independent checkColliders gate.
    const groups: Record<string, PlacedObject[]> = {};
    const shapes: Record<string, PlacedObject[]> = {};

    // Exactly the authored map: no decoration/paving on top. Everything that
    // was added to fill gaps has been removed — the gaps are back.
    const allPlacements: PlacedObject[] = islandSceneData.placedObjects;

    allPlacements.forEach((obj: PlacedObject) => {
      // NPCs are rendered exclusively by CrewNPCs with skeletal animation rigs
      const lower = obj.modelPath.toLowerCase();
      if (lower.includes('npc_') || lower.includes('mannequin')) {
        return;
      }
      if (!groups[obj.modelPath]) groups[obj.modelPath] = [];
      groups[obj.modelPath].push(obj);

      // Non-boxed placements (slopes + all props) get exact
      // physics from their own triangles; the visual stays in the shared groups.
      const filename = (obj.modelPath.split('/').pop() || '').toLowerCase();
      const isBoxedTerrain =
        filename.startsWith('terrain_low') ||
        filename.startsWith('terrain_mining') ||
        filename.startsWith('terrain_tall');
      if (!isBoxedTerrain) {
        if (!shapes[obj.modelPath]) shapes[obj.modelPath] = [];
        shapes[obj.modelPath].push(obj);
      }
    });

    // Box colliders: slabs/quarry/tall + low perimeter + the shared
    // safety floor. One RigidBody compound consumes them all; the numbers are
    // recomputed and verified by the independent gate scripts/checkColliders.mjs.
    const build = buildSceneColliders(islandSceneData, MODEL_BOUNDS);

    return {
      instancedGroups: groups,
      shapeGroups: shapes,
      // Slabs are merged into long boxes (same volume), the rest is as is.
      sceneColliders: [
        ...mergeGroundColliders(build.colliders),
        ...build.subColliders,
        ...build.extras
      ]
    };
  }, []);

  return (
    <group>
      {/* ── Proximity Interaction Manager for NPC Dialogues ── */}
      <ProximityManager playerPosRef={playerPosRef} />

      {/* ── ?debug=1: physics collider wireframe over the world ── */}
      {IS_DEBUG && <PhysicsDebugOverlay colliders={sceneColliders} playerPosRef={playerPosRef} />}

      {/* ── 6 Interactive Animated Crew NPCs with Look-At & Halos ── */}
      <Suspense fallback={null}>
        <CrewNPCs playerPosRef={playerPosRef} />
      </Suspense>

      {/* ── Markers above the crew: see where to go without opening the map ── */}
      <CrewMarkers />

      {/* ── Instanced Batched Meshes (GPU instanced in single draw calls) ── */}
      {Object.entries(instancedGroups).map(([modelPath, instances]) => (
        <Suspense key={modelPath} fallback={null}>
          <InstancedModelGroup modelPath={modelPath} instances={instances} material={kitMaterial} />
        </Suspense>
      ))}

      {/* ── Warm halos above the lamp heads (1 draw call, no point light) ── */}
      <LampGlow />

      {/* ── Exact trimesh physics: slopes and all props via their own triangles ── */}
      {Object.entries(shapeGroups).map(([modelPath, instances]) => (
        <Suspense key={`shape-physics-${modelPath}`} fallback={null}>
          <ModelShapeColliders
            modelPath={modelPath}
            instances={instances}
            debugColor={modelPath.toLowerCase().includes('terrain_slope') ? 0xfb923c : 0x60a5fa}
          />
        </Suspense>
      ))}

      {/* ── Unified Compound Static Physics Body ── */}
      {/* Box colliders — only ground (slabs/quarry/tall) + the perimeter
          and safety floor from sceneColliders; slopes and props get exact
          trimesh physics of their own meshes above (ModelShapeColliders). */}
      <RigidBody type="fixed" colliders={false}>
        {sceneColliders.map((item) => (
          <CuboidCollider
            key={item.id}
            args={item.halfExtents}
            position={item.position}
            rotation={item.rotation}
            friction={item.friction}
          />
        ))}
      </RigidBody>
    </group>
  );
}

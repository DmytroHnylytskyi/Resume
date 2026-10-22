'use client';

/**
 * WorldScene — 3-Tier Sci-Fi Space Outpost environment module for Aetheria.
 *
 * Owns everything that is NOT the player character:
 * - High-performance GPU instancing via `THREE.InstancedMesh` for 900+ modular pieces
 * - Physics colliders built from MEASURED mesh bounds (src/data/modelBounds.generated.ts)
 *   via src/data/sceneColliders.ts — terrain boxes + low invisible perimeter walls
 *   at the island edge (пропсы и рампы — точная физика собственных треугольников мешей)
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
// NPC- и Mannequin-файлы скипаем (фильтр 1:1 с рендер-группами ниже):
// их никогда не рендерит WorldScene — CrewNPCs грузит и preload'ит
// свои Mannequin-клоны и риги сам, а npc_*.glb (~2.4 МБ) здесь лишь
// раздували очередь drei useProgress и трафик.
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

// NPC-позиции для ProximityManager приходят из ../../data/npcPlacements —
// один резолвер на всю игру (физика, радар, маркеры над головами, этот
// менеджер). В кадре — только чтение координат, никакого find() по 997 объектам.

// ══════════════════════════════════════════════════════
// 1. HIGH-PERF INSTANCED RENDERER FOR REPEATED PROPS
// ══════════════════════════════════════════════════════
interface InstancedModelGroupProps {
  modelPath: string;
  instances: PlacedObject[];
  /** Общий атлас-материал каталога (один на всю статику — см. kitAssets.ts). */
  material: THREE.Material;
}

function isTerrainSurfaceModel(filenameLower: string): boolean {
  return filenameLower.startsWith('terrain_') || filenameLower.startsWith('rock');
}

// Деталь-текстура грунта (256²): крупный молтлинг + мелкое зерно + гравийные
// спеклы. Накладывается в шейдере в МИРОВЫХ координатах (vWorldXZ), поэтому
// рисунок бесшовно продолжается через стыки плит — вместо «рассеивания по
// полосам» виден настоящий каменистый грунт.
function getTerrainDetailTexture(): THREE.CanvasTexture {
  const w = window as unknown as Record<string, THREE.CanvasTexture | undefined>;
  const cacheKey = '__aetheriaTerrainDetail';
  const existing = w[cacheKey];
  if (existing) return existing;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Базовый крупный молтлинг: 16×16 шум → растяжка (мягкие пятна 0.35..0.8)
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
    // Средняя октава: 64×64 шум, полупрозрачно (варьирует тон местами)
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
    // Мелкое HOSTOE зерно: 128×128 поверх
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
    // Гравийные спеклы: тёмные камешки и светлые крапинки
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
  // Смежные плиты пола ничего не отбрасывают друг на друга — отдавать их
  // в теневой проход впустую; тени формы дают пропсы и скалы terrain_tall.
  const isGroundPlate = filenameLower.startsWith('terrain_low');
  const isTerrainSurface = isTerrainSurfaceModel(filenameLower);
  // Фонари получают собственный вариант общего материала с emissive:
  // плафоны светятся из атласа, металл стойки остаётся тёмным. Это не новый
  // материал на каждый фонарь — один клон на всю instanced-группу.
  const isLamp = filenameLower.startsWith('lights');
  const lampMask = useMemo(
    () => (isLamp ? buildLampEmissiveMask(scene) : null),
    [isLamp, scene]
  );
  const lampMaterial = useMemo(() => {
    if (!isLamp) return null;
    const clone = material.clone() as THREE.MeshStandardMaterial | THREE.MeshLambertMaterial;
    clone.emissive = new THREE.Color('#ffcf8a');
    // Только UV-острова двух плафонов; без маски emissive нет вовсе,
    // чтобы не вернуть свечение всей ножки.
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

  // Сабмеши модели (до 5 примитивов у грузовиков/буров) запекаются в одну
  // геометрию: один InstancedMesh на модель вместо N draw call'ов.
  const geometry = useMemo(() => mergeSceneGeometry(scene), [scene]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  // Копии атласа внутри GLTF больше не нужны — освобождаем их.
  useEffect(() => disposeKitSourceMaterials(scene), [scene]);

  const meshData = useMemo(() => {
    // Единый источник габаритов с физикой: и визуал, и коллайдеры
    // масштабируются одним UNIT_SCALE и заякориваются за один и тот же
    // измеренный минимум Y меша (MODEL_BOUNDS). Прежняя эвристика
    // getUnitScale по порогам maxDim удаляла рассинхрон только случайно —
    // у всех 72 моделей каталога maxDim < 10 и она всегда давала 1.
    const filename = modelPath.split('/').pop() || '';
    const bounds = MODEL_BOUNDS[filename];
    if (bounds) return { uScale: UNIT_SCALE, minY: bounds.min[1] };

    // Защитный fallback для моделей вне каталога extractModelBounds
    // (его тест гарантирует запись, поэтому путь мёртв, но без него
    // новая модель без bounds сломала бы визуал).
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

      // Плита пола terrain_low — идеальный куб 2×2×1: поворот на 90° вокруг Y
      // не меняет ни силуэт, ни стыковку с соседями (боковые грани равнозначны).
      // Зато он разворачивает запечённый в атласе линейный градиент верхней
      // грани (перепад яркости 22% по v шло на КАЖДУЮ плиту в одну сторону) —
      // без этого все 728 плит несли одну и ту же светотень и складывались в
      // ровные полосы каждые 2 м.
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
    // Локальные матрицы узлов уже запечены в merged-геометрию.
    for (let i = 0; i < placementMatrices.length; i++) {
      instMesh.setMatrixAt(i, placementMatrices[i]);
    }
    instMesh.instanceMatrix.needsUpdate = true;
    instMesh.computeBoundingSphere();
  }, [placementMatrices]);

  // ── Земля: полностью матовый диффузный материал + мир-тайловая деталь ──
  //
  // «Белые блики ровными полосами» на грунте давали две вещи, обе — про
  // скользящие углы (плиты 2×2 м, уходящие к горизонту):
  //  1. Диэлектрический specular у MeshStandardMaterial: F0 = 0.04, но на
  //     скользящих углах Fresnel тянет отражение почти к 1. roughness = 1
  //     блик не убирает, а только размазывает — вытянутые перспективой плиты
  //     блестят полосами. Земле блик не нужен вообще, поэтому материал
  //     подменяется на MeshLambertMaterial: у него specular-ветки в шейдере
  //     нет, реакция на свет — только диффузная.
  //  2. Выбор mip-уровня на скользящих углах: анизотропия поднята 4 → 8, а
  //     две мелкие октавы деталь-текстуры гаснут с дистанцией (к своей
  //     средней, а не в ноль — иначе земля у горизонта потемнела бы).
  // Диффузная часть та же (атлас каталога × мир-тайловая деталь), поэтому вид
  // грунта сохраняется — меняется только его реакция на свет.
  // ── Земля: полностью матовый диффузный материал + мир-тайловая деталь ──
  //
  // «Белые блики ровными полосами» на грунте давали две вещи, обе — про
  // скользящие углы (плиты 2×2 м, уходящие к горизонту):
  //  1. Диэлектрический specular у MeshStandardMaterial: F0 = 0.04, но на
  //     скользящих углах Fresnel тянет отражение почти к 1. roughness = 1
  //     блик не убирает, а только размазывает — вытянутые перспективой плиты
  //     блестят полосами. Земле блик не нужен вообще, поэтому материал
  //     подменяется на MeshLambertMaterial: у него specular-ветки в шейдере
  //     нет, реакция на свет — только диффузная.
  //  2. Выбор mip-уровня на скользящих углах: анизотропия поднята 4 → 8, а
  //     две мелкие октавы деталь-текстуры гаснут с дистанцией (к своей
  //     средней, а не в ноль — иначе земля у горизонта потемнела бы).
  // Диффузная часть та же (атлас каталога × мир-тайловая деталь), поэтому вид
  // грунта сохраняется — меняется только его реакция на свет.
  //
  // Материал деривативный: карта общая с kitMaterial (одна текстура на всю
  // сцену), поэтому копий атласа по-прежнему нет.
  const terrainMaterial = useMemo(() => {
    if (!isTerrainSurface) return null;

    const mat = makeCheapMaterial(material, {
      name: 'terrain_matte',
      // Плиты пола — идеальные кубы, у них и так пофасетные нормали: flat
      // ничего не добавляет, зато его нормаль из производных экранных
      // координат неустойчива на скользящих углах. Склонам и скалам
      // фасетка нужна — им flatShading оставляем.
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
          // Мир-тайловая деталь: периоды 2 м / 0.69 м / 0.23 м — рисунок
          // продолжается через стыки плит без швов.
          float detA = texture2D(uTerrainDetail, vWorldXZ.xz * 0.50).r;
          float detB = texture2D(uTerrainDetail, vWorldXZ.xz * 1.45 + 0.37).r;
          float detC = texture2D(uTerrainDetail, vWorldXZ.xz * 4.30 + 0.71).r;
          // Мелкие октавы гаснут с дистанцией к своему среднему (0.25), а не
          // в ноль: средняя яркость грунта от этого не меняется, а рябь под
          // скользящим углом успевает погаснуть до того, как начнёт алиасить.
          float detailFade = 1.0 - smoothstep(7.0, 30.0, length(vViewPosition));
          float fine = detB * 0.35 + detC * 0.15;
          float detail = detA * 0.50 + mix(0.25, fine, detailFade);
          diffuseColor.rgb *= (0.78 + 0.44 * detail);
          // Лёгкий тёпло-холодный разброс оттенка (грунт не монохромен)
          float tint = (detB - 0.5) * 0.12 * detailFade;
          diffuseColor.rgb *= vec3(1.0 + tint, 1.0 + tint * 0.35, 1.0 - tint);`
        );
    };
    mat.customProgramCacheKey = () => 'terrain-detail-v2';
    mat.needsUpdate = true;
    return mat;
  }, [material, isTerrainSurface, isGroundPlate]);

  useEffect(() => () => terrainMaterial?.dispose(), [terrainMaterial]);

  // Анизотропия общей карты — один раз на сцену, а не на каждую модель.
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
 * ModelShapeColliders — точная физика неконвексных форм из их треугольников.
 *
 * Механизм доказан на рампах: бокс по AABB антенн/турбин с лопастями/скал/плит
 * с бортиками разъезжался с мешем — игрок заскакивал на пустоту бокса и упирался
 * в невидимые стены. Матрица размещения идентична визуалу InstancedModelGroup
 * (scale·UNIT_SCALE, заякоривание за измеренный минимум Y из MODEL_BOUNDS,
 * rotation, позиция × мировая матрица узла GLTF) — trimesh-физика бит-в-бит
 * с визуалом. В ?debug=1 поверх тела рисуется каркас сумм, чтобы сверять
 * «меш vs коллайдер» глазами.
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
      // Та же матрица размещения, что у InstancedModelGroup: пивот по
      // измеренному минимуму Y, масштаб fs, yaw из islandScene.json.
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
        // Только рёбра (не сетка треугольников) — читаемый каркас поверх мира.
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

  // Один fixed-body на модель вместо одного на каждое размещение: вершин
  // уже в мировых координатах, поэтому тело стоит в нуле, а trimesh-коллайдеры
  // просто складываются в компаунд. На карте это ~44 тела вместо ~300 —
  // ровно та разница, которую профиль показывал в forEach по rigid body
  // states каждый физический шаг.
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
 * Слияние лежащих на одной высоте плит в крупные боксы.
 *
 * sceneColliders (и его гейт) остаются точными «одна плита — один бокс»:
 * это источник правды для сверки. Но в физический мир 871 отдельный бокс
 * отправлять необязательно — они все статические, осевые и стоят сеткой
 * 2×2 м. Склеиваем подряд идущие плиты одного ряда в один длинный бокс:
 * объём тот же бит-в-бит, а широкая фаза Rapier обходит в разы меньше
 * коллайдеров. Склоны и tall/mining не трогаем (у них другой размер).
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
  // day/night theme sync) — тот же паттерн, что в CharacterController.tsx.
  const language = useGameStore((s) => s.language);
  const currentPromptTitleRef = useRef<string | null>(null);

  const npcList = useMemo(() => Object.values(NPC_DIALOGUES), []);

  useFrame(() => {
    if (!playerPosRef || !playerPosRef.current) return;
    const p = playerPosRef.current;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return;

    // Actions читаем через getState(): подписка на них не нужна — ссылки
    // стабильно, а подписка на interactionPrompt ре-рендерила бы поддерево
    // сцены на каждый proximity edge.
    const { setActiveDialogue, setInteractionPrompt } = useGameStore.getState();

    // ── 1. Interactive NPC Crew Proximity ──
    let closestNpc: NPCDialogueDef | null = null;
    let closestDistSq = Infinity;

    for (let i = 0; i < npcList.length; i++) {
      const npc = npcList[i];
      // Позиция из заранее собранной NPC_POSITIONS (Map) — никакого
      // placedObjects.find() с toLowerCase() на 114 объектах каждый кадр.
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
// Вся физика вынесена в чистый модуль ../../data/sceneColliders.ts:
// он строит коллайдеры из islandSceneData + MODEL_BOUNDS без three.js,
// поэтому тот же список пересчитывает независимый гейт
// scripts/checkColliders.mjs (Node снимает типы без сборки).

// ══════════════════════════════════════════════════════
// 5. WORLD SCENE ROOT
// ══════════════════════════════════════════════════════
interface WorldSceneProps {
  playerPosRef?: React.MutableRefObject<THREE.Vector3 | null>;
}

// ?debug=1: каркас физики поверх мира — инструмент сверки «меш vs коллайдер»
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

/** Оверлей-каркас всех статических коллайдеров + консольный мост __aetheriaDebug. */
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
    // Инвентарь размещений рядом с игроком (имя модели + позиция) — для
    // полевой сверки раскладки без рендера.
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
  // Один атлас + один материал на всю статику (см. kitAssets.ts).
  const kitMaterial = useKitMaterial();

  const { instancedGroups, shapeGroups, sceneColliders } = useMemo(() => {
    // GPU-instancing группирует объекты по модели (один draw call на
    // модель). Физика двухпоточная: земляные объёмы — чистый модуль
    // sceneColliders (осевые боксы плит/карьера/стен, источник правды —
    // modelBounds.generated.ts), склоны и ВСЕ ПРОПСЫ — точные trimesh из
    // собственных треугольников (ModelShapeColliders) — по одному на
    // размещение, свертку пересчитывает независимый гейт checkColliders.
    const groups: Record<string, PlacedObject[]> = {};
    const shapes: Record<string, PlacedObject[]> = {};

    // Ровно авторская карта: никакого декора/замостки сверху. Всё, что
    // добавлялось для заполнения пустот, удалено — пустоты вернулись.
    const allPlacements: PlacedObject[] = islandSceneData.placedObjects;

    allPlacements.forEach((obj: PlacedObject) => {
      // NPCs are rendered exclusively by CrewNPCs with skeletal animation rigs
      const lower = obj.modelPath.toLowerCase();
      if (lower.includes('npc_') || lower.includes('mannequin')) {
        return;
      }
      if (!groups[obj.modelPath]) groups[obj.modelPath] = [];
      groups[obj.modelPath].push(obj);

      // Небоксируемые размещения (склоны + все пропсы) получают точную
      // физику своими треугольниками; визуал остаётся в общих группах.
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

    // Коллайдеры боксов: плиты/карьер/tall + низкий периметр + общий
    // страховочный пол. Один RigidBody-компаунд жрёт их все, числа
    // пересчитывает и сверяет независимый гейт scripts/checkColliders.mjs.
    const build = buildSceneColliders(islandSceneData, MODEL_BOUNDS);

    return {
      instancedGroups: groups,
      shapeGroups: shapes,
      // Плиты склеены в длинные боксы (объём тот же), остальное — как есть.
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

      {/* ── ?debug=1: каркас физ-коллайдеров поверх мира ── */}
      {IS_DEBUG && <PhysicsDebugOverlay colliders={sceneColliders} playerPosRef={playerPosRef} />}

      {/* ── 6 Interactive Animated Crew NPCs with Look-At & Halos ── */}
      <Suspense fallback={null}>
        <CrewNPCs playerPosRef={playerPosRef} />
      </Suspense>

      {/* ── Маркеры над экипажем: видно, куда идти, не открывая карту ── */}
      <CrewMarkers />

      {/* ── Instanced Batched Meshes (GPU instanced in single draw calls) ── */}
      {Object.entries(instancedGroups).map(([modelPath, instances]) => (
        <Suspense key={modelPath} fallback={null}>
          <InstancedModelGroup modelPath={modelPath} instances={instances} material={kitMaterial} />
        </Suspense>
      ))}

      {/* ── Тёплые гало над плафонами фонарей (1 draw call, без point light) ── */}
      <LampGlow />

      {/* ── Exact trimesh physics: склоны и все пропсы — своими треугольниками ── */}
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
      {/* Боксовые коллайдеры — только земля (плиты/карьер/tall) + периметр
          и страховочный пол из sceneColliders; у склонов и пропсов точная
          trimesh-физика своих мешей выше (ModelShapeColliders). */}
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

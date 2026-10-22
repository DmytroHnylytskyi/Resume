'use client';

/**
 * kitAssets — общая геометрия и материалы для каталога KayKit Space Base.
 *
 * Зачем отдельный модуль. В каталоге 58 GLTF, и у ВСЕХ одна и та же пара
 * «material spacebits_texture + один атлас 1024²». GLTFLoader не кэширует
 * текстуры между файлами, поэтому каждая модель тянула собственную копию
 * атласа: 40+ копий по ~5.6 МБ — сотни мегабайт VRAM, на телефоне это
 * гарантированный вылет или термальный троттлинг. Здесь атлас грузится ОДИН
 * раз, и вся статика получает один общий материал.
 *
 * Второй источник потерь — сабмеши. У грузовиков/буров/турбин до 5
 * примитивов, каждый рисовался своим draw call'ом. mergeSceneGeometry
 * запекает локальные матрицы узлов в одну геометрию: один InstancedMesh на
 * модель вместо N.
 *
 * Персонажи (Mannequin) — 6 skinned-примитивов на каждого: 7 персонажей дают
 * 42 draw call'а. mergeSkinnedMeshes склеивает их в один SkinnedMesh на
 * скелет, сохраняя риг и анимации.
 */

import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { visualQuality } from '../../store/debugState';

export const KIT_ATLAS_PATH = '/model/kaykit_space/spacebits_texture.png';

/**
 * buildLampEmissiveMask — UV-маска «только плафоны» для lights.gltf.
 *
 * Если использовать в emissiveMap весь атлас, светится вся модель: ножка и
 * подставка тоже содержат светлые пиксели. Здесь маска строится из самой
 * геометрии: в canvas заливаются белым только UV-треугольники, чьи центроиды
 * лежат в двух головах фонаря (локально |x| > 0.16, y > 0.8). Всё остальное
 * остаётся чёрным, поэтому emissive есть только у плафонов.
 *
 * Текстура 512², flipY=false как у атласа GLTF; треугольники обводятся на
 * 2 px, чтобы фильтрация не срезала края UV-островов.
 */
export function buildLampEmissiveMask(scene: THREE.Object3D, size = 512): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';

  const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
  let drawn = 0;

  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geo = mesh.geometry;
    const position = geo.getAttribute('position');
    const uv = geo.getAttribute('uv');
    if (!position || !uv) return;

    const index = geo.getIndex();
    const triangles = index ? index.count / 3 : position.count / 3;

    for (let t = 0; t < triangles; t++) {
      const ia = index ? index.getX(t * 3) : t * 3;
      const ib = index ? index.getX(t * 3 + 1) : t * 3 + 1;
      const ic = index ? index.getX(t * 3 + 2) : t * 3 + 2;

      const cx = (position.getX(ia) + position.getX(ib) + position.getX(ic)) / 3;
      const cy = (position.getY(ia) + position.getY(ib) + position.getY(ic)) / 3;
      if (Math.abs(cx) <= 0.16 || cy <= 0.8) continue;

      const ua = clamp01(uv.getX(ia)) * size;
      const va = clamp01(uv.getY(ia)) * size;
      const ub = clamp01(uv.getX(ib)) * size;
      const vb = clamp01(uv.getY(ib)) * size;
      const uc = clamp01(uv.getX(ic)) * size;
      const vc = clamp01(uv.getY(ic)) * size;

      ctx.beginPath();
      ctx.moveTo(ua, va);
      ctx.lineTo(ub, vb);
      ctx.lineTo(uc, vc);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      drawn++;
    }
  });

  if (drawn === 0) return null;

  const tex = new THREE.CanvasTexture(canvas);
  // Та же ориентация UV, что у атласа GLTF (flipY=false).
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Атлас каталога + один общий материал. Возвращает стандартный или Lambert по пресету. */
export function useKitMaterial(): THREE.Material {
  const map = useTexture(KIT_ATLAS_PATH);

  return useMemo(() => {
    // GLTFLoader ставит flipY=false и SRGB для baseColorTexture — при загрузке
    // через useTexture это надо повторить вручную, иначе UV перевернутся и
    // цвета потеряют гамму.
    map.flipY = false;
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    map.needsUpdate = true;

    return visualQuality.cheapMaterials
      ? new THREE.MeshLambertMaterial({ map, name: 'kit_atlas_lambert' })
      : new THREE.MeshStandardMaterial({
          map,
          roughness: 0.6,
          metalness: 0,
          name: 'kit_atlas_standard'
        });
  }, [map]);
}

// Оригинальные материалы GLTF после перехода на общий атлас не рендерятся,
// но продолжают держать в памяти декодированные изображения (каждая модель —
// своя копия атласа). Освобождаем их один раз на сцену.
const disposedKitScenes = new WeakSet<THREE.Object3D>();

export function disposeKitSourceMaterials(scene: THREE.Object3D): void {
  if (disposedKitScenes.has(scene)) return;
  disposedKitScenes.add(scene);

  const materials = new Set<THREE.Material>();
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    list.forEach((m) => m && materials.add(m));
  });

  const textures = new Set<THREE.Texture>();
  materials.forEach((m) => {
    const mat = m as THREE.MeshStandardMaterial;
    if (mat.map) textures.add(mat.map);
    if (mat.normalMap) textures.add(mat.normalMap);
    if (mat.roughnessMap) textures.add(mat.roughnessMap);
    if (mat.metalnessMap) textures.add(mat.metalnessMap);
    if (mat.emissiveMap) textures.add(mat.emissiveMap);
    m.dispose();
  });
  textures.forEach((tex) => {
    const image = tex.image as ImageBitmap | HTMLImageElement | undefined;
    // ImageBitmap.close() освобождает декодированный буфер сразу, не дожидаясь GC.
    if (image && typeof (image as ImageBitmap).close === 'function') {
      (image as ImageBitmap).close();
    }
    tex.dispose();
  });
}

/** Копия материала под Lambert для low-пресета (для персонажей и terrain). */
export function makeCheapMaterial(
  source: THREE.Material,
  overrides: THREE.MeshLambertMaterialParameters = {}
): THREE.MeshLambertMaterial {
  const src = source as THREE.MeshStandardMaterial;
  return new THREE.MeshLambertMaterial({
    map: src.map ?? null,
    color: src.color ? src.color.clone() : new THREE.Color(0xffffff),
    flatShading: src.flatShading,
    transparent: src.transparent,
    opacity: src.opacity,
    side: src.side,
    alphaTest: src.alphaTest,
    ...overrides
  });
}

/**
 * Собирает все меши GLTF-сцены в одну геометрию с запечёнными матрицами узлов.
 * Атрибуты нормализуются до position/normal/uv, чтобы merge не падал на
 * моделях с отличающимся набором (tangent и пр.).
 */
export function mergeSceneGeometry(scene: THREE.Object3D): THREE.BufferGeometry | null {
  scene.updateMatrixWorld(true);

  const pieces: THREE.BufferGeometry[] = [];
  scene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) return; // у статики их нет
    const geo = mesh.geometry.clone();
    if (!geo.getAttribute('normal')) geo.computeVertexNormals();
    if (!geo.getAttribute('uv')) {
      const count = geo.getAttribute('position')?.count ?? 0;
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    }
    for (const name of Object.keys(geo.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') geo.deleteAttribute(name);
    }
    geo.applyMatrix4(mesh.matrixWorld);
    pieces.push(geo);
  });

  if (pieces.length === 0) return null;
  if (pieces.length === 1) return pieces[0];

  // mergeGeometries требует одинаковый режим индексации.
  const anyNonIndexed = pieces.some((p) => !p.getIndex());
  const normalized = anyNonIndexed ? pieces.map((p) => (p.getIndex() ? p.toNonIndexed() : p)) : pieces;
  const merged = mergeGeometries(normalized, false);
  if (normalized !== pieces) normalized.forEach((p, i) => p !== pieces[i] && p.dispose());
  pieces.forEach((p) => p.dispose());
  return merged;
}

/**
 * Склеивает N SkinnedMesh с общим скелетом в один. Возвращает merged-меш или
 * null, если склейка невозможна (разные скелеты / нет skin-атрибутов).
 */
export function mergeSkinnedMeshes(root: THREE.Object3D): THREE.SkinnedMesh | null {
  const meshes: THREE.SkinnedMesh[] = [];
  root.traverse((child) => {
    if ((child as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(child as THREE.SkinnedMesh);
  });
  if (meshes.length <= 1) return null;

  // SkeletonUtils.clone создаёт отдельный объект Skeleton на каждый
  // SkinnedMesh, но кости в них — одни и те же объекты. Проверяем именно
  // тождество костей (а не ссылку на Skeleton): иначе склейка молча
  // отменяется и персонаж остаётся 6 draw call'ами.
  const skeleton = meshes[0].skeleton;
  const bones0 = skeleton.bones;
  const sameBones = meshes.every(
    (m) =>
      m.skeleton.bones.length === bones0.length &&
      m.skeleton.bones.every((bone, i) => bone === bones0[i])
  );
  if (!sameBones) return null;

  const pieces: THREE.BufferGeometry[] = [];
  for (const mesh of meshes) {
    const geo = mesh.geometry.clone();
    if (!geo.getAttribute('skinIndex') || !geo.getAttribute('skinWeight')) return null;
    for (const name of Object.keys(geo.attributes)) {
      if (!['position', 'normal', 'uv', 'skinIndex', 'skinWeight'].includes(name)) {
        geo.deleteAttribute(name);
      }
    }
    // Геометрии скинов живут в bind-пространстве: локальные матрицы узлов
    // (identity у KayKit) запекать НЕЛЬЗЯ, иначе части разъедутся.
    pieces.push(geo);
  }

  const merged = mergeGeometries(pieces, false);
  pieces.forEach((p) => p.dispose());
  if (!merged) return null;

  const first = meshes[0];
  const mergedMesh = new THREE.SkinnedMesh(merged, first.material);
  mergedMesh.name = `${first.name ?? 'skinned'}_merged`;
  mergedMesh.castShadow = first.castShadow;
  mergedMesh.receiveShadow = first.receiveShadow;
  mergedMesh.frustumCulled = first.frustumCulled;
  mergedMesh.bindMode = first.bindMode;
  mergedMesh.bindMatrix.copy(first.bindMatrix);
  mergedMesh.bindMatrixInverse.copy(first.bindMatrixInverse);
  mergedMesh.bind(skeleton, first.bindMatrix);

  const parent = first.parent ?? root;
  parent.add(mergedMesh);
  meshes.forEach((m) => {
    m.parent?.remove(m);
    m.geometry.dispose();
  });

  return mergedMesh;
}

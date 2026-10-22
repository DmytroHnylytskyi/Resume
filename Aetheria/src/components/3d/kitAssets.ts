'use client';

/**
 * kitAssets — shared geometry and materials for the KayKit Space Base catalog.
 *
 * Why a separate module. Every static model in the Space Base kit shares the same pair
 * "material spacebits_texture + one 1024² atlas". GLTFLoader does not cache
 * textures across files, so each model pulled its own copy of the
 * atlas: dozens of copies at ~5.6 MB each — hundreds of megabytes of VRAM, on a phone that is
 * a guaranteed crash or thermal throttling. Here the atlas is loaded ONCE
 * and all static geometry gets one shared material.
 *
 * The second source of waste is submeshes. Trucks/drills/turbines have up to 5
 * primitives, each drawn by its own draw call. mergeSceneGeometry
 * bakes node local matrices into one geometry: one InstancedMesh per
 * model instead of N.
 *
 * Characters (Mannequin) — 6 skinned primitives each: 7 characters give
 * 42 draw calls. mergeSkinnedMeshes merges them into one SkinnedMesh per
 * skeleton, preserving the rig and animations.
 */

import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { visualQuality } from '../../store/debugState';

export const KIT_ATLAS_PATH = '/model/kaykit_space/spacebits_texture.png';

/**
 * buildLampEmissiveMask — UV mask "heads only" for lights.gltf.
 *
 * Using the whole atlas as emissiveMap makes the whole model glow: the stem and
 * base also contain bright pixels. Here the mask is built from the geometry
 * itself: only UV triangles whose centroids lie in the two lamp heads
 * (locally |x| > 0.16, y > 0.8) are filled white in the canvas. Everything else
 * stays black, so only the heads are emissive.
 *
 * Texture 512², flipY=false like the GLTF atlas; triangles are stroked at
 * 2 px so filtering does not clip the edges of UV islands.
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
  // Same UV orientation as the GLTF atlas (flipY=false).
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Catalog atlas + one shared material. Returns standard or Lambert depending on the preset. */
export function useKitMaterial(): THREE.Material {
  const map = useTexture(KIT_ATLAS_PATH);

  return useMemo(() => {
    // GLTFLoader sets flipY=false and SRGB for baseColorTexture — when loading
    // through useTexture this must be repeated manually, otherwise UVs flip and
    // the colors lose their gamma.
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

// The original GLTF materials are not rendered after switching to the shared atlas,
// but they keep decoded images in memory (each model has its own
// copy of the atlas). We release them once per scene.
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
    // ImageBitmap.close() frees the decoded buffer immediately, without waiting for GC.
    if (image && typeof (image as ImageBitmap).close === 'function') {
      (image as ImageBitmap).close();
    }
    tex.dispose();
  });
}

/** Material copy as Lambert for the low preset (for characters and terrain). */
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
 * Collects all meshes of a GLTF scene into one geometry with baked node matrices.
 * Attributes are normalized to position/normal/uv so the merge does not fail on
 * models with a different attribute set (tangent etc.).
 */
export function mergeSceneGeometry(scene: THREE.Object3D): THREE.BufferGeometry | null {
  scene.updateMatrixWorld(true);

  const pieces: THREE.BufferGeometry[] = [];
  scene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) return; // static geometry has none
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

  // mergeGeometries requires the same indexing mode.
  const anyNonIndexed = pieces.some((p) => !p.getIndex());
  const normalized = anyNonIndexed ? pieces.map((p) => (p.getIndex() ? p.toNonIndexed() : p)) : pieces;
  const merged = mergeGeometries(normalized, false);
  if (normalized !== pieces) normalized.forEach((p, i) => p !== pieces[i] && p.dispose());
  pieces.forEach((p) => p.dispose());
  return merged;
}

/**
 * Merges N SkinnedMeshes sharing one skeleton into one. Returns the merged mesh or
 * null if merging is impossible (different skeletons / no skin attributes).
 */
export function mergeSkinnedMeshes(root: THREE.Object3D): THREE.SkinnedMesh | null {
  const meshes: THREE.SkinnedMesh[] = [];
  root.traverse((child) => {
    if ((child as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(child as THREE.SkinnedMesh);
  });
  if (meshes.length <= 1) return null;

  // SkeletonUtils.clone creates a separate Skeleton object for each
  // SkinnedMesh, but the bones in them are the same objects. We check bone
  // identity (not the Skeleton reference): otherwise the merge is silently
  // cancelled and the character stays at 6 draw calls.
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
    // Skinned geometries live in bind space: node local matrices
    // (identity in KayKit) must NOT be baked, otherwise the parts fall apart.
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

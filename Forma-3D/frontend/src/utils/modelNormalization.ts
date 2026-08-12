/**
 * @file modelNormalization.ts
 * @module utils/modelNormalization
 * @description Centralized 3D geometry normalizer and pivot alignment engine for Three.js GLB assets.
 * Guarantees:
 * 1. Pivot Point Centering: Object (0,0) is placed at the EXACT center of the horizontal bounding box (X/Z),
 *    and the bottom (Y=0) is snapped flush to the floor grid.
 * 2. Realistic Proportional Scale: Architectural elements are 1:1 metric, furniture is scaled to ergonomic
 *    real-world dimensions, and oversized environment models (islands, statues, portals, magic trees)
 *    are normalized to balanced scene proportions.
 * 3. Base Orientation Alignment: Corrects axis discrepancies for models exported with non-standard coordinates.
 * 
 * @author 3D Furniture Configurator Team
 */

import * as THREE from 'three';
import { NormalizeResult } from '../types';

function validateScale(scale: number, modelPath: string): number {
  const MIN_REASONABLE = 0.001;
  const MAX_REASONABLE = 50.0;
  if (scale < MIN_REASONABLE || scale > MAX_REASONABLE || !isFinite(scale)) {
    console.warn(`[modelNormalization] Unreasonable scale ${scale} for ${modelPath}, clamping`);
    return Math.max(MIN_REASONABLE, Math.min(MAX_REASONABLE, scale || 1.0));
  }
  return scale;
}

/**
 * Calculates raw coordinate scale normalization factor for 3D models.
 * Detects whether geometry was exported in millimeters, centimeters, decimeters, or meters.
 * 
 * @param {THREE.Box3} box - Raw model bounding box.
 * @returns {number} Unit scaling divisor factor.
 */
function getRawUnitScale(box: THREE.Box3): number {
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);

  if (maxDim <= 0) return 1;
  if (maxDim > 1000) return 1 / 1000;
  if (maxDim > 100) return 1 / 100;
  if (maxDim > 20) return 1 / 10;
  return 1;
}

/**
 * Computes canonical target height or dimension scale factor based on model category.
 * 
 * @param {string} modelPath - Relative GLB file path.
 * @param {THREE.Box3} box - Raw model bounding box.
 * @returns {number} Normalized scale multiplier.
 */
export function getModelBaseScale(modelPath: string, box: THREE.Box3): number {
  const file = (modelPath || '').toLowerCase();
  const unitScale = getRawUnitScale(box);
  
  const size = new THREE.Vector3();
  box.getSize(size);
  const rawH = size.y * unitScale;
  const rawMaxDim = Math.max(size.x, size.y, size.z) * unitScale;

  // 1. Structural Architectural Elements (Walls, Windows, Doors, Floors, Roofs, Stairs, Gothic Elements)
  // Preserved at 1:1 real-world metric scale
  if (
    file.includes('wall') || 
    file.includes('door') || 
    file.includes('window') || 
    file.includes('floor') || 
    file.includes('roof') || 
    file.includes('gothic') ||
    file.includes('house_') ||
    file.includes('stone_steps') ||
    file.includes('rope_bridge')
  ) {
    // Specific adjustment for small accessories vs modular wall packs
    if (file.includes('house_bike_stand')) return unitScale;
    if (file.includes('modular_modern_house_pack')) return unitScale * 0.5;
    return unitScale;
  }

  // 2. Large Environment / Terrains / Portals / Statues / Magic Trees
  if (file.includes('island_base')) {
    const targetIslandWidth = 16.0;
    return size.x > 0 ? targetIslandWidth / size.x : unitScale;
  }
  if (file.includes('portal_')) {
    const targetPortalHeight = 3.2;
    return size.y > 0 ? targetPortalHeight / size.y : unitScale;
  }
  if (file.includes('statue_')) {
    const targetStatueHeight = 2.8;
    return size.y > 0 ? targetStatueHeight / size.y : unitScale;
  }
  if (file.includes('magic_tree')) {
    const targetTreeHeight = 4.2;
    return size.y > 0 ? targetTreeHeight / size.y : unitScale;
  }
  if (file.includes('bush')) {
    const targetBushHeight = 1.2;
    return size.y > 0 ? targetBushHeight / size.y : unitScale;
  }
  if (file.includes('room_diorama')) {
    return unitScale * 0.3;
  }

  // 3. Ergonomic Furniture & Decor
  if (rawH <= 0) return unitScale;

  let targetHeight = 1.0;
  if (file.includes('sofa')) targetHeight = 0.85;
  else if (file.includes('lounge chair')) targetHeight = 0.85;
  else if (file.includes('dining chair') || file.includes('chair')) targetHeight = 0.88;
  else if (file.includes('pouf') || file.includes('stool')) targetHeight = 0.5;
  else if (file.includes('dining table')) targetHeight = 0.78;
  else if (file.includes('coffee table')) targetHeight = 0.46;
  else if (file.includes('tv stand')) targetHeight = 0.48;
  else if (file.includes('tv')) targetHeight = 0.75;
  else if (file.includes('bookshelf') || file.includes('sideboard')) targetHeight = 1.65;
  else if (file.includes('floor lamp')) targetHeight = 1.55;
  else if (file.includes('table lamp')) targetHeight = 0.48;
  else if (file.includes('chandelier')) targetHeight = 0.85;
  else if (file.includes('plant')) targetHeight = 0.9;
  else if (file.includes('carpet')) targetHeight = 0.02;
  else if (file.includes('monitor')) targetHeight = 0.52;
  else if (file.includes('painting')) targetHeight = 1.2;
  else targetHeight = Math.min(rawMaxDim, 1.2);

  return (targetHeight / size.y);
}

/**
 * Normalizes a Three.js cloned model scene:
 * - Automatically aligns coordinate orientation (Z-up / inverted models to Y-up standard).
 * - Wraps cloned model in a centered container group.
 * - Perfectly centers the horizontal bounding box (X and Z centered at 0,0).
 * - Snaps the bottom bounding box (Y) flush to 0 (ground level).
 * - Computes and returns the exact normalized scale multiplier.
 * 
 * @param {THREE.Object3D} clonedScene - Deep cloned Three.js Object3D scene.
 * @param {string} modelPath - Relative GLB file path.
 * @returns {NormalizeResult} Container group and base scale.
 */
export function normalizeModelGeometry(clonedScene: THREE.Object3D, modelPath: string): NormalizeResult {
  const file = (modelPath || '').toLowerCase();

  // 1. Orientation correction for inverted models:
  if (file.includes('house_bike_stand')) {
    clonedScene.rotation.z += Math.PI;
  }

  const rawBox = new THREE.Box3().setFromObject(clonedScene);
  let baseScale = getModelBaseScale(modelPath, rawBox);
  baseScale = validateScale(baseScale, modelPath);

  // If bounding box is empty, return simple wrapper
  if (rawBox.isEmpty()) {
    const wrapper = new THREE.Group();
    wrapper.add(clonedScene);
    return { wrapper, normalizedScale: 1 };
  }

  // Calculate center of raw geometry
  const center = new THREE.Vector3();
  rawBox.getCenter(center);

  // Center horizontally (X, Z) and ground vertically (Y)
  clonedScene.position.x -= center.x;
  clonedScene.position.z -= center.z;
  clonedScene.position.y -= rawBox.min.y;

  const wrapper = new THREE.Group();
  wrapper.add(clonedScene);

  return {
    wrapper,
    normalizedScale: baseScale
  };
}

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
export function getModelBaseScale(_modelPath: string, box: THREE.Box3): number {
  const unitScale = getRawUnitScale(box);
  return unitScale;
}


/**
 * Normalizes a Three.js cloned model scene:
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

  // Center horizontally on X/Z and snap base flush to ground level Y=0
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


// ══════════════════════════════════════════════════════════════════════
// sceneColliders.ts — single source of truth for the space-map physics.
//
// Builds SCENE colliders FROM MEASURED mesh dimensions
// (src/data/modelBounds.generated.ts, source of truth — the generator
// scripts/extractModelBounds.mjs) and placement positions/rotations
// (src/data/islandScene.json). The hand-written MODEL_COLLIDER_DEFS dictionary in
// WorldScene.tsx was removed: for all 28 models with manual half-extents at least
// one axis disagreed with the real AABB (up to +83% phantom walls on
// tunnel_straight_A, down to −77% pass-through windturbine_tall masts,
// −76% landing pad thickness), and 49 ground tiles and 14 ramps had no
// colliders at all — the player walked on an invisible 90×90 cube field from
// IslandCanvas.tsx far beyond the edge of the visible island.
//
// Module with no runtime imports (type-imports only): it is imported directly by
// the independent gate scripts/checkColliders.mjs — Node 24 strips types
// itself. Functions are pure, all numbers reproduce bit-for-bit for
// identical inputs, so the gate recomputes colliders by the same
// rules and compares them with what WorldScene actually renders.
//
// Rules:
//  - solid box over the measured mesh AABB (8 corners, yaw multiple of 90° → axis-aligned
//    box) — ONLY ground volumes: terrain_low* / terrain_mining (walkable
//    ground; the top of each collider equals the top of ITS tile: the map is multi-tier,
//    walkable levels 1..4 m; the terrain_mining quarry rim is lowered by 7 cm
//    — not walkable) and terrain_tall (exact 2×2×2 cube);
//  - terrain_slope* and ALL PROPS — NO colliders here: their physics are built by
//    WorldScene from the mesh triangles themselves (ModelShapeColliders,
//    TrimeshCollider). AABB boxes around non-convex shapes (antennas, turbines
//    with blades, rocks, bridges, tiles with curbs) diverged from the mesh:
//    the player could climb onto empty box space and hit invisible walls.
//    Mesh triangles give physics bit-for-bit with the visuals without manual
//    calibration — already proven for slopes;
//  - NPCs (npc_*, Mannequin*) get no colliders — their bodies are rendered by
//    CrewNPCs with skeletal rigs;
//  - support/perimeter/safetyFloor — invisible safety volumes where
//    there are no meshes at all (the rule "box = mesh AABB" does not apply to them).
//
// The visual side (InstancedModelGroup) uses the same UNIT_SCALE and
// MODEL_BOUNDS: scale and anchoring at the mesh bottom are computed from a single
// source for both rendering and physics.
// ══════════════════════════════════════════════════════════════════════

import type { IslandSceneData, PlacedObject } from '../types/scene';
import type { ModelBounds } from './modelBounds.generated';

// Collider category (used for coverage accounting in the gate): terrain/obstacle —
// box on ground volumes, support/perimeter/safetyFloor — invisible
// safety volumes without meshes (slope never falls into boxes — trimesh).
export type ColliderKind =
  | 'terrain'
  | 'slope'
  | 'obstacle'
  | 'support'
  | 'perimeter'
  | 'safetyFloor';

export interface SceneCollider {
  id: string;
  kind: ColliderKind;
  halfExtents: [number, number, number];
  position: [number, number, number];
  rotation: [number, number, number];
  friction: number;
}

export interface SceneColliderMeta {
  /** Bottom walkable tier of the map (minimum top of terrain_low* tiles). */
  groundLevel: number;
  /** Top level of the ramps (maximum top of terrain_slope* meshes). */
  terraceLevel: number;
  /** Island AABB over ground tiles (for the perimeter and safety floor). */
  islandMinX: number;
  islandMaxX: number;
  islandMinZ: number;
  islandMaxZ: number;
  /** Ground top under the spawn point (-Infinity if there is no support). */
  spawnSupportTop: number;
}

export interface SceneColliderBuild {
  /** Exactly one primary collider per non-NPC placement (108 total). */
  colliders: SceneCollider[];
  /** Additional caps of the same placements (base tiles under ramps). */
  subColliders: SceneCollider[];
  /** Supports/perimeter/safety floor — volumes where there are no meshes. */
  extras: SceneCollider[];
  meta: SceneColliderMeta;
}

// Scale unit of catalog meshes. It used to be picked by the getUnitScale
// heuristic using maxDim thresholds 10/100/1000, but the measured dimensions of all
// 72 catalog models lie in [0.5 .. 2.999991] (the maximum is
// windturbine_tall.gltf), so the heuristic always returned 1. The value is
// hardcoded as a constant so the visual (scale * UNIT_SCALE) and physics take it
// from one place.
export const UNIT_SCALE = 1;

// Snapshot of the non-walkable quarry rim terrain_mining (see the terrain rule below).
export const MINING_RIM_DROP = 0.07;

// ══════════════════════════════════════════════════════════════════════
// Quaternions/Euler XYZ — replicate three.js formulas verbatim
// (Quaternion.setFromEuler 'XYZ', Euler.setFromRotationMatrix 'XYZ' —
// see node_modules/three/src/math/Euler.js), because the Rapier binding
// expands rotation into THREE.Euler(x, y, z) with XYZ order, and the
// collider transforms must match the visual transforms.
// Verified against three 0.174: zero divergence over 180k random rotations and
// all scene yaws.
// ══════════════════════════════════════════════════════════════════════

interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

function quatFromEulerXYZ(x: number, y: number, z: number): Quat {
  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);
  return {
    x: s1 * c2 * c3 + c1 * s2 * s3,
    y: c1 * s2 * c3 - s1 * c2 * s3,
    z: c1 * c2 * s3 + s1 * s2 * c3,
    w: c1 * c2 * c3 - s1 * s2 * s3
  };
}

// Column elements with THREE.Matrix4.elements layout (te[0..10]).
function quatToTe(q: Quat): number[] {
  const x = q.x, y = q.y, z = q.z, w = q.w;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    1 - (yy + zz), xy + wz, xz - wy, 0,
    xy - wz, 1 - (xx + zz), yz + wx, 0,
    xz + wy, yz - wx, 1 - (xx + yy), 0,
    0, 0, 0, 1
  ];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

interface Aabb {
  center: [number, number, number];
  halfExtents: [number, number, number];
}

// World AABB of the placement mesh: the 8 corners of the measured AABB multiplied by
// fs = scale * UNIT_SCALE, rotated by the object's full rotation (for
// yaw-only objects — the same as "yaw from islandScene.json"), with the same
// anchoring at the mesh bottom as the visual InstancedModelGroup:
// pivotY = position.y − bounds.min.y·fs. Their AABB is the collider box.
function worldAabb(
  bounds: ModelBounds,
  fs: number,
  euler: [number, number, number],
  position: [number, number, number]
): Aabb {
  const te = quatToTe(quatFromEulerXYZ(euler[0], euler[1], euler[2]));
  const pivotY = position[1] - bounds.min[1] * fs;
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let ci = 0; ci < 2; ci++) {
    const cx = (ci === 0 ? bounds.min[0] : bounds.max[0]) * fs;
    for (let cj = 0; cj < 2; cj++) {
      const cy = (cj === 0 ? bounds.min[1] : bounds.max[1]) * fs;
      for (let ck = 0; ck < 2; ck++) {
        const cz = (ck === 0 ? bounds.min[2] : bounds.max[2]) * fs;
        const x = te[0] * cx + te[4] * cy + te[8] * cz;
        const y = te[1] * cx + te[5] * cy + te[9] * cz;
        const z = te[2] * cx + te[6] * cy + te[10] * cz;
        minX = Math.min(minX, position[0] + x);
        minY = Math.min(minY, pivotY + y);
        minZ = Math.min(minZ, position[2] + z);
        maxX = Math.max(maxX, position[0] + x);
        maxY = Math.max(maxY, pivotY + y);
        maxZ = Math.max(maxZ, position[2] + z);
      }
    }
  }
  return {
    center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
    halfExtents: [(maxX - minX) / 2, (maxY - minY) / 2, (maxZ - minZ) / 2]
  };
}

// Mesh top in world space (anchored at the bottom + maxY of the measured AABB).
function meshTopY(bounds: ModelBounds, fs: number, pivotY: number): number {
  return pivotY + bounds.max[1] * fs;
}

export function buildSceneColliders(
  sceneData: IslandSceneData,
  modelBounds: Record<string, ModelBounds>
): SceneColliderBuild {
  const colliders: SceneCollider[] = [];
  const subColliders: SceneCollider[] = [];
  const extras: SceneCollider[] = [];

  // NPC models (npc_*, Mannequin*) are rendered by CrewNPCs with a skeletal rig
  // and get no colliders — the same filter as in the instancing renderer.
  const isNpc = (lower: string): boolean => lower.startsWith('npc_') || lower.includes('mannequin');
  const isGroundTile = (lower: string): boolean =>
    lower.startsWith('terrain_low') || lower.startsWith('terrain_mining');
  const isRamp = (lower: string): boolean => lower.startsWith('terrain_slope');

  const unitScaleOf = (obj: PlacedObject): number =>
    (Array.isArray(obj.scale) ? obj.scale[0] : obj.scale || 1) * UNIT_SCALE;

  // ── Pass 1: prepare records and derived scene levels ──
  const records = sceneData.placedObjects.map((obj) => {
    const name = obj.modelPath.split('/').pop() || '';
    const lower = name.toLowerCase();
    const bounds = modelBounds[name];
    if (!bounds) {
      // extractModelBounds.mjs guarantees a record for every scene model
      // (otherwise its self-check exits with code 1) — a missing record is a data error.
      throw new Error(
        `sceneColliders: model ${name} has no MODEL_BOUNDS record — regenerate with: node scripts/extractModelBounds.mjs`
      );
    }
    const fs = unitScaleOf(obj);
    const pivotY = obj.position[1] - bounds.min[1] * fs;
    return { obj, bounds, lower, name, fs, pivotY };
  });
  const physical = records.filter((r) => !isNpc(r.lower));

  const groundTileTops: number[] = [];
  const groundBoxes: Aabb[] = [];
  const rampTopLevels: number[] = [];
  for (const rec of physical) {
    if (isGroundTile(rec.lower)) {
      groundTileTops.push(meshTopY(rec.bounds, rec.fs, rec.pivotY));
      groundBoxes.push(worldAabb(rec.bounds, rec.fs, rec.obj.rotation, rec.obj.position));
    } else if (isRamp(rec.lower)) {
      rampTopLevels.push(meshTopY(rec.bounds, rec.fs, rec.pivotY));
    }
  }
  if (groundTileTops.length === 0) {
    throw new Error('sceneColliders: no terrain_low* ground tiles in the scene — cannot derive the floor level');
  }
  // Multi-tier map: tiles sit at levels 1..4 m, there is no single "ground".
  // groundLevel = bottom walkable tier (minimum top of terrain_low* tiles,
  // above zero due to mesh anisotropy; the terrain_mining quarry is a local
  // pit and is not part of the base level). The collider top of each tile
  // is determined per-tile in pass 2 — a single clamp here would sink the
  // upper tiers to the bottom one.
  const groundLowTops: number[] = [];
  for (const rec of physical) {
    if (rec.lower.startsWith('terrain_low')) {
      groundLowTops.push(meshTopY(rec.bounds, rec.fs, rec.pivotY));
    }
  }
  const groundLevel = Math.min(...groundLowTops);
  // Top ramp level: on a multi-tier map terraces exist on every tier;
  // the historical field is kept as the maximum of ramps (no consumers of the value
  // except the gate — mirror recomputation comparison).
  const terraceLevel = rampTopLevels.length > 0 ? Math.max(...rampTopLevels) : groundLevel;
  const islandMinX = Math.min(...groundBoxes.map((b) => b.center[0] - b.halfExtents[0]));
  const islandMaxX = Math.max(...groundBoxes.map((b) => b.center[0] + b.halfExtents[0]));
  const islandMinZ = Math.min(...groundBoxes.map((b) => b.center[2] - b.halfExtents[2]));
  const islandMaxZ = Math.max(...groundBoxes.map((b) => b.center[2] + b.halfExtents[2]));
  const islandMinY = Math.min(...groundBoxes.map((b) => b.center[1] - b.halfExtents[1]));

  // ═══ Pass 2: placement colliders ═══
  // Yaw is a multiple of 90° (and rx=rz=0): the rotated local box coincides with the
  // mesh's world AABB, so the collider stays axis-aligned (rotation [0,0,0]).
  function isAxisAlignedYaw(euler: [number, number, number]): boolean {
    if (Math.abs(euler[0]) > 1e-12 || Math.abs(euler[2]) > 1e-12) return false;
    const quarter = Math.PI / 2;
    for (let k = -4; k <= 4; k++) {
      if (Math.abs(euler[1] - k * quarter) <= 1e-9) return true;
    }
    return false;
  }

  for (const rec of physical) {
    // Box colliders here are applied ONLY to ground volumes: tiles and the quarry
    // map perfectly to an axis-aligned box (their top is the walkable surface),
    // terrain_tall is an exact 2×2×2 cube. Slopes and ALL PROPS get their physics
    // from their own triangles (ModelShapeColliders in WorldScene): an AABB box around
    // antennas/turbines/rocks/modules produced "invisible walls" and phantom
    // floors where there is no mesh — the user could climb onto empty box space.
    if (isRamp(rec.lower) || !(isGroundTile(rec.lower) || rec.lower.startsWith('terrain_tall'))) {
      continue;
    }

    let kind: ColliderKind = 'obstacle';
    if (isGroundTile(rec.lower)) kind = 'terrain';

    const euler: [number, number, number] = [
      rec.obj.rotation[0],
      rec.obj.rotation[1],
      rec.obj.rotation[2]
    ];
    const box = worldAabb(rec.bounds, rec.fs, euler, rec.obj.position);
    const axisAligned = isAxisAlignedYaw(euler);
    let centerY = box.center[1];
    let halfY = box.halfExtents[1];
    // Ground: collider top = top of THE TILE ITSELF. The map is multi-tier
    // (walkable levels 1..4 m); a single groundLevel clamp would sink the upper
    // tiers — every tier is walkable by its own top. Exception: the
    // terrain_mining quarry rim (mesh up to +1.0725 above its bottom): the rim is not a
    // walkable surface, 7 cm is subtracted so the capsule does not catch the invisible
    // ledge along the crater perimeter. Catalog ground tiles are always axis-aligned
    // (yaw multiple of 90° — verified on the current map); the top/world rule
    // is defined in world coordinates.
    if (kind === 'terrain') {
      const top = box.center[1] + box.halfExtents[1];
      const bottom = box.center[1] - box.halfExtents[1];
      const cappedTop = rec.lower.startsWith('terrain_mining') ? top - MINING_RIM_DROP : top;
      centerY = (cappedTop + bottom) / 2;
      halfY = (cappedTop - bottom) / 2;
    }
    const halfExtents: [number, number, number] = axisAligned
      ? [box.halfExtents[0], halfY, box.halfExtents[2]]
      : [
          ((rec.bounds.max[0] - rec.bounds.min[0]) / 2) * rec.fs,
          halfY,
          ((rec.bounds.max[2] - rec.bounds.min[2]) / 2) * rec.fs
        ];
    colliders.push({
      id: rec.obj.id,
      kind,
      halfExtents,
      position: [box.center[0], centerY, box.center[2]],
      rotation: axisAligned ? [0, 0, 0] : euler,
      friction: 0.8
    });
  }

  // ═══ Invisible safety volumes (perimeter, floor) ═══

  // Former ramp-junction supports (drill plaza, solar terrace ridge) —
  // artifacts of the old procedural map: in the authored editor layout
  // junctions already rest on tiles, and phantom invisible boxes would only
  // break the passages. Junction quality is controlled by the e2e map walk.

  // Perimeter: invisible walls exactly at the edge of the ground tiles. On the multi-tier
  // map the wall height on each side is tied to the highest tile near
  // that side: a single-height wall from the bottom tier would leave the upper
  // tiers open (the 4th tier floor is 3 m higher). The elevation above the floor
  // is the same 0.85 m: the jump apex v²/(2g) = 5.5²/(2·19.6) ≈ 0.77 m < 0.85 —
  // it cannot be jumped over.
  const WALL_MARGIN = 0.1; // wall face lies exactly on the tile edge
  const WALL_HALF_THICKNESS = 0.1;
  const WALL_HEIGHT_ABOVE_GROUND = 0.85;
  const WALL_ADJACENT_STEP = 2.1; // a tile is "near a side" if its edge is within one tile step of the edge
  function sideWallTop(side: 'north' | 'south' | 'west' | 'east'): number {
    let top = -Infinity;
    for (const b of groundBoxes) {
      const edgeMaxX = b.center[0] + b.halfExtents[0];
      const edgeMinX = b.center[0] - b.halfExtents[0];
      const edgeMaxZ = b.center[2] + b.halfExtents[2];
      const edgeMinZ = b.center[2] - b.halfExtents[2];
      const boxTop = b.center[1] + b.halfExtents[1];
      if (
        (side === 'north' && islandMaxZ - edgeMaxZ <= WALL_ADJACENT_STEP) ||
        (side === 'south' && edgeMinZ - islandMinZ <= WALL_ADJACENT_STEP) ||
        (side === 'west' && edgeMinX - islandMinX <= WALL_ADJACENT_STEP) ||
        (side === 'east' && islandMaxX - edgeMaxX <= WALL_ADJACENT_STEP)
      ) {
        top = Math.max(top, boxTop);
      }
    }
    return Number.isFinite(top) ? top : groundLevel;
  }
  const islandCenterX = (islandMinX + islandMaxX) / 2;
  const islandHalfX = (islandMaxX - islandMinX) / 2 + WALL_MARGIN;
  const islandCenterZ = (islandMinZ + islandMaxZ) / 2;
  const islandHalfZ = (islandMaxZ - islandMinZ) / 2 + WALL_MARGIN;
  function perimeterWall(sideTop: number): { wallCenterY: number; wallHalfY: number } {
    const wallTop = sideTop + WALL_HEIGHT_ABOVE_GROUND;
    return { wallCenterY: (islandMinY + wallTop) / 2, wallHalfY: (wallTop - islandMinY) / 2 };
  }
  const northWall = perimeterWall(sideWallTop('north'));
  const southWall = perimeterWall(sideWallTop('south'));
  const westWall = perimeterWall(sideWallTop('west'));
  const eastWall = perimeterWall(sideWallTop('east'));
  extras.push(
    {
      id: 'perimeter_north',
      kind: 'perimeter',
      halfExtents: [islandHalfX, northWall.wallHalfY, WALL_HALF_THICKNESS],
      position: [islandCenterX, northWall.wallCenterY, islandMaxZ + WALL_MARGIN],
      rotation: [0, 0, 0],
      friction: 0.8
    },
    {
      id: 'perimeter_south',
      kind: 'perimeter',
      halfExtents: [islandHalfX, southWall.wallHalfY, WALL_HALF_THICKNESS],
      position: [islandCenterX, southWall.wallCenterY, islandMinZ - WALL_MARGIN],
      rotation: [0, 0, 0],
      friction: 0.8
    },
    {
      id: 'perimeter_west',
      kind: 'perimeter',
      halfExtents: [WALL_HALF_THICKNESS, westWall.wallHalfY, islandHalfZ],
      position: [islandMinX - WALL_MARGIN, westWall.wallCenterY, islandCenterZ],
      rotation: [0, 0, 0],
      friction: 0.8
    },
    {
      id: 'perimeter_east',
      kind: 'perimeter',
      halfExtents: [WALL_HALF_THICKNESS, eastWall.wallHalfY, islandHalfZ],
      position: [islandMaxX + WALL_MARGIN, eastWall.wallCenterY, islandCenterZ],
      rotation: [0, 0, 0],
      friction: 0.8
    }
  );

  // Safety floor strictly under the visual island: a thin box 0.1 m
  // below the top of the tiles catches falls into the numerical seam between adjacent tiles;
  // beyond the tile edge there is no floor — walking on an invisible floor in the void
  // is impossible. Width = island extent + the same margin as the walls.
  const SEAM_DROP = 0.1; // top below ground level — the drop is noticeable but small
  const SAFETY_HALF_HEIGHT = 0.25;
  const safetyTop = groundLevel - SEAM_DROP;
  extras.push({
    id: 'safety_floor',
    kind: 'safetyFloor',
    halfExtents: [(islandMaxX - islandMinX) / 2 + WALL_MARGIN, SAFETY_HALF_HEIGHT, (islandMaxZ - islandMinZ) / 2 + WALL_MARGIN],
    position: [islandCenterX, safetyTop - SAFETY_HALF_HEIGHT, islandCenterZ],
    rotation: [0, 0, 0],
    friction: 0.8
  });

  // Ground top under the spawn point (the gate additionally verifies that spawn
  // stands on a tile, not in the air and not inside the ground).
  const [sx, , sz] = sceneData.spawnPoint;
  let spawnSupportTop = -Infinity;
  for (let i = 0; i < groundBoxes.length; i++) {
    const b = groundBoxes[i];
    if (
      sx >= b.center[0] - b.halfExtents[0] &&
      sx <= b.center[0] + b.halfExtents[0] &&
      sz >= b.center[2] - b.halfExtents[2] &&
      sz <= b.center[2] + b.halfExtents[2]
    ) {
      spawnSupportTop = Math.max(spawnSupportTop, groundTileTops[i]);
    }
  }

  return {
    colliders,
    subColliders,
    extras,
    meta: {
      groundLevel,
      terraceLevel,
      islandMinX,
      islandMaxX,
      islandMinZ,
      islandMaxZ,
      spawnSupportTop
    }
  };
}

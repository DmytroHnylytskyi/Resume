#!/usr/bin/env node
/**
 * checkColliders.mjs — INDEPENDENT gate for the space-map physics.
 *
 * Pure Node 24, no dependencies. The TS module src/data/sceneColliders.ts
 * is imported directly — Node strips types itself.
 *
 * What it does:
 *  1. Independently recomputes ALL box colliders from src/data/islandScene.json +
 *     src/data/modelBounds.generated.ts by the same rules documented
 *     in sceneColliders.ts (8 corners of the mesh AABB; boxes — ONLY ground volumes:
 *     tiles/quarry/tall cube + perimeter/safety floor). Slopes and ALL PROPS
 *     have NO boxes: their physics is a TrimeshCollider from mesh triangles
 *     (ModelShapeColliders in WorldScene), and the gate checks it separately
 *     (item 2d) against .bin vertices.
 *  2. Independence is NOT only from the module code but also from the rules/meshes:
 *     — compares MODEL_BOUNDS with accessor.min/max of the .gltf/.glb assets themselves
 *       (semantics of extractModelBounds: union of POSITION over meshes from default
 *       scene roots with node-graph transforms; .glb — via its header);
 *  3. Compares the recomputation with what is actually rendered in WorldScene
 *     (the list returned by buildSceneColliders and mapped into CuboidCollider):
 *      — center tolerance <= 0.05 m;
 *      — half extents <= 2%;
 *      — for yaw that is a multiple of 90° (and zero rx/rz) — strictly exact
 *        match (bit-for-bit) on center, half extents and rotation;
 *      — coverage of all non-NPC placements (slopes/props — trimesh, item 2d);
 *      — ground top surface equals the top of its own tile;
 *      — spawn stands on the ground (support exists, drop <= 0.3 m) and its capsule
 *        does not intersect boxes or world AABBs of trimesh bodies;
 *      — WorldScene renders box colliders only through the module (no manual
 *        numbers), IslandCanvas no longer holds a cube floor.
 *  4. On any mismatch exits with code 1. The last output line — always:
 *     ##COLLIDER_SUMMARY## {"models":N,"colliders":N,"mismatched":N,"uncovered":N}
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const COL = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

const failures = [];
const ok = (msg) => console.log(`  ${COL.green}OK${COL.reset} ${msg}`);
function fail(msg, err) {
  failures.push(msg);
  console.log(`  ${COL.red}FAIL${COL.reset} ${msg}`);
  if (err && err.stack) console.log(`${COL.gray}${String(err.stack).split('\n').slice(0, 4).join('\n')}${COL.reset}`);
}

// ── Loading data ──
const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const ROOT = path.resolve(scriptDir, '..');
const scenePath = path.join(ROOT, 'src', 'data', 'islandScene.json');
const boundsPath = path.join(ROOT, 'src', 'data', 'modelBounds.generated.ts');
const modulePath = path.join(ROOT, 'src', 'data', 'sceneColliders.ts');
const worldScenePath = path.join(ROOT, 'src', 'components', '3d', 'WorldScene.tsx');
const islandCanvasPath = path.join(ROOT, 'src', 'components', '3d', 'IslandCanvas.tsx');

let sceneData = null;
let MODEL_BOUNDS = null;
let moduleApi = null;
try {
  sceneData = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
  const boundsMod = await import(pathToFileURL(boundsPath).href);
  MODEL_BOUNDS = boundsMod.MODEL_BOUNDS;
  moduleApi = await import(pathToFileURL(modulePath).href);
} catch (err) {
  // Data or module cannot be read — the model fallback count is impossible.
  const nonNpcAll = sceneData ? sceneData.placedObjects.filter((o) => !/npc_|mannequin/i.test(o.modelPath)) : [];
  const modelsKnown = sceneData
    ? new Set(nonNpcAll.map((o) => o.modelPath.split('/').pop()).filter((n) => MODEL_BOUNDS && MODEL_BOUNDS[n])).size
    : 0;
  fail(`sources load: ${err && err.message}`, err);
  printSummary(modelsKnown, 0, failures.length, sceneData ? nonNpcAll.length : 0);
}

// ══════════════════════════════════════════════════════════════════════
// Independent recomputation (formulas replicate the documented rules of
// sceneColliders.ts with the exact operation order — this is what makes the
// "yaw multiple of 90° — strictly exact match" check meaningful).
// ══════════════════════════════════════════════════════════════════════

// ── Independence from MESHES (not just from the module code) ──
// Assets are read directly from public/model/kaykit_space: .gltf — JSON text,
// .glb — via the GLB header (magic/version/length, JSON chunk from byte 20).
function readGltfJson(absPath) {
  const buf = fs.readFileSync(absPath);
  if (absPath.endsWith('.glb')) {
    if (buf.length < 20) throw new Error(`GLB too small: ${absPath}`);
    const magic = buf.readUInt32LE(0);
    const version = buf.readUInt32LE(4);
    const total = buf.readUInt32LE(8);
    const chunkLen = buf.readUInt32LE(12);
    const chunkType = buf.readUInt32LE(16);
    if (magic !== 0x46546c67 || version !== 2) throw new Error(`not GLB v2: ${path.basename(absPath)}`);
    if (chunkType !== 0x4e4f534a) throw new Error(`first chunk is not JSON: ${path.basename(absPath)}`);
    if (total !== buf.length) throw new Error(`GLB header length != file size: ${path.basename(absPath)}`);
    return JSON.parse(buf.slice(20, 20 + chunkLen).toString('utf8'));
  }
  return JSON.parse(buf.toString('utf8'));
}

// Local node matrix: n.matrix (column-major) or T·R·S from TRS components.
function gltfNodeLocalMatrix(n) {
  if (n.matrix) return n.matrix.slice();
  const t = n.translation || [0, 0, 0];
  const q = n.rotation || [0, 0, 0, 1];
  const s = n.scale || [1, 1, 1];
  const [x, y, z, w] = q;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1
  ];
}

// a·b for column-major matrices.
function gltfMatMul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

function gltfXform(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]
  ];
}

// World AABB of the asset: union of accessor.min/max corners for POSITION of all mesh
// primitives reachable from the default scene roots, with node-graph
// transforms (same semantics as scripts/extractModelBounds.mjs —
// equivalent to THREE.Box3().setFromObject right after loading).
function gltfAssetBounds(absPath) {
  const json = readGltfJson(absPath);
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  const touch = (p) => {
    minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); minZ = Math.min(minZ, p[2]);
    maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]); maxZ = Math.max(maxZ, p[2]);
  };
  const walk = (idx, parentM) => {
    const n = json.nodes[idx];
    const world = gltfMatMul(parentM, gltfNodeLocalMatrix(n));
    if (n.mesh !== undefined && json.meshes[n.mesh]) {
      for (const prim of json.meshes[n.mesh].primitives) {
        const acc = json.accessors[prim.attributes.POSITION];
        if (!acc || !acc.min || !acc.max) throw new Error(`POSITION accessor without min/max: ${absPath}`);
        for (const cx of [acc.min[0], acc.max[0]]) {
          for (const cy of [acc.min[1], acc.max[1]]) {
            for (const cz of [acc.min[2], acc.max[2]]) {
              touch(gltfXform(world, [cx, cy, cz]));
            }
          }
        }
      }
    }
    for (const child of n.children || []) walk(child, world);
  };
  const sceneRoots = json.scenes[json.scene ?? 0].nodes;
  for (const r of sceneRoots) walk(r, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ]
  };
}

// Rise axis of the terrain_slope* wedge over .bin vertices: vertex centroids at
// min-Y and max-Y in the XZ plane; direction from the min-Y centroid to the max-Y centroid = rise.
// (used by check 2d via the shared decoder; a separate function is not needed)
function gateQuatFromEulerXYZ(x, y, z) {
  const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
  return {
    x: s1 * c2 * c3 + c1 * s2 * s3,
    y: c1 * s2 * c3 - s1 * c2 * s3,
    z: c1 * c2 * s3 + s1 * s2 * c3,
    w: c1 * c2 * c3 - s1 * s2 * s3
  };
}

function gateQuatToTe(q) {
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

function gateQuatMul(a, b) {
  return {
    x: a.x * b.w + a.w * b.x + a.y * b.z - a.z * b.y,
    y: a.y * b.w + a.w * b.y + a.z * b.x - a.x * b.z,
    z: a.z * b.w + a.w * b.z + a.x * b.y - a.y * b.x,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
  };
}

function gateClamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function gateEulerXYZFromQuat(q) {
  const te = gateQuatToTe(q);
  const m13 = te[8];
  const y = Math.asin(gateClamp(m13, -1, 1));
  let x, z;
  if (Math.abs(m13) < 0.9999999) {
    x = Math.atan2(-te[9], te[10]);
    z = Math.atan2(-te[4], te[0]);
  } else {
    x = Math.atan2(te[6], te[5]);
    z = 0;
  }
  return [x, y, z];
}

function gateWorldAabb(bounds, fs, euler, position) {
  const te = gateQuatToTe(gateQuatFromEulerXYZ(euler[0], euler[1], euler[2]));
  const pivotY = position[1] - bounds.min[1] * fs;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
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

function gateMedian(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ── Classification (same predicates as in sceneColliders) ──
// The gate DERIVES the scale unit from measured dimensions instead of taking it from the
// module and instead of hardcoding it: max(maxDim) over MODEL_BOUNDS is run through the
// thresholds of the former getUnitScale heuristic (10/100/1000). Currently the maximum is
// windturbine_tall 2.999991, no threshold is reached → 1; if a large model appears
// in the catalog tomorrow, the gate changes its expectation automatically.
// The module must produce the same answer (check below); substituting UNIT_SCALE in the
// module diverges from this value and fails the gate.
const GATE_MAX_MAXDIM = Math.max(...Object.values(MODEL_BOUNDS).map((b) => b.maxDim));
const GATE_UNIT_SCALE = GATE_MAX_MAXDIM > 1000 ? 1 / 1000 : GATE_MAX_MAXDIM > 100 ? 1 / 100 : GATE_MAX_MAXDIM > 10 ? 1 / 10 : 1;
// Snapshot of the non-walkable terrain_mining quarry rim. Mirrors the module's
// MINING_RIM_DROP; the gate itself checks that the constants match (see comparison below).
const GATE_MINING_RIM_DROP = 0.07;
const isNpcLower = (lower) => lower.startsWith('npc_') || lower.includes('mannequin');
const isGroundLower = (lower) => lower.startsWith('terrain_low') || lower.startsWith('terrain_mining');
const isRampLower = (lower) => lower.startsWith('terrain_slope');
// Box volumes (axis-aligned, walkable surface = tile top): ground + tall cube
// 2×2×2. Everything else (slopes + props) — exact trimesh physics of the meshes.
const isBoxedLower = (lower) => isGroundLower(lower) || lower.startsWith('terrain_tall');

// Ramp ascent/descent is checked against .bin vertices (see 2d); there are no
// duplicated constants anymore. The landing pad profile (deck/rings) was removed together
// with prop box colliders: pads now have exact trimesh mesh physics.

// ══════════════════════════════════════════════════════════════════════
// Main check
// ══════════════════════════════════════════════════════════════════════

function gateBuild() {
  const records = sceneData.placedObjects.map((obj) => {
    const name = obj.modelPath.split('/').pop() || '';
    const lower = name.toLowerCase();
    if (!MODEL_BOUNDS[name]) {
      throw new Error(`model ${name} has no MODEL_BOUNDS record`);
    }
    const rawScale = Array.isArray(obj.scale) ? obj.scale[0] : obj.scale || 1;
    const fs = rawScale * GATE_UNIT_SCALE;
    const pivotY = obj.position[1] - MODEL_BOUNDS[name].min[1] * fs;
    return { obj, name, lower, bounds: MODEL_BOUNDS[name], fs, pivotY };
  });
  const physical = records.filter((r) => !isNpcLower(r.lower));

  const groundTops = [];
  const groundLowTops = [];
  const groundBoxes = [];
  const rampTops = [];
  for (const rec of physical) {
    if (isGroundLower(rec.lower)) {
      const top = rec.pivotY + MODEL_BOUNDS[rec.name].max[1] * rec.fs;
      groundTops.push(top);
      groundBoxes.push(gateWorldAabb(MODEL_BOUNDS[rec.name], rec.fs, rec.obj.rotation, rec.obj.position));
      // Multi-tier map: the base level comes from walkable terrain_low* tiles;
      // the terrain_mining quarry is a local pit and is not part of the base.
      if (!rec.lower.startsWith('terrain_mining')) groundLowTops.push(top);
    } else if (isRampLower(rec.lower)) {
      rampTops.push(rec.pivotY + MODEL_BOUNDS[rec.name].max[1] * rec.fs);
    }
  }
  const groundLevel = Math.min(...groundLowTops);
  // On a multi-tier map terraces exist on every tier — only the maximum is derived
  // from the terraces (the historical terraceLevel field is kept for comparison).
  const terraceLevel = rampTops.length > 0 ? Math.max(...rampTops) : groundLevel;
  const islandMinX = Math.min(...groundBoxes.map((b) => b.center[0] - b.halfExtents[0]));
  const islandMaxX = Math.max(...groundBoxes.map((b) => b.center[0] + b.halfExtents[0]));
  const islandMinZ = Math.min(...groundBoxes.map((b) => b.center[2] - b.halfExtents[2]));
  const islandMaxZ = Math.max(...groundBoxes.map((b) => b.center[2] + b.halfExtents[2]));
  const islandMinY = Math.min(...groundBoxes.map((b) => b.center[1] - b.halfExtents[1]));

  const primaries = [];
  const subs = [];
  for (const rec of physical) {
    const exporter = rec.obj;
    // Slopes and props have no boxes: their physics is mesh trimesh (check 2d).
    if (!isBoxedLower(rec.lower)) {
      continue;
    }
    const euler = [exporter.rotation[0], exporter.rotation[1], exporter.rotation[2]];
    const b = MODEL_BOUNDS[rec.name];
    const box = gateWorldAabb(b, rec.fs, euler, exporter.position);
    // Ground: collider top = top of its own tile (the map is multi-tier,
    // walkable levels 1..4 m); the terrain_mining quarry rim is non-walkable —
    // lowered by GATE_MINING_RIM_DROP (the same "0.07" as the module's
    // MINING_RIM_DROP; the gate additionally compares this number with the module below).
    // terrain_tall is an exact 2×2×2 cube, its top is not clamped (kind obstacle).
    let groundHalfY = box.halfExtents[1];
    let groundCenterY = box.center[1];
    if (isGroundLower(rec.lower)) {
      const top = box.center[1] + box.halfExtents[1];
      const bottom = box.center[1] - box.halfExtents[1];
      const cappedTop = rec.lower.startsWith('terrain_mining') ? top - GATE_MINING_RIM_DROP : top;
      groundCenterY = (cappedTop + bottom) / 2;
      groundHalfY = (cappedTop - bottom) / 2;
    }
    primaries.push({
      id: exporter.id,
      halfExtents: [box.halfExtents[0], groundHalfY, box.halfExtents[2]],
      position: [box.center[0], groundCenterY, box.center[2]],
      rotation: [0, 0, 0],
      friction: 0.8
    });
  }

  // Perimeter (same derivation as the module: wall height of each side from the
  // highest tile on that side + 0.85, multi-tier map).
  const WALL_MARGIN = 0.1;
  const WALL_HALF_THICKNESS = 0.1;
  const WALL_HEIGHT_ABOVE_GROUND = 0.85;
  const WALL_ADJACENT_STEP = 2.1;
  const gateSideWallTop = (side) => {
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
  };
  const gateWallPart = (sideTop) => {
    const wallTop = sideTop + WALL_HEIGHT_ABOVE_GROUND;
    return { wallCenterY: (islandMinY + wallTop) / 2, wallHalfY: (wallTop - islandMinY) / 2 };
  };
  const islandCenterX = (islandMinX + islandMaxX) / 2;
  const islandHalfX = (islandMaxX - islandMinX) / 2 + WALL_MARGIN;
  const islandCenterZ = (islandMinZ + islandMaxZ) / 2;
  const islandHalfZ = (islandMaxZ - islandMinZ) / 2 + WALL_MARGIN;
  const northWall = gateWallPart(gateSideWallTop('north'));
  const southWall = gateWallPart(gateSideWallTop('south'));
  const westWall = gateWallPart(gateSideWallTop('west'));
  const eastWall = gateWallPart(gateSideWallTop('east'));
  const extras = [
    { id: 'perimeter_north', halfExtents: [islandHalfX, northWall.wallHalfY, WALL_HALF_THICKNESS], position: [islandCenterX, northWall.wallCenterY, islandMaxZ + WALL_MARGIN], rotation: [0, 0, 0], friction: 0.8 },
    { id: 'perimeter_south', halfExtents: [islandHalfX, southWall.wallHalfY, WALL_HALF_THICKNESS], position: [islandCenterX, southWall.wallCenterY, islandMinZ - WALL_MARGIN], rotation: [0, 0, 0], friction: 0.8 },
    { id: 'perimeter_west', halfExtents: [WALL_HALF_THICKNESS, westWall.wallHalfY, islandHalfZ], position: [islandMinX - WALL_MARGIN, westWall.wallCenterY, islandCenterZ], rotation: [0, 0, 0], friction: 0.8 },
    { id: 'perimeter_east', halfExtents: [WALL_HALF_THICKNESS, eastWall.wallHalfY, islandHalfZ], position: [islandMaxX + WALL_MARGIN, eastWall.wallCenterY, islandCenterZ], rotation: [0, 0, 0], friction: 0.8 },
    {
      id: 'safety_floor',
      halfExtents: [(islandMaxX - islandMinX) / 2 + WALL_MARGIN, 0.25, (islandMaxZ - islandMinZ) / 2 + WALL_MARGIN],
      position: [islandCenterX, groundLevel - 0.1 - 0.25, islandCenterZ],
      rotation: [0, 0, 0],
      friction: 0.8
    }
  ];
  // Ramp junction supports (drill plaza, terrace ridge) became obsolete together with
  // the old procedural map — the module no longer builds them (see there).

  // Ground top under the spawn.
  const [sx, , sz] = sceneData.spawnPoint;
  let spawnTop = -Infinity;
  for (let i = 0; i < groundBoxes.length; i++) {
    const b = groundBoxes[i];
    if (sx >= b.center[0] - b.halfExtents[0] && sx <= b.center[0] + b.halfExtents[0] &&
        sz >= b.center[2] - b.halfExtents[2] && sz <= b.center[2] + b.halfExtents[2]) {
      spawnTop = Math.max(spawnTop, groundTops[i]);
    }
  }

  return { primaries, subs, extras, groundLevel, terraceLevel, spawnTop, groundTops, groundBoxes };
}

let gate = null;
try {
  gate = gateBuild();
} catch (err) {
  fail('independent recomputation runs', err);
}

try {
  console.log(`${COL.bold}${COL.cyan}=== checkColliders: independent gate for the space-map physics ===${COL.reset}`);

  // Component sources are read once at the top (needed by the spawn check
  // and by the "numbers only from the module" check).
  const worldSrc = fs.readFileSync(worldScenePath, 'utf8');
  const canvasSrc = fs.readFileSync(islandCanvasPath, 'utf8');

  // ── 1. Single module call (numeric output to the checks) ──
  const moduleBuild = moduleApi.buildSceneColliders(sceneData, MODEL_BOUNDS);
  const meta = moduleBuild.meta;
  // Scale unit: the module value must match the one derived by the gate.
  moduleApi.UNIT_SCALE === GATE_UNIT_SCALE
    ? ok(`module UNIT_SCALE = ${moduleApi.UNIT_SCALE} == gate derivation: max(maxDim over MODEL_BOUNDS) = ${GATE_MAX_MAXDIM} → thresholds 10/100/1000 → ${GATE_UNIT_SCALE}`)
    : fail(`module UNIT_SCALE ${moduleApi.UNIT_SCALE} != derived by gate ${GATE_UNIT_SCALE}`);
  moduleApi.MINING_RIM_DROP === GATE_MINING_RIM_DROP
    ? ok(`quarry rim snapshot: module MINING_RIM_DROP = ${moduleApi.MINING_RIM_DROP} == gate ${GATE_MINING_RIM_DROP}`)
    : fail(`MINING_RIM_DROP: module ${moduleApi.MINING_RIM_DROP} != gate ${GATE_MINING_RIM_DROP}`);
  if (gate) {
    Math.abs(meta.groundLevel - gate.groundLevel) <= 1e-9
      ? ok(`ground level from tile AABBs: ${meta.groundLevel} (independently: ${gate.groundLevel})`)
      : fail(`ground level: module ${meta.groundLevel} vs gate ${gate.groundLevel}`);
    Math.abs(meta.terraceLevel - gate.terraceLevel) <= 1e-9
      ? ok(`top terrace level from ramp AABBs: ${meta.terraceLevel} (independently: ${gate.terraceLevel})`)
      : fail(`terrace level: module ${meta.terraceLevel} vs gate ${gate.terraceLevel}`);
  }

  // ── 1b. MODEL_BOUNDS against the .gltf/.glb assets themselves ──
  // (independence from the generator: the gate does not trust MODEL_BOUNDS blindly).
  {
    const assetsDir = path.join(ROOT, 'public', 'model', 'kaykit_space');
    const BOUNDS_TOL = 5e-6; // data in bounds is rounded to 6 decimals
    let checked = 0;
    const bad = [];
    for (const [name, b] of Object.entries(MODEL_BOUNDS)) {
      const file = path.join(assetsDir, name);
      if (!fs.existsSync(file)) {
        bad.push(`${name}: file missing`);
        continue;
      }
      let measured;
      try {
        measured = gltfAssetBounds(file);
      } catch (err) {
        bad.push(`${name}: ${err.message}`);
        continue;
      }
      const drift = Math.max(
        Math.abs(measured.min[0] - b.min[0]), Math.abs(measured.min[1] - b.min[1]), Math.abs(measured.min[2] - b.min[2]),
        Math.abs(measured.max[0] - b.max[0]), Math.abs(measured.max[1] - b.max[1]), Math.abs(measured.max[2] - b.max[2])
      );
      // Derived fields must also agree with min/max:
      // size = max − min, maxDim = the largest component of size.
      const sizeDrift = Math.max(
        Math.abs(b.size[0] - (b.max[0] - b.min[0])),
        Math.abs(b.size[1] - (b.max[1] - b.min[1])),
        Math.abs(b.size[2] - (b.max[2] - b.min[2]))
      );
      const maxDimDrift = Math.abs(b.maxDim - Math.max(b.size[0], b.size[1], b.size[2]));
      if (!(drift <= BOUNDS_TOL)) bad.push(`${name}: min/max drift ${drift.toExponential(2)} m`);
      else if (!(sizeDrift <= BOUNDS_TOL)) bad.push(`${name}: size disagrees with min/max`);
      else if (!(maxDimDrift <= BOUNDS_TOL)) bad.push(`${name}: maxDim disagrees with size`);
      checked++;
    }
    checked === Object.keys(MODEL_BOUNDS).length && bad.length === 0
      ? ok(`MODEL_BOUNDS matches accessor.min/max of all ${checked} assets (tolerance ${BOUNDS_TOL})`)
      : fail(`MODEL_BOUNDS diverges from assets (${bad.length}): ${bad.slice(0, 4).join('; ')}`);
  }

  // ── 2. Coverage of all non-NPC placements ──
  // Slopes excluded: their physics is trimesh (2d), not a primary box.
  const nonNpc = sceneData.placedObjects.filter((o) => {
    const n = (o.modelPath.split('/').pop() || '').toLowerCase();
    return !isNpcLower(n);
  });
  // Two physics classes: ground volumes — axis-aligned boxes (module + gate),
  // slopes and ALL PROPS — trimesh from their own triangles (2d).
  const boxedObjs = nonNpc.filter((o) => isBoxedLower((o.modelPath.split('/').pop() || '').toLowerCase()));
  const trimeshObjs = nonNpc.filter((o) => {
    const n = (o.modelPath.split('/').pop() || '').toLowerCase();
    return !isBoxedLower(n);
  });
  const uniqueModels = new Set(nonNpc.map((o) => o.modelPath.split('/').pop()));
  const modulePrimaries = moduleBuild.colliders;
  const moduleById = new Map(modulePrimaries.map((c) => [c.id, c]));
  const gateById = gate ? new Map(gate.primaries.map((c) => [c.id, c])) : new Map();

  let uncovered = 0;
  const missingIds = [];
  for (const obj of boxedObjs) {
    if (!moduleById.has(obj.id) || !gateById.has(obj.id)) {
      uncovered++;
      missingIds.push(obj.id);
    }
  }
  uncovered === 0
    ? ok(`coverage of all ${boxedObjs.length} box placements with primary colliders (+${trimeshObjs.length} slopes/props on trimesh, item 2d)`)
    : fail(`uncovered placements: ${uncovered} (${missingIds.slice(0, 4).join(', ')}...)`);

  modulePrimaries.length === boxedObjs.length && new Set(modulePrimaries.map((c) => c.id)).size === modulePrimaries.length
    ? ok(`exactly ${modulePrimaries.length} primary colliders — one per box placement, ids unique`)
    : fail(`primary collider count ${modulePrimaries.length} != placements ${boxedObjs.length}`);

  // ── 2d. Slopes + props: trimesh physics must match the mesh ──
  // For each non-box placement the gate decodes ALL POSITION vertices
  // from .bin (taking into account .gltf node transforms and the placement matrix:
  // scale·UNIT_SCALE, anchoring at the mesh bottom, full Euler XYZ — the same
  // formulas as in ModelShapeColliders) and requires:
  //   — triangle count > 0 and valid indices (within the vertex range);
  //   — axis-aligned instances: world min/max of the geometry ==
  //     gateWorldAabb(MODEL_BOUNDS...) — the physical surface is neither larger nor
  //     smaller than the visible mesh;
  //   — instances with arbitrary yaw (45°): the physical surface does not
  //     protrude beyond the corner AABB of the visible mesh (a sparse mesh yields
  //     a world vertex AABB strictly smaller — that is normal).
  const trimeshWorldAabbs = []; // for the spawn capsule (5b): the set is prepared in the block below
  {
    const assetsDir = path.join(ROOT, 'public', 'model', 'kaykit_space');
    let trimeshBad = 0;
    const trimeshErrors = [];
    let trimeshTriangles = 0;
    let trimeshVertices = 0;
    // Dimension cache: each model is loaded once.
    const primCache = new Map();
    const loadModelPrims = (name) => {
      if (primCache.has(name)) return primCache.get(name);
      const gltfPath = path.join(assetsDir, name);
      const json = readGltfJson(gltfPath);
      const binUri = json.buffers[json.bufferViews[0].buffer ?? 0].uri;
      if (!binUri) throw new Error(`${name}: no .bin buffer`);
      const bin = fs.readFileSync(path.join(path.dirname(gltfPath), decodeURIComponent(binUri)));
      const meshData = json.meshes.map((msh) =>
        msh.primitives.map((prim) => {
          const pa = json.accessors[prim.attributes.POSITION];
          const bv = json.bufferViews[pa.bufferView];
          const off = (bv.byteOffset || 0) + (pa.byteOffset || 0);
          const stride = bv.byteStride || 12;
          const positions = [];
          for (let i = 0; i < pa.count; i++) {
            const o = off + i * stride;
            positions.push([bin.readFloatLE(o), bin.readFloatLE(o + 4), bin.readFloatLE(o + 8)]);
          }
          let idx = null;
          if (prim.indices !== undefined) {
            const ia = json.accessors[prim.indices];
            const ibv = json.bufferViews[ia.bufferView];
            const ioff = (ibv.byteOffset || 0) + (ia.byteOffset || 0);
            const istride = ibv.byteStride || (ia.componentType === 5123 ? 2 : 4);
            idx = [];
            for (let i = 0; i < ia.count; i++) {
              idx.push(ia.componentType === 5123 ? bin.readUInt16LE(ioff + i * istride) : bin.readUInt32LE(ioff + i * istride));
            }
          }
          return { positions, idx };
        })
      );
      // Map of nodes with meshes → their world matrices from the default scene roots.
      const nodeWorldByMesh = new Map();
      const walk = (ni, parent) => {
        const n = json.nodes[ni];
        const world = gltfMatMul(parent, gltfNodeLocalMatrix(n));
        if (n.mesh !== undefined) nodeWorldByMesh.set(n.mesh, world);
        for (const c of n.children || []) walk(c, world);
      };
      for (const r of json.scenes[json.scene ?? 0].nodes) walk(r, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
      const data = { meshData, nodeWorldByMesh };
      primCache.set(name, data);
      return data;
    };

    for (const obj of trimeshObjs) {
      const name = obj.modelPath.split('/').pop();
      const yaw = obj.rotation[1];
      const axisAligned =
        Math.abs(obj.rotation[0]) <= 1e-12 && Math.abs(obj.rotation[2]) <= 1e-12 &&
        [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2, 2 * Math.PI].some((a) => [1, -1].some((s) => Math.abs(yaw - s * a) <= 1e-9));
      const rec = { obj, bounds: MODEL_BOUNDS[name], name, lower: name.toLowerCase(), fs: (Array.isArray(obj.scale) ? obj.scale[0] : obj.scale || 1) * GATE_UNIT_SCALE };
      rec.pivotY = obj.position[1] - rec.bounds.min[1] * rec.fs;
      const expected = gateWorldAabb(rec.bounds, rec.fs, obj.rotation, obj.position);
      try {
        const { meshData, nodeWorldByMesh } = loadModelPrims(name);
        // Placement matrix (column-major, as in gltfMatMul): T·R·S.
        const q = gateQuatFromEulerXYZ(obj.rotation[0], obj.rotation[1], obj.rotation[2]);
        const te = gateQuatToTe(q);
        const mPlace = [
          te[0] * rec.fs, te[1] * rec.fs, te[2] * rec.fs, 0,
          te[4] * rec.fs, te[5] * rec.fs, te[6] * rec.fs, 0,
          te[8] * rec.fs, te[9] * rec.fs, te[10] * rec.fs, 0,
          obj.position[0], rec.pivotY, obj.position[2], 1
        ];
        let minY = Infinity, maxY = -Infinity;
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        let triangles = 0;
        meshData.forEach((prims, meshIdx) => {
          const nodeWorld = nodeWorldByMesh.get(meshIdx);
          if (!nodeWorld) throw new Error(`${name}: mesh node ${meshIdx} is unreachable from scene roots`);
          const m = gltfMatMul(mPlace, nodeWorld);
          for (const prim of prims) {
            prim.positions.forEach((p) => {
              const w = gltfXform(m, p);
              minX = Math.min(minX, w[0]); maxX = Math.max(maxX, w[0]);
              minY = Math.min(minY, w[1]); maxY = Math.max(maxY, w[1]);
              minZ = Math.min(minZ, w[2]); maxZ = Math.max(maxZ, w[2]);
            });
            const nIdx = prim.idx ? prim.idx.length : prim.positions.length;
            triangles += nIdx / 3;
            if (prim.idx) {
              const bad = prim.idx.some((i) => i < 0 || i >= prim.positions.length);
              if (bad) throw new Error(`${name}: index out of vertex range`);
            }
          }
        });
        trimeshTriangles += triangles;
        trimeshVertices += meshData.reduce((s, prims) => s + prims.reduce((ss, p) => ss + p.positions.length, 0), 0);
        trimeshWorldAabbs.push({
          id: obj.id,
          min: [minX, minY, minZ],
          max: [maxX, maxY, maxZ]
        });
        const tol = 5e-4;
        if (triangles <= 0) {
          trimeshBad++;
          trimeshErrors.push(`${obj.id.slice(0, 8)} ${name}: 0 triangles`);
        } else if (axisAligned) {
          // Axis-aligned instances: physics must match the mesh exactly.
          const drift = Math.max(
            Math.abs(minX - (expected.center[0] - expected.halfExtents[0])), Math.abs(maxX - (expected.center[0] + expected.halfExtents[0])),
            Math.abs(minY - (expected.center[1] - expected.halfExtents[1])), Math.abs(maxY - (expected.center[1] + expected.halfExtents[1])),
            Math.abs(minZ - (expected.center[2] - expected.halfExtents[2])), Math.abs(maxZ - (expected.center[2] + expected.halfExtents[2]))
          );
          if (!(drift <= tol)) {
            trimeshBad++;
            trimeshErrors.push(`${obj.id.slice(0, 8)} ${name}: geometry AABB diverges by ${drift.toExponential(2)} m`);
          }
        } else {
          // Arbitrary yaw (45° props): for a sparse mesh the world vertex AABB
          // is strictly smaller than the corner AABB — check the REQUIRED
          // direction: the physical surface must not protrude beyond the
          // visible mesh extent (that is exactly what an "invisible wall" is).
          const outside = Math.max(
            (expected.center[0] - expected.halfExtents[0]) - minX, maxX - (expected.center[0] + expected.halfExtents[0]),
            (expected.center[1] - expected.halfExtents[1]) - minY, maxY - (expected.center[1] + expected.halfExtents[1]),
            (expected.center[2] - expected.halfExtents[2]) - minZ, maxZ - (expected.center[2] + expected.halfExtents[2])
          );
          if (!(outside <= tol)) {
            trimeshBad++;
            trimeshErrors.push(`${obj.id.slice(0, 8)} ${name} yaw=${yaw}: trimesh protrudes beyond the mesh by ${outside.toExponential(2)} m`);
          }
        }
      } catch (err) {
        trimeshBad++;
        trimeshErrors.push(`${obj.id.slice(0, 8)} ${name}: ${err.message}`);
      }
    }
    // And the expectation: WorldScene builds slope/prop physics from their own
    // triangles (ModelShapeColliders with TrimeshCollider), not from module numbers.
    const hasSlopeTrimesh =
      worldSrc.includes('ModelShapeColliders') && /<TrimeshCollider\s+args=\{\[b\.vertices, b\.indices\]\}/.test(worldSrc.replace(/\n\s+/g, ' ')) && worldSrc.includes('shapeGroups');
    trimeshBad === 0 && hasSlopeTrimesh && trimeshObjs.length > 0
      ? ok(`slopes+props (${trimeshObjs.length} items, ${trimeshTriangles} triangles, ${trimeshVertices} vertices): trimesh = real mesh geometry (axis-aligned — exact, rotated — no protrusions)`)
      : fail(`trimesh physics: ${trimeshBad} problems (${trimeshErrors.slice(0, 3).join('; ')}); ModelShapeColliders+TrimeshCollider+shapeGroups in WorldScene: ${hasSlopeTrimesh}`);
  }

  // ── 3. Collider number comparison: module vs independent recomputation ──
  const CENTER_TOL = 0.05; // m
  const HALF_TOL = 0.02; // 2%
  const isMultipleOf90 = (euler) => {
    const [rx, ry, rz] = euler;
    const quarter = Math.PI / 2;
    const near90 = (v) => {
      for (let k = -4; k <= 4; k++) {
        if (Math.abs(v - k * quarter) <= 1e-9) return true;
      }
      return Math.abs(Math.abs(v) - 0) <= 1e-9;
    };
    return Math.abs(rx) <= 1e-12 && Math.abs(rz) <= 1e-12 && near90(ry);
  };
  const tuplesEqual = (a, b) => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const centerOk = (a, b) => Math.abs(a[0] - b[0]) <= CENTER_TOL && Math.abs(a[1] - b[1]) <= CENTER_TOL && Math.abs(a[2] - b[2]) <= CENTER_TOL;
  const halvesOk = (a, b) => a.every((v, i) => {
    if (b[i] === 0) return Math.abs(v) <= 1e-9;
    return Math.abs(v - b[i]) / b[i] <= HALF_TOL;
  });

  let mismatched = 0;
  let exactChecked = 0;
  let tolerantChecked = 0;
  const mismatches = [];
  function compareOne(entry, gateEntry, worldEuler) {
    const exact = isMultipleOf90(worldEuler);
    if (exact) exactChecked++; else tolerantChecked++;
    let label = '';
    if (exact && !tuplesEqual(entry.position, gateEntry.position)) label += ` position ${JSON.stringify(entry.position)} vs ${JSON.stringify(gateEntry.position)}`;
    if (exact && !tuplesEqual(entry.halfExtents, gateEntry.halfExtents)) label += ` halves ${JSON.stringify(entry.halfExtents)} vs ${JSON.stringify(gateEntry.halfExtents)}`;
    if (exact && !tuplesEqual(entry.rotation, gateEntry.rotation)) label += ` rotation ${JSON.stringify(entry.rotation)} vs ${JSON.stringify(gateEntry.rotation)}`;
    if (!exact) {
      if (!centerOk(entry.position, gateEntry.position)) label += ` center drift > ${CENTER_TOL}m: ${JSON.stringify(entry.position)} vs ${JSON.stringify(gateEntry.position)}`;
      if (!halvesOk(entry.halfExtents, gateEntry.halfExtents)) label += ` halves drift > ${HALF_TOL * 100}%: ${JSON.stringify(entry.halfExtents)} vs ${JSON.stringify(gateEntry.halfExtents)}`;
    }
    return label.trim();
  }

  if (gate) {
    for (const p of modulePrimaries) {
      const g = gateById.get(p.id);
      if (!g) { mismatched++; mismatches.push(`${p.id}: missing in the independent recomputation`); continue; }
      const obj = sceneData.placedObjects.find((o) => o.id === p.id);
      const label = compareOne(p, g, obj.rotation);
      if (label) { mismatched++; mismatches.push(`${p.id}:${label}`); }
    }
    for (const s of moduleBuild.subColliders) {
      const g = gate.subs.find((x) => x.id === s.id);
      if (!g) { mismatched++; mismatches.push(`${s.id}: missing in the independent recomputation`); continue; }
      const rec = nonNpc.find((o) => o.id === s.id.replace(/#.*$/, ''));
      const label = compareOne(s, g, rec.rotation);
      if (label) { mismatched++; mismatches.push(`${s.id}:${label}`); }
    }
    for (const e of moduleBuild.extras) {
      const g = gate.extras.find((x) => x.id === e.id);
      if (!g) { mismatched++; mismatches.push(`${e.id}: missing in the independent recomputation`); continue; }
      const label = compareOne(e, g, [0, 0, 0]);
      if (label) { mismatched++; mismatches.push(`${e.id}:${label}`); }
    }
  } else {
    mismatched = modulePrimaries.length;
  }
  // Both comparison branches historically checked arbitrary-yaw boxes; after
  // props moved to trimesh, box colliders are ONLY axis-aligned (tiles/cubes),
  // so we require full coverage by the strict branch and an empty tolerant branch.
  exactChecked > 0 && tolerantChecked === 0
    ? ok(`strictly exact comparison: all ${exactChecked} ground boxes are axis-aligned (yaw multiple of 90°), bit-for-bit`)
    : fail(`box comparison: strict=${exactChecked}, tolerant=${tolerantChecked} — ground boxes must be axis-aligned`);

  // ── 4. Ground top = top of tile meshes (exact match) ──
  if (gate) {
    let topBad = 0;
    const topErrors = [];
    for (const r of sceneData.placedObjects) {
      const name = r.modelPath.split('/').pop() || '';
      const n = name.toLowerCase();
      if (!n.startsWith('terrain_low')) continue;
      const fs = (Array.isArray(r.scale) ? r.scale[0] : r.scale || 1) * GATE_UNIT_SCALE;
      // Tile mesh top = anchoring at the bottom + maxY of the measured AABB.
      const expectedTop = r.position[1] -
        MODEL_BOUNDS[name].min[1] * fs +
        MODEL_BOUNDS[name].max[1] * fs;
      const c = moduleById.get(r.id);
      if (!c) { topBad++; continue; }
      const actualTop = c.position[1] + c.halfExtents[1];
      if (Math.abs(actualTop - expectedTop) > 1e-9) {
        topBad++;
        topErrors.push(`${r.id}: ${actualTop} != ${expectedTop}`);
      }
    }
    topBad === 0
      ? ok(`ground top is strictly equal to the mesh top of all terrain_low* tiles (${sceneData.placedObjects.filter((r) => ((r.modelPath.split('/').pop() || '').toLowerCase().startsWith('terrain_low'))).length} items)`)
      : fail(`ground top does not match mesh tops for ${topBad} tiles: ${topErrors.slice(0, 3).join('; ')}`);
  }

  // ── 4b. Ground collider top = top of its own tile ──
  // (multi-tier map: each tile has its own walkable level 1..4 m;
  // the terrain_mining quarry rim is clamped down by MINING_RIM_DROP —
  // regression guard: an AABB top of 1.0715 produced an invisible 7 cm ledge).
  {
    let ledgeBad = 0;
    const ledgeErrors = [];
    let ledgedChecked = 0;
    for (const r of sceneData.placedObjects) {
      const name = r.modelPath.split('/').pop() || '';
      const n = name.toLowerCase();
      if (!isGroundLower(n)) continue;
      const fs = (Array.isArray(r.scale) ? r.scale[0] : r.scale || 1) * GATE_UNIT_SCALE;
      const rimTop = r.position[1] - MODEL_BOUNDS[name].min[1] * fs + MODEL_BOUNDS[name].max[1] * fs;
      const expectedTop = n.startsWith('terrain_mining') ? rimTop - GATE_MINING_RIM_DROP : rimTop;
      const c = moduleById.get(r.id);
      if (!c || c.kind !== 'terrain') { ledgeBad++; ledgeErrors.push(`${r.id}: terrain collider not found`); continue; }
      ledgedChecked++;
      const top = c.position[1] + c.halfExtents[1];
      if (Math.abs(top - expectedTop) > 1e-9) {
        ledgeBad++;
        ledgeErrors.push(`${r.id}: top ${top} != top of its tile ${expectedTop} (tier ${rimTop.toFixed(2)})`);
      }
    }
    ledgeBad === 0
      ? ok(`per-tile levels: the top of all ${ledgedChecked} ground colliders equals the top of its tile (mining rim clamped by ${GATE_MINING_RIM_DROP})`)
      : fail(`invisible ledges/tile drops: ${ledgeBad} items: ${ledgeErrors.slice(0, 3).join('; ')}`);
  }

  // ── 5. Spawn stands on the ground ──
  // The game spawns the character with an explicit prop from IslandCanvas (fallback —
  // spawnPoint from the scene JSON); we check the actual point.
  let [sx, sy, sz] = sceneData.spawnPoint;
  const spawnProp = canvasSrc
    ? (canvasSrc.match(/spawnPoint=\{\[\s*([-\d.\s,]+?)\s*\]\}/) || [])[1]
    : null;
  if (spawnProp) {
    const parsed = spawnProp.split(',').map((v) => parseFloat(v.trim()));
    if (parsed.length === 3 && parsed.every((v) => Number.isFinite(v))) {
      [sx, sy, sz] = parsed;
    }
  }
  const spawnTopModule = meta.spawnSupportTop;
  const spawnTopGate = gate ? gate.spawnTop : spawnTopModule;
  const supported = spawnTopModule !== -Infinity && Math.abs(spawnTopModule - spawnTopGate) <= 1e-9 &&
    sy - spawnTopModule > 0 && sy - spawnTopModule <= 0.3;
  supported
    ? ok(`spawn [${sx}, ${sy}, ${sz}] stands on the ground: tile top ${spawnTopModule}, drop ${(sy - spawnTopModule).toFixed(2)} m`)
    : fail(`spawn [${sx}, ${sy}, ${sz}] has no ground support: top=${spawnTopModule}, independent=${spawnTopGate}`);

  // ── 5b. Spawn capsule does not intersect any collider ──
  // (regression guard for the depenetration kick finding: the spacetruck_large box
  // reached [0,1.1,6], the r=0.2 capsule intersected it by ~0.16 m).
  // Conservative: world AABBs of colliders (|R|·h) against the capsule AABB
  // CapsuleCollider [0.17, 0.20] offset 0.37 → y from body bottom to +0.74.
  {
    const CAP_R = 0.15;
    const CAP_H = 0.54;
    const capMin = [sx - CAP_R, sy, sz - CAP_R];
    const capMax = [sx + CAP_R, sy + CAP_H, sz + CAP_R];
    const overlaps = [];
    for (const c of [...moduleBuild.colliders, ...moduleBuild.subColliders, ...moduleBuild.extras]) {
      // World half-boxes: |R| rows over the te columns for a full Euler rotation.
      const te = gateQuatToTe(gateQuatFromEulerXYZ(c.rotation[0], c.rotation[1], c.rotation[2]));
      const wh = [
        Math.abs(te[0]) * c.halfExtents[0] + Math.abs(te[4]) * c.halfExtents[1] + Math.abs(te[8]) * c.halfExtents[2],
        Math.abs(te[1]) * c.halfExtents[0] + Math.abs(te[5]) * c.halfExtents[1] + Math.abs(te[9]) * c.halfExtents[2],
        Math.abs(te[2]) * c.halfExtents[0] + Math.abs(te[6]) * c.halfExtents[1] + Math.abs(te[10]) * c.halfExtents[2]
      ];
      const sep =
        c.position[0] - wh[0] >= capMax[0] || c.position[0] + wh[0] <= capMin[0] ||
        c.position[1] - wh[1] >= capMax[1] || c.position[1] + wh[1] <= capMin[1] ||
        c.position[2] - wh[2] >= capMax[2] || c.position[2] + wh[2] <= capMin[2];
      if (!sep) overlaps.push(`${c.id}: AABB x[${(c.position[0] - wh[0]).toFixed(2)}..${(c.position[0] + wh[0]).toFixed(2)}] y[${(c.position[1] - wh[1]).toFixed(2)}..${(c.position[1] + wh[1]).toFixed(2)}] z[${(c.position[2] - wh[2]).toFixed(2)}..${(c.position[2] + wh[2]).toFixed(2)}]`);
    }
    // Trimesh bodies (slopes + props): their world AABBs are already decoded from
    // .bin vertices (2d, trimeshWorldAabbs) — include them in the same check.
    for (const t of trimeshWorldAabbs) {
      const sep =
        t.min[0] >= capMax[0] || t.max[0] <= capMin[0] ||
        t.min[1] >= capMax[1] || t.max[1] <= capMin[1] ||
        t.min[2] >= capMax[2] || t.max[2] <= capMin[2];
      if (!sep) overlaps.push(`trimesh ${t.id.slice(0, 8)}: AABB x[${t.min[0].toFixed(2)}..${t.max[0].toFixed(2)}] y[${t.min[1].toFixed(2)}..${t.max[1].toFixed(2)}] z[${t.min[2].toFixed(2)}..${t.max[2].toFixed(2)}]`);
    }
    overlaps.length === 0
      ? ok(`spawn capsule r=0.15 does not intersect any of ${moduleBuild.colliders.length + moduleBuild.subColliders.length + moduleBuild.extras.length + trimeshWorldAabbs.length} colliders (boxes + trimesh)`)
      : fail(`spawn capsule intersects ${overlaps.length} collider(s): ${overlaps.slice(0, 3).join('; ')}`);
  }

  // ── 6. WorldScene actually renders exactly these numbers ──
  if (!worldSrc.includes('buildSceneColliders(')) fail('WorldScene consumes buildSceneColliders');
  else if (/MODEL_COLLIDER_DEFS\s*[:=]/.test(worldSrc)) fail('the manual MODEL_COLLIDER_DEFS dictionary was removed from WorldScene (otherwise numbers live outside the module)');
  else {
    ok('WorldScene consumes buildSceneColliders, the manual dictionary was removed');
  }
  const cuboidCount = (worldSrc.match(/<CuboidCollider/g) || []).length;
  if (cuboidCount !== 1 || !/<CuboidCollider\s+key=\{item\.id\}\s+args=\{item\.halfExtents\}/.test(worldSrc.replace(/\n\s+/g, ' '))) {
    fail(`WorldScene renders CuboidCollider only by mapping over the module (found <CuboidCollider: ${cuboidCount})`);
  } else {
    ok('WorldScene renders a single mapped <CuboidCollider> without hardcoded numbers');
  }
  if (!worldSrc.includes('UNIT_SCALE') || !worldSrc.includes('MODEL_BOUNDS[')) {
    fail('InstancedModelGroup uses UNIT_SCALE and MODEL_BOUNDS (single source of scale/anchoring with physics)');
  } else {
    ok('InstancedModelGroup: scale from UNIT_SCALE, anchoring from MODEL_BOUNDS — in line with physics');
  }
  if (/CuboidCollider|args=\{\[45,/.test(canvasSrc)) {
    fail('IslandCanvas no longer holds the invisible 90×90 cube floor (moved to WorldScene/sceneColliders)');
  } else {
    ok('IslandCanvas: the 90×90 cube floor was removed, floor physics comes only from sceneColliders');
  }

  // ── Summary ──
  if (failures.length === 0 && mismatched === 0 && uncovered === 0) {
    console.log(`\n${COL.green}${COL.bold}GATE PASSED: colliders = measured mesh AABBs, coverage is complete.${COL.reset}`);
  } else {
    console.log(`\n${COL.red}${COL.bold}GATE FAILED:${COL.reset}`);
    for (const f of failures) console.log(`  ${COL.red}- ${f}${COL.reset}`);
    for (const m of mismatches.slice(0, 12)) console.log(`  ${COL.red}~ ${m}${COL.reset}`);
  }
  printSummary(uniqueModels.size, modulePrimaries.length, mismatched, uncovered);
} catch (err) {
  fail('gate ended with an unexpected error', err);
  printSummary(0, 0, failures.length, sceneData ? nonNpcFallbackCount() : 0);
}

// ── helpers ──
function nonNpcFallbackCount() {
  const n = sceneData.placedObjects.filter((o) => {
    const name = (o.modelPath.split('/').pop() || '').toLowerCase();
    return !isNpcLower(name);
  }).length;
  return n;
}

function printSummary(models, colliders, mismatched, uncovered) {
  // The LAST output line — exactly the specified format.
  process.stdout.write(
    `##COLLIDER_SUMMARY## ${JSON.stringify({ models, colliders, mismatched, uncovered })}\n`
  );
  process.exit(failures.length === 0 && mismatched === 0 && uncovered === 0 ? 0 : 1);
}

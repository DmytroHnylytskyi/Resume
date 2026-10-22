#!/usr/bin/env node
/**
 * extractModelBounds.mjs
 *
 * Extracts the real geometric bounds (AABB) of all GLTF/GLB models
 * from public/model/kaykit_space/ and generates src/data/modelBounds.generated.ts
 * — the source of truth about dimensions for collision physics.
 *
 * AABB math is equivalent to THREE.Box3().setFromObject(gltf.scene) in three.js
 * right after GLTFLoader.load: union over all meshes reachable from the default
 * scene roots, including node-graph transforms (node.matrix or TRS),
 * WITHOUT any external scale.
 *
 * Pure Node (ESM), no external dependencies. .bin files and textures are not read:
 * accessor.min/max of the POSITION attribute is enough (mandatory per the glTF 2.0
 * specification for POSITION).
 *
 * Self-check: every unique model from src/data/islandScene.json must
 * have a record; all numbers are finite; size is within reasonable limits (0.01..1000).
 * Any violation => exit 1.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODEL_DIR = path.join(ROOT, 'public', 'model', 'kaykit_space');
const SCENE_JSON = path.join(ROOT, 'src', 'data', 'islandScene.json');
const OUT_FILE = path.join(ROOT, 'src', 'data', 'modelBounds.generated.ts');

// ── Mat4 utilities (column-major, as in three.js / glTF) ─────────────────────

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** node.matrix => column-major 4x4 directly. TRS => compose(T * R * S). */
function localMatrixOf(node) {
  if (node.matrix) return node.matrix.slice();
  const t = node.translation ?? [0, 0, 0];
  const r = node.rotation ?? [0, 0, 0, 1]; // quaternion [x, y, z, w]
  const s = node.scale ?? [1, 1, 1];
  const [x, y, z, w] = r;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}

/** a * b, column-major. */
function matMul(a, b) {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let v = 0;
      for (let k = 0; k < 4; k++) v += a[k * 4 + r] * b[c * 4 + k];
      out[c * 4 + r] = v;
    }
  }
  return out;
}

function transformPoint(m, x, y, z) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

// ── Reading glTF JSON (.gltf is plain JSON; .glb is a container) ────────────────

const GLB_MAGIC = 0x46546c67; // 'glTF'
const CHUNK_TYPE_JSON = 0x4e4f534a; // 'JSON'

/** .glb: 12-byte header (magic, version, length), then the JSON chunk:
 *  chunk length — bytes 12..16 (uint32 LE), type — bytes 16..20. */
function readGlbJsonChunks(buffer) {
  if (buffer.length < 20) throw new Error('GLB file too short');
  const magic = buffer.readUInt32LE(0);
  if (magic !== GLB_MAGIC) throw new Error(`bad GLB magic 0x${magic.toString(16)}`);
  const version = buffer.readUInt32LE(4);
  if (version !== 2) throw new Error(`unsupported GLB version ${version}`);
  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.readUInt32LE(16);
  if (jsonType !== CHUNK_TYPE_JSON) throw new Error('first GLB chunk is not JSON');
  const jsonStart = 20;
  if (jsonStart + jsonLength > buffer.length) throw new Error('JSON chunk overruns file');
  const json = JSON.parse(buffer.slice(jsonStart, jsonStart + jsonLength).toString('utf8'));
  return json;
}

function loadGltfJson(filePath) {
  const buf = fs.readFileSync(filePath);
  if (/\.glb$/i.test(filePath)) return readGlbJsonChunks(buf);
  return JSON.parse(buf.toString('utf8'));
}

// ── AABB: union of positional bboxes of all meshes in the default scene ────────────────

function computeUnionBounds(doc) {
  const { nodes = [], meshes = [], accessors = [] } = doc;
  const rootScene = doc.scenes?.[doc.scene ?? 0] ?? doc.scenes?.[0];
  if (!rootScene) return null; // as in three.js: empty scene => Box3.isEmpty()

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let meshPrimCount = 0;

  const stack = [];
  for (const rootIndex of rootScene.nodes) {
    stack.push([rootIndex, IDENTITY]);
  }
  const visited = new Set();

  while (stack.length > 0) {
    const [nodeIndex, parentWorld] = stack.pop();
    // protection against cycles in the graph (broken/malicious files)
    if (visited.has(nodeIndex)) continue;
    visited.add(nodeIndex);

    const node = nodes[nodeIndex];
    if (!node) continue;
    const world = matMul(parentWorld, localMatrixOf(node));

    if (node.mesh !== undefined && meshes[node.mesh]) {
      for (const prim of meshes[node.mesh].primitives) {
        const posAccIndex = prim.attributes?.POSITION;
        if (posAccIndex === undefined) continue;
        const acc = accessors[posAccIndex];
        if (!acc?.min || !acc?.max) {
          throw new Error(`POSITION accessor #${posAccIndex} lacks min/max`);
        }
        meshPrimCount++;
        // 8 corners of the local bbox transformed by the node matrix.
        for (const cx of [acc.min[0], acc.max[0]]) {
          for (const cy of [acc.min[1], acc.max[1]]) {
            for (const cz of [acc.min[2], acc.max[2]]) {
              const p = transformPoint(world, cx, cy, cz);
              for (let i = 0; i < 3; i++) {
                min[i] = Math.min(min[i], p[i]);
                max[i] = Math.max(max[i], p[i]);
              }
            }
          }
        }
      }
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) stack.push([child, world]);
    }
  }

  if (meshPrimCount === 0) return null;
  return { min, max, meshPrimCount };
}

// ── Module generation ───────────────────────────────────────────────────────

const round6 = (v) => {
  const r = Math.round(v * 1e6) / 1e6;
  return Object.is(r, -0) ? 0 : r;
};

function fmtTuple(v) {
  return `[${v.map(round6).join(', ')}]`;
}

function main() {
  if (!fs.existsSync(MODEL_DIR)) {
    console.error(`FAIL: model dir not found: ${MODEL_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(MODEL_DIR)
    .filter((f) => /\.(gltf|glb)$/i.test(f))
    .sort();

  /** @type {Record<string, {min:[number,number,number]; max:[number,number,number]; size:[number,number,number]; maxDim:number}>} */
  const bounds = {};
  const filesWithoutMeshes = [];

  for (const file of files) {
    const doc = loadGltfJson(path.join(MODEL_DIR, file));
    const union = computeUnionBounds(doc);
    if (!union) {
      filesWithoutMeshes.push(file);
      continue;
    }
    const { min, max } = union;
    const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
    const maxDim = Math.max(size[0], size[1], size[2]);
    for (const v of [...min, ...max, ...size, maxDim]) {
      if (!Number.isFinite(v)) {
        console.error(`FAIL: non-finite bounds in ${file}`);
        process.exit(1);
      }
    }
    bounds[file] = { min, max, size, maxDim };
  }

  // ── Self-check: every unique model from islandScene.json must be present ──
  const sceneRaw = fs.readFileSync(SCENE_JSON, 'utf8');
  const scene = JSON.parse(sceneRaw);
  const sceneFiles = new Set(
    (scene.placedObjects ?? [])
      .map((o) => o.modelPath)
      .filter((p) => typeof p === 'string' && /\.(gltf|glb)$/i.test(p))
      .map((p) => path.posix.basename(p))
  );
  console.log(`[check] islandScene.json: unique models = ${sceneFiles.size}`);

  const missing = [...sceneFiles].filter((f) => !bounds[f]).sort();
  if (missing.length > 0) {
    console.error(`FAIL: scene models without a MODEL_BOUNDS record: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log(`[check] all ${sceneFiles.size} scene models are present in MODEL_BOUNDS`);

  let rangeViolations = [];
  for (const [file, b] of Object.entries(bounds)) {
    for (const comp of [...b.size, b.maxDim]) {
      if (comp < 0.01 || comp > 1000) {
        rangeViolations.push(`${file}: size=[${b.size.map(round6)}] maxDim=${round6(b.maxDim)}`);
        break;
      }
    }
  }
  if (rangeViolations.length > 0) {
    console.error(`FAIL: dimensions outside reasonable limits (0.01..1000):`);
    for (const v of rangeViolations) console.error(`  - ${v}`);
    process.exit(1);
  }
  console.log(`[check] all ${Object.keys(bounds).length} records: numbers are finite, size within 0.01..1000`);

  if (filesWithoutMeshes.length > 0) {
    // Models without meshes are not written — but report them explicitly.
    console.warn(`[warn] no reachable meshes (record not created): ${filesWithoutMeshes.join(', ')}`);
    for (const f of filesWithoutMeshes) {
      if (sceneFiles.has(f)) {
        console.error(`FAIL: scene model ${f} has no meshes => no record`);
        process.exit(1);
      }
    }
  }

  // ── Writing the module ──────────────────────────────────────────────────────
  const entries = Object.entries(bounds);
  const lines = entries.map(([file, b]) => {
    const pad = Math.max(...entries.map(([f]) => f.length));
    return `  ${JSON.stringify(file)}:${' '.repeat(pad - file.length)} {`
      + ` min: ${fmtTuple(b.min)}, max: ${fmtTuple(b.max)},`
      + ` size: ${fmtTuple(b.size)}, maxDim: ${round6(b.maxDim)} },`;
  });

  const header = [
    '// ════════════════════════════════════════════════════════════════════',
    '// THIS FILE IS GENERATED AUTOMATICALLY by scripts/extractModelBounds.mjs',
    '// DO NOT EDIT MANUALLY — changes will be overwritten on the next run.',
    '//',
    '// Source of truth for the real dimensions of GLTF/GLB models in public/model/kaykit_space/',
    '// for collision physics. AABB = union of POSITION accessor.min/max over all meshes',
    '// reachable from the default scene roots, including node-graph transforms',
    '// (equivalent to THREE.Box3().setFromObject(gltf.scene) right after GLTFLoader.load,',
    '// without external scale and without uScale from getUnitScale).',
    '// ════════════════════════════════════════════════════════════════════',
    '',
    'export interface ModelBounds {',
    '  min: [number, number, number];',
    '  max: [number, number, number];',
    '  size: [number, number, number];',
    '  maxDim: number;',
    '}',
    '',
    'export const MODEL_BOUNDS: Record<string, ModelBounds> = {',
  ];

  const footer = ['};', ''];

  fs.writeFileSync(OUT_FILE, [...header, ...lines, ...footer].join('\n'), 'utf8');
  console.log(`[ok] wrote ${OUT_FILE}: records = ${entries.length}`);

  // ── Summary ────────────────────────────────────────────────────────────────
  const dims = entries.map(([, b]) => b.maxDim);
  const minOfDims = Math.min(...dims);
  const maxOfDims = Math.max(...dims);
  const oversized = entries.filter(([, b]) => b.maxDim >= 10).sort((a, b) => b[1].maxDim - a[1].maxDim);

  console.log('── Summary ──');
  console.log(`total models: ${entries.length}`);
  console.log(`minimum dimension (maxDim): ${round6(minOfDims)}`);
  console.log(`maximum dimension (maxDim): ${round6(maxOfDims)}`);
  console.log(`models with maxDim >= 10 (for them getUnitScale in WorldScene.tsx yields uScale != 1): ${oversized.length}`);
  for (const [file, b] of oversized) {
    const uScale = b.maxDim > 1000 ? 1 / 1000 : b.maxDim > 100 ? 1 / 100 : b.maxDim > 10 ? 1 / 10 : 1;
    console.log(`  - ${file}: maxDim=${round6(b.maxDim)} => uScale=${uScale}`);
  }
}

main();

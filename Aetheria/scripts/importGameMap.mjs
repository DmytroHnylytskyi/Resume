// ═══════════════════════════════════════════════════════════════════════════
// importGameMap.mjs — canonical generator of src/data/islandScene.json
// from the live map authored in the Forma 3D Workspace editor.
//
// Map pipeline: authored layout → this importer → islandScene.json.
// Do not edit islandScene.json by hand — regenerate only:
//   node scripts/importGameMap.mjs
// ═══════════════════════════════════════════════════════════════════════════
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const SOURCE = 'scripts/map-source/forma-workspace-3d.json';
const TARGET = 'src/data/islandScene.json';
const MODEL_DIR = 'public/model/kaykit_space';
const BOUNDS_FILE = 'src/data/modelBounds.generated.ts';

// Spawn point: open western plaza south of the hub, on the 1st-tier ground
// (tile tops at 1.0). Verified for free clearance: 4.9 m to large props,
// 10 m to the new solar field and 7 m to the new south tower; the three hub towers
// stay ahead rather than right next to it. Yaw — to the northeast, toward the hub (radians).
const SPAWN_POINT = [-8, 1.1, 12];
const SPAWN_YAW = -0.25;

// Crew: linked to the NPC_DIALOGUES (src/data/npcDialogues.ts) by
// model file name; the position in islandScene.json takes precedence over the dialogue
// fallback position. Y of each position = support level under the point (see checks below).
const NPCS = [
  // Commander — on the hub deck (roofmodule_base tile tops at 1.4) near the exit,
  // greets the player by the shuttle.
  { file: 'npc_commander.glb',  position: [5.5, 1.4, -6.1],  rotation: [0, Math.PI, 0] },
  // Chief engineer — outpost plateau (4th tier, top 4.0) by the drill.
  { file: 'npc_engineer.glb',   position: [-16.7, 4, -10.6], rotation: [0, -0.8, 0] },
  // Comms officer — cargo terminal (southwest) in front of the depot.
  { file: 'npc_comms.glb',      position: [-12.6, 1, 19.2],  rotation: [0, -1.2, 0] },
  // UI architect — parking lot by the hub in front of the hangars.
  { file: 'npc_forma.glb',      position: [7.5, 1, -3.2],    rotation: [0, -1.57, 0] },
  // Geodata — mining quarry (southeast) by the wells.
  { file: 'npc_terrascope.glb', position: [22.5, 1, 24.3],   rotation: [0, 1.57, 0] },
  // Photonics — turbine field by the garage (east).
  { file: 'npc_lumina.glb',     position: [21.8, 1, 15.6],   rotation: [0, Math.PI, 0] }
];

function fail(msg) {
  console.error('✗ importGameMap: ' + msg);
  process.exit(1);
}

// MODEL_BOUNDS — a generated TS file; extract the object literal with a standard parser.
function loadModelBounds() {
  const src = readFileSync(BOUNDS_FILE, 'utf8');
  const start = src.indexOf('{', src.indexOf('MODEL_BOUNDS'));
  const inner = src.slice(start + 1, src.lastIndexOf('};'));
  return new Function(`return ({${inner}})`)();
}

const bounds = loadModelBounds();
const source = JSON.parse(readFileSync(SOURCE, 'utf8'));
if (!Array.isArray(source.placedObjects) || source.placedObjects.length === 0) {
  fail('source has no placedObjects');
}

// ── Source record validation ────────────────────────────────────────────
const seenIds = new Set();
for (const o of source.placedObjects) {
  const name = o.modelPath.split('/').pop() || '';
  if (!o.id || seenIds.has(o.id)) fail(`duplicate/empty id: ${o.id}`);
  seenIds.add(o.id);
  if (!name.startsWith('terrain_') && !(name.startsWith('npc_') || name.includes('mannequin'))) {
    if (!existsSync(`${MODEL_DIR}/${name}`)) fail(`model ${name} is missing in ${MODEL_DIR}`);
  }
  if (!(name in bounds)) fail(`model ${name} has no MODEL_BOUNDS record — run node scripts/extractModelBounds.mjs`);
  if (!Array.isArray(o.position) || o.position.length !== 3) fail(`${o.id} has an invalid position`);
  if (!Array.isArray(o.rotation) || o.rotation.length !== 3) fail(`${o.id} has an invalid rotation`);
}
const npcsInSource = source.placedObjects.filter((o) => {
  const n = (o.modelPath.split('/').pop() || '').toLowerCase();
  return n.startsWith('npc_') || n.includes('mannequin');
});
if (npcsInSource.length > 0) fail('source contains NPCs — they are added by this script, not by the export');

// ── Support checks (ground tiles + prop platforms), same as at runtime ─────────
const tiles = [];
const propBoxes = [];
for (const o of source.placedObjects) {
  const name = o.modelPath.split('/').pop();
  const b = bounds[name];
  if (name.startsWith('terrain_')) {
    tiles.push({ name, x: o.position[0], z: o.position[2], y: o.position[1] });
    continue;
  }
  // The editor can emit scale as an array ([2, 2.72, 2]); rendering, physics
  // and the gate historically take the first component (uniform scale).
  // The importer must read the same way, otherwise propBoxes get NaN and the
  // support/clearance checks silently turn into NaN.
  const fs = Array.isArray(o.scale) ? o.scale[0] : o.scale || 1;
  const yaw = o.rotation[1];
  // Half-extents of the rotated AABB (approximation for arbitrary yaw).
  const whx = Math.abs(Math.cos(yaw)) * b.size[0] / 2 * fs + Math.abs(Math.sin(yaw)) * b.size[2] / 2 * fs;
  const whz = Math.abs(Math.sin(yaw)) * b.size[0] / 2 * fs + Math.abs(Math.cos(yaw)) * b.size[2] / 2 * fs;
  propBoxes.push({ o, name, cx: o.position[0], cz: o.position[2], whx, whz,
    // World dimensions of the placement: rendering anchors the mesh by its BOTTOM at position.y
    // (pivot = y − min·fs), so walkable bottom = y, top = y + height·fs.
    bottom: o.position[1], top: o.position[1] + b.size[1] * fs });
}

function groundTopAt(x, z) {
  let top = null;
  for (const t of tiles) {
    if (Math.abs(t.x - x) > 1.001 || Math.abs(t.z - z) > 1.001) continue;
    //terrain_low* — top at +1 from the bottom; terrain_mining sits in quarries, the walkable rim is clamped at runtime, not a candidate for NPCs.
    if (t.name === 'terrain_low.gltf' || t.name === 'terrain_low_curved.gltf' || t.name === 'terrain_tall.gltf') {
      top = Math.max(top ?? -Infinity, t.y + 1);
    }
  }
  return top;
}

function propTopAt(x, z) {
  let top = null;
  for (const p of propBoxes) {
    if (Math.abs(p.cx - x) <= p.whx && Math.abs(p.cz - z) <= p.whz) top = Math.max(top ?? -Infinity, p.top);
  }
  return top;
}

function clearanceToProps(x, z) {
  let best = Infinity;
  for (const p of propBoxes) {
    const dx = Math.max(0, Math.abs(x - p.cx) - p.whx);
    const dz = Math.max(0, Math.abs(z - p.cz) - p.whz);
    best = Math.min(best, Math.hypot(dx, dz));
  }
  return best;
}

function assertSupport(label, x, y, z) {
  const ground = groundTopAt(x, z);
  const prop = propTopAt(x, z);
  const supportTop = Math.max(ground ?? -Infinity, prop ?? -Infinity);
  if (!Number.isFinite(supportTop)) fail(`${label}: neither a tile nor a platform under [${x}, ${z}]`);
  if (Math.abs(supportTop - y) > 0.11) {
    fail(`${label}: y=${y}, but support under the point is ${supportTop.toFixed(2)} (tile ${ground ?? '—'}, platform ${prop ?? '—'})`);
  }
  // Clearance is measured only to real obstacles: props whose top is
  // above the support level (a platform underfoot is a floor, not an obstacle).
  let clear = Infinity;
  for (const p of propBoxes) {
    if (p.top <= supportTop + 0.05) continue;
    const dx = Math.max(0, Math.abs(x - p.cx) - p.whx);
    const dz = Math.max(0, Math.abs(z - p.cz) - p.whz);
    clear = Math.min(clear, Math.hypot(dx, dz));
  }
  if (clear < 0.35) fail(`${label}: clearance to props ${clear.toFixed(2)} m — the point is inside an obstacle`);
  console.log(`✓ ${label}: support ${supportTop.toFixed(2)}, clearance ${clear.toFixed(2)} m`);
}

assertSupport('spawn', SPAWN_POINT[0], SPAWN_POINT[1], SPAWN_POINT[2]);
for (const npc of NPCS) {
  assertSupport(npc.file, npc.position[0], npc.position[1], npc.position[2]);
}

// ── Grounding props: small "floaters" in the authored layout ──────────────
// In the editor platforms were counted 0.1 higher (tops of roofmodule deck tiles
// at ×2 scale: anchor at the marker vs our anchor at the mesh bottom), which made lamps,
// basemodule_A and the hub landing pad hover 0.1 m above the deck.
// Rendering anchors each mesh by its BOTTOM at position.y — the gap between position.y
// and the support is directly visible. Rule: bottom-up (by bottom), snap the bottom of each
// prop to the top of its support (ground tile / already grounded prop) if the gap
// is in (0.02, 0.35] m — this is a positioning artifact. Downward sinks (a model
// partially sunk) and high "bridge" tunnels between towers (gap > 0.35 —
// intentional design) are left alone. source.placedObjects is mutated — that is
// the material for islandScene.json.
propBoxes.sort((a, b) => a.bottom - b.bottom);
let snapped = 0;
let maxSnap = 0;
for (const p of propBoxes) {
  const ground = groundTopAt(p.cx, p.cz);
  let top = ground ?? -Infinity;
  for (const q of propBoxes) {
    if (q === p || q.bottom > p.bottom + 0.002) continue;
    if (Math.abs(q.cx - p.cx) <= q.whx && Math.abs(q.cz - p.cz) <= q.whz) top = Math.max(top, q.top);
  }
  const gap = p.bottom - top;
  if (Number.isFinite(top) && gap > 0.02 && gap <= 0.35) {
    // Cascade: mutate both the original (goes into islandScene) and the cache — otherwise
    // upper layers of stacks (basemodule_D towers on top of A) computed support from the
    // old height and kept hovering above the already lowered layer.
    const drop = top - p.bottom;
    p.o.position[1] += drop;
    p.bottom += drop;
    p.top += drop;
    maxSnap = Math.max(maxSnap, gap);
    snapped++;
  }
}
console.log(`✓ grounded props: ${snapped} (max gap ${maxSnap.toFixed(2)} m)`);

// ── Assembling islandScene.json ────────────────────────────────────────────────
const placedObjects = [
  ...source.placedObjects,
  ...NPCS.map((npc, i) => ({
    id: `npc-crew-${i + 1}`,
    modelPath: `/model/kaykit_space/${npc.file}`,
    position: npc.position,
    rotation: npc.rotation,
    scale: 1,
    hiddenParts: [],
    colors: {}
  }))
];

const scene = {
  version: '2.0.0-imported',
  timestamp: new Date().toISOString(),
  projectName: 'Forma 3D Workspace',
  spawnPoint: SPAWN_POINT,
  spawnYaw: SPAWN_YAW,
  placedObjects
};

writeFileSync(TARGET, JSON.stringify(scene, null, 2) + '\n');
console.log(`✓ ${TARGET}: ${placedObjects.length} objects (${source.placedObjects.length} from export + ${NPCS.length} NPC), spawn [${SPAWN_POINT.join(', ')}]`);

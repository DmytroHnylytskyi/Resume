#!/usr/bin/env node
/**
 * checkColliders.mjs — НЕЗАВИСИМЫЙ гейт физики космо-карты.
 *
 * Чистый Node 24, без зависимостей. TS-модуль src/data/sceneColliders.ts
 * импортируется напрямую — Node сам снимает типы.
 *
 * Что делает:
 *  1. Сам пересчитывает ВСЕ бокс-коллайдеры из src/data/islandScene.json +
 *     src/data/modelBounds.generated.ts по тем же правилам, что задокументированы
 *     в sceneColliders.ts (8 углов AABB меша; боксы — ТОЛЬКО земляные объёмы:
 *     плиты/карьер/tall-куб + периметр/страховочный пол). Склоны и ВСЕ ПРОПСЫ
 *     боксов НЕ имеют: их физика — TrimeshCollider из треугольников меша
 *     (ModelShapeColliders в WorldScene), и гейт проверяет её отдельно
 *     (п. 2d) по вершинам .bin.
 *  2. Независимость НЕ только от кода модуля, но и от правил/мешей:
 *     — сверяет MODEL_BOUNDS с accessor.min/max самих .gltf/.glb-ассетов
 *       (семантика extractModelBounds: union POSITION по мешам из корней
 *       дефолтной сцены с трансформами графа узлов; .glb — через заголовок);
 *  3. Сверяет пересчёт с тем, что реально рендерится в WorldScene
 *     (список, который отдаёт buildSceneColliders и маппит в CuboidCollider):
 *      — допуск по центру <= 0.05 м;
 *      — по half extents <= 2%;
 *      — для yaw, кратного 90° (и нулевых rx/rz), — строго точное
 *        совпадение (бит-в-бит) по центру, half extents и rotation;
 *      — покрытие всех не-NPC размещений (склоны/пропсы — trimesh, п. 2d);
 *      — верхняя поверхность земли равна верху собственной плиты ;
 *      — спавн стоит на земле (опора есть, падение <= 0.3 м) и его капсула
 *        не пересекает ни боксы, ни мировые AABB trimesh-тел;
 *      — WorldScene рендерит бокс-коллайдеры только через модуль (без ручных
 *        чисел), IslandCanvas больше не держит куб-пол.
 *  4. При любом несоответствии завершается с кодом 1. Последняя строка
 *     вывода — всегда:
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

// ── Нагрузка данных ──
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
  // Данные или модуль не читаются — модельный fallback-подсчёт невозможен.
  const nonNpcAll = sceneData ? sceneData.placedObjects.filter((o) => !/npc_|mannequin/i.test(o.modelPath)) : [];
  const modelsKnown = sceneData
    ? new Set(nonNpcAll.map((o) => o.modelPath.split('/').pop()).filter((n) => MODEL_BOUNDS && MODEL_BOUNDS[n])).size
    : 0;
  fail(`источники читаются: ${err && err.message}`, err);
  printSummary(modelsKnown, 0, failures.length, sceneData ? nonNpcAll.length : 0);
}

// ══════════════════════════════════════════════════════════════════════
// Независимый пересчёт (формулы повторяют документированные правила
// sceneColliders.ts с точным порядком операций — это делает проверку
// «yaw кратно 90° — строго точное совпадение» осмысленной).
// ══════════════════════════════════════════════════════════════════════

// ── Независимость от МЕШЕЙ (не только от кода модуля) ──
// Ассеты читаются прямо из public/model/kaykit_space: .gltf — JSON-текст,
// .glb — через GLB-заголовок (magic/version/length, JSON-чанк с байта 20).
function readGltfJson(absPath) {
  const buf = fs.readFileSync(absPath);
  if (absPath.endsWith('.glb')) {
    if (buf.length < 20) throw new Error(`GLB слишком мал: ${absPath}`);
    const magic = buf.readUInt32LE(0);
    const version = buf.readUInt32LE(4);
    const total = buf.readUInt32LE(8);
    const chunkLen = buf.readUInt32LE(12);
    const chunkType = buf.readUInt32LE(16);
    if (magic !== 0x46546c67 || version !== 2) throw new Error(`не GLB v2: ${path.basename(absPath)}`);
    if (chunkType !== 0x4e4f534a) throw new Error(`первый чанк не JSON: ${path.basename(absPath)}`);
    if (total !== buf.length) throw new Error(`длина заголовка GLB != размеру файла: ${path.basename(absPath)}`);
    return JSON.parse(buf.slice(20, 20 + chunkLen).toString('utf8'));
  }
  return JSON.parse(buf.toString('utf8'));
}

// Локальная матрица узла: n.matrix (column-major) или T·R·S из TRS-компонент.
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

// a·b для column-major матриц.
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

// Мировой AABB ассета: union углов accessor.min/max по POSITION всех
// примитивов мешей, достижимых из корней дефолтной сцены, с трансформами
// графа узлов (та же семантика, что у scripts/extractModelBounds.mjs —
// эквивалент THREE.Box3().setFromObject сразу после загрузки).
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
        if (!acc || !acc.min || !acc.max) throw new Error(`POSITION accessor без min/max: ${absPath}`);
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

// Ось подъёма клина terrain_slope* по вершинам .bin: центроиды вершин у
// min-Y и max-Y в плоскости XZ; направление «низ → низ» = подъём.
// (используется проверкой 2d через общий декод; отдельная функция не нужна)
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

// ── Классификация (те же предикаты, что в sceneColliders) ──
// Единица масштаба гейт ВЫВОДИТ из измеренных габаритов, а не берёт из
// модуля и не хардкодит: max(maxDim) по MODEL_BOUNDS прогоняется через
// пороги прежней эвристики getUnitScale (10/100/1000). Сейчас максимум —
// windturbine_tall 2.999991, ни один порог не достигнут → 1; если завтра
// в каталог попадёт крупная модель, гейт сам сменит ожидание.
// Модуль обязан дать тот же ответ (проверка ниже); подмена UNIT_SCALE в
// модуле расходится с этим значением и валит гейт.
const GATE_MAX_MAXDIM = Math.max(...Object.values(MODEL_BOUNDS).map((b) => b.maxDim));
const GATE_UNIT_SCALE = GATE_MAX_MAXDIM > 1000 ? 1 / 1000 : GATE_MAX_MAXDIM > 100 ? 1 / 100 : GATE_MAX_MAXDIM > 10 ? 1 / 10 : 1;
// Снимок неходовой кромки карьера terrain_mining. Зеркалит MINING_RIM_DROP
// модуля; совпадение констант гейт проверяет сам (см. сверку ниже).
const GATE_MINING_RIM_DROP = 0.07;
const isNpcLower = (lower) => lower.startsWith('npc_') || lower.includes('mannequin');
const isGroundLower = (lower) => lower.startsWith('terrain_low') || lower.startsWith('terrain_mining');
const isRampLower = (lower) => lower.startsWith('terrain_slope');
// Бокс-объёмы (осевые, ходовая поверхность = верх плиты): земля + tall-куб
// 2×2×2. Всё остальное (склоны + пропсы) — точная trimesh-физика мешей.
const isBoxedLower = (lower) => isGroundLower(lower) || lower.startsWith('terrain_tall');

// Подъём/спуск рамп проверяется по вершинам .bin (см. 2d), констант-дублей
// больше нет. Профиль посадочных площадок (настил/кольца) удалён вместе с
// бокс-коллайдерами пропсов: у площадок теперь точная trimesh-физика мешей.

// ══════════════════════════════════════════════════════════════════════
// Основная проверка
// ══════════════════════════════════════════════════════════════════════

function gateBuild() {
  const records = sceneData.placedObjects.map((obj) => {
    const name = obj.modelPath.split('/').pop() || '';
    const lower = name.toLowerCase();
    if (!MODEL_BOUNDS[name]) {
      throw new Error(`у модели ${name} нет записи в MODEL_BOUNDS`);
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
      // Многоярусная карта: базовый уровень — по ходовым плитам terrain_low*;
      // карьер terrain_mining — локальная яма, в базу не входит.
      if (!rec.lower.startsWith('terrain_mining')) groundLowTops.push(top);
    } else if (isRampLower(rec.lower)) {
      rampTops.push(rec.pivotY + MODEL_BOUNDS[rec.name].max[1] * rec.fs);
    }
  }
  const groundLevel = Math.min(...groundLowTops);
  // На многоярусной карте террасы на каждом ярусе — из террас выводится
  // только максимум (историческое поле terraceLevel сохранено ради сверки).
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
    // Склоны и пропсы боксов не имеют: их физика — trimesh меша (проверка 2d).
    if (!isBoxedLower(rec.lower)) {
      continue;
    }
    const euler = [exporter.rotation[0], exporter.rotation[1], exporter.rotation[2]];
    const b = MODEL_BOUNDS[rec.name];
    const box = gateWorldAabb(b, rec.fs, euler, exporter.position);
    // Земля: верх коллайдера = верх собственной плиты (карта многоярусная,
    // ходовые уровни 1..4 м); кромка карьера terrain_mining неходовая —
    // снимается на GATE_MINING_RIM_DROP (тот же «0.07», что MINING_RIM_DROP
    // модуля; гейт дополнительно сверяет это число с модулем ниже).
    // terrain_tall — точный куб 2×2×2, верх не зажимается (kind obstacle).
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

  // Периметр (тот же вывод, что у модуля: высота стены каждой стороны по
  // самой высокой плите у этой стороны + 0.85, многоярусная карта).
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
  // Подпорки стыков рамп (plaza бура, гребень террасы) устарели вместе со
  // старой процедурной картой — модуль их больше не строит (см. там же).

  // Верх земли под спавном.
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
  fail('независимый пересчёт выполняется', err);
}

try {
  console.log(`${COL.bold}${COL.cyan}=== checkColliders: независимый гейт физики космо-карты ===${COL.reset}`);

  // Исходники компонент читаются один раз наверху (нужны и спавн-проверке,
  // и контролю «числа только из модуля»).
  const worldSrc = fs.readFileSync(worldScenePath, 'utf8');
  const canvasSrc = fs.readFileSync(islandCanvasPath, 'utf8');

  // ── 1. Единый вызов модуля (числовой вывод к проверкам) ──
  const moduleBuild = moduleApi.buildSceneColliders(sceneData, MODEL_BOUNDS);
  const meta = moduleBuild.meta;
  // Единица масштаба: значение модуля обязано совпасть с выведенной гейтом.
  moduleApi.UNIT_SCALE === GATE_UNIT_SCALE
    ? ok(`UNIT_SCALE модуля = ${moduleApi.UNIT_SCALE} == вывод гейта: max(maxDim по MODEL_BOUNDS) = ${GATE_MAX_MAXDIM} → пороги 10/100/1000 → ${GATE_UNIT_SCALE}`)
    : fail(`UNIT_SCALE модуля ${moduleApi.UNIT_SCALE} != выведенной гейтом ${GATE_UNIT_SCALE}`);
  moduleApi.MINING_RIM_DROP === GATE_MINING_RIM_DROP
    ? ok(`снимок кромки карьера: MINING_RIM_DROP модуля = ${moduleApi.MINING_RIM_DROP} == гейта ${GATE_MINING_RIM_DROP}`)
    : fail(`MINING_RIM_DROP: модуль ${moduleApi.MINING_RIM_DROP} != гейта ${GATE_MINING_RIM_DROP}`);
  if (gate) {
    Math.abs(meta.groundLevel - gate.groundLevel) <= 1e-9
      ? ok(`уровень земли из AABB плит: ${meta.groundLevel} (независимо: ${gate.groundLevel})`)
      : fail(`уровень земли: модуль ${meta.groundLevel} vs гейт ${gate.groundLevel}`);
    Math.abs(meta.terraceLevel - gate.terraceLevel) <= 1e-9
      ? ok(`уровень верхней террасы из AABB рамп: ${meta.terraceLevel} (независимо: ${gate.terraceLevel})`)
      : fail(`уровень террасы: модуль ${meta.terraceLevel} vs гейт ${gate.terraceLevel}`);
  }

  // ── 1b. MODEL_BOUNDS против самих .gltf/.glb-ассетов ──
  // (независимость от генератора: гейт не верит MODEL_BOUNDS на слово).
  {
    const assetsDir = path.join(ROOT, 'public', 'model', 'kaykit_space');
    const BOUNDS_TOL = 5e-6; // данные в bounds округлены до 6 знаков
    let checked = 0;
    const bad = [];
    for (const [name, b] of Object.entries(MODEL_BOUNDS)) {
      const file = path.join(assetsDir, name);
      if (!fs.existsSync(file)) {
        bad.push(`${name}: файла нет`);
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
      // Зачётные производные поля тоже должны быть согласованы с min/max:
      // size = max − min, maxDim = максимальная компонента size.
      const sizeDrift = Math.max(
        Math.abs(b.size[0] - (b.max[0] - b.min[0])),
        Math.abs(b.size[1] - (b.max[1] - b.min[1])),
        Math.abs(b.size[2] - (b.max[2] - b.min[2]))
      );
      const maxDimDrift = Math.abs(b.maxDim - Math.max(b.size[0], b.size[1], b.size[2]));
      if (!(drift <= BOUNDS_TOL)) bad.push(`${name}: дрейф min/max ${drift.toExponential(2)} м`);
      else if (!(sizeDrift <= BOUNDS_TOL)) bad.push(`${name}: size не согласован с min/max`);
      else if (!(maxDimDrift <= BOUNDS_TOL)) bad.push(`${name}: maxDim не согласован с size`);
      checked++;
    }
    checked === Object.keys(MODEL_BOUNDS).length && bad.length === 0
      ? ok(`MODEL_BOUNDS совпадает с accessor.min/max всех ${checked} ассетов (допуск ${BOUNDS_TOL})`)
      : fail(`MODEL_BOUNDS расходится с ассетами (${bad.length}): ${bad.slice(0, 4).join('; ')}`);
  }

  // ── 2. Покрытие всех не-NPC размещений ──
  // Склоны excluded: у них физика trimesh (2d), а не первичный бокс.
  const nonNpc = sceneData.placedObjects.filter((o) => {
    const n = (o.modelPath.split('/').pop() || '').toLowerCase();
    return !isNpcLower(n);
  });
  // Два класса физики: земляные объёмы — осевые боксы (модуль + гейт),
  // склоны и ВСЕ ПРОПСЫ — trimesh из собственных треугольников (2d).
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
    ? ok(`покрытие всех ${boxedObjs.length} бокс-размещений первичными коллайдерами (+${trimeshObjs.length} склонов/пропсов на trimesh, п. 2d)`)
    : fail(`не покрыто размещений: ${uncovered} (${missingIds.slice(0, 4).join(', ')}...)`);

  modulePrimaries.length === boxedObjs.length && new Set(modulePrimaries.map((c) => c.id)).size === modulePrimaries.length
    ? ok(`первичных коллайдеров ровно ${modulePrimaries.length} — по одному на бокс-размещение, id уникальны`)
    : fail(`число первичных коллайдеров ${modulePrimaries.length} != размещений ${boxedObjs.length}`);

  // ── 2d. Склоны + пропсы: trimesh-физика обязана соответствовать мешу ──
  // Для каждого не-бокс размещения гейт сам декодирует ВСЕ вершины POSITION
  // из .bin (учитывая трансформы узлов .gltf и матрицу размещения:
  // scale·UNIT_SCALE, заякоривание за низ меша, полный Эйлер XYZ — те же
  // формулы, что в ModelShapeColliders) и требует:
  //   — число треугольников > 0 и валидные индексы (в диапазоне вершин);
  //   — осевые экземпляры: мировые min/max геометрии ==
  //     gateWorldAabb(MODEL_BOUNDS...) — физическая поверхность не больше и
  //     не меньше видимого меша;
  //   — экземпляры с произвольным yaw (45°): физическая поверхность не
  //     вылезает за corner-AABB видимого меша (разреженная сетка даёт
  //     мировой AABB вершин строго меньше — это норма).
  const trimeshWorldAabbs = []; // для спавн-капсулы (5b): компакт готовится в блоке ниже
  {
    const assetsDir = path.join(ROOT, 'public', 'model', 'kaykit_space');
    let trimeshBad = 0;
    const trimeshErrors = [];
    let trimeshTriangles = 0;
    let trimeshVertices = 0;
    // Габаритный кэш: одна модель грузится один раз.
    const primCache = new Map();
    const loadModelPrims = (name) => {
      if (primCache.has(name)) return primCache.get(name);
      const gltfPath = path.join(assetsDir, name);
      const json = readGltfJson(gltfPath);
      const binUri = json.buffers[json.bufferViews[0].buffer ?? 0].uri;
      if (!binUri) throw new Error(`${name}: без .bin буфера`);
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
      // Карта узлов с мешами → их мировые матрицы от корней дефолтной сцены.
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
        // Матрица размещения (column-major, как gltfMatMul): T·R·S.
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
          if (!nodeWorld) throw new Error(`${name}: узел меша ${meshIdx} недостижим из корней сцены`);
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
              if (bad) throw new Error(`${name}: индекс вне диапазона вершин`);
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
          trimeshErrors.push(`${obj.id.slice(0, 8)} ${name}: 0 треугольников`);
        } else if (axisAligned) {
          // Осевые экземпляры: физика обязана совпадать с мешем точно.
          const drift = Math.max(
            Math.abs(minX - (expected.center[0] - expected.halfExtents[0])), Math.abs(maxX - (expected.center[0] + expected.halfExtents[0])),
            Math.abs(minY - (expected.center[1] - expected.halfExtents[1])), Math.abs(maxY - (expected.center[1] + expected.halfExtents[1])),
            Math.abs(minZ - (expected.center[2] - expected.halfExtents[2])), Math.abs(maxZ - (expected.center[2] + expected.halfExtents[2]))
          );
          if (!(drift <= tol)) {
            trimeshBad++;
            trimeshErrors.push(`${obj.id.slice(0, 8)} ${name}: AABB геометрии расходится на ${drift.toExponential(2)} м`);
          }
        } else {
          // Произвольный yaw (45° пропсы): у разреженного меша мировой AABB
          // вершин строго меньше corner-AABB — проверяем Т Р Е Б У ЕМОЕ
          // направление: физическая поверхность не должна вылезать за
          // видимый габарит меша (это и есть «невидимая стена»).
          const outside = Math.max(
            (expected.center[0] - expected.halfExtents[0]) - minX, maxX - (expected.center[0] + expected.halfExtents[0]),
            (expected.center[1] - expected.halfExtents[1]) - minY, maxY - (expected.center[1] + expected.halfExtents[1]),
            (expected.center[2] - expected.halfExtents[2]) - minZ, maxZ - (expected.center[2] + expected.halfExtents[2])
          );
          if (!(outside <= tol)) {
            trimeshBad++;
            trimeshErrors.push(`${obj.id.slice(0, 8)} ${name} yaw=${yaw}: trimesh торчит за меш на ${outside.toExponential(2)} м`);
          }
        }
      } catch (err) {
        trimeshBad++;
        trimeshErrors.push(`${obj.id.slice(0, 8)} ${name}: ${err.message}`);
      }
    }
    // И ожидание: WorldScene строит физику склонов/пропсов из своих
    // треугольников (ModelShapeColliders с TrimeshCollider), а не из чисел модуля.
    const hasSlopeTrimesh =
      worldSrc.includes('ModelShapeColliders') && /<TrimeshCollider\s+args=\{\[b\.vertices, b\.indices\]\}/.test(worldSrc.replace(/\n\s+/g, ' ')) && worldSrc.includes('shapeGroups');
    trimeshBad === 0 && hasSlopeTrimesh && trimeshObjs.length > 0
      ? ok(`склоны+пропсы (${trimeshObjs.length} шт, ${trimeshTriangles} треугольников, ${trimeshVertices} вершин): trimesh = реальной геометрии мешей (осевые — точно, повёрнутые — без выпираний)`)
      : fail(`trimesh-физика: ${trimeshBad} проблем (${trimeshErrors.slice(0, 3).join('; ')}); ModelShapeColliders+TrimeshCollider+shapeGroups в WorldScene: ${hasSlopeTrimesh}`);
  }

  // ── 3. Сверка чисел коллайдеров: модуль vs независимый пересчёт ──
  const CENTER_TOL = 0.05; // м
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
      if (!centerOk(entry.position, gateEntry.position)) label += ` center drift > ${CENTER_TOL}м: ${JSON.stringify(entry.position)} vs ${JSON.stringify(gateEntry.position)}`;
      if (!halvesOk(entry.halfExtents, gateEntry.halfExtents)) label += ` halves drift > ${HALF_TOL * 100}%: ${JSON.stringify(entry.halfExtents)} vs ${JSON.stringify(gateEntry.halfExtents)}`;
    }
    return label.trim();
  }

  if (gate) {
    for (const p of modulePrimaries) {
      const g = gateById.get(p.id);
      if (!g) { mismatched++; mismatches.push(`${p.id}: нет в независимом пересчёте`); continue; }
      const obj = sceneData.placedObjects.find((o) => o.id === p.id);
      const label = compareOne(p, g, obj.rotation);
      if (label) { mismatched++; mismatches.push(`${p.id}:${label}`); }
    }
    for (const s of moduleBuild.subColliders) {
      const g = gate.subs.find((x) => x.id === s.id);
      if (!g) { mismatched++; mismatches.push(`${s.id}: нет в независимом пересчёте`); continue; }
      const rec = nonNpc.find((o) => o.id === s.id.replace(/#.*$/, ''));
      const label = compareOne(s, g, rec.rotation);
      if (label) { mismatched++; mismatches.push(`${s.id}:${label}`); }
    }
    for (const e of moduleBuild.extras) {
      const g = gate.extras.find((x) => x.id === e.id);
      if (!g) { mismatched++; mismatches.push(`${e.id}: нет в независимом пересчёте`); continue; }
      const label = compareOne(e, g, [0, 0, 0]);
      if (label) { mismatched++; mismatches.push(`${e.id}:${label}`); }
    }
  } else {
    mismatched = modulePrimaries.length;
  }
  // Обе ветки сверки исторически проверяли боксы произвольного yaw; после
  // перевода пропсов на trimesh бокс-коллайдеры ТОЛЬКО осевые (плиты/кубы),
  // поэтому требуем полное покрытие строгой веткой и пустую tolerant.
  exactChecked > 0 && tolerantChecked === 0
    ? ok(`сверка строго точная: все ${exactChecked} земляных боксов осевые (yaw кратно 90°), бит-в-бит`)
    : fail(`сверка боксов: строго=${exactChecked}, с допуском=${tolerantChecked} — земляные боксы обязаны быть осевыми`);

  // ── 4. Верх земли = верх мешей плит (точное совпадение) ──
  if (gate) {
    let topBad = 0;
    const topErrors = [];
    for (const r of sceneData.placedObjects) {
      const name = r.modelPath.split('/').pop() || '';
      const n = name.toLowerCase();
      if (!n.startsWith('terrain_low')) continue;
      const fs = (Array.isArray(r.scale) ? r.scale[0] : r.scale || 1) * GATE_UNIT_SCALE;
      // Верх меша плиты = заякоривание за низ + maxY измеренного AABB.
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
      ? ok(`верх земли строго равен верху мешей всех плит terrain_low* (${sceneData.placedObjects.filter((r) => ((r.modelPath.split('/').pop() || '').toLowerCase().startsWith('terrain_low'))).length} шт)`)
      : fail(`верх земли не совпадает с верхом мешей у ${topBad} плит: ${topErrors.slice(0, 3).join('; ')}`);
  }

  // ── 4b. Верх земляных коллайдеров = верх собственной плиты ──
  // (многоярусная карта: у каждой плиты свой ходовой уровень 1..4 м;
  // кромка карьера terrain_mining зажимается на MINING_RIM_DROP вниз —
  // регресс-охрана: AABB-верх 1.0715 давал невидимый уступ 7 см).
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
      if (!c || c.kind !== 'terrain') { ledgeBad++; ledgeErrors.push(`${r.id}: коллайдер terrain не найден`); continue; }
      ledgedChecked++;
      const top = c.position[1] + c.halfExtents[1];
      if (Math.abs(top - expectedTop) > 1e-9) {
        ledgeBad++;
        ledgeErrors.push(`${r.id}: верх ${top} != верху своей плиты ${expectedTop} (ярус ${rimTop.toFixed(2)})`);
      }
    }
    ledgeBad === 0
      ? ok(`потайловые уровни: верх всех ${ledgedChecked} земляных коллайдеров равен верху своей плиты (кромка mining зажата на ${GATE_MINING_RIM_DROP})`)
      : fail(`невидимые уступы/провалы плит: ${ledgeBad} шт: ${ledgeErrors.slice(0, 3).join('; ')}`);
  }

  // ── 5. Спавн стоит на земле ──
  // Игра спавнит персонажа явным пропом из IslandCanvas (fallback —
  // spawnPoint из JSON сцены); проверяем именно фактическую точку.
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
    ? ok(`спавн [${sx}, ${sy}, ${sz}] стоит на земле: верх плиты ${spawnTopModule}, просадка ${(sy - spawnTopModule).toFixed(2)} м`)
    : fail(`спавн [${sx}, ${sy}, ${sz}] без опоры на земле: верх=${spawnTopModule}, независимый=${spawnTopGate}`);

  // ── 5b. Спавн-капсула не пересекает ни один коллайдер ──
  // (регресс-охрана находки о депенетрационном пинке: бокс spacetruck_large
  // доходил до [0,1.1,6], капсула r=0.2 пересекала его на ~0.16 м).
  // Консервативно: мировые AABB коллайдеров (|R|·h) против AABB капсулы
  // CapsuleCollider [0.17, 0.20] offset 0.37 → y от низа тела до +0.74.
  {
    const CAP_R = 0.15;
    const CAP_H = 0.54;
    const capMin = [sx - CAP_R, sy, sz - CAP_R];
    const capMax = [sx + CAP_R, sy + CAP_H, sz + CAP_R];
    const overlaps = [];
    for (const c of [...moduleBuild.colliders, ...moduleBuild.subColliders, ...moduleBuild.extras]) {
      // Мировые полубоксы: |R| rows по столбцам te для полного Эйлера.
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
    // Trimesh-тела (склоны + пропсы): их мировые AABB уже декодированы из
    // .bin вершин (2d, trimeshWorldAabbs) — включаем в ту же проверку.
    for (const t of trimeshWorldAabbs) {
      const sep =
        t.min[0] >= capMax[0] || t.max[0] <= capMin[0] ||
        t.min[1] >= capMax[1] || t.max[1] <= capMin[1] ||
        t.min[2] >= capMax[2] || t.max[2] <= capMin[2];
      if (!sep) overlaps.push(`trimesh ${t.id.slice(0, 8)}: AABB x[${t.min[0].toFixed(2)}..${t.max[0].toFixed(2)}] y[${t.min[1].toFixed(2)}..${t.max[1].toFixed(2)}] z[${t.min[2].toFixed(2)}..${t.max[2].toFixed(2)}]`);
    }
    overlaps.length === 0
      ? ok(`спавн-капсула r=0.15 не пересекает ни один из ${moduleBuild.colliders.length + moduleBuild.subColliders.length + moduleBuild.extras.length + trimeshWorldAabbs.length} коллайдеров (боксы + trimesh)`)
      : fail(`спавн-капсула пересекает ${overlaps.length} коллайдер(ов): ${overlaps.slice(0, 3).join('; ')}`);
  }

  // ── 6. WorldScene реально рендерит ровно эти числа ──
  if (!worldSrc.includes('buildSceneColliders(')) fail('WorldScene потребляет buildSceneColliders');
  else if (/MODEL_COLLIDER_DEFS\s*[:=]/.test(worldSrc)) fail('в WorldScene удалён ручной словарь MODEL_COLLIDER_DEFS (иначе числа вне модуля)');
  else {
    ok('WorldScene потребляет buildSceneColliders, ручной словарь удалён');
  }
  const cuboidCount = (worldSrc.match(/<CuboidCollider/g) || []).length;
  if (cuboidCount !== 1 || !/<CuboidCollider\s+key=\{item\.id\}\s+args=\{item\.halfExtents\}/.test(worldSrc.replace(/\n\s+/g, ' '))) {
    fail(`WorldScene рендерит CuboidCollider только маппингом по модулю (найдено <CuboidCollider: ${cuboidCount})`);
  } else {
    ok('WorldScene рендерит единственный mapped <CuboidCollider> без захардкоженных чисел');
  }
  if (!worldSrc.includes('UNIT_SCALE') || !worldSrc.includes('MODEL_BOUNDS[')) {
    fail('InstancedModelGroup использует UNIT_SCALE и MODEL_BOUNDS (единый источник масштаба/якорения с физикой)');
  } else {
    ok('InstancedModelGroup: масштаб от UNIT_SCALE, якорение от MODEL_BOUNDS — вровень с физикой');
  }
  if (/CuboidCollider|args=\{\[45,/.test(canvasSrc)) {
    fail('IslandCanvas больше не держит невидимый куб-пол 90×90 (перенесён в WorldScene/sceneColliders)');
  } else {
    ok('IslandCanvas: куб-пол 90×90 удалён, физика пола только из sceneColliders');
  }

  // ── Итог ──
  if (failures.length === 0 && mismatched === 0 && uncovered === 0) {
    console.log(`\n${COL.green}${COL.bold}ГАТ ПРОЙДЕН: коллайдеры = измеренным AABB мешей, покрытие полное.${COL.reset}`);
  } else {
    console.log(`\n${COL.red}${COL.bold}ГАТ ПРОВАЛЕН:${COL.reset}`);
    for (const f of failures) console.log(`  ${COL.red}- ${f}${COL.reset}`);
    for (const m of mismatches.slice(0, 12)) console.log(`  ${COL.red}~ ${m}${COL.reset}`);
  }
  printSummary(uniqueModels.size, modulePrimaries.length, mismatched, uncovered);
} catch (err) {
  fail('гейт завершился неожиданной ошибкой', err);
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
  // ПОСЛЕДНЯЯ строка вывода — ровно указанный формат.
  process.stdout.write(
    `##COLLIDER_SUMMARY## ${JSON.stringify({ models, colliders, mismatched, uncovered })}\n`
  );
  process.exit(failures.length === 0 && mismatched === 0 && uncovered === 0 ? 0 : 1);
}

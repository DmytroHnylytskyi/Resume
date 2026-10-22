#!/usr/bin/env node
/**
 * buildGameMap.mjs — ЕДИНСТВЕННЫЙ источник игровой карты Aetheria.
 *
 * Строит src/data/islandScene.json программно из каталога KayKit-ассетов
 * (public/model/kaykit_space, габариты — src/data/modelBounds.generated.ts)
 * по сетке 2 м с встроенной валидацией укладки. Заменяет устаревший
 * scripts/buildSpaceBaseScene.js: у того не было ни опор, ни дорожек, ни
 * проверки пересечений — отсюда висящие башни, пропы на рампах и NPC в
 * склонах карьера.
 *
 * Правила генератора (нарушить нельзя — карта не выводится):
 *  1. Каждый объект имеет ОПОРУ: земля уровня 1.0 (плита terrain_low*),
 *     терраса уровня 2.0 (mesa-рампы/энерготерраса с верхом 2.0, terrain_tall),
 *     пилон (structure_tall top=+2) или low-постамент (structure_low top=+1),
 *     либо модуль под крышей roofmodule_*.
 *  2. Дорожки между зонами свободны: AABB любого не-terrain объекта,
 *     расширенный на 0.35 м, не задевает ядро полосы (±0.5 м от оси).
 *     Фонари и посадочные площадки исключены (фонарь — кромка, пад — дорожка).
 *  3. Нет пересечений AABB между не-terrain объектами (зазор 0.25 м);
 *     легитимные пары: крыша-на-модуле, шаттл-на-основании, груз-на-опоре.
 *  4. NPC стоит на плите своего уровня (XZ внутри клетки, y = верху уровня).
 *  5. Масштаб всегда 1.
 *  6. Каждая модель измерена в modelBounds.generated.ts (иначе exit 1),
 *     неизвестных modelPath в выводе не бывает.
 *
 * Уровни: земля 1.0 (terrain_low: y=0, верх +1) · терраса 2.0 (рампы и
 * terrain_tall: y=0, верх +2) · пилон 3.0 (structure_tall: y=1, top +2).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const OUT_PATH = path.join(ROOT, 'src', 'data', 'islandScene.json');
const BOUNDS_PATH = path.join(ROOT, 'src', 'data', 'modelBounds.generated.ts');

const { MODEL_BOUNDS } = await import(pathToFileURL(BOUNDS_PATH).href);

const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.error(`  FAIL: ${msg}`);
};

const GROUND_TOP = 1.0;
const TERRACE_TOP = 2.0;
const PYLON_TOP = 3.0;

// Сетка 2×2, центры в нечётных координатах → остров 24×24 (±12 от центра).
const TILE_CENTERS = [];
for (let x = -11; x <= 11; x += 2) for (let z = -11; z <= 11; z += 2) TILE_CENTERS.push([x, z]);

// Клетки, отданные конструкциям: mesa-кольцо бура (центр) и энерготерраса (СЗ).
// Раскладка обеих — proven-физика прошлых шагов (trimesh-склоны).
const MESA_CELLS = new Set(['1,3', '-1,3', '-3,1', '-3,-1', '1,-1', '-1,-1', '1,1', '-1,1']);
const SOLAR_CELLS = new Set(['-7,5', '-5,5', '-7,3', '-5,3', '-5,7', '-7,7']);
const QUARRY_CELL = '5,5';

const objects = [];
const supports = []; // {x, z, rx, rz, topY} — постаменты/пилоны/модули

function makeObj(modelName, position, rotation = [0, 0, 0], extra = {}) {
  const bounds = MODEL_BOUNDS[modelName];
  if (!bounds) {
    fail(`модель ${modelName} не измерена — запусти scripts/extractModelBounds.mjs`);
    return null;
  }
  const obj = {
    id: crypto.randomUUID(),
    modelPath: `/model/kaykit_space/${modelName}`,
    position: [position[0], +position[1].toFixed(4), position[2]],
    rotation,
    scale: 1,
    hiddenParts: [],
    colors: {},
    ...extra
  };
  objects.push(obj);
  return obj;
}

// ── Земля ──
for (const [cx, cz] of TILE_CENTERS) {
  const key = `${cx},${cz}`;
  if (MESA_CELLS.has(key) || SOLAR_CELLS.has(key)) continue;
  if (key === QUARRY_CELL) {
    makeObj('terrain_mining.gltf', [cx, 0, cz]);
    continue;
  }
  const corner = Math.abs(cx) === 11 && Math.abs(cz) === 11;
  makeObj(corner ? 'terrain_low_curved.gltf' : 'terrain_low.gltf', [cx, 0, cz]);
}

// ── Mesa-кольцо (верх 2.0; trimesh-физика склонов) ──
makeObj('terrain_slope_outer_corner.gltf', [1, 0, 3], [0, Math.PI / 2, 0]);
makeObj('terrain_slope_outer_corner.gltf', [-1, 0, 3], [0, 0, 0]);
makeObj('terrain_slope_outer_corner.gltf', [-3, 0, 1], [0, 0, 0]);
makeObj('terrain_slope_outer_corner.gltf', [-3, 0, -1], [0, -Math.PI / 2, 0]);
makeObj('terrain_slope_outer_corner.gltf', [1, 0, -1], [0, Math.PI, 0]);
makeObj('terrain_slope.gltf', [-1, 0, -1], [0, -Math.PI / 2, 0]);
makeObj('terrain_slope.gltf', [1, 0, 1], [0, Math.PI, 0]);
makeObj('terrain_slope_inner_corner.gltf', [-1, 0, 1], [0, 0, 0]);

// ── Энерготерраса СЗ (верх 2.0) ──
makeObj('terrain_slope.gltf', [-7, 0, 5], [0, Math.PI, 0]);
makeObj('terrain_slope.gltf', [-5, 0, 5], [0, 0, 0]);
makeObj('terrain_slope_outer_corner.gltf', [-7, 0, 3], [0, -Math.PI / 2, 0]);
makeObj('terrain_slope_outer_corner.gltf', [-5, 0, 3], [0, Math.PI, 0]);
makeObj('terrain_slope_outer_corner.gltf', [-5, 0, 7], [0, Math.PI / 2, 0]);
makeObj('terrain_slope_outer_corner.gltf', [-7, 0, 7], [0, 0, 0]);

// ── Постаменты: реестр для опоры ──
function pedestal(model, x, z, y = 1) {
  const b = MODEL_BOUNDS[model];
  makeObj(model, [x, y, z]);
  supports.push({ x, z, rx: b.max[0], rz: b.max[2], topY: y + b.max[1] });
  return y + b.max[1];
}

// ════════ 1. Посадка (юг) ════════
makeObj('landingpad_large.gltf', [0, 1, 8.8]);
pedestal('lander_base.gltf', 3, 8.6);
makeObj('lander_A.gltf', [3, 1.5, 8.6]);
makeObj('spacetruck_large.gltf', [-3.2, 1, 8.0], [0, 0.5, 0]);
makeObj('cargo_A_stacked.gltf', [-4.6, 1, 9.2]);
makeObj('cargo_A_packed.gltf', [-1.9, 1, 9.5]);
makeObj('lights.gltf', [-2.9, 1, 10.5]);
makeObj('lights.gltf', [3.4, 1, 10.3]);
makeObj('npc_commander.glb', [1.4, 1, 6.7], [0, 0.3, 0]);

// ════════ 2. Буровая меза (центр) ════════
makeObj('drill_structure.gltf', [0, TERRACE_TOP, 0]);
// север: россыпь у турбинного ряда
makeObj('rocks_A.gltf', [8.6, 1, -4.2], [0, 0.4, 0]);
makeObj('rock_B.gltf', [6.9, 1, -4.0], [0, -0.4, 0]);

// ════════ 3. Жилой сектор (запад) ════════
makeObj('basemodule_B.gltf', [-10.6, 1, 9.4], [0, 0.15, 0]);
makeObj('basemodule_A.gltf', [-9.5, 1, 5.4]);
const towerX = -6.2, towerZ = 1.6;
pedestal('structure_tall.gltf', towerX, towerZ);
makeObj('basemodule_E.gltf', [towerX, PYLON_TOP, towerZ]);
{
  const roofY = +(PYLON_TOP + MODEL_BOUNDS['basemodule_E.gltf'].max[1] - 0.2).toFixed(4);
  makeObj('roofmodule_solarpanels.gltf', [towerX, roofY, towerZ]);
}
pedestal('structure_low.gltf', -8.6, 2.9);
makeObj('cargo_B_packed.gltf', [-8.6, 2, 2.9]);
// сервисный гараж у южной кромки (виден от спавна, ворота на дорожку)
makeObj('basemodule_garage.gltf', [-8, 1, 8.8]);
// грузовой коридор-декор между штабелями и северной кромкой
makeObj('tunnel_straight_B.gltf', [6.0, 1, -5.2]);
makeObj('npc_engineer.glb', [-3.6, 1, 4.6], [0, 1.4, 0]);
makeObj('npc_forma.glb', [-3.6, 1, 2.4], [0, 1.57, 0]);

// ════════ 4. Грузовой терминал (восток) ════════
makeObj('cargodepot_A.gltf', [6.4, 1, 8.6]);
makeObj('cargodepot_B.gltf', [6.4, 1, 6.0]);
makeObj('cargodepot_C.gltf', [6.4, 1, 3.4]);
makeObj('containers_B.gltf', [9.2, 1, 8.6]);
makeObj('containers_C.gltf', [9.2, 1, 7.8]);
makeObj('containers_D.gltf', [9.2, 1, 6.6]);
makeObj('containers_A.gltf', [9.2, 1, 5.2]);
makeObj('spacetruck.gltf', [8.6, 1, 2.0], [0, 1.37, 0]);
makeObj('spacetruck_trailer.gltf', [6.6, 1, 0.4], [0, 1.37, 0]);
makeObj('cargo_B_stacked.gltf', [5.4, 1, -2.8]);
makeObj('cargo_A_stacked.gltf', [5.4, 1, -1.4]);
makeObj('landingpad_small.gltf', [9.2, 1, -1.4]);
makeObj('lights.gltf', [3.6, 1, 2.4]);
makeObj('npc_comms.glb', [4.4, 1, 7.2], [0, -0.6, 0]);

// ════════ 5. Энерготерраса (СЗ, верх 2.0) + северные турбины ════════
makeObj('solarpanel.gltf', [-7.6, TERRACE_TOP, 5.4], [0, 0.3, 0]);
makeObj('solarpanel.gltf', [-5.7, TERRACE_TOP, 5.6], [0, -0.2, 0]);
makeObj('solarpanel.gltf', [-7.6, TERRACE_TOP, 7.2], [0, 0, 0]);
makeObj('lights.gltf', [-5.4, TERRACE_TOP, 4.0], [0, 1.57, 0]);
makeObj('npc_terrascope.glb', [-6.8, TERRACE_TOP, 4.9], [0, -1.9, 0]);
makeObj('windturbine_tall.gltf', [-3.2, 1, -9.8], [0, 0.8, 0]);
makeObj('windturbine_tall.gltf', [-1, 1, -9.8], [0, 0.8, 0]);
makeObj('windturbine_tall.gltf', [1.2, 1, -9.8], [0, 0.8, 0]);
makeObj('windturbine_low.gltf', [3.4, 1, -9.8], [0, 0.8, 0]);
makeObj('npc_lumina.glb', [1.8, 1, -6.4], [0, 2.8, 0]);

// ── Фонари вдоль дорожек (кромка) ──
makeObj('lights.gltf', [1.1, 1, 4.4]);
makeObj('lights.gltf', [1.1, 1, -4.4]);
makeObj('lights.gltf', [-1.1, 1, -4.4]);
makeObj('lights.gltf', [-3.4, 1, 2.8]);

// ══════════════════════════════════════════════════════════════
// Валидация
// ══════════════════════════════════════════════════════════════
const LANES = [
  [0, 10.5, 0, 6],
  [0, 6, -4, 6],
  [0, 6, 4, 6],
  [-4, 6, -4, -2],
  [-4, -2, -4, -6],
  [4, 6, 4, -2],
  [4, -2, 4, -6],
  [-4, -6, 0, -6],
  [4, -6, 0, -6]
];

const TERRAIN_LIKE = /terrain_(low|tall|mining|slope)/;
const NPC_LIKE = /npc_|mannequin/;
const props = objects.filter((o) => !TERRAIN_LIKE.test(o.modelPath) && !NPC_LIKE.test(o.modelPath));

function rotatedHalfExtents(bounds, yaw) {
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  return {
    hx: c * bounds.size[0] / 2 + s * bounds.size[2] / 2,
    hz: s * bounds.size[0] / 2 + c * bounds.size[2] / 2
  };
}

function laneBlocked(x, z, hx, hz, expanded) {
  for (const [x1, z1, x2, z2] of LANES) {
    const aminX = x - hx - expanded, amaxX = x + hx + expanded;
    const aminZ = z - hz - expanded, amaxZ = z + hz + expanded;
    const vertical = Math.abs(x1 - x2) < 1e-9;
    // ось полосы (±0.5 ядро) и диапазон вдоль оси — по ОСИ, не по z всегда
    const coreMin = (vertical ? x1 : z1) - 0.5;
    const coreMax = (vertical ? x1 : z2) + 0.5;
    const acrossMin = vertical ? aminX : aminZ;
    const acrossMax = vertical ? amaxX : amaxZ;
    const alongMin = vertical ? Math.min(z1, z2) : Math.min(x1, x2);
    const alongMax = vertical ? Math.max(z1, z2) : Math.max(x1, x2);
    const alongMinA = vertical ? aminZ : aminX;
    const alongMaxA = vertical ? amaxZ : amaxX;
    const across = acrossMin <= coreMax && acrossMax >= coreMin;
    const along = alongMinA <= alongMax && alongMaxA >= alongMin;
    if (across && along) return true;
  }
  return false;
}

const levelOf = (y) => {
  const tol = 0.15;
  if (Math.abs(y - GROUND_TOP) < tol) return GROUND_TOP;
  if (Math.abs(y - TERRACE_TOP) < tol) return TERRACE_TOP;
  if (Math.abs(y - PYLON_TOP) < tol) return PYLON_TOP;
  return -1;
};

// Правило 1: опора (полный низ меша — min.y учтён якорением рендера)
for (const o of props) {
  const name = o.modelPath.split('/').pop();
  const bounds = MODEL_BOUNDS[name];
  const y = o.position[1];
  if (/roofmodule_/.test(name)) {
    const under = objects.find(
      (o2) =>
        o2 !== o &&
        /basemodule_/.test(o2.modelPath) &&
        Math.abs(o2.position[0] - o.position[0]) < 0.6 &&
        Math.abs(o2.position[2] - o.position[2]) < 0.6 &&
        Math.abs(o2.position[1] + MODEL_BOUNDS[o2.modelPath.split('/').pop()].max[1] - 0.2 - y) < 0.15
    );
    if (!under) fail(`${name} @ [${o.position}]: крыша без модуля под ней`);
    continue;
  }
  // Опора через реестр постаментов (пилон/постамент/основание шаттла) —
  // вне зависимости от «этажа».
  const onPedestal = supports.some(
    (s) => Math.abs(s.topY - y) < 0.2 && Math.abs(o.position[0] - s.x) <= s.rx && Math.abs(o.position[2] - s.z) <= s.rz
  );
  if (onPedestal) continue;
  const level = levelOf(y);
  let ok = false;
  if (level > 0) {
    ok = TILE_CENTERS.some(([cx, cz]) => {
      const key = `${cx},${cz}`;
      const constructed = MESA_CELLS.has(key) || SOLAR_CELLS.has(key);
      const top = constructed ? TERRACE_TOP : GROUND_TOP;
      return (
        Math.abs(top - level) < 0.1 &&
        Math.abs(o.position[0] - cx) <= 1.0 &&
        Math.abs(o.position[2] - cz) <= 1.0
      );
    });
  }
  if (!ok) fail(`${name} @ [${o.position}]: нет опоры (y=${y})`);
}

// Правило 2: дорожки свободны
for (const o of props) {
  const name = o.modelPath.split('/').pop();
  if (/^(landingpad_|lights)/.test(name)) continue;
  const { hx, hz } = rotatedHalfExtents(MODEL_BOUNDS[name], o.rotation[1]);
  if (laneBlocked(o.position[0], o.position[2], hx, hz, 0.35)) {
    fail(`${name} @ [${o.position}]: стоит на дорожке`);
  }
}

// Правило 3: пересечения (зазор 0.25)
// Легитимная пара — «стоящий на опоре»: низ верхнего объекта совпадает с
//   верхом нижнего (панель/крыша-на-модуле, шаттл-на-основании,
//   модуль-на-пилоне, груз-на-постаменте). Иначе любое пересечение — ошибка.
const stackedOn = (a, aB, b, bB) =>
  Math.abs(a.position[1] + aB.min[1] - (b.position[1] + bB.max[1])) < 0.32;
// Крыша утоплена в модуль на 0.2 (не «стоит на»), — легитимная пара.
const roofOnModule = (aName, bName) =>
  (/roofmodule_/.test(aName) && /basemodule_/.test(bName)) ||
  (/basemodule_/.test(aName) && /roofmodule_/.test(bName));
for (let i = 0; i < props.length; i++) {
  for (let j = i + 1; j < props.length; j++) {
    const ai = props[i], bj = props[j];
    const bi = MODEL_BOUNDS[ai.modelPath.split('/').pop()];
    const bj2 = MODEL_BOUNDS[bj.modelPath.split('/').pop()];
    const ri = rotatedHalfExtents(bi, ai.rotation[1]);
    const rj = rotatedHalfExtents(bj2, bj.rotation[1]);
    const GAP = 0.25;
    const yLoA = ai.position[1] + bi.min[1], yHiA = ai.position[1] + bi.max[1];
    const yLoB = bj.position[1] + bj2.min[1], yHiB = bj.position[1] + bj2.max[1];
    const sep =
      Math.abs(ai.position[0] - bj.position[0]) >= ri.hx + rj.hx + GAP ||
      Math.abs(ai.position[2] - bj.position[2]) >= ri.hz + rj.hz + GAP ||
      yHiA + GAP <= yLoB ||
      yHiB + GAP <= yLoA ||
      stackedOn(ai, bi, bj, bj2) ||
      stackedOn(bj, bj2, ai, bi) ||
      roofOnModule(ai.modelPath, bj.modelPath);
    if (!sep) {
      fail(`пересечение: ${ai.modelPath.split('/').pop()} [${ai.position}] × ${bj.modelPath.split('/').pop()} [${bj.position}]`);
    }
  }
}

// Правило 4: NPC на плите своего уровня
for (const o of objects.filter((x) => NPC_LIKE.test(x.modelPath))) {
  const level = o.position[1];
  const ok = TILE_CENTERS.some(([cx, cz]) => {
    const key = `${cx},${cz}`;
    const constructed = MESA_CELLS.has(key) || SOLAR_CELLS.has(key);
    const top = constructed ? TERRACE_TOP : GROUND_TOP;
    return Math.abs(top - level) < 0.15 && Math.abs(o.position[0] - cx) <= 0.95 && Math.abs(o.position[2] - cz) <= 0.95;
  });
  if (!ok) fail(`NPC ${o.modelPath.split('/').pop()} @ [${o.position}]: вне плиты уровня ${level}`);
}

// ══════════════════════════════════════════════════════════════
// Вывод
// ══════════════════════════════════════════════════════════════
if (failures.length > 0) {
  console.error(`\nСБОРКА ПРЕРВАНА: ${failures.length} нарушений правил раскладки.`);
  process.exit(1);
}

const scene = {
  version: '2.0.0-generated',
  timestamp: new Date().toISOString().slice(0, 19) + 'Z',
  projectName: 'Aetheria Outpost — generated by buildGameMap.mjs',
  spawnPoint: [0.3, 1.1, 6],
  placedObjects: objects
};
fs.writeFileSync(OUT_PATH, JSON.stringify(scene, null, 2) + '\n');

console.log(`Карта собрана: ${objects.length} объектов (плит ${objects.filter((o) => /terrain/.test(o.modelPath)).length}, ${objects.filter((o) => NPC_LIKE.test(o.modelPath)).length} NPC).`);
console.log('Зоны: посадка (юг) · буровая меза (центр) · жилой сектор (запад) · грузовой терминал (восток) · энерготерраса (СЗ) · турбины (север).');
console.log(`Уровни: земля ${GROUND_TOP} · терраса ${TERRACE_TOP} · пилон ${PYLON_TOP}. Полос дорожек: ${LANES.length}.`);
console.log(`Файл: ${path.relative(ROOT, OUT_PATH)}`);

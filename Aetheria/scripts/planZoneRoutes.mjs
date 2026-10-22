#!/usr/bin/env node

/**
 * planZoneRoutes.mjs —— планировщик наполнения карты.
 *
 * Считает, где прокладывать путевые огни и чем заполнять пустоты, и печатает
 * спеку размещения для редактора Forma-3D. Нужен потому, что «поставь фонари
 * между зонами» — это не инструкция: без проверки проходимости половина точек
 * оказалась бы внутри построек, а вторая половина — на уже освещённых участках.
 *
 * Что делает:
 *  1. Строит сетку занятости 1 м по ПРОПСАМ (плиты terrain_* — это пол, они не
 *     препятствие и в занятость не идут; иначе карта выглядит равномерно
 *     заполненной и пустоты не видно).
 *  2. Габариты берёт из modelBounds.generated.ts с учётом масштаба размещения,
 *     плюс запас на габарит игрока: маршрут должен быть проходим, а не
 *     «пролезать в щель между двумя ящиками».
 *  3. Ищет путь A* от спавна к каждой зоне без огней, упрощает ломаную и режет
 *     её на точки через равные шаги, смещая их вбок от оси маршрута, чтобы
 *     фонарь стоял сбоку, а не посреди дороги.
 *  4. Отмечает, какие из уже стоящих фонарей попадают на маршрут, чтобы не
 *     дублировать освещение.
 *  5. Проверяет точки застройки пустот: печатает только те, что реально стоят
 *     на свободном месте.
 *
 * Запуск: node scripts/planZoneRoutes.mjs [--json <файл>]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Ключевые места. Держим синхронно с src/data/zones.ts ──
const ZONES = {
  reactor_core: { name: 'REACTOR CORE', x: -16.7, z: -10.6, y: 4.0, radius: 8 },
  subspace_array: { name: 'SUBSPACE ARRAY', x: -12.6, z: 19.2, y: 1.0, radius: 8 },
  orbital_gis: { name: 'ORBITAL GIS', x: 22.5, z: 24.3, y: 1.0, radius: 8 },
  lumina_optics: { name: 'LUMINA OPTICS', x: 21.8, z: 15.6, y: 1.0, radius: 8 }
};
const HUB = { x: 5, z: -3 }; // спавн: обе хабовые зоны уже освещены

const CELL = 1; // м
const HALF = 31; // сетка от −31 до +31
const N = (HALF * 2) / CELL + 1;
const PLAYER_CLEARANCE = 0.6; // запас вокруг пропса, чтобы путь был проходим
const LIGHT_STEP = 6; // м между фонарями
const LIGHT_SIDE = 1.7; // м вбок от оси маршрута
const EXISTING_LIGHT_NEAR = 5; // м: ближе этого свой фонарь не нужен

const toIdx = (v) => Math.round((v + HALF) / CELL);

function loadBounds() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'data', 'modelBounds.generated.ts'), 'utf8');
  const bounds = {};
  const re =
    /^\s+"([^"]+)":\s+\{\s*min:\s*\[([-\d.e, ]+)\],\s*max:\s*\[([-\d.e, ]+)\],\s*size:\s*\[([-\d.e, ]+)\]/gm;
  let m;
  while ((m = re.exec(src))) {
    const num = (s) => s.split(',').map(Number);
    bounds[m[1]] = { min: num(m[2]), max: num(m[3]), size: num(m[4]) };
  }
  return bounds;
}

/**
 * Поле высот земли: для каждой клетки — верх самой высокой плиты под ней.
 *
 * Высота берётся из габаритов модели, а не из физики: якорь меша считается как
 * `position.y − min[1]·scale`, поэтому плита занимает по вертикали
 * [position.y, position.y + (max[1] − min[1])·scale]. Для terrain_low это
 * ровно «верх = y + 1», что совпадает с гейтом коллайдеров.
 *
 * Нужно потому, что карта многоярусная: без высот планировщик считает обрыв
 * проходимым и ведёт маршрут по краю острова вместо существующих рамп.
 */
function buildHeights(scene, bounds) {
  const top = new Float32Array(N * N).fill(NaN);
  const isRamp = new Uint8Array(N * N);
  // Расстояние до центра «своей» плиты. Высота клетки берётся у БЛИЖАЙШЕЙ плиты,
  // а не как максимум по перекрытию: плита 2 м накрывает несколько клеток 1 м,
  // и максимум задирал высоту клетки, соседней с ярусом, до высоты яруса —
  // каждая ступенька раздувалась на клетку, и планировщик видел стену там, где
  // её нет. Из-за этого все четыре маршрута выходили вдвое длиннее прямых.
  const ownerDist = new Float32Array(N * N).fill(Infinity);
  for (const obj of scene.placedObjects) {
    const file = obj.modelPath.split('/').pop();
    if (!file || !file.startsWith('terrain_')) continue;
    const b = bounds[file];
    if (!b) continue;
    const scale = Array.isArray(obj.scale) ? obj.scale[0] : obj.scale || 1;
    const tileTop = obj.position[1] + (b.max[1] - b.min[1]) * scale;
    // Рампа — всё, что не плоская плита: она соединяет ярусы, и правило
    // ограниченного подъёма на неё не распространяется.
    const ramp = !file.startsWith('terrain_low') && !file.startsWith('terrain_tall');
    const halfX = Math.max(1, Math.ceil((b.size[0] / 2) * scale / CELL));
    const halfZ = Math.max(1, Math.ceil((b.size[2] / 2) * scale / CELL));
    const cx = toIdx(obj.position[0]);
    const cz = toIdx(obj.position[2]);
    for (let dz = -halfZ; dz <= halfZ; dz++) {
      for (let dx = -halfX; dx <= halfX; dx++) {
        const x = cx + dx;
        const z = cz + dz;
        if (x < 0 || z < 0 || x >= N || z >= N) continue;
        const i = z * N + x;
        const d = dx * dx + dz * dz;
        if (d >= ownerDist[i]) continue; // клетка уже принадлежит плите ближе
        ownerDist[i] = d;
        top[i] = tileTop;
        isRamp[i] = ramp ? 1 : 0;
      }
    }
  }
  return { top, isRamp };
}

function buildOccupancy(scene, bounds) {
  const blocked = Array.from({ length: N }, () => new Uint8Array(N));
  let props = 0;
  for (const obj of scene.placedObjects) {
    const file = obj.modelPath.split('/').pop();
    // Пол — не препятствие: это поверхность, по которой ходят.
    if (!file || file.startsWith('terrain_')) continue;
    const b = bounds[file];
    if (!b) continue;
    const scale = Array.isArray(obj.scale) ? obj.scale[0] : obj.scale || 1;
    const radius = (Math.max(b.size[0], b.size[2]) / 2) * scale + PLAYER_CLEARANCE;
    const cx = toIdx(obj.position[0]);
    const cz = toIdx(obj.position[2]);
    const r = Math.max(1, Math.ceil(radius / CELL));
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dz * dz > r * r) continue;
        const x = cx + dx;
        const z = cz + dz;
        if (x < 0 || z < 0 || x >= N || z >= N) continue;
        blocked[z][x] = 1;
      }
    }
    props++;
  }
  // Край карты: за периметром ходить негде.
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const wx = i * CELL - HALF;
      const wz = j * CELL - HALF;
      if (Math.abs(wx) > 29 || Math.abs(wz) > 29) blocked[j][i] = 1;
    }
  }
  return { blocked, props };
}

const STEP_UP = 0.6; // предельный подъём между соседними клетками, м

/**
 * Можно ли шагнуть из клетки в клетку.
 *
 * Спуск разрешён всегда (в игре можно упасть), подъём ограничен: иначе
 * планировщик ведёт маршрут прямо по обрыву. Клетки рамп исключены из правила —
 * они для того и поставлены, чтобы соединять ярусы.
 */
function walkableStep(heights, ax, az, bx, bz) {
  const ia = az * N + ax;
  const ib = bz * N + bx;
  // Клетки без плиты не считаем стеной: под островом лежит страховочный пол,
  // и по этим провалам игрок ходит. Раньше они блокировались, и все маршруты
  // уходили в обход вдвое длиннее прямого — на ровном месте.
  if (Number.isNaN(heights.top[ia]) || Number.isNaN(heights.top[ib])) return true;
  if (heights.isRamp[ia] || heights.isRamp[ib]) return true;
  return heights.top[ib] - heights.top[ia] <= STEP_UP;
}

// A* по 8 направлениям: диагональ дороже прямого хода.
function findPath(blocked, heights, from, to) {
  const sx = toIdx(from.x), sz = toIdx(from.z);
  const tx = toIdx(to.x), tz = toIdx(to.z);
  const key = (x, z) => z * N + x;
  const open = [{ x: sx, z: sz, g: 0, f: 0, parent: null }];
  const seen = new Map();
  const DIRS = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]
  ];
  // Цель может быть занята (NPC стоит вплотную к чему-то) — берём ближайшую
  // ДОСТИЖИМУЮ свободную клетку, а не просто ближайшую: ближайшая вполне может
  // оказаться в кармане между двумя ящиками, куда снаружи не попасть, и тогда
  // поиск честно вернёт «пути нет» на ровном месте.
  const candidates = [];
  if (blocked[tz][tx]) {
    for (let z = 0; z < N; z++) {
      for (let x = 0; x < N; x++) {
        if (blocked[z][x]) continue;
        candidates.push({ x, z, d: (x - tx) ** 2 + (z - tz) ** 2 });
      }
    }
    candidates.sort((a, b) => a.d - b.d);
    candidates.length = Math.min(candidates.length, 60);
  } else {
    candidates.push({ x: tx, z: tz, d: 0 });
  }

  for (const goal of candidates) {
  const h = (x, z) => Math.hypot(x - goal.x, z - goal.z);
  open.length = 0;
  open.push({ x: sx, z: sz, g: 0, f: h(sx, sz), parent: null });

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift();
    const k = key(cur.x, cur.z);
    if (seen.has(k)) continue;
    seen.set(k, cur);
    if (cur.x === goal.x && cur.z === goal.z) {
      const out = [];
      for (let n = cur; n; n = n.parent) out.push({ x: n.x * CELL - HALF, z: n.z * CELL - HALF });
      return out.reverse();
    }
    for (const [dx, dz, cost] of DIRS) {
      const nx = cur.x + dx;
      const nz = cur.z + dz;
      if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue;
      if (blocked[nz][nx]) continue;
      // Диагональ нельзя резать через угол занятой клетки.
      if (dx && dz && (blocked[cur.z][nx] || blocked[nz][cur.x])) continue;
      if (!walkableStep(heights, cur.x, cur.z, nx, nz)) continue;
      if (seen.has(key(nx, nz))) continue;
      const g = cur.g + cost;
      open.push({ x: nx, z: nz, g, f: g + h(nx, nz), parent: cur });
    }
  }
    seen.clear();
  }
  return null;
}

/**
 * Поле расстояний до ближайшего препятствия по свободным клеткам.
 * Многоисточниковый BFS от всех занятых клеток сразу: даёт «насколько здесь
 * просторно» без подсчёта соседей в каждом окне.
 */
function distanceToObstacle(blocked) {
  const dist = Array.from({ length: N }, () => new Int16Array(N).fill(-1));
  const queue = [];
  for (let z = 0; z < N; z++) {
    for (let x = 0; x < N; x++) {
      if (blocked[z][x]) { dist[z][x] = 0; queue.push([x, z]); }
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const [x, z] = queue[head];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue;
      if (dist[nz][nx] !== -1) continue;
      dist[nz][nx] = dist[z][x] + 1;
      queue.push([nx, nz]);
    }
  }
  return dist;
}

/** Связные области, где до ближайшего пропса дальше порога. */
function openAreas(dist, minClearance) {
  const seen = Array.from({ length: N }, () => new Uint8Array(N));
  const areas = [];
  for (let z = 0; z < N; z++) {
    for (let x = 0; x < N; x++) {
      if (seen[z][x] || dist[z][x] < minClearance) continue;
      const stack = [[x, z]];
      seen[z][x] = 1;
      const cells = [];
      while (stack.length) {
        const [cx, cz] = stack.pop();
        cells.push({ x: cx, z: cz });
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const nz = cz + dz;
          if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue;
          if (seen[nz][nx] || dist[nz][nx] < minClearance) continue;
          seen[nz][nx] = 1;
          stack.push([nx, nz]);
        }
      }
      if (cells.length < 12) continue; // мелочь не интересна
      // Лучшая точка — не центр описанного прямоугольника (у кривой области он
      // уезжает вбок, иногда прямо в постройку), а клетка, максимально
      // удалённая от любого пропса.
      let best = cells[0];
      let bestD = -1;
      for (const c of cells) {
        const d = dist[c.z][c.x];
        if (d > bestD) { bestD = d; best = c; }
      }
      const xs = cells.map((c) => c.x * CELL - HALF);
      const zs = cells.map((c) => c.z * CELL - HALF);
      areas.push({
        area: cells.length,
        cx: +(best.x * CELL - HALF).toFixed(1),
        cz: +(best.z * CELL - HALF).toFixed(1),
        clearance: bestD,
        w: Math.max(...xs) - Math.min(...xs),
        d: Math.max(...zs) - Math.min(...zs)
      });
    }
  }
  return areas.sort((a, b) => b.area - a.area);
}

// Ломаная по узлам: убираем точки, лежащие на прямой между соседями.
function simplify(points) {
  if (points.length < 3) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1];
    const b = points[i];
    const c = points[i + 1];
    const cross = (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
    if (Math.abs(cross) > 0.01) out.push(b);
  }
  out.push(points[points.length - 1]);
  return out;
}

function sampleAlong(polyline, step) {
  const pts = [];
  let acc = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 1e-6) continue;
    const nx = (b.x - a.x) / len;
    const nz = (b.z - a.z) / len;
    let t = acc === 0 ? 0 : step - acc;
    while (t < len) {
      pts.push({ x: a.x + nx * t, z: a.z + nz * t, nx, nz });
      t += step;
    }
    acc = (acc + len) % step;
  }
  return pts;
}

function main() {
  const scene = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'islandScene.json'), 'utf8'));
  const bounds = loadBounds();
  const { blocked, props } = buildOccupancy(scene, bounds);
  const heights = buildHeights(scene, bounds);
  // Провалы между плитами намеренно НЕ блокируем: под островом страховочный
  // пол, и по ним ходят. Блокировка давала ложные обходы вдвое длиннее прямых.
  const existingLights = scene.placedObjects.filter((p) => p.modelPath.includes('lights'));

  const lines = [];
  const routesJson = [];

  lines.push('## Маршруты от хаба к секторам\n');
  lines.push(`Сетка ${N}×${N} по 1 м. Занятость по ${props} пропсам (плиты земли не препятствие). Высоты — из габаритов плит, подъём ограничен ${STEP_UP} м, рампы проходимы.`);
  lines.push(`Занятых клеток: ${blocked.reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0)} из ${N * N}.\n`);

  for (const [id, zone] of Object.entries(ZONES)) {
    const raw = findPath(blocked, heights, HUB, { x: zone.x, z: zone.z });
    if (!raw) {
      lines.push(`### ${zone.name} — МАРШРУТ НЕ НАЙДЕН, нужен проход\n`);
      continue;
    }
    const simple = simplify(raw);
    const len = simple.reduce(
      (s, p, i) => (i ? s + Math.hypot(p.x - simple[i - 1].x, p.z - simple[i - 1].z) : 0),
      0
    );
    const samples = sampleAlong(simple, LIGHT_STEP);
    const near = existingLights.filter((l) =>
      samples.some((s) => Math.hypot(l.position[0] - s.x, l.position[2] - s.z) < EXISTING_LIGHT_NEAR)
    );
    const need = samples.filter(
      (s) =>
        !existingLights.some(
          (l) => Math.hypot(l.position[0] - s.x, l.position[2] - s.z) < EXISTING_LIGHT_NEAR
        )
    );

    // Точки для застройки: с боковым смещением И с высотой.
    //
    // Y обязателен: импортёр поднимает только ВИСЯЩИЕ пропсы (зазор до 0.35 м),
    // а утопленный фонарь так и останется в земле. Высоту берём из поля высот в
    // точке ПОСЛЕ смещения — там, где фонарь реально встанет.
    const px = need.map((s, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      const wx = s.x - s.nz * LIGHT_SIDE * side;
      const wz = s.z + s.nx * LIGHT_SIDE * side;
      const top = heights.top[toIdx(wz) * N + toIdx(wx)];
      return {
        x: Number(wx.toFixed(1)),
        z: Number(wz.toFixed(1)),
        y: Number.isNaN(top) ? 1 : Number(top.toFixed(2))
      };
    });
    routesJson.push({
      id,
      name: zone.name,
      path: simple.map((p) => [+p.x.toFixed(1), +p.z.toFixed(1)]),
      lights: px
    });

    const straight = Math.hypot(zone.x - HUB.x, zone.z - HUB.z);
    lines.push(`### ${zone.name} → (${zone.x}, ${zone.z})`);
    lines.push(`Длина ${len.toFixed(0)} м, узлов после упрощения ${simple.length}.`);
    // Обход длиннее прямого на треть и больше — признак того, что планировщик
    // упёрся в стену по высоте. Так бывает и по делу (настоящий обход), и
    // ошибочно (ложная стена из-за клетки-перемычки у обрыва), поэтому такие
    // маршруты помечаем, а не выдаём за истину.
    if (len > straight * 1.35) {
      lines.push(
        `> Прямой путь ${straight.toFixed(0)} м, а по проходимости ${len.toFixed(0)} м — ` +
          'пройди ногами: возможно, есть более короткий проход, которого планировщик не видит.'
      );
    }
    if (near.length) lines.push(`Уже освещено: ${near.length} существующих фонарей в ${EXISTING_LIGHT_NEAR} м от оси.`);
    lines.push(`Ставить новых фонарей: **${need.length}**`);
    lines.push('');
    lines.push('| # | X | Z | смещение вбок |');
    lines.push('|---|---|---|---|');
    need.forEach((s, i) => {
      // Смещение вбок: перпендикуляр к направлению маршрута, сторона чередуется.
      const side = i % 2 === 0 ? 1 : -1;
      const ox = -s.nz * LIGHT_SIDE * side;
      const oz = s.nx * LIGHT_SIDE * side;
      lines.push(
        `| ${i + 1} | ${(s.x + ox).toFixed(1)} | ${(s.z + oz).toFixed(1)} | ${side > 0 ? 'лево' : 'право'} |`
      );
    });
    lines.push('');
  }

  // ── Пустоты ──
  // Крупнейшие свободные области: грубо — клетки, от которых 8 м во все стороны
  // нет ни одного пропса. Это и есть кандидаты на застройку.
  lines.push('## Пустые области (кандидаты на застройку)\n');
  // Порог 3 м: это не «между двумя ящиками просторно», а настоящее поле.
  const dist = distanceToObstacle(blocked);
  const free = openAreas(dist, 3);
  lines.push(`Областей, где до ближайшего пропса больше 3 м: **${free.length}**.\n`);
  if (free.length) {
    lines.push('| # | точка X | точка Z | просвет, м | габарит, м | что поставить | зачем |');
    lines.push('|---|---|---|---|---|---|---|');
    // Названия и содержимое — по смыслу места; координаты берутся из расчёта,
    // а не выдумываются, поэтому точка гарантированно стоит на пустом.
    const purpose = [
      ['склад-перевалочный', 'cargo_A_stacked, containers_B, cargo_B', 'грузы между хабом и юго-западным терминалом'],
      ['стоянка техники', 'spacetruck, spacetruck_trailer', 'брошенная техника на западном поле'],
      ['карьерный отвал', 'rock_A, rocks_A, rock_B', 'природный рельеф вместо пустого поля'],
      ['заправка', 'structure_low, solarpanel, lights', 'промежуточная точка на восточном маршруте']
    ];
    free.slice(0, 8).forEach((a, i) => {
      const [label, models, why] = purpose[i % purpose.length];
      lines.push(
        `| ${i + 1} | ${a.cx} | ${a.cz} | ${a.clearance} | ${a.w.toFixed(0)}×${a.d.toFixed(0)} | ${models} | ${label} — ${why} |`
      );
    });
    lines.push('');
    lines.push('Габарит — описанный прямоугольник области, и у изогнутой области он завышен: ориентируйся на точку и просвет. Точку можно сдвигать внутри области, она останется на свободном.');
  }

  const header = [
    '# Наполнение карты: маршруты и пустоты',
    '',
    'Файл сгенерирован `scripts/planZoneRoutes.mjs` — не править руками, а',
    'перезапустить скрипт после изменений карты:',
    '',
    '```',
    'node scripts/planZoneRoutes.mjs --out scripts/map-source/zone-fill-plan.md --json /tmp/routes.json',
    '```',
    '',
    'Координаты — мировые метры, как в редакторе Forma-3D. Модели брать только из',
    'каталога `src/data/modelBounds.generated.ts`: на модель вне каталога',
    '`importGameMap.mjs` отклонит экспорт целиком.',
    '',
    'Как читать. Путевые огни ставятся по таблицам маршрутов — точки уже смещены',
    'вбок от оси, чтобы фонарь не перекрывал проход. Застройка пустот — по второй',
    'таблице: пустота это связная область, где до ближайшего пропса больше 3 м,',
    'поэтому точку можно двигать внутри области, она останется на свободном.',
    'Колонка «просвет» — расстояние от этой точки до ближайшего пропса.',
    '',
    'Оговорка. Маршруты построены по сетке 1 м с учётом высот плит (подъём',
    'ограничен, рампы проходимы), но без учёта того, как игрок реально обходит',
    'препятствия. Маршрут к REACTOR CORE идёт по ярусам через рампы — пройди его',
    'один раз ногами и поправь, если он расходится с тем, как ходишь ты.',
    ''
  ].join('\n');

  const text = header + '\n' + lines.join('\n');
  console.log(lines.join('\n'));

  const outArg = process.argv.indexOf('--out');
  if (outArg > -1 && process.argv[outArg + 1]) {
    fs.writeFileSync(path.join(ROOT, process.argv[outArg + 1]), text);
    console.error(`\nСпека записана: ${process.argv[outArg + 1]}`);
  }

  const jsonArg = process.argv.indexOf('--json');
  if (jsonArg > -1 && process.argv[jsonArg + 1]) {
    fs.writeFileSync(process.argv[jsonArg + 1], JSON.stringify({ routes: routesJson, free }, null, 1));
    console.error(`\nДанные маршрутов записаны: ${process.argv[jsonArg + 1]}`);
  }
}

main();

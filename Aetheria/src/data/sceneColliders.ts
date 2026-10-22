// ══════════════════════════════════════════════════════════════════════
// sceneColliders.ts — единый источник физики космо-карты.
//
// Строит коллайдеры СЦЕНЫ ИЗ ИЗМЕРЕННЫХ габаритов мешей
// (src/data/modelBounds.generated.ts, источник правды — генератор
// scripts/extractModelBounds.mjs) и позиций/поворотов размещений
// (src/data/islandScene.json). Ручной словарь MODEL_COLLIDER_DEFS из
// WorldScene.tsx удалён: у всех 28 моделей с ручными half-extents хотя бы
// одна ось расходилась с реальным AABB (до +83% фантомных стен у
// tunnel_straight_A, до −77% проходимых насквозь мачт windturbine_tall,
// −76% толщины посадочной площадки), а 49 плит земли и 14 рамп не имели
// коллайдеров вовсе — игрок ходил по невидимому кубу-полю 90×90 из
// IslandCanvas.tsx далеко за краем видимого острова.
//
// Модуль без рантайм-импортов (только type-imports): его напрямую
// импортирует независимый гейт scripts/checkColliders.mjs — Node 24 сам
// снимает типы. Функции чистые, все числа воспроизводятся бит-в-бит при
// одинаковых входах, поэтому гейт пересчитывает коллайдеры по тем же
// правилам и сверяет c тем, что реально рендерит WorldScene.
//
// Правила:
//  - сплошной бокс по измеренному AABB меша (8 углов, yaw кратно 90° → осевой
//    бокс) — ТОЛЬКО земляные объёмы: terrain_low* / terrain_mining (проходимая
//    земля; верх каждого коллайдера равен верху ЕГО плиты: карта многоярусная,
//    ходовые уровни 1..4 м; кромка карьера terrain_mining снимается на 7 см
//    вниз — не ходовая) и terrain_tall (точный куб 2×2×2);
//  - terrain_slope* и ВСЕ ПРОПСЫ — коллайдеров здесь НЕТ: их физику строит
//    WorldScene из самих треугольников меша (ModelShapeColliders,
//    TrimeshCollider). Бокс по AABB неконвексных форм (антенны, турбины
//    с лопастями, скалы, мостики, плиты с бортиками) разъезжался с мешем:
//    игрок заскакивал на пустоту бокса и упирался в невидимые стены.
//    Меш-треугольники дают физику бит-в-бит с визуалом без ручной
//    калибровки — для склонов это уже доказано;
//  - NPC (npc_*, Mannequin*) коллайдеров не получают — тела рендерит
//    CrewNPCs со скелетными ригами;
//  - support/perimeter/safetyFloor — невидимые страховочные объёмы там,
//    где мешей нет вовсе (для них правило «бокс = AABB меша» неприменимо).
//
// Визуал (InstancedModelGroup) использует те же UNIT_SCALE и
// MODEL_BOUNDS: масштаб и заякоривание за низ меша у рендера и физики
// считаются из одного источника.
// ══════════════════════════════════════════════════════════════════════

import type { IslandSceneData, PlacedObject } from '../types/scene';
import type { ModelBounds } from './modelBounds.generated';

// Категория коллайдера (для подсчёта покрытия в гейте): terrain/obstacle —
// бокс на земляные объёмы, support/perimeter/safetyFloor — невидимые
// страховочные объёмы без мешей (slope в боксы не попадает — trimesh).
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
  /** Нижний ходовой ярус карты (минимальный верх плит terrain_low*). */
  groundLevel: number;
  /** Верхний уровень рамп (максимальный верх мешей terrain_slope*). */
  terraceLevel: number;
  /** AABB острова по плитам земли (для периметра и страховочного пола). */
  islandMinX: number;
  islandMaxX: number;
  islandMinZ: number;
  islandMaxZ: number;
  /** Верх земли под точкой спавна (-Infinity, если опоры нет). */
  spawnSupportTop: number;
}

export interface SceneColliderBuild {
  /** Ровно один первичный коллайдер на каждое не-NPC размещение (108 шт). */
  colliders: SceneCollider[];
  /** Дополнительные капы тех же размещений (базовые плиты под рампами). */
  subColliders: SceneCollider[];
  /** Опоры/периметр/страховочный пол — объёмы там, где мешей нет. */
  extras: SceneCollider[];
  meta: SceneColliderMeta;
}

// Единица масштаба мешей каталога. Раньше её подбирала эвристика
// getUnitScale по порогам maxDim 10/100/1000, но измеренные габариты всех
// 72 моделей каталога лежат в [0.5 .. 2.999991] (максимум —
// windturbine_tall.gltf), поэтому эвристика всегда возвращала 1. Значение
// зашито константой, чтобы визуал (scale * UNIT_SCALE) и физика брали его
// из одного места.
export const UNIT_SCALE = 1;

// Снимок неходовой кромки карьера terrain_mining (см. правило terrain ниже).
export const MINING_RIM_DROP = 0.07;

// ══════════════════════════════════════════════════════════════════════
// Кватернионы/Эйлер XYZ — дословно повторяют формулы three.js
// (Quaternion.setFromEuler 'XYZ', Euler.setFromRotationMatrix 'XYZ' —
// см. node_modules/three/src/math/Euler.js), потому что Rapier-биндинг
// разворачивает rotation в THREE.Euler(x, y, z) с порядком XYZ, и
// трансформы коллайдеров обязаны совпадать с трансформами визуала.
// Сверено с three 0.174: расхождение 0 на 180k случайных вращений и на
// всех yaw сцены.
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

// Столбцовые элементы с layout THREE.Matrix4.elements (te[0..10]).
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

// Мировой AABB меша размещения: 8 углов измеренного AABB, умноженные на
// fs = scale * UNIT_SCALE, повёрнутые на полный rotation объекта (для
// yaw-only объектов — то же, что «повёрнутые yaw из islandScene.json»),
// в том же заякоривании за низ меша, что и визуальный InstancedModelGroup:
// pivotY = position.y − bounds.min.y·fs. Их AABB и есть бокс коллайдера.
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

// Верх меша в мире (заякоривание за низ + maxY измеренного AABB).
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

  // NPC-модели (npc_*, Mannequin*) рендерятся CrewNPCs со скелетным ригом
  // и коллайдеров не получают — та же отсечка, что и в instancing-рендере.
  const isNpc = (lower: string): boolean => lower.startsWith('npc_') || lower.includes('mannequin');
  const isGroundTile = (lower: string): boolean =>
    lower.startsWith('terrain_low') || lower.startsWith('terrain_mining');
  const isRamp = (lower: string): boolean => lower.startsWith('terrain_slope');

  const unitScaleOf = (obj: PlacedObject): number =>
    (Array.isArray(obj.scale) ? obj.scale[0] : obj.scale || 1) * UNIT_SCALE;

  // ── Проход 1: подготовка записей и производные уровни сцены ──
  const records = sceneData.placedObjects.map((obj) => {
    const name = obj.modelPath.split('/').pop() || '';
    const lower = name.toLowerCase();
    const bounds = modelBounds[name];
    if (!bounds) {
      // extractModelBounds.mjs гарантирует запись для каждой модели сцены
      // (иначе его тест падает с exit 1) — отсутствие записи — ошибка данных.
      throw new Error(
        `sceneColliders: у модели ${name} нет записи в MODEL_BOUNDS — перегенерируйте: node scripts/extractModelBounds.mjs`
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
    throw new Error('sceneColliders: в сцене нет плит земли terrain_low* — не из чего вывести уровень пола');
  }
  // Многоярусная карта: плиты стоят на уровнях 1..4 м, единой «земли» нет.
  // groundLevel = нижний ходовой ярус (минимальный верх плит terrain_low*,
  // выше нуля за счёт анизотропии меша; карьер terrain_mining — локальная
  // яма, в базовый уровень не входит). Верх коллайдера каждой плиты
  // определяется потайлово в проходе 2 — единый зажим здесь топил бы
  // верхние ярусы до нижнего.
  const groundLowTops: number[] = [];
  for (const rec of physical) {
    if (rec.lower.startsWith('terrain_low')) {
      groundLowTops.push(meshTopY(rec.bounds, rec.fs, rec.pivotY));
    }
  }
  const groundLevel = Math.min(...groundLowTops);
  // Уровень верхней рампы: на многоярусной карте террасы на каждом ярусе;
  // историческое поле оставлено как максимум рамп (потребителей у значения
  // нет, кроме гейта — сверка зеркального пересчёта).
  const terraceLevel = rampTopLevels.length > 0 ? Math.max(...rampTopLevels) : groundLevel;
  const islandMinX = Math.min(...groundBoxes.map((b) => b.center[0] - b.halfExtents[0]));
  const islandMaxX = Math.max(...groundBoxes.map((b) => b.center[0] + b.halfExtents[0]));
  const islandMinZ = Math.min(...groundBoxes.map((b) => b.center[2] - b.halfExtents[2]));
  const islandMaxZ = Math.max(...groundBoxes.map((b) => b.center[2] + b.halfExtents[2]));
  const islandMinY = Math.min(...groundBoxes.map((b) => b.center[1] - b.halfExtents[1]));

  // ═══ Проход 2: коллайдеры размещений ═══
  // Yaw кратен 90° (и rx=rz=0): повёрнутый локальный бокс совпадает с
  // мировым AABB меша, коллайдер оставляем осевым (rotation [0,0,0]).
  function isAxisAlignedYaw(euler: [number, number, number]): boolean {
    if (Math.abs(euler[0]) > 1e-12 || Math.abs(euler[2]) > 1e-12) return false;
    const quarter = Math.PI / 2;
    for (let k = -4; k <= 4; k++) {
      if (Math.abs(euler[1] - k * quarter) <= 1e-9) return true;
    }
    return false;
  }

  for (const rec of physical) {
    // Бокс-коллайдеры здесь получают ТОЛЬКО земляные объёмы: плиты и карьер
    // идеально повторяются осевым боксом (ходовая поверхность — их верх),
    // terrain_tall — точный куб 2×2×2. Склоны и ВСЕ ПРОПСЫ физику получают
    // из своих треугольников (ModelShapeColliders в WorldScene): бокс по
    // AABB антенн/турбин/скал/модулей давал «невидимые стены» и фантомные
    // полы там, где меша нет — пользователь заскакивал на пустоту бокса.
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
    // Земля: верх коллайдера = верх САМОЙ ПЛИТЫ. Карта многоярусная
    // (ходовые уровни 1..4 м), единый зажим groundLevel топил бы верхние
    // ярусы — каждый ярус ходовой по своему верху. Исключение — кромка
    // карьера terrain_mining (меш до +1.0725 над низом): кромка не ходовая
    // поверхность, 7 см снимается, чтобы капсула не цепляла невидимый
    // уступ по периметру кратера. Плиты земли каталога всегда осевые
    // (yaw кратно 90° — проверено на текущей карте), верх/world-правило
    // определено в мировых координатах.
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

  // ═══ Невидимые страховочные объёмы (периметр, пол) ═══

  // Бывшие опоры стыков рамп (plaza бура, гребень солнечной террасы) —
  // артефакты старой процедурной карты: в авторской раскладке из редактора
  // стыки уже опираются на плиты, а фантомные невидимые боксы только
  // ломали бы проходы. Качество стыков контролируется e2e-обходом карты.

  // Периметр: невидимые стены точно на краю плит земли. На многоярусной
  // карте высота стены каждой стороны привязана к самой высокой плите у
  // этой стороны: стена единой высоты от нижнего яруса оставляла бы верхние
  // ярусы открытыми (у 4-го яруса пол на 3 м выше). Возвышение над полом
  // то же 0.85 м: апогей прыжка v²/(2g) = 5.5²/(2·19.6) ≈ 0.77 м < 0.85 —
  // перепрыгнуть нельзя.
  const WALL_MARGIN = 0.1; // грань стены лежит ровно на крае плит
  const WALL_HALF_THICKNESS = 0.1;
  const WALL_HEIGHT_ABOVE_GROUND = 0.85;
  const WALL_ADJACENT_STEP = 2.1; // плита «у стороны», если её край в шаге плит от кромки
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

  // Страховочный пол строго под визуальным островом: тонкий бокс на 0.1 м
  // ниже верха плит ловит провал в числовом шве между соседними плитами;
  // за краем плит пола нет — ходить по невидимому полу в пустоте
  // невозможно. Ширина = габарит острова + та же кромка, что у стен.
  const SEAM_DROP = 0.1; // верх ниже уровня земли — провал заметен, но мал
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

  // Верх земли под точкой спавна (гейт отдельно убеждается, что спавн
  // стоит на плите, а не в воздухе и не внутри земли).
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

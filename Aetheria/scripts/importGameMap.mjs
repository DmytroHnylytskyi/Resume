// ═══════════════════════════════════════════════════════════════════════════
// importGameMap.mjs — канонический генератор src/data/islandScene.json
// из живой карты, собранной в редакторе Forma 3D Workspace.
//
// Пайплайн карты: авторская раскладка → этот импортёр → islandScene.json.
// buildGameMap.mjs остаётся legacy-процедурным генератором и для текущей
// карты не используется. islandScene.json руками не редактировать — только
// перегенерация:  node scripts/importGameMap.mjs
// ═══════════════════════════════════════════════════════════════════════════
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const SOURCE = 'scripts/map-source/forma-workspace-3d.json';
const TARGET = 'src/data/islandScene.json';
const MODEL_DIR = 'public/model/kaykit_space';
const BOUNDS_FILE = 'src/data/modelBounds.generated.ts';

// Точка спавна: открытая западная площадь южнее хаба, на земле 1-го яруса
// (верх плит 1.0). Испытана по свободному зазору: 4.9 м до крупных пропсов,
// 10 м до нового солнечного поля и 7 м до новой южной башни; три башни хаба
// остаются впереди, а не вплотную. Yaw — на северо-восток, к хабу (радианы).
const SPAWN_POINT = [-8, 1.1, 12];
const SPAWN_YAW = -0.25;

// Экипаж: связка с диалогами NPC_DIALOGUES (src/data/npcDialogues.ts) — по
// имени файла модели; позиция в islandScene.json главнее fallback-позиции
// диалога. Y каждой позиции = уровень опоры под точкой (см. проверки ниже).
const NPCS = [
  // Командир — на палубе хаба (верх плит roofmodule_base 1.4) у схода,
  // встречает игрока у шаттла.
  { file: 'npc_commander.glb',  position: [5.5, 1.4, -6.1],  rotation: [0, Math.PI, 0] },
  // Головной инженер — плато аванпоста (4-й ярус, верх 4.0) у буровой.
  { file: 'npc_engineer.glb',   position: [-16.7, 4, -10.6], rotation: [0, -0.8, 0] },
  // Офицер связи — грузовой терминал (юго-запад) перед депо.
  { file: 'npc_comms.glb',      position: [-12.6, 1, 19.2],  rotation: [0, -1.2, 0] },
  // UI-архитектор — стоянка у хаба перед ангарами.
  { file: 'npc_forma.glb',      position: [7.5, 1, -3.2],    rotation: [0, -1.57, 0] },
  // Геоданные — буровой карьер (юго-восток) у скважин.
  { file: 'npc_terrascope.glb', position: [22.5, 1, 24.3],   rotation: [0, 1.57, 0] },
  // Фотоника — поле турбин у гаража (восток).
  { file: 'npc_lumina.glb',     position: [21.8, 1, 15.6],   rotation: [0, Math.PI, 0] }
];

function fail(msg) {
  console.error('✗ importGameMap: ' + msg);
  process.exit(1);
}

// MODEL_BOUNDS — генерируемый TS-файл; достаём литерал объекта штатным парсером.
function loadModelBounds() {
  const src = readFileSync(BOUNDS_FILE, 'utf8');
  const start = src.indexOf('{', src.indexOf('MODEL_BOUNDS'));
  const inner = src.slice(start + 1, src.lastIndexOf('};'));
  return new Function(`return ({${inner}})`)();
}

const bounds = loadModelBounds();
const source = JSON.parse(readFileSync(SOURCE, 'utf8'));
if (!Array.isArray(source.placedObjects) || source.placedObjects.length === 0) {
  fail('в источнике нет placedObjects');
}

// ── Валидация записей источника ────────────────────────────────────────────
const seenIds = new Set();
for (const o of source.placedObjects) {
  const name = o.modelPath.split('/').pop() || '';
  if (!o.id || seenIds.has(o.id)) fail(`дублирующийся/пустой id: ${o.id}`);
  seenIds.add(o.id);
  if (!name.startsWith('terrain_') && !(name.startsWith('npc_') || name.includes('mannequin'))) {
    if (!existsSync(`${MODEL_DIR}/${name}`)) fail(`модель ${name} отсутствует в ${MODEL_DIR}`);
  }
  if (!(name in bounds)) fail(`у модели ${name} нет записи в MODEL_BOUNDS — запустите node scripts/extractModelBounds.mjs`);
  if (!Array.isArray(o.position) || o.position.length !== 3) fail(`у ${o.id} некорректная position`);
  if (!Array.isArray(o.rotation) || o.rotation.length !== 3) fail(`у ${o.id} некорректная rotation`);
}
const npcsInSource = source.placedObjects.filter((o) => {
  const n = (o.modelPath.split('/').pop() || '').toLowerCase();
  return n.startsWith('npc_') || n.includes('mannequin');
});
if (npcsInSource.length > 0) fail('в источнике есть NPC — они добавляются этим скриптом, а не экспортом');

// ── Проверки опоры (плиты земли + платформы-пропсы), как в runtime ─────────
const tiles = [];
const propBoxes = [];
for (const o of source.placedObjects) {
  const name = o.modelPath.split('/').pop();
  const b = bounds[name];
  if (name.startsWith('terrain_')) {
    tiles.push({ name, x: o.position[0], z: o.position[2], y: o.position[1] });
    continue;
  }
  // Редактор умеет отдавать scale массивом ([2, 2.72, 2]); рендер, физика
  // и гейт исторически берут первую компоненту (равномерный масштаб).
  // Импортёр обязан читать так же, иначе propBoxes получают NaN и проверки
  // опоры/зазоров молча превращаются в NaN.
  const fs = Array.isArray(o.scale) ? o.scale[0] : o.scale || 1;
  const yaw = o.rotation[1];
  // Полуразмеры повёрнутого AABB (приближение для произвольного yaw).
  const whx = Math.abs(Math.cos(yaw)) * b.size[0] / 2 * fs + Math.abs(Math.sin(yaw)) * b.size[2] / 2 * fs;
  const whz = Math.abs(Math.sin(yaw)) * b.size[0] / 2 * fs + Math.abs(Math.cos(yaw)) * b.size[2] / 2 * fs;
  propBoxes.push({ o, name, cx: o.position[0], cz: o.position[2], whx, whz,
    // Мир-габариты размещения: рендер заякоривает меш НИЗОМ в position.y
    // (pivot = y − min·fs), поэтому ходовой низ = y, верх = y + высота·fs.
    bottom: o.position[1], top: o.position[1] + b.size[1] * fs });
}

function groundTopAt(x, z) {
  let top = null;
  for (const t of tiles) {
    if (Math.abs(t.x - x) > 1.001 || Math.abs(t.z - z) > 1.001) continue;
    //terrain_low* — верх на +1 от низа; terrain_mining стоит в карьерах, ходовая кромка зажимается в рантайме, для NPC не кандидат.
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
  if (!Number.isFinite(supportTop)) fail(`${label}: под [${x}, ${z}] нет ни плиты, ни платформы`);
  if (Math.abs(supportTop - y) > 0.11) {
    fail(`${label}: y=${y}, а опора под точкой ${supportTop.toFixed(2)} (плита ${ground ?? '—'}, платформа ${prop ?? '—'})`);
  }
  // Зазор считаем только до реальных препятствий: пропсы, верх которых
  // выше уровня опоры (платформа под ногами — это пол, не препятствие).
  let clear = Infinity;
  for (const p of propBoxes) {
    if (p.top <= supportTop + 0.05) continue;
    const dx = Math.max(0, Math.abs(x - p.cx) - p.whx);
    const dz = Math.max(0, Math.abs(z - p.cz) - p.whz);
    clear = Math.min(clear, Math.hypot(dx, dz));
  }
  if (clear < 0.35) fail(`${label}: зазор до пропсов ${clear.toFixed(2)} м — точка внутри препятствия`);
  console.log(`✓ ${label}: опора ${supportTop.toFixed(2)}, зазор ${clear.toFixed(2)} м`);
}

assertSupport('спавн', SPAWN_POINT[0], SPAWN_POINT[1], SPAWN_POINT[2]);
for (const npc of NPCS) {
  assertSupport(npc.file, npc.position[0], npc.position[1], npc.position[2]);
}

// ── Заземление пропсов: маленькие «парения» авторской раскладки ────────────
// В редакторе платформы считались на 0.1 выше (верх палубных плит roofmodule
// при масштабе ×2: anchor за مرکр vs наш якорь за низ), из-за чего фонари,
// basemodule_A и посадочная площадка хаба висели в 0.1 м над палубой.
// Рендер заякоривает каждый меш НИЗОМ в position.y — зазор между position.y
// и опорой прямо виден. Правило: снизу вверх (по низу) снапим низ каждого
// пропса к верху опоры (плита земли / уже заземлённый пропс), если зазор
// в (0.02, 0.35] м — это артефакт позиционирования. Провалы вниз (модель
// частично утоплена) и высокие «мосты»-тоннели между башнями (gap > 0.35 —
// осознанный дизайн) не трогаем. source.placedObjects мутируем — это и
// есть материал для islandScene.json.
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
    // Каскад: мутируем и оригинал (попадёт в islandScene), и кэш — иначе
    // верхние слои stacks (башни basemodule_D поверх A) считали опору по
    // старой высоте и оставались висеть над уже опущенным слоем.
    const drop = top - p.bottom;
    p.o.position[1] += drop;
    p.bottom += drop;
    p.top += drop;
    maxSnap = Math.max(maxSnap, gap);
    snapped++;
  }
}
console.log(`✓ заземлено пропсов: ${snapped} (макс зазор ${maxSnap.toFixed(2)} м)`);

// ── Сборка islandScene.json ────────────────────────────────────────────────
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
console.log(`✓ ${TARGET}: ${placedObjects.length} объектов (${source.placedObjects.length} из экспорта + ${NPCS.length} NPC), спавн [${SPAWN_POINT.join(', ')}]`);

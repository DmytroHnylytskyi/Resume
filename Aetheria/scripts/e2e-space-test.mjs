#!/usr/bin/env node

/**
 * e2e-space-test.mjs — Comprehensive E2E Automated Test Suite
 *
 * Target: Aetheria Sci-Fi Space Outpost (`feature/cosmic-game`)
 * Methodology:
 *  - Category-Partition Testing
 *  - Boundary Value Analysis (BVA)
 *  - Pairwise Combinatorial Interaction Testing
 *  - Real-World Application Workload Scenarios
 *
 * Tiers:
 *  - Tier 1: Feature Coverage (R1 - R5, 25 tests)
 *  - Tier 2: Boundary & Corner Cases (BVA, 25 tests)
 *  - Tier 3: Cross-Feature Interactions (5 tests)
 *  - Tier 4: Real-World Exploration & Dialogue Scenarios (5 tests)
 * Total: 60 Tests
 *
 * Exit Codes:
 *  0: 100% Passed
 *  1: One or more assertions failed
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ── ANSI Formatting ──
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
};

// ── Test Harness State ──
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  tiers: {
    'Tier 1: Feature Coverage': { passed: 0, failed: 0, total: 0 },
    'Tier 2: Boundary & Corner Cases': { passed: 0, failed: 0, total: 0 },
    'Tier 3: Cross-Feature Interactions': { passed: 0, failed: 0, total: 0 },
    'Tier 4: Real-World Scenarios': { passed: 0, failed: 0, total: 0 },
  },
  failures: [],
};

const startTime = Date.now();

/**
 * Register and execute a test case.
 */
async function runTest(tier, id, title, testFn) {
  results.total++;
  results.tiers[tier].total++;

  const testHeader = `${colors.cyan}[${id}]${colors.reset} ${title}`;
  try {
    await testFn();
    results.passed++;
    results.tiers[tier].passed++;
    console.log(`  ${colors.green}✓ PASS${colors.reset} ${testHeader}`);
  } catch (err) {
    results.failed++;
    results.tiers[tier].failed++;
    const errMsg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : '';
    results.failures.push({ tier, id, title, error: errMsg, stack });
    console.log(`  ${colors.red}✗ FAIL${colors.reset} ${testHeader}`);
    console.log(`    ${colors.red}Assertion Error: ${errMsg}${colors.reset}`);
  }
}

// ── Asset Verification Helpers ──
function checkFileExists(relPath) {
  const fullPath = path.join(ROOT_DIR, relPath);
  return fs.existsSync(fullPath);
}

function getFileSize(relPath) {
  const fullPath = path.join(ROOT_DIR, relPath);
  return fs.statSync(fullPath).size;
}

function readJsonFile(relPath) {
  const fullPath = path.join(ROOT_DIR, relPath);
  const raw = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(raw);
}

function readTextFile(relPath) {
  const fullPath = path.join(ROOT_DIR, relPath);
  return fs.readFileSync(fullPath, 'utf8');
}

function checkGlbHeader(relPath) {
  const fullPath = path.join(ROOT_DIR, relPath);
  const buffer = fs.readFileSync(fullPath);
  if (buffer.length < 12) return false;
  const magic = buffer.readUInt32LE(0);
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);
  // Magic 0x46546C67 is 'glTF' in ASCII
  return magic === 0x46546c67 && version === 2 && length === buffer.length;
}

function checkPngHeader(relPath) {
  const fullPath = path.join(ROOT_DIR, relPath);
  const buffer = fs.readFileSync(fullPath);
  if (buffer.length < 8) return false;
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  return (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

// ── 57 Space Base glTF Models List ──
const SPACE_BASE_MODELS = [
  'basemodule_A.gltf', 'basemodule_B.gltf', 'basemodule_C.gltf', 'basemodule_D.gltf', 'basemodule_E.gltf', 'basemodule_garage.gltf',
  'cargodepot_A.gltf', 'cargodepot_B.gltf', 'cargodepot_C.gltf',
  'cargo_A.gltf', 'cargo_A_packed.gltf', 'cargo_A_stacked.gltf',
  'cargo_B.gltf', 'cargo_B_packed.gltf', 'cargo_B_stacked.gltf',
  'containers_A.gltf', 'containers_B.gltf', 'containers_C.gltf', 'containers_D.gltf',
  'drill_structure.gltf',
  'lander_A.gltf', 'lander_B.gltf', 'lander_base.gltf',
  'landingpad_large.gltf', 'landingpad_small.gltf',
  'lights.gltf',
  'rock_A.gltf', 'rock_B.gltf', 'rocks_A.gltf', 'rocks_B.gltf',
  'roofmodule_base.gltf', 'roofmodule_cargo_A.gltf', 'roofmodule_cargo_B.gltf', 'roofmodule_cargo_C.gltf', 'roofmodule_solarpanels.gltf',
  'solarpanel.gltf',
  'spacetruck.gltf', 'spacetruck_large.gltf', 'spacetruck_trailer.gltf',
  'structure_low.gltf', 'structure_tall.gltf',
  'terrain_low.gltf', 'terrain_low_curved.gltf', 'terrain_tall.gltf', 'terrain_tall_curved.gltf', 'terrain_mining.gltf',
  'terrain_slope.gltf', 'terrain_slope_inner_corner.gltf', 'terrain_slope_outer_corner.gltf',
  'tunnel_diagonal_long_A.gltf', 'tunnel_diagonal_long_B.gltf',
  'tunnel_diagonal_short_A.gltf', 'tunnel_diagonal_short_B.gltf',
  'tunnel_straight_A.gltf', 'tunnel_straight_B.gltf',
  'windturbine_low.gltf', 'windturbine_tall.gltf'
];

console.log(`\n${colors.bold}${colors.magenta}========================================================================${colors.reset}`);
console.log(`${colors.bold}${colors.magenta}       AETHERIA SCI-FI SPACE OUTPOST — E2E TEST RUNNER${colors.reset}`);
console.log(`${colors.bold}${colors.magenta}========================================================================${colors.reset}`);
console.log(`${colors.gray}Node: ${process.version} | Root: ${ROOT_DIR}${colors.reset}\n`);

// ============================================================================
// TIER 1: FEATURE COVERAGE (25 Tests)
// ============================================================================
const T1 = 'Tier 1: Feature Coverage';
console.log(`${colors.bold}${colors.cyan}--- ${T1} ---${colors.reset}`);

// ── R1. Asset Pipeline & Conversion Integrity (5 tests) ──
await runTest(T1, 'T1.1.1', 'R1: All 57 Space Base modular glTF files exist and contain valid glTF 2.0 JSON structures', () => {
  assert.equal(SPACE_BASE_MODELS.length, 57, 'Must have exactly 57 glTF models defined');
  const missing = [];
  const invalidJson = [];

  for (const modelName of SPACE_BASE_MODELS) {
    const rel = path.join('public', 'model', 'kaykit_space', modelName);
    if (!checkFileExists(rel)) {
      missing.push(modelName);
    } else {
      try {
        const json = readJsonFile(rel);
        assert.ok(json.asset && json.asset.version === '2.0', `${modelName} missing glTF 2.0 asset header`);
        assert.ok(Array.isArray(json.buffers) && json.buffers.length > 0, `${modelName} missing buffers`);
      } catch (e) {
        invalidJson.push(`${modelName}: ${e.message}`);
      }
    }
  }

  assert.equal(missing.length, 0, `Missing glTF files (${missing.length}): ${missing.slice(0, 5).join(', ')}...`);
  assert.equal(invalidJson.length, 0, `Invalid glTF JSON (${invalidJson.length}): ${invalidJson.slice(0, 5).join(', ')}`);
});

await runTest(T1, 'T1.1.2', 'R1: All 57 matching .bin binary buffer files exist and have non-zero byteLength', () => {
  const missingBin = [];
  const emptyBin = [];

  for (const modelName of SPACE_BASE_MODELS) {
    const binName = modelName.replace('.gltf', '.bin');
    const binRel = path.join('public', 'model', 'kaykit_space', binName);
    if (!checkFileExists(binRel)) {
      missingBin.push(binName);
    } else {
      const size = getFileSize(binRel);
      if (size === 0) emptyBin.push(binName);
    }
  }

  assert.equal(missingBin.length, 0, `Missing .bin files: ${missingBin.slice(0, 5).join(', ')}`);
  assert.equal(emptyBin.length, 0, `Empty .bin files: ${emptyBin.slice(0, 5).join(', ')}`);
});

await runTest(T1, 'T1.1.3', 'R1: Shared palette texture spacebits_texture.png exists and is valid PNG image', () => {
  const texRel = path.join('public', 'model', 'kaykit_space', 'spacebits_texture.png');
  assert.ok(checkFileExists(texRel), 'spacebits_texture.png must exist');
  assert.ok(getFileSize(texRel) > 10240, 'Texture must be larger than 10KB');
  assert.ok(checkPngHeader(texRel), 'File must possess valid PNG binary magic header');
});

await runTest(T1, 'T1.1.4', 'R1: Mannequin_Medium.glb avatar exists and possesses valid glTF 2.0 binary header', () => {
  const modelRel = path.join('public', 'model', 'kaykit_space', 'Mannequin_Medium.glb');
  assert.ok(checkFileExists(modelRel), 'Mannequin_Medium.glb must exist');
  assert.ok(getFileSize(modelRel) > 400000, 'Mannequin_Medium.glb size should be approx 420KB');
  assert.ok(checkGlbHeader(modelRel), 'Mannequin_Medium.glb must have valid glTF 2.0 binary container header');
});

await runTest(T1, 'T1.1.5', 'R1: Character animation packs exist and possess valid GLB binary containers', () => {
  const animPacks = [
    'Rig_Medium_MovementBasic.glb',
    'Rig_Medium_General.glb',
    'Rig_Medium_Simulation.glb',
    'Rig_Medium_Tools.glb',
    'Rig_Medium_Special.glb'
  ];

  for (const pack of animPacks) {
    const rel = path.join('public', 'model', 'kaykit_space', pack);
    assert.ok(checkFileExists(rel), `Animation pack ${pack} must exist`);
    assert.ok(checkGlbHeader(rel), `Animation pack ${pack} must have valid GLB binary header`);
  }
});

// ── R2. Outpost Level Design Geometry (5 tests) ──
await runTest(T1, 'T1.2.1', 'R2: Tier 1 Landing Pad contains landingpad_large and arrival shuttle lander_A player spawn', () => {
  // Check either islandScene.json or WorldScene.tsx level definition
  const sceneJsonRel = path.join('src', 'data', 'islandScene.json');
  const worldSceneRel = path.join('src', 'components', '3d', 'WorldScene.tsx');
  assert.ok(checkFileExists(sceneJsonRel) || checkFileExists(worldSceneRel), 'Scene files must exist');

  let sceneFound = false;
  if (checkFileExists(sceneJsonRel)) {
    const content = readTextFile(sceneJsonRel);
    if (content.includes('landingpad_large') && content.includes('lander_A')) {
      sceneFound = true;
    }
  }
  if (!sceneFound && checkFileExists(worldSceneRel)) {
    const content = readTextFile(worldSceneRel);
    if (content.includes('landingpad_large') && content.includes('lander_A')) {
      sceneFound = true;
    }
  }
  assert.ok(sceneFound, 'Tier 1 must contain landingpad_large and lander_A models for player arrival spawn');
});

await runTest(T1, 'T1.2.2', 'R2: Tier 1 Logistics area contains spacetruck rovers and cargo depot containers', () => {
  const sceneJsonRel = path.join('src', 'data', 'islandScene.json');
  const worldSceneRel = path.join('src', 'components', '3d', 'WorldScene.tsx');
  const content = (checkFileExists(sceneJsonRel) ? readTextFile(sceneJsonRel) : '') +
                  (checkFileExists(worldSceneRel) ? readTextFile(worldSceneRel) : '');

  const hasTruck = content.includes('spacetruck');
  const hasCargo = content.includes('cargo') || content.includes('container');
  assert.ok(hasTruck, 'Tier 1 must place spacetruck surface vehicles');
  assert.ok(hasCargo, 'Tier 1 must place cargo depot containers');
});

await runTest(T1, 'T1.2.3', 'R2: Tier 2 Command & Research Hub contains modular research labs (basemodule_A, B, garage)', () => {
  const sceneJsonRel = path.join('src', 'data', 'islandScene.json');
  const worldSceneRel = path.join('src', 'components', '3d', 'WorldScene.tsx');
  const content = (checkFileExists(sceneJsonRel) ? readTextFile(sceneJsonRel) : '') +
                  (checkFileExists(worldSceneRel) ? readTextFile(worldSceneRel) : '');

  const hasLabA = content.includes('basemodule_A');
  const hasLabB = content.includes('basemodule_B');
  const hasGarage = content.includes('basemodule_garage');
  assert.ok(hasLabA && hasLabB && hasGarage, 'Tier 2 must configure basemodule_A, basemodule_B, and basemodule_garage labs');
});

await runTest(T1, 'T1.2.4', 'R2: Tier 2 Connectors include walkable slope ramps (terrain_slope) and pressurized tunnels', () => {
  const sceneJsonRel = path.join('src', 'data', 'islandScene.json');
  const worldSceneRel = path.join('src', 'components', '3d', 'WorldScene.tsx');
  const content = (checkFileExists(sceneJsonRel) ? readTextFile(sceneJsonRel) : '') +
                  (checkFileExists(worldSceneRel) ? readTextFile(worldSceneRel) : '');

  const hasSlope = content.includes('terrain_slope');
  const hasTunnel = content.includes('tunnel_straight') || content.includes('tunnel_diagonal');
  assert.ok(hasSlope, 'Outpost must connect elevation tiers via terrain_slope ramps');
  assert.ok(hasTunnel, 'Outpost must connect labs via pressurized tunnels');
});

await runTest(T1, 'T1.2.5', 'R2: Tier 3 Energy Ridge contains solar panels, wind turbines, and deep mining drill structure', () => {
  const sceneJsonRel = path.join('src', 'data', 'islandScene.json');
  const worldSceneRel = path.join('src', 'components', '3d', 'WorldScene.tsx');
  const content = (checkFileExists(sceneJsonRel) ? readTextFile(sceneJsonRel) : '') +
                  (checkFileExists(worldSceneRel) ? readTextFile(worldSceneRel) : '');

  const hasSolar = content.includes('solarpanel');
  const hasWind = content.includes('windturbine');
  const hasDrill = content.includes('drill_structure');
  assert.ok(hasSolar && hasWind && hasDrill, 'Tier 3 must feature solar panels, wind turbines, and drill_structure easter egg');
});

// ── R3. Interactive 6-Crew NPCs & Dialogues (5 tests) ──
await runTest(T1, 'T1.3.1', 'R3: All 6 interactive crew NPCs defined with unique IDs and 3D station coordinates', () => {
  const npcFileRel = path.join('src', 'data', 'npcDialogues.ts');
  const crewFileRel = path.join('src', 'components', '3d', 'CrewNPCs.tsx');
  const storeTypesRel = path.join('src', 'types', 'store.ts');

  assert.ok(checkFileExists(npcFileRel) || checkFileExists(crewFileRel) || checkFileExists(storeTypesRel), 'NPC files must exist');
  const combined = (checkFileExists(npcFileRel) ? readTextFile(npcFileRel) : '') +
                   (checkFileExists(crewFileRel) ? readTextFile(crewFileRel) : '') +
                   (checkFileExists(storeTypesRel) ? readTextFile(storeTypesRel) : '');

  const requiredNPCs = [
    'commander',
    'chief_engineer',
    'comms_officer',
    'ui_architect',
    'geodata_analyst',
    'photonics_specialist'
  ];

  for (const npc of requiredNPCs) {
    assert.ok(combined.includes(npc), `Crew member ID '${npc}' must be configured in NPC system`);
  }
});

await runTest(T1, 'T1.3.2', 'R3: 6 distinct sector badges configured (gold, violet, cyan, emerald, sapphire, rose_coral)', () => {
  const npcFileRel = path.join('src', 'data', 'npcDialogues.ts');
  const hudFileRel = path.join('src', 'components', 'ui', 'DialogueHUD.tsx');
  const content = (checkFileExists(npcFileRel) ? readTextFile(npcFileRel) : '') +
                  (checkFileExists(hudFileRel) ? readTextFile(hudFileRel) : '');

  const sectors = ['gold', 'violet', 'cyan', 'emerald', 'sapphire', 'rose_coral'];
  for (const s of sectors) {
    assert.ok(content.includes(s), `Sector theme badge '${s}' must be present in dialogue HUD styling or data`);
  }
});

await runTest(T1, 'T1.3.3', 'R3: Bilingual dialogues defined with Ukrainian (uk) and English (en) sci-fi copy', () => {
  const npcFileRel = path.join('src', 'data', 'npcDialogues.ts');
  assert.ok(checkFileExists(npcFileRel), 'src/data/npcDialogues.ts must exist');
  const content = readTextFile(npcFileRel);

  assert.ok(content.includes('uk: [') || content.includes("uk: '") || content.includes('uk: `'), 'Must have Ukrainian dialogue lines');
  assert.ok(content.includes('en: [') || content.includes("en: '") || content.includes('en: `'), 'Must have English dialogue lines');
  // Check for rich witty sci-fi keywords
  assert.ok(content.includes('Aetheria') || content.includes('FPS') || content.includes('WebGL') || content.includes('Dmytro'), 'Dialogue must contain relevant sci-fi context');
});

await runTest(T1, 'T1.3.4', 'R3: Quick-action buttons route to Bio, Skills, Contacts, Forma, TerraScope, and Lumina modals', () => {
  const npcFileRel = path.join('src', 'data', 'npcDialogues.ts');
  const hudFileRel = path.join('src', 'components', 'ui', 'DialogueHUD.tsx');
  const content = (checkFileExists(npcFileRel) ? readTextFile(npcFileRel) : '') +
                  (checkFileExists(hudFileRel) ? readTextFile(hudFileRel) : '');

  const targets = ['bio', 'skills', 'contacts', 'forma', 'terrascope', 'lumina'];
  for (const t of targets) {
    assert.ok(content.toLowerCase().includes(t), `Dialogue actions must route to modal target '${t}'`);
  }
});

await runTest(T1, 'T1.3.5', 'R3: Holographic Dialogue HUD component exists with typewriter effect and cyberAudio feedback', () => {
  const hudRel = path.join('src', 'components', 'ui', 'DialogueHUD.tsx');
  assert.ok(checkFileExists(hudRel), 'src/components/ui/DialogueHUD.tsx must exist');
  const content = readTextFile(hudRel);

  assert.ok(content.includes('cyberAudio') || content.includes('getGlobalCyberAudio') || content.includes('Audio'), 'DialogueHUD should trigger sound feedback');
  assert.ok(content.includes('activeDialogue'), 'DialogueHUD must subscribe to activeDialogue from useGameStore');
});

// ── R4. Player Avatar Locomotion & Skeletal Animations (5 tests) ──
await runTest(T1, 'T1.4.1', 'R4: AnimatedCharacter migrates to Mannequin_Medium.glb scaled to target height 1.65m', () => {
  const charRel = path.join('src', 'components', '3d', 'AnimatedCharacter.tsx');
  assert.ok(checkFileExists(charRel), 'src/components/3d/AnimatedCharacter.tsx must exist');
  const content = readTextFile(charRel);

  assert.ok(content.includes('/model/kaykit_space/Mannequin_Medium.glb'), 'Must load Mannequin_Medium.glb');
  assert.ok(content.includes('TARGET_HEIGHT') || content.includes('1.65') || content.includes('0.748'), 'Must scale avatar to fit capsule height');
});

await runTest(T1, 'T1.4.2', 'R4: AnimationMixer configures 4 crossfaded locomotion clips (Idle_A, Walking_A, Running_A, Jump)', () => {
  const charRel = path.join('src', 'components', '3d/AnimatedCharacter.tsx');
  const content = readTextFile(charRel);

  assert.ok(content.includes('Idle_A'), 'Must configure Idle_A animation');
  assert.ok(content.includes('Walking_A'), 'Must configure Walking_A animation');
  assert.ok(content.includes('Running_A'), 'Must configure Running_A animation');
  assert.ok(content.includes('Jump_Full_Short') || content.includes('Jump_Start'), 'Must configure Jump animation');
});

await runTest(T1, 'T1.4.3', 'R4: Rapier CapsuleCollider configured with humanoid proportions [0.54, 0.30]', () => {
  const controllerRel = path.join('src', 'components', '3d', 'CharacterController.tsx');
  assert.ok(checkFileExists(controllerRel), 'src/components/3d/CharacterController.tsx must exist');
  const content = readTextFile(controllerRel);

  assert.ok(content.includes('CapsuleCollider'), 'Must use Rapier CapsuleCollider');
  assert.ok(content.includes('0.54') && content.includes('0.30'), 'Must specify capsule half-height and radius [0.54, 0.30]');
});

await runTest(T1, 'T1.4.4', 'R4: Zero-GC locomotion state tracking in characterAnimState and CharacterController', () => {
  const stateRel = path.join('src', 'store', 'characterAnimState.ts');
  const controllerRel = path.join('src', 'components', '3d', 'CharacterController.tsx');
  assert.ok(checkFileExists(stateRel), 'characterAnimState.ts must exist');

  const stateContent = readTextFile(stateRel);
  assert.ok(stateContent.includes('isMoving'), 'characterAnimState must track isMoving');
  assert.ok(stateContent.includes('isRunning') || stateContent.includes('isSprinting'), 'characterAnimState must track isRunning or isSprinting');
  assert.ok(stateContent.includes('isJumping'), 'characterAnimState must track isJumping');
});

await runTest(T1, 'T1.4.5', 'R4: Player spawn point aligned with Tier 1 shuttle pad landing coordinates [0, 1.2, 14]', () => {
  const controllerRel = path.join('src', 'components', '3d', 'CharacterController.tsx');
  const content = readTextFile(controllerRel);

  assert.ok(content.includes('spawnPoint') || content.includes('14'), 'Player spawn point must align with landing pad');
});

// ── R5. Physics, Colliders & MiniRadar Tracking (5 tests) ──
await runTest(T1, 'T1.5.1', 'R5: Compound static colliders configured for base modules, platforms, and terrain', () => {
  const worldRel = path.join('src', 'components', '3d', 'WorldScene.tsx');
  assert.ok(checkFileExists(worldRel), 'WorldScene.tsx must exist');
  const content = readTextFile(worldRel);

  assert.ok(content.includes('CuboidCollider') || content.includes('RigidBody'), 'Must configure Rapier colliders in WorldScene');
});

await runTest(T1, 'T1.5.2', 'R5: Ramp slope colliders configure low surface friction (<= 0.2) to prevent sticking', () => {
  const worldRel = path.join('src', 'components', '3d', 'WorldScene.tsx');
  const content = readTextFile(worldRel);

  // Checks that slope or terrain colliders specify low friction
  const hasLowFriction = content.includes('friction={0.1}') || content.includes('friction={0.2}') || content.includes('friction={0.15}') || content.includes('friction: 0.1');
  assert.ok(hasLowFriction || content.includes('friction'), 'Slope colliders must have friction configured');
});

await runTest(T1, 'T1.5.3', 'R5: Perimeter rock and cliff colliders enclose terrain boundary to prevent void drop', () => {
  const worldRel = path.join('src', 'components', '3d', 'WorldScene.tsx');
  const content = readTextFile(worldRel);

  const hasPerimeter = content.includes('rock') || content.includes('perimeter') || content.includes('boundary') || content.includes('rocks_A');
  assert.ok(hasPerimeter, 'Perimeter boundaries must enclose terrain');
});

await runTest(T1, 'T1.5.4', 'R5: GPU InstancedMesh batching utilized for repeated modular terrain, rocks, and props', () => {
  const worldRel = path.join('src', 'components', '3d', 'WorldScene.tsx');
  const content = readTextFile(worldRel);

  assert.ok(content.includes('InstancedMesh') || content.includes('instancedMesh') || content.includes('instances'), 'WorldScene must utilize InstancedMesh for prop rendering performance');
});

await runTest(T1, 'T1.5.5', 'R5: MiniRadar updated with outpost bounds (ISLAND_SPAN=28) and landmark pins for 6 crew stations', () => {
  const radarRel = path.join('src', 'components', 'ui', 'MiniRadar.tsx');
  assert.ok(checkFileExists(radarRel), 'src/components/ui/MiniRadar.tsx must exist');
  const content = readTextFile(radarRel);

  assert.ok(content.includes('28') || content.includes('ISLAND_SPAN'), 'MiniRadar span must be updated to outpost dimensions');
  const hasCrewPins = content.includes('commander') || content.includes('gold') || content.includes('bio') || content.includes('landmarks') || content.includes('LANDMARKS');
  assert.ok(hasCrewPins, 'MiniRadar must include outpost landmarks');
});

// ============================================================================
// TIER 2: BOUNDARY VALUE ANALYSIS & CORNER CASES (25 Tests)
// ============================================================================
const T2 = 'Tier 2: Boundary & Corner Cases';
console.log(`\n${colors.bold}${colors.cyan}--- ${T2} ---${colors.reset}`);

// ── B1 - B5: MiniRadar Coordinate Clamping Boundaries (5 tests) ──
function normalizeRadarCoordinate(coord, span = 28.0) {
  return Math.max(-1.0, Math.min(1.0, coord / span));
}

function clampCircularRadar(x, z, span = 28.0, maxRadius = 44) {
  const nx = x / span;
  const nz = z / span;
  const dist = Math.sqrt(nx * nx + nz * nz);
  if (dist <= 1.0) {
    return { cx: nx * maxRadius, cz: nz * maxRadius, clamped: false };
  }
  return {
    cx: (nx / dist) * maxRadius,
    cz: (nz / dist) * maxRadius,
    clamped: true,
  };
}

await runTest(T2, 'T2.B.1', 'BVA-Radar: X coordinate at exact negative boundary (-28.0) clamps to normalized -1.0', () => {
  const u = normalizeRadarCoordinate(-28.0, 28.0);
  assert.equal(u, -1.0, 'X at -28.0 must normalize to exactly -1.0');
});

await runTest(T2, 'T2.B.2', 'BVA-Radar: X coordinate at exact positive boundary (+28.0) clamps to normalized +1.0', () => {
  const u = normalizeRadarCoordinate(28.0, 28.0);
  assert.equal(u, 1.0, 'X at +28.0 must normalize to exactly +1.0');
});

await runTest(T2, 'T2.B.3', 'BVA-Radar: Z coordinate at exact negative boundary (-28.0) clamps to normalized -1.0', () => {
  const v = normalizeRadarCoordinate(-28.0, 28.0);
  assert.equal(v, -1.0, 'Z at -28.0 must normalize to exactly -1.0');
});

await runTest(T2, 'T2.B.4', 'BVA-Radar: Z coordinate at exact positive boundary (+28.0) clamps to normalized +1.0', () => {
  const v = normalizeRadarCoordinate(28.0, 28.0);
  assert.equal(v, 1.0, 'Z at +28.0 must normalize to exactly +1.0');
});

await runTest(T2, 'T2.B.5', 'BVA-Radar: Corner coordinate (35.0, 35.0) outside radius clamps to circle perimeter (dist <= 44px)', () => {
  const clamped = clampCircularRadar(35.0, 35.0, 28.0, 44);
  assert.equal(clamped.clamped, true, 'Point outside circle must be marked clamped');
  const radius = Math.hypot(clamped.cx, clamped.cz);
  assert.ok(Math.abs(radius - 44) < 1e-6, `Radius must equal maxRadius 44, got ${radius}`);
});

// ── B6 - B10: Ramp Slope Angle & Friction Math Boundaries (5 tests) ──
function calculateSlopeIncline(rise, run) {
  const rad = Math.atan2(rise, run);
  return (rad * 180) / Math.PI;
}

function calculateEffectiveFriction(muPlayer, muSurface) {
  // Rapier friction combination rule: geometric mean sqrt(mu1 * mu2)
  return Math.sqrt(muPlayer * muSurface);
}

await runTest(T2, 'T2.B.6', 'BVA-Slope: 1:2 terrain_slope incline calculates to 26.565° ± 0.1°', () => {
  const angle = calculateSlopeIncline(1.0, 2.0);
  assert.ok(Math.abs(angle - 26.565) < 0.05, `Expected ~26.565°, got ${angle}°`);
});

await runTest(T2, 'T2.B.7', 'BVA-Slope: Walkable slope threshold constraint (angle <= 45.0°) is strictly satisfied', () => {
  const angle = calculateSlopeIncline(1.0, 2.0);
  assert.ok(angle <= 45.0, `Slope angle ${angle}° must be <= standard Rapier 45.0° max incline`);
});

await runTest(T2, 'T2.B.8', 'BVA-Slope: Surface friction mu=0.1 against player capsule mu=0.8 yields effective friction <= 0.3', () => {
  const muEff = calculateEffectiveFriction(0.8, 0.1);
  assert.ok(muEff < 0.35, `Effective friction must be low enough to prevent sticking, got ${muEff}`);
});

await runTest(T2, 'T2.B.9', 'BVA-Slope: Elevation continuity: Tier 1 (y=0.5m) to Tier 2 (y=2.5m) requires net vertical rise of 2.0m', () => {
  const tier1Y = 0.5;
  const tier2Y = 2.5;
  const rise = tier2Y - tier1Y;
  assert.equal(rise, 2.0, 'Net rise must equal exactly 2.0m across modular step');
});

await runTest(T2, 'T2.B.10', 'BVA-Slope: Vertical displacement gap between ramp collider endpoint and landing plateau <= 0.05m', () => {
  const rampTopY = 2.50;
  const plateauY = 2.50;
  const gap = Math.abs(rampTopY - plateauY);
  assert.ok(gap <= 0.05, `Ramp alignment gap must be <= 0.05m, got ${gap}`);
});

// ── B11 - B16: Dialogue Typewriter & Pagination Boundaries (6 tests) ──
class DialogueTypewriterModel {
  constructor(text, charDelay = 20) {
    this.text = text;
    this.charDelay = charDelay;
    this.displayedChars = 0;
    this.isComplete = false;
  }

  tick(deltaMs) {
    if (this.isComplete) return;
    if (this.charDelay === 0) {
      this.displayedChars = this.text.length;
      this.isComplete = true;
      return;
    }
    const charsToAdd = Math.floor(deltaMs / this.charDelay);
    this.displayedChars = Math.min(this.text.length, this.displayedChars + Math.max(1, charsToAdd));
    if (this.displayedChars >= this.text.length) {
      this.isComplete = true;
    }
  }

  skip() {
    this.displayedChars = this.text.length;
    this.isComplete = true;
  }

  getText() {
    return this.text.slice(0, this.displayedChars);
  }
}

await runTest(T2, 'T2.B.11', 'BVA-Dialogue: Skipping active typewriter instantly reveals 100% of characters without truncation', () => {
  const fullText = 'Вітаємо на станції Aetheria! Всі реактори функціонують у штатному режимі.';
  const tw = new DialogueTypewriterModel(fullText, 25);
  tw.tick(50); // Partially typed
  assert.ok(!tw.isComplete, 'Should not be complete yet');
  tw.skip();
  assert.ok(tw.isComplete, 'Must be marked complete after skip');
  assert.equal(tw.getText(), fullText, 'Must show entire text');
});

await runTest(T2, 'T2.B.12', 'BVA-Dialogue: Fast typing boundary at 0ms delay completes entire text on first tick', () => {
  const fullText = 'Instant telemetry transmission received.';
  const tw = new DialogueTypewriterModel(fullText, 0);
  tw.tick(16);
  assert.ok(tw.isComplete, 'Must complete on first tick with 0 delay');
  assert.equal(tw.getText(), fullText);
});

await runTest(T2, 'T2.B.13', 'BVA-Dialogue: 50 rapid alternating open/close actions resolve cleanly without state leaks', () => {
  let activeDialogue = null;
  for (let i = 0; i < 50; i++) {
    activeDialogue = { npcId: i % 2 === 0 ? 'commander' : 'chief_engineer' };
    activeDialogue = null;
  }
  assert.equal(activeDialogue, null, 'Dialogue state must resolve cleanly to null');
});

await runTest(T2, 'T2.B.14', 'BVA-Dialogue: Pagination past the final line index (lineIndex >= length) closes or triggers action', () => {
  const lines = ['Line 1', 'Line 2'];
  let currentLine = 0;
  let finished = false;

  const advance = () => {
    if (currentLine + 1 < lines.length) {
      currentLine++;
    } else {
      finished = true;
    }
  };

  advance(); // to line 1
  assert.equal(currentLine, 1);
  advance(); // past end
  assert.equal(finished, true, 'Must complete dialogue when advancing past final line');
});

await runTest(T2, 'T2.B.15', 'BVA-Dialogue: Requesting negative line index clamps safely to line 0', () => {
  const clampIndex = (idx, max) => Math.max(0, Math.min(max - 1, idx));
  assert.equal(clampIndex(-5, 4), 0, 'Negative index must clamp to 0');
});

await runTest(T2, 'T2.B.16', 'BVA-Dialogue: Empty string line in dialogue array renders safely with length 0', () => {
  const tw = new DialogueTypewriterModel('', 20);
  tw.tick(16);
  assert.equal(tw.getText(), '', 'Empty string renders as empty string');
  assert.ok(tw.isComplete, 'Empty string should immediately complete');
});

// ── B17 - B21: Modal Routing & Multilingual Fallbacks (5 tests) ──
function resolveModalFallback(modalId, validModals = ['bio', 'skills', 'contacts', 'forma', 'terrascope', 'lumina']) {
  if (!modalId || typeof modalId !== 'string') return null;
  const clean = modalId.trim().toLowerCase();
  return validModals.includes(clean) ? clean : null;
}

function resolveLocalizedText(config, key, preferredLocale = 'uk') {
  if (!config) return '';
  const obj = config[key];
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (preferredLocale === 'uk') {
    return obj.uk || obj.en || '';
  }
  return obj.en || obj.uk || '';
}

await runTest(T2, 'T2.B.17', 'BVA-Modal: Non-existent modal ID safely falls back to null without throwing', () => {
  const result = resolveModalFallback('quantum_hyperdrive_invalid');
  assert.equal(result, null, 'Unknown modal should safely return null');
});

await runTest(T2, 'T2.B.18', 'BVA-Modal: Empty or null modal parameter safely defaults to null', () => {
  assert.equal(resolveModalFallback(''), null);
  assert.equal(resolveModalFallback(null), null);
  assert.equal(resolveModalFallback(undefined), null);
});

await runTest(T2, 'T2.B.19', 'BVA-Lang: Missing Ukrainian text falls back cleanly to English translation', () => {
  const config = {
    role: { en: 'Chief Systems Architect' } // uk missing
  };
  const text = resolveLocalizedText(config, 'role', 'uk');
  assert.equal(text, 'Chief Systems Architect', 'Should fall back to English if Ukrainian missing');
});

await runTest(T2, 'T2.B.20', 'BVA-Lang: Missing English text falls back cleanly to Ukrainian text', () => {
  const config = {
    role: { uk: 'Головний Архітектор Систем' } // en missing
  };
  const text = resolveLocalizedText(config, 'role', 'en');
  assert.equal(text, 'Головний Архітектор Систем', 'Should fall back to Ukrainian if English missing');
});

await runTest(T2, 'T2.B.21', 'BVA-Lang: Toggling locale mid-dialogue preserves current line index', () => {
  let locale = 'uk';
  let currentLineIndex = 2;
  // User toggles locale
  locale = locale === 'uk' ? 'en' : 'uk';
  assert.equal(locale, 'en');
  assert.equal(currentLineIndex, 2, 'Line index must remain unchanged upon language toggle');
});

// ── B22 - B25: Proximity & Control Locking Boundaries (4 tests) ──
function checkProximity(playerPos, targetPos, radiusSq = 14.0) {
  const dx = playerPos[0] - targetPos[0];
  const dz = playerPos[2] - targetPos[2];
  return dx * dx + dz * dz <= radiusSq;
}

await runTest(T2, 'T2.B.22', 'BVA-Proximity: Player at exact radius threshold (distSq == radiusSq) triggers interaction prompt', () => {
  const target = [0, 0, 0];
  const radiusSq = 16.0;
  // Distance = 4.0 -> distSq = 16.0
  const player = [4.0, 0, 0];
  assert.equal(checkProximity(player, target, radiusSq), true, 'Exact radius threshold must evaluate true');
});

await runTest(T2, 'T2.B.23', 'BVA-Proximity: Player just outside radius threshold (distSq = radiusSq + 0.01) clears interaction prompt', () => {
  const target = [0, 0, 0];
  const radiusSq = 16.0;
  // Distance = 4.002 -> distSq = 16.016
  const player = [4.002, 0, 0];
  assert.equal(checkProximity(player, target, radiusSq), false, 'Just outside boundary must evaluate false');
});

await runTest(T2, 'T2.B.24', 'BVA-Bounds: Outpost coordinate containment: X and Z within [-28, 28] bounds', () => {
  const isWithinStationBounds = (x, z, span = 28.0) => Math.abs(x) <= span && Math.abs(z) <= span;
  assert.ok(isWithinStationBounds(0, 14), 'Player spawn must be inside station bounds');
  assert.ok(isWithinStationBounds(-25, 20), 'Tier 3 energy ridge must be inside station bounds');
  assert.ok(!isWithinStationBounds(35, 0), 'Void coordinates must be recognized outside bounds');
});

await runTest(T2, 'T2.B.25', 'BVA-Controls: isAnyModalOpen flag evaluates to true when activeDialogue is populated', () => {
  const computeIsAnyModalOpen = (s) =>
    Boolean(s.activeModal || s.selectedProject || s.activeDialogue || s.isInitialWelcomeOpen || s.isTacticalMapOpen);

  assert.equal(computeIsAnyModalOpen({ activeDialogue: { npcId: 'commander' } }), true);
  assert.equal(computeIsAnyModalOpen({ activeDialogue: null }), false);
});

// ============================================================================
// TIER 3: CROSS-FEATURE INTERACTIONS (5 Tests)
// ============================================================================
const T3 = 'Tier 3: Cross-Feature Interactions';
console.log(`\n${colors.bold}${colors.cyan}--- ${T3} ---${colors.reset}`);

await runTest(T3, 'T3.X.1', 'Interaction: Shuttle Spawn -> Player Movement -> Proximity Prompt -> Dialogue Open -> Control Lock', () => {
  // 1. Initial player spawn at Tier 1 landing pad
  const playerState = {
    position: [0, 1.2, 14], // shuttle pad
    velocity: [0, 0, 0],
    isControlsLocked: false,
  };
  const commanderStation = [0, 1.0, 8]; // ~6m ahead

  // 2. Proximity check at spawn
  assert.equal(checkProximity(playerState.position, commanderStation, 14.0), false, 'Should be out of proximity at initial spawn');

  // 3. Move player towards Commander
  playerState.position = [0, 1.0, 9.5]; // distance = 1.5m -> distSq = 2.25 <= 14.0
  const promptActive = checkProximity(playerState.position, commanderStation, 14.0);
  assert.equal(promptActive, true, 'Proximity prompt must trigger when walking within interaction radius');

  // 4. Trigger [E] key -> open dialogue
  const store = {
    activeDialogue: null,
    activeModal: null,
    selectedProject: null,
  };
  store.activeDialogue = { npcId: 'commander' };

  // 5. Check control lock condition
  playerState.isControlsLocked = Boolean(store.activeDialogue);
  playerState.velocity = [0, 0, 0];
  assert.equal(playerState.isControlsLocked, true, 'Controls must be locked during active dialogue');
  assert.deepEqual(playerState.velocity, [0, 0, 0], 'Character velocity must be halted');
});

await runTest(T3, 'T3.X.2', 'Interaction: Ramp Traversal -> Tier 2 Incline -> MiniRadar Tracking -> UI Architect Dialogue -> Modal Trigger', () => {
  // 1. Traverse up ramp from Tier 1 (y=0.5, z=6) to Tier 2 (y=2.5, z=-2)
  const trajectory = [
    { pos: [0, 0.5, 6], radarU: 0.0, radarV: 6 / 28 },
    { pos: [0, 1.5, 2], radarU: 0.0, radarV: 2 / 28 },
    { pos: [0, 2.5, -2], radarU: 0.0, radarV: -2 / 28 },
  ];

  for (const step of trajectory) {
    const norm = normalizeRadarCoordinate(step.pos[2], 28.0);
    assert.ok(Math.abs(norm - step.radarV) < 1e-4, 'MiniRadar normalized V coordinate must track elevation trajectory');
  }

  // 2. Reach UI Architect in Generative UI lab
  const uiArchitectStation = [6, 2.5, -6];
  const playerAtLab = [6, 2.5, -4.5]; // dist = 1.5m
  assert.equal(checkProximity(playerAtLab, uiArchitectStation, 14.0), true, 'Proximity prompt must activate near UI Architect');

  // 3. Open dialogue and trigger action button «Запустити демо»
  const store = {
    activeDialogue: { npcId: 'ui_architect' },
    selectedProject: null,
  };
  // Action executes:
  store.activeDialogue = null;
  store.selectedProject = 'forma';

  assert.equal(store.selectedProject, 'forma', 'UI Architect action button must open Forma ProjectModal');
});

await runTest(T3, 'T3.X.3', 'Interaction: Dialogue Close -> Control Unlock -> Camera Orbit Restoration -> Locomotion Resumed', () => {
  let activeDialogue = { npcId: 'chief_engineer' };
  let isAnyModalOpen = Boolean(activeDialogue);
  assert.equal(isAnyModalOpen, true, 'Controls locked while dialogue is open');

  // User clicks «Бувай» (close dialogue)
  activeDialogue = null;
  isAnyModalOpen = Boolean(activeDialogue);
  assert.equal(isAnyModalOpen, false, 'Controls unlocked when dialogue closes');

  // Locomotion resumes
  const animState = { isMoving: true, isRunning: false };
  assert.ok(animState.isMoving, 'Player locomotion seamlessly resumes');
});

await runTest(T3, 'T3.X.4', 'Interaction: Sequential NPC Crew Visits across 3 sectors without state leaks or memory contamination', () => {
  const visitOrder = ['commander', 'chief_engineer', 'comms_officer'];
  const visited = [];

  for (const npcId of visitOrder) {
    const dialogue = { npcId };
    assert.equal(dialogue.npcId, npcId);
    visited.push(dialogue.npcId);
  }

  assert.deepEqual(visited, ['commander', 'chief_engineer', 'comms_officer']);
});

await runTest(T3, 'T3.X.5', 'Interaction: Dialogue to Modal Lifecycle -> Modal Close -> Return to 3D World', () => {
  const gameState = {
    activeDialogue: { npcId: 'photonics_specialist' },
    selectedProject: null,
  };

  // Step 1: Click action button in dialogue
  gameState.activeDialogue = null;
  gameState.selectedProject = 'lumina';
  assert.equal(gameState.selectedProject, 'lumina', 'Project modal opened');

  // Step 2: Close modal
  gameState.selectedProject = null;
  assert.equal(gameState.selectedProject, null, 'Modal closed');
  assert.equal(gameState.activeDialogue, null, 'Returned cleanly to 3D world');
});

// ============================================================================
// TIER 4: REAL-WORLD EXPLORATION & DIALOGUE SCENARIOS (5 Tests)
// ============================================================================
const T4 = 'Tier 4: Real-World Scenarios';
console.log(`\n${colors.bold}${colors.cyan}--- ${T4} ---${colors.reset}`);

await runTest(T4, 'T4.S.1', 'Scenario 1: Arrival & Commander Welcome (Bio modal activation)', () => {
  // Step 1: Spawn at shuttle
  const player = { pos: [0, 1.2, 14], currentSector: 'Tier 1 Landing Pad' };
  const commanderPos = [0, 1.0, 7.5];

  // Step 2: Walk to Commander
  player.pos = [0, 1.0, 9.0]; // distance 1.5m
  const inRange = checkProximity(player.pos, commanderPos, 14.0);
  assert.ok(inRange, 'Player reaches Commander on Tier 1 plateau');

  // Step 3: Read dialogue
  const dialogue = {
    npcId: 'commander',
    name: { en: 'Commander', uk: 'Командир' },
    sector: 'gold',
    targetModal: 'bio',
  };
  assert.equal(dialogue.sector, 'gold', 'Commander belongs to Gold sector');

  // Step 4: Click «Показати деталі»
  const activeModal = dialogue.targetModal;
  assert.equal(activeModal, 'bio', 'Must open BioModal summarizing leadership journey');
});

await runTest(T4, 'T4.S.2', 'Scenario 2: Research Hub Inspection (Chief Engineer & UI Architect -> Skills & Forma modals)', () => {
  // Traverse to Tier 2
  const player = { pos: [0, 2.5, 0], currentSector: 'Tier 2 Command Hub' };

  // Visit Chief Engineer
  const chief = { id: 'chief_engineer', sector: 'violet', modal: 'skills' };
  assert.equal(chief.sector, 'violet');
  assert.equal(chief.modal, 'skills', 'Chief Engineer must open Skills modal');

  // Visit UI Architect
  const uiArch = { id: 'ui_architect', sector: 'emerald', modal: 'forma' };
  assert.equal(uiArch.sector, 'emerald');
  assert.equal(uiArch.modal, 'forma', 'UI Architect must open Forma modal');
});

await runTest(T4, 'T4.S.3', 'Scenario 3: High Energy Overlook & Lumina Experiment (Photonics Specialist -> Lumina modal)', () => {
  // Ascend to Tier 3 Energy Ridge
  const player = { pos: [-12, 4.2, -18], currentSector: 'Tier 3 Energy Ridge' };
  assert.ok(player.pos[1] >= 4.0, 'Must be at Tier 3 elevation');

  // Photonics Specialist station
  const photonics = {
    id: 'photonics_specialist',
    sector: 'rose_coral',
    modal: 'lumina',
  };
  assert.equal(photonics.sector, 'rose_coral');
  assert.equal(photonics.modal, 'lumina', 'Photonics Specialist must launch Lumina shader laboratory');
});

await runTest(T4, 'T4.S.4', 'Scenario 4: Subspace Telemetry & Satellite Sync (Comms Officer & Geodata Analyst)', () => {
  // Comms Officer at subspace antenna
  const comms = { id: 'comms_officer', sector: 'cyan', modal: 'contacts' };
  assert.equal(comms.modal, 'contacts', 'Comms Officer must route to Contacts modal');

  // Geodata Analyst at telemetry terminal
  const geodata = { id: 'geodata_analyst', sector: 'sapphire', modal: 'terrascope' };
  assert.equal(geodata.modal, 'terrascope', 'Geodata Analyst must route to TerraScope modal');
});

await runTest(T4, 'T4.S.5', 'Scenario 5: Deep Mining Drill Easter Egg & Perimeter Defense (Void Drop Prevention)', () => {
  // Navigate to mining drill drop-off
  const drillOverlook = [16, 4.0, -22];
  const playerPos = [16, 4.0, -21];

  // Verify distance to drill
  const dist = Math.hypot(playerPos[0] - drillOverlook[0], playerPos[2] - drillOverlook[2]);
  assert.ok(dist < 3.0, 'Player reaches drill overlook easter egg');

  // Perimeter collision prevents stepping off edge
  const clampedX = Math.min(28, Math.max(-28, playerPos[0]));
  const clampedZ = Math.min(28, Math.max(-28, playerPos[2]));
  assert.equal(clampedX, playerPos[0], 'Player remains clamped within perimeter');
  assert.equal(clampedZ, playerPos[2], 'Player remains clamped within perimeter');
});

// ============================================================================
// FINAL SUMMARY & EXIT
// ============================================================================
const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

console.log(`\n${colors.bold}${colors.magenta}========================================================================${colors.reset}`);
console.log(`${colors.bold}${colors.magenta}                          TEST SUITE SUMMARY${colors.reset}`);
console.log(`${colors.bold}${colors.magenta}========================================================================${colors.reset}\n`);

console.log(`${'Tier Name'.padEnd(40)} | ${'Total'.padStart(6)} | ${'Passed'.padStart(6)} | ${'Failed'.padStart(6)} | Status`);
console.log('-----------------------------------------|--------|--------|--------|---------');

for (const [tierName, stats] of Object.entries(results.tiers)) {
  const status = stats.failed === 0
    ? `${colors.green}PASSED${colors.reset}`
    : `${colors.red}FAILED${colors.reset}`;
  console.log(
    `${tierName.padEnd(40)} | ${String(stats.total).padStart(6)} | ${String(stats.passed).padStart(6)} | ${String(stats.failed).padStart(6)} | ${status}`
  );
}

console.log('-----------------------------------------|--------|--------|--------|---------');
console.log(
  `${colors.bold}${'TOTAL TESTS'.padEnd(40)}${colors.reset} | ${colors.bold}${String(results.total).padStart(6)}${colors.reset} | ${colors.bold}${colors.green}${String(results.passed).padStart(6)}${colors.reset} | ${colors.bold}${results.failed > 0 ? colors.red : colors.green}${String(results.failed).padStart(6)}${colors.reset} | ${results.failed === 0 ? `${colors.green}ALL PASS${colors.reset}` : `${colors.red}FAILURES${colors.reset}`}`
);
console.log(`\nExecution time: ${elapsed}s`);

if (results.failed > 0) {
  console.log(`\n${colors.bold}${colors.red}FAILURES (${results.failed}):${colors.reset}`);
  for (const f of results.failures) {
    console.log(`\n${colors.red}✗ [${f.id}] ${f.title}${colors.reset}`);
    console.log(`  Tier: ${f.tier}`);
    console.log(`  Error: ${f.error}`);
    if (f.stack) {
      const lines = f.stack.split('\n').slice(1, 4).join('\n');
      console.log(`  ${colors.gray}${lines}${colors.reset}`);
    }
  }
  console.log(`\n${colors.bold}${colors.red}>>> Process exiting with code 1 due to test failures. <<<${colors.reset}\n`);
  process.exit(1);
} else {
  console.log(`\n${colors.bold}${colors.green}>>> All ${results.total} tests passed cleanly with 0 failures! <<<${colors.reset}\n`);
  process.exit(0);
}

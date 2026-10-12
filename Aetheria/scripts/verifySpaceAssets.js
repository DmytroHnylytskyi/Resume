const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

console.log('--- Scanning scene assets in islandScene.json ---');
const scenePath = path.join(__dirname, '..', 'src', 'data', 'islandScene.json');
const sceneData = JSON.parse(fs.readFileSync(scenePath, 'utf8'));

let missing = 0;
const uniqueModels = Array.from(new Set(sceneData.placedObjects.map(o => o.modelPath)));
console.log(`Unique scene models: ${uniqueModels.length}`);

uniqueModels.forEach(modelPath => {
  const fullPath = path.join(publicDir, modelPath.replace(/^\//, ''));
  if (!fs.existsSync(fullPath)) {
    console.error(`MISSING ASSET: ${fullPath}`);
    missing++;
  } else {
    // If glTF, verify its external .bin and textures
    if (fullPath.endsWith('.gltf')) {
      const gltf = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      (gltf.buffers || []).forEach(b => {
        if (b.uri && !b.uri.startsWith('data:')) {
          const binPath = path.join(path.dirname(fullPath), b.uri);
          if (!fs.existsSync(binPath)) {
            console.error(`MISSING GLTF BUFFER: ${binPath} (from ${fullPath})`);
            missing++;
          }
        }
      });
      (gltf.images || []).forEach(img => {
        if (img.uri && !img.uri.startsWith('data:')) {
          const imgPath = path.join(path.dirname(fullPath), img.uri);
          if (!fs.existsSync(imgPath)) {
            console.error(`MISSING GLTF IMAGE: ${imgPath} (from ${fullPath})`);
            missing++;
          }
        }
      });
    }
  }
});

console.log('--- Verifying Character and Animation GLBs ---');
const characterFiles = [
  'model/kaykit_space/Mannequin_Medium.glb',
  'model/kaykit_space/Rig_Medium_MovementBasic.glb',
  'model/kaykit_space/Rig_Medium_General.glb',
  'model/kaykit_space/Rig_Medium_Simulation.glb',
  'model/kaykit_space/Rig_Medium_Tools.glb'
];

characterFiles.forEach(rel => {
  const p = path.join(publicDir, rel);
  if (!fs.existsSync(p)) {
    console.error(`MISSING CHARACTER ASSET: ${p}`);
    missing++;
  } else {
    console.log(`OK: ${rel} (${fs.statSync(p).size} bytes)`);
  }
});

console.log('--- Verifying NPC Dialogues & Links ---');
const dialoguesSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'npcDialogues.ts'), 'utf8');

const npcIds = ['commander', 'chief_engineer', 'comms_officer', 'ui_architect', 'geodata_analyst', 'photonics_specialist'];
console.log(`Checking expected 6 NPC IDs: ${npcIds.join(', ')}`);

npcIds.forEach(id => {
  if (dialoguesSrc.includes(`${id}: {`)) {
    console.log(`OK: Found definition for NPC [${id}]`);
  } else {
    console.error(`MISSING: NPC [${id}] in npcDialogues.ts`);
    missing++;
  }
});

if (missing === 0) {
  console.log('>>> ALL ASSET AND DIALOGUE VERIFICATIONS PASSED WITH 0 ERRORS! <<<');
  process.exit(0);
} else {
  console.error(`FAILED: ${missing} missing assets or errors detected.`);
  process.exit(1);
}

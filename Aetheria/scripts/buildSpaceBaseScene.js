const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

function makeObj(modelName, position, rotation = [0, 0, 0], scale = 1, extra = {}) {
  return {
    id: randomUUID(),
    modelPath: `/model/kaykit_space/${modelName}`,
    position,
    rotation,
    scale,
    hiddenParts: [],
    colors: {},
    ...extra
  };
}

const objects = [];

// ═════════════════════════════════════════════════════════════════
// TIER 1: LOWER LANDING PLATEAU (Y = 0.0 - 0.5, Z around 10 to 22)
// ═════════════════════════════════════════════════════════════════

// 1. Landing Pad (Centered at [0, 0.4, 14])
objects.push(makeObj('landingpad_large.gltf', [0, 0.4, 14], [0, 0, 0], 3.0));

// 2. Arrival Shuttle (lander_A) docked beside landing pad
objects.push(makeObj('lander_A.gltf', [4.5, 0.5, 14.5], [0, -0.4, 0], 2.2));
objects.push(makeObj('lander_base.gltf', [4.5, 0.4, 14.5], [0, 0, 0], 2.0));

// 3. Surface Trucks & Rovers
objects.push(makeObj('spacetruck.gltf', [-5.5, 0.5, 13.5], [0, 0.8, 0], 1.5));
objects.push(makeObj('spacetruck_large.gltf', [-6.0, 0.5, 16.5], [0, 0.2, 0], 1.5));
objects.push(makeObj('spacetruck_trailer.gltf', [-6.0, 0.5, 19.0], [0, 0.2, 0], 1.5));

// 4. Cargo & Freight Depot
objects.push(makeObj('cargodepot_A.gltf', [-5.5, 0.5, 10.0], [0, 0, 0], 1.8));
objects.push(makeObj('cargo_B_stacked.gltf', [-7.5, 0.5, 11.5], [0, 0.3, 0], 1.5));
objects.push(makeObj('cargo_A_packed.gltf', [-7.5, 0.5, 9.5], [0, -0.2, 0], 1.5));
objects.push(makeObj('containers_A.gltf', [6.0, 0.5, 11.5], [0, -0.5, 0], 1.5));
objects.push(makeObj('containers_B.gltf', [6.0, 0.5, 17.0], [0, 0.1, 0], 1.5));
objects.push(makeObj('containers_C.gltf', [7.5, 0.5, 14.0], [0, -0.2, 0], 1.5));
objects.push(makeObj('containers_D.gltf', [7.5, 0.5, 16.5], [0, 0.4, 0], 1.5));

// 5. Landing Pad Perimeter Lighting Towers
objects.push(makeObj('lights.gltf', [-4.5, 0.5, 17.5], [0, 0.5, 0], 1.2));
objects.push(makeObj('lights.gltf', [4.5, 0.5, 17.5], [0, -0.5, 0], 1.2));
objects.push(makeObj('lights.gltf', [-4.5, 0.5, 10.5], [0, 0.8, 0], 1.2));
objects.push(makeObj('lights.gltf', [4.5, 0.5, 10.5], [0, -0.8, 0], 1.2));

// 6. Tier 1 Ground Foundation Tiles (terrain_low at Y=0)
for (let x = -10; x <= 10; x += 2) {
  for (let z = 10; z <= 20; z += 2) {
    // Avoid exact center overlap under landing pad
    if (Math.abs(x) <= 2 && (z === 12 || z === 14 || z === 16)) continue;
    objects.push(makeObj('terrain_low.gltf', [x, 0.0, z], [0, 0, 0], 1.0));
  }
}

// ═════════════════════════════════════════════════════════════════
// TRANSITION: TIER 1 -> TIER 2 (Z = 6 to 9, Y = 0.5 to 2.0)
// ═════════════════════════════════════════════════════════════════

// Slope Ramps (Rise 1.0m, Run 2.0m)
objects.push(makeObj('terrain_slope.gltf', [-2.0, 1.0, 7.5], [0, Math.PI, 0], 1.0));
objects.push(makeObj('terrain_slope.gltf', [2.0, 1.0, 7.5], [0, Math.PI, 0], 1.0));

// Tunnels connecting Tier 1 to Tier 2
objects.push(makeObj('tunnel_straight_A.gltf', [-2.0, 1.5, 5.5], [0, Math.PI, 0], 1.2));
objects.push(makeObj('tunnel_straight_A.gltf', [2.0, 1.5, 5.5], [0, Math.PI, 0], 1.2));

// ═════════════════════════════════════════════════════════════════
// TIER 2: MID COMMAND & RESEARCH HUB (Y = 2.0, Z = -6 to 6)
// ═════════════════════════════════════════════════════════════════

// 1. Central Hub Foundation Platform (terrain_tall blocks at Y=0, top surface at Y=2.0)
for (let x = -14; x <= 14; x += 2) {
  for (let z = -6; z <= 4; z += 2) {
    objects.push(makeObj('terrain_tall.gltf', [x, 0.0, z], [0, 0, 0], 1.0));
  }
}

// 2. Central Command Base Module (basemodule_A)
objects.push(makeObj('basemodule_A.gltf', [0, 2.0, 2.0], [0, 0, 0], 1.4));
objects.push(makeObj('roofmodule_base.gltf', [0, 3.4, 2.0], [0, 0, 0], 1.4));

// 3. Engineering Bay (Chief Engineer / basemodule_B)
objects.push(makeObj('basemodule_B.gltf', [4.5, 2.0, 2.0], [0, -Math.PI / 2, 0], 1.3));
objects.push(makeObj('roofmodule_cargo_A.gltf', [4.5, 3.3, 2.0], [0, 0, 0], 1.3));
objects.push(makeObj('lights.gltf', [6.5, 2.0, 3.5], [0, 0, 0], 1.2));

// 4. Comms Array Bay (Comms Officer / basemodule_B)
objects.push(makeObj('basemodule_B.gltf', [-4.5, 2.0, 2.0], [0, Math.PI / 2, 0], 1.3));
objects.push(makeObj('roofmodule_solarpanels.gltf', [-4.5, 3.3, 2.0], [0, 0, 0], 1.3));
objects.push(makeObj('lights.gltf', [-6.5, 2.0, 3.5], [0, 0, 0], 1.2));

// 5. East Wing - Generative CAD Lab (UI Architect Nova / Forma-3D)
objects.push(makeObj('tunnel_diagonal_long_A.gltf', [6.0, 2.0, -1.0], [0, 0, 0], 1.2));
objects.push(makeObj('basemodule_garage.gltf', [10.0, 2.0, -4.0], [0, -Math.PI / 2, 0], 1.5));
objects.push(makeObj('roofmodule_cargo_B.gltf', [10.0, 3.5, -4.0], [0, 0, 0], 1.5));
objects.push(makeObj('containers_C.gltf', [12.5, 2.0, -2.5], [0, 0.3, 0], 1.3));
objects.push(makeObj('lights.gltf', [8.0, 2.0, -4.0], [0, 0, 0], 1.2));

// 6. West Wing - Orbital GIS Lab (Geodata Analyst Orion / TerraScope)
objects.push(makeObj('tunnel_diagonal_long_B.gltf', [-6.0, 2.0, -1.0], [0, 0, 0], 1.2));
objects.push(makeObj('basemodule_C.gltf', [-10.0, 2.0, -4.0], [0, Math.PI / 2, 0], 1.5));
objects.push(makeObj('roofmodule_cargo_C.gltf', [-10.0, 3.5, -4.0], [0, 0, 0], 1.5));
objects.push(makeObj('cargodepot_B.gltf', [-12.5, 2.0, -2.5], [0, -0.3, 0], 1.3));
objects.push(makeObj('lights.gltf', [-8.0, 2.0, -4.0], [0, 0, 0], 1.2));

// Hub interior lights
objects.push(makeObj('lights.gltf', [0, 2.0, -1.5], [0, 0, 0], 1.2));

// ═════════════════════════════════════════════════════════════════
// TRANSITION: TIER 2 -> TIER 3 (Z = -6 to -10, Y = 2.0 to 4.0)
// ═════════════════════════════════════════════════════════════════

// Slopes connecting Tier 2 to Tier 3 (Rise 2.0m, Run 4.0m)
objects.push(makeObj('terrain_slope.gltf', [-2.0, 3.0, -8.0], [0, Math.PI, 0], 1.0));
objects.push(makeObj('terrain_slope.gltf', [2.0, 3.0, -8.0], [0, Math.PI, 0], 1.0));
objects.push(makeObj('tunnel_straight_B.gltf', [0, 3.2, -8.0], [0, Math.PI, 0], 1.2));

// ═════════════════════════════════════════════════════════════════
// TIER 3: HIGH VANTAGE & ENERGY RIDGE (Y = 4.0, Z = -10 to -18)
// ═════════════════════════════════════════════════════════════════

// 1. Foundation Platform (Height 4.0m: terrain_tall stacked)
for (let x = -12; x <= 12; x += 2) {
  for (let z = -18; z <= -10; z += 2) {
    objects.push(makeObj('terrain_tall.gltf', [x, 2.0, z], [0, 0, 0], 1.0));
  }
}

// 2. High Overlook Platform (Photonics Specialist Lyra / Lumina)
objects.push(makeObj('structure_tall.gltf', [0, 4.0, -14.0], [0, 0, 0], 1.5));
objects.push(makeObj('structure_low.gltf', [0, 4.0, -11.5], [0, 0, 0], 1.5));

// 3. Solar Panel Arrays
const solarX = [-9.5, -7.5, -5.5, 5.5, 7.5, 9.5];
const solarZ = [-13.0, -15.5];
for (const sx of solarX) {
  for (const sz of solarZ) {
    objects.push(makeObj('solarpanel.gltf', [sx, 4.0, sz], [0, 0, 0], 1.4));
  }
}

// 4. Tall Wind Turbines
objects.push(makeObj('windturbine_tall.gltf', [-12.0, 4.0, -14.0], [0, 0, 0], 1.5));
objects.push(makeObj('windturbine_tall.gltf', [12.0, 4.0, -14.0], [0, 0, 0], 1.5));
objects.push(makeObj('windturbine_low.gltf', [-3.0, 4.0, -16.0], [0, 0, 0], 1.4));
objects.push(makeObj('windturbine_low.gltf', [3.0, 4.0, -16.0], [0, 0, 0], 1.4));

// 5. Communications array lights
objects.push(makeObj('lights.gltf', [-3.5, 4.0, -12.5], [0, 0, 0], 1.2));
objects.push(makeObj('lights.gltf', [3.5, 4.0, -12.5], [0, 0, 0], 1.2));
objects.push(makeObj('lights.gltf', [0, 4.0, -16.5], [0, 0, 0], 1.2));

// ═════════════════════════════════════════════════════════════════
// EASTER EGG ZONE: DEEP MINING DRILL OVER DROP-OFF (Z = -12, X = 14)
// ═════════════════════════════════════════════════════════════════
objects.push(makeObj('terrain_mining.gltf', [14.0, 2.5, -12.0], [0, 0, 0], 1.5));
objects.push(makeObj('drill_structure.gltf', [14.0, 3.5, -12.0], [0, 0, 0], 1.6));
objects.push(makeObj('lights.gltf', [12.5, 3.5, -10.5], [0, 0.4, 0], 1.2));
objects.push(makeObj('containers_D.gltf', [15.5, 3.5, -10.0], [0, -0.3, 0], 1.3));

// ═════════════════════════════════════════════════════════════════
// NATURAL PERIMETER BOUNDARIES & ROCKS
// ═════════════════════════════════════════════════════════════════
const perimeterPoints = [
  // South boundary (near landing pad)
  [-12, 0.2, 22], [-8, 0.2, 22.5], [-4, 0.2, 23], [0, 0.2, 23], [4, 0.2, 23], [8, 0.2, 22.5], [12, 0.2, 22],
  // East boundary
  [14, 0.4, 18], [15, 0.5, 12], [16, 1.8, 6], [17, 1.8, 0], [17, 2.0, -6], [16, 3.5, -16],
  // West boundary
  [-14, 0.4, 18], [-15, 0.5, 12], [-16, 1.8, 6], [-17, 1.8, 0], [-17, 2.0, -6], [-16, 3.5, -16],
  // North boundary (behind Energy Ridge)
  [-14, 3.8, -19], [-10, 3.8, -19.5], [-5, 3.8, -20], [0, 3.8, -20], [5, 3.8, -20], [10, 3.8, -19.5], [14, 3.8, -19]
];

perimeterPoints.forEach((pt, i) => {
  const rockModel = i % 2 === 0 ? 'rocks_A.gltf' : 'rocks_B.gltf';
  const scale = 1.6 + (i % 3) * 0.3;
  const yaw = (i * 0.7) % (Math.PI * 2);
  objects.push(makeObj(rockModel, pt, [0, yaw, 0], scale));
});

// Ground rock scatter
const scatterPoints = [
  [-8, 0.3, 14], [-7, 0.3, 18], [8, 0.3, 13], [8, 0.3, 18],
  [-12, 1.8, 2], [12, 1.8, 2], [-8, 1.8, -2], [8, 1.8, -2],
  [-6, 3.8, -11], [6, 3.8, -11], [-10, 3.8, -17], [10, 3.8, -17]
];

scatterPoints.forEach((pt, i) => {
  const rockModel = i % 2 === 0 ? 'rock_A.gltf' : 'rock_B.gltf';
  const yaw = (i * 1.1) % (Math.PI * 2);
  objects.push(makeObj(rockModel, pt, [0, yaw, 0], 1.2));
});

const sceneData = {
  version: '1.0',
  timestamp: new Date().toISOString(),
  projectName: 'Aetheria Space Outpost',
  spawnPoint: [0.0, 1.2, 14.0],
  placedObjects: objects
};

fs.writeFileSync(
  path.join(__dirname, '..', 'src', 'data', 'islandScene.json'),
  JSON.stringify(sceneData, null, 2)
);

console.log(`Generated ${objects.length} placed objects in islandScene.json`);

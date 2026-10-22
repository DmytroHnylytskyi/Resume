// ════════════════════════════════════════════════════════════════════
// THIS FILE IS GENERATED AUTOMATICALLY by scripts/extractModelBounds.mjs
// DO NOT EDIT MANUALLY — changes will be overwritten on the next run.
//
// Source of truth for the real dimensions of GLTF/GLB models in public/model/kaykit_space/
// for collision physics. AABB = union of POSITION accessor.min/max over all meshes
// reachable from the default scene roots, including node-graph transforms
// (equivalent to THREE.Box3().setFromObject(gltf.scene) right after GLTFLoader.load,
// without external scale and without uScale from getUnitScale).
// ════════════════════════════════════════════════════════════════════

export interface ModelBounds {
  min: [number, number, number];
  max: [number, number, number];
  size: [number, number, number];
  maxDim: number;
}

export const MODEL_BOUNDS: Record<string, ModelBounds> = {
  "Mannequin_Medium.glb":            { min: [-0.989238, -0.000027, -0.469743], max: [0.989238, 2.203677, 0.535871], size: [1.978476, 2.203704, 1.005614], maxDim: 2.203704 },
  "Rig_Medium_General.glb":          { min: [-0.989238, -0.000027, -0.469743], max: [0.989238, 2.203677, 0.535871], size: [1.978476, 2.203704, 1.005614], maxDim: 2.203704 },
  "Rig_Medium_MovementBasic.glb":    { min: [-0.989238, -0.000027, -0.469743], max: [0.989238, 2.203677, 0.535871], size: [1.978476, 2.203704, 1.005614], maxDim: 2.203704 },
  "Rig_Medium_Simulation.glb":       { min: [-0.989238, -0.000027, -0.469743], max: [0.989238, 2.203677, 0.535871], size: [1.978476, 2.203704, 1.005614], maxDim: 2.203704 },
  "Rig_Medium_Tools.glb":            { min: [-0.989238, -0.000027, -0.469743], max: [0.989238, 2.203677, 0.535871], size: [1.978476, 2.203704, 1.005614], maxDim: 2.203704 },
  "basemodule_A.gltf":               { min: [-1.175961, -0.000002, -1], max: [1.072221, 1, 1.175961], size: [2.248183, 1.000002, 2.175961], maxDim: 2.248183 },
  "basemodule_C.gltf":               { min: [-1, 0, -1], max: [1, 1, 1.205556], size: [2, 1, 2.205556], maxDim: 2.205556 },
  "basemodule_D.gltf":               { min: [-1.222222, 0, -1.072221], max: [1.222222, 1, 1.072221], size: [2.444445, 1, 2.144443], maxDim: 2.444445 },
  "basemodule_E.gltf":               { min: [-1.111109, 0, -1.072217], max: [1.111109, 1.65, 1.205556], size: [2.222219, 1.65, 2.277773], maxDim: 2.277773 },
  "basemodule_garage.gltf":          { min: [-1, -0.000002, -1.096178], max: [1, 1, 1.277778], size: [2, 1.000002, 2.373955], maxDim: 2.373955 },
  "cargo_A.gltf":                    { min: [-0.25, 0, -0.26025], max: [0.25, 0.520001, 0.26025], size: [0.5, 0.520001, 0.5205], maxDim: 0.5205 },
  "cargo_A_stacked.gltf":            { min: [-0.51025, -0.01025, -0.51025], max: [0.51025, 1.01025, 0.51025], size: [1.0205, 1.0205, 1.0205], maxDim: 1.0205 },
  "cargodepot_A.gltf":               { min: [-1.072221, 0, -1.072217], max: [1, 1.120007, 1.01025], size: [2.072221, 1.120007, 2.082467], maxDim: 2.082467 },
  "cargodepot_B.gltf":               { min: [-1.072313, 0, -1.105652], max: [1.01025, 1.020001, 1.072217], size: [2.082563, 1.020001, 2.177869], maxDim: 2.177869 },
  "containers_A.gltf":               { min: [-0.25, -0.001985, -0.25], max: [0.25, 0.198015, 0.25], size: [0.5, 0.2, 0.5], maxDim: 0.5 },
  "containers_B.gltf":               { min: [-0.25, -0.001985, -0.25], max: [0.25, 0.198015, 0.25], size: [0.5, 0.2, 0.5], maxDim: 0.5 },
  "drill_structure.gltf":            { min: [-0.875063, 0, -0.875063], max: [0.875063, 1.999995, 0.875063], size: [1.750127, 1.999995, 1.750127], maxDim: 1.999995 },
  "lander_A.gltf":                   { min: [-0.671751, -0.000003, -0.671751], max: [0.700002, 1.192134, 0.75], size: [1.371754, 1.192137, 1.421751], maxDim: 1.421751 },
  "lander_B.gltf":                   { min: [-0.671751, -0.000003, -0.671751], max: [0.700002, 1.095142, 0.75], size: [1.371754, 1.095145, 1.421751], maxDim: 1.421751 },
  "landingpad_large.gltf":           { min: [-1.25, -0.000003, -1.25], max: [1.25, 0.5, 1.25], size: [2.5, 0.500003, 2.500001], maxDim: 2.500001 },
  "landingpad_small.gltf":           { min: [-0.95, -0.000003, -0.95], max: [0.95, 0.5, 0.95], size: [1.9, 0.500003, 1.900001], maxDim: 1.900001 },
  "lights.gltf":                     { min: [-0.339996, -0.000001, -0.33999], max: [0.339995, 0.998377, 0.33999], size: [0.679991, 0.998378, 0.67998], maxDim: 0.998378 },
  "npc_commander.glb":               { min: [-0.989238, -0.000027, -0.469743], max: [0.989238, 2.203677, 0.535871], size: [1.978476, 2.203704, 1.005614], maxDim: 2.203704 },
  "npc_comms.glb":                   { min: [-0.989238, -0.000027, -0.469743], max: [0.989238, 2.203677, 0.535871], size: [1.978476, 2.203704, 1.005614], maxDim: 2.203704 },
  "npc_engineer.glb":                { min: [-0.989238, -0.000027, -0.469743], max: [0.989238, 2.203677, 0.535871], size: [1.978476, 2.203704, 1.005614], maxDim: 2.203704 },
  "npc_forma.glb":                   { min: [-0.989238, -0.000027, -0.469743], max: [0.989238, 2.203677, 0.535871], size: [1.978476, 2.203704, 1.005614], maxDim: 2.203704 },
  "npc_lumina.glb":                  { min: [-0.989238, -0.000027, -0.469743], max: [0.989238, 2.203677, 0.535871], size: [1.978476, 2.203704, 1.005614], maxDim: 2.203704 },
  "npc_terrascope.glb":              { min: [-0.989238, -0.000027, -0.469743], max: [0.989238, 2.203677, 0.535871], size: [1.978476, 2.203704, 1.005614], maxDim: 2.203704 },
  "rock_B.gltf":                     { min: [-0.34762, 0, -0.401397], max: [0.34762, 0.401397, 0.401397], size: [0.695239, 0.401397, 0.802793], maxDim: 0.802793 },
  "rocks_A.gltf":                    { min: [-0.790187, 0, -0.821735], max: [0.523918, 0.353983, 0.82108], size: [1.314105, 0.353983, 1.642815], maxDim: 1.642815 },
  "rocks_B.gltf":                    { min: [-0.949602, -0.000013, -0.875862], max: [0.931445, 1.067021, 0.862595], size: [1.881046, 1.067034, 1.738458], maxDim: 1.881046 },
  "roofmodule_base.gltf":            { min: [-0.697617, -0.1, -0.697618], max: [0.697617, 0.1, 0.697618], size: [1.395235, 0.2, 1.395237], maxDim: 1.395237 },
  "roofmodule_cargo_B.gltf":         { min: [-0.697617, -0.1, -0.697618], max: [0.697617, 1.119999, 0.697618], size: [1.395235, 1.219999, 1.395237], maxDim: 1.395237 },
  "roofmodule_cargo_C.gltf":         { min: [-0.697617, -0.1, -0.697618], max: [0.697617, 1.119999, 0.697618], size: [1.395235, 1.219999, 1.395237], maxDim: 1.395237 },
  "roofmodule_solarpanels.gltf":     { min: [-0.697617, -0.1, -0.697618], max: [0.697617, 0.470907, 0.697618], size: [1.395235, 0.570907, 1.395237], maxDim: 1.395237 },
  "solarpanel.gltf":                 { min: [-0.45, -0.000003, -0.225001], max: [0.45, 0.370916, 0.224999], size: [0.9, 0.370919, 0.45], maxDim: 0.9 },
  "spacetruck.gltf":                 { min: [-0.244749, -0.077895, -0.445536], max: [0.244749, 0.488305, 0.447792], size: [0.489499, 0.5662, 0.893327], maxDim: 0.893327 },
  "spacetruck_large.gltf":           { min: [-0.252282, -0.133549, -0.571793], max: [0.252282, 0.551923, 0.455936], size: [0.504565, 0.685472, 1.027729], maxDim: 1.027729 },
  "spacetruck_trailer.gltf":         { min: [-0.24, -0.143121, -0.5], max: [0.24, 0.195079, 0.5], size: [0.48, 0.3382, 1], maxDim: 1 },
  "structure_low.gltf":              { min: [-0.875063, 0, -0.875063], max: [0.875063, 1, 0.875063], size: [1.750127, 1, 1.750127], maxDim: 1.750127 },
  "structure_tall.gltf":             { min: [-0.875063, 0, -0.875063], max: [0.875063, 1.999995, 0.875063], size: [1.750127, 1.999995, 1.750127], maxDim: 1.999995 },
  "terrain_low.gltf":                { min: [-1, -1, -1], max: [1, 0, 1], size: [2, 1, 2], maxDim: 2 },
  "terrain_mining.gltf":             { min: [-1, -1, -1], max: [1, 1.072528, 1], size: [2, 2.072528, 2], maxDim: 2.072528 },
  "terrain_slope.gltf":              { min: [-1, -1, -1], max: [1, 1, 1], size: [2, 2, 2], maxDim: 2 },
  "terrain_slope_outer_corner.gltf": { min: [-1, -1, -1], max: [1, 1, 1], size: [2, 2, 2], maxDim: 2 },
  "terrain_tall.gltf":               { min: [-1, -1, -1], max: [1, 1, 1], size: [2, 2, 2], maxDim: 2 },
  "tunnel_diagonal_long_A.gltf":     { min: [-1.469519, 0.2, -1.469519], max: [1.469519, 0.8, 1.469519], size: [2.939038, 0.6, 2.939038], maxDim: 2.939038 },
  "tunnel_straight_A.gltf":          { min: [-1, 0.2, -0.465], max: [1, 0.8, 0.465], size: [2, 0.6, 0.93], maxDim: 2 },
  "windturbine_low.gltf":            { min: [-0.571751, 0, -0.645204], max: [0.571752, 1.464977, 0.645204], size: [1.143503, 1.464977, 1.290407], maxDim: 1.464977 },
  "windturbine_tall.gltf":           { min: [-0.832615, -0.000003, -0.554644], max: [0.832623, 2.999988, 0.445204], size: [1.665238, 2.999991, 0.999847], maxDim: 2.999991 },
};

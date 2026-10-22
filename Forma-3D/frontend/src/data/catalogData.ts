import { CatalogCategory, CatalogItem } from '../types';

/**
 * @file catalogData.ts
 * @module data/catalogData
 * @description Comprehensive catalog definition including Space Base modular assets,
 * and interactive NPC crew members.
 */

export const catalogCategories: CatalogCategory[] = [
  {
    "id": "space_modules",
    "key": "space_modules"
  },
  {
    "id": "space_terrain",
    "key": "space_terrain"
  },
  {
    "id": "space_vehicles",
    "key": "space_vehicles"
  },
  {
    "id": "space_structures",
    "key": "space_structures"
  },
  {
    "id": "space_props",
    "key": "space_props"
  },
  {
    "id": "space_crew",
    "key": "space_crew"
  },
];

export const catalogItems: CatalogItem[] = [
  {
    "id": "space_basemodule_a",
    "file": "kaykit_space/basemodule_A.gltf",
    "category": "space_modules",
    "defaultName": "Base Module A (Hex)"
  },
  {
    "id": "space_basemodule_b",
    "file": "kaykit_space/basemodule_B.gltf",
    "category": "space_modules",
    "defaultName": "Base Module B (Round)"
  },
  {
    "id": "space_basemodule_c",
    "file": "kaykit_space/basemodule_C.gltf",
    "category": "space_modules",
    "defaultName": "Base Module C (Square)"
  },
  {
    "id": "space_basemodule_d",
    "file": "kaykit_space/basemodule_D.gltf",
    "category": "space_modules",
    "defaultName": "Base Module D (Angle)"
  },
  {
    "id": "space_basemodule_e",
    "file": "kaykit_space/basemodule_E.gltf",
    "category": "space_modules",
    "defaultName": "Base Module E (Wide)"
  },
  {
    "id": "space_basemodule_garage",
    "file": "kaykit_space/basemodule_garage.gltf",
    "category": "space_modules",
    "defaultName": "Base Module Garage"
  },
  {
    "id": "space_tunnel_straight_a",
    "file": "kaykit_space/tunnel_straight_A.gltf",
    "category": "space_modules",
    "defaultName": "Tunnel Straight A"
  },
  {
    "id": "space_tunnel_straight_b",
    "file": "kaykit_space/tunnel_straight_B.gltf",
    "category": "space_modules",
    "defaultName": "Tunnel Straight B (Window)"
  },
  {
    "id": "space_tunnel_diagonal_short_a",
    "file": "kaykit_space/tunnel_diagonal_short_A.gltf",
    "category": "space_modules",
    "defaultName": "Tunnel Diagonal Short A"
  },
  {
    "id": "space_tunnel_diagonal_short_b",
    "file": "kaykit_space/tunnel_diagonal_short_B.gltf",
    "category": "space_modules",
    "defaultName": "Tunnel Diagonal Short B"
  },
  {
    "id": "space_tunnel_diagonal_long_a",
    "file": "kaykit_space/tunnel_diagonal_long_A.gltf",
    "category": "space_modules",
    "defaultName": "Tunnel Diagonal Long A"
  },
  {
    "id": "space_tunnel_diagonal_long_b",
    "file": "kaykit_space/tunnel_diagonal_long_B.gltf",
    "category": "space_modules",
    "defaultName": "Tunnel Diagonal Long B"
  },
  {
    "id": "space_roofmodule_base",
    "file": "kaykit_space/roofmodule_base.gltf",
    "category": "space_modules",
    "defaultName": "Roof Module Base"
  },
  {
    "id": "space_roofmodule_cargo_a",
    "file": "kaykit_space/roofmodule_cargo_A.gltf",
    "category": "space_modules",
    "defaultName": "Roof Module Cargo A"
  },
  {
    "id": "space_roofmodule_cargo_b",
    "file": "kaykit_space/roofmodule_cargo_B.gltf",
    "category": "space_modules",
    "defaultName": "Roof Module Cargo B"
  },
  {
    "id": "space_roofmodule_cargo_c",
    "file": "kaykit_space/roofmodule_cargo_C.gltf",
    "category": "space_modules",
    "defaultName": "Roof Module Cargo C"
  },
  {
    "id": "space_roofmodule_solarpanels",
    "file": "kaykit_space/roofmodule_solarpanels.gltf",
    "category": "space_modules",
    "defaultName": "Roof Module Solar Panels"
  },
  {
    "id": "space_landingpad_large",
    "file": "kaykit_space/landingpad_large.gltf",
    "category": "space_terrain",
    "defaultName": "Landing Pad Large"
  },
  {
    "id": "space_landingpad_small",
    "file": "kaykit_space/landingpad_small.gltf",
    "category": "space_terrain",
    "defaultName": "Landing Pad Small"
  },
  {
    "id": "space_terrain_low",
    "file": "kaykit_space/terrain_low.gltf",
    "category": "space_terrain",
    "defaultName": "Terrain Low Platform"
  },
  {
    "id": "space_terrain_low_curved",
    "file": "kaykit_space/terrain_low_curved.gltf",
    "category": "space_terrain",
    "defaultName": "Terrain Low Curved"
  },
  {
    "id": "space_terrain_slope",
    "file": "kaykit_space/terrain_slope.gltf",
    "category": "space_terrain",
    "defaultName": "Terrain Slope Ramp"
  },
  {
    "id": "space_terrain_slope_inner_corner",
    "file": "kaykit_space/terrain_slope_inner_corner.gltf",
    "category": "space_terrain",
    "defaultName": "Terrain Slope Inner Corner"
  },
  {
    "id": "space_terrain_slope_outer_corner",
    "file": "kaykit_space/terrain_slope_outer_corner.gltf",
    "category": "space_terrain",
    "defaultName": "Terrain Slope Outer Corner"
  },
  {
    "id": "space_terrain_tall",
    "file": "kaykit_space/terrain_tall.gltf",
    "category": "space_terrain",
    "defaultName": "Terrain Tall Platform"
  },
  {
    "id": "space_terrain_tall_curved",
    "file": "kaykit_space/terrain_tall_curved.gltf",
    "category": "space_terrain",
    "defaultName": "Terrain Tall Curved"
  },
  {
    "id": "space_terrain_mining",
    "file": "kaykit_space/terrain_mining.gltf",
    "category": "space_terrain",
    "defaultName": "Terrain Mining Pit"
  },
  {
    "id": "space_lander_a",
    "file": "kaykit_space/lander_A.gltf",
    "category": "space_vehicles",
    "defaultName": "Space Shuttle Lander A"
  },
  {
    "id": "space_lander_b",
    "file": "kaykit_space/lander_B.gltf",
    "category": "space_vehicles",
    "defaultName": "Space Shuttle Lander B"
  },
  {
    "id": "space_lander_base",
    "file": "kaykit_space/lander_base.gltf",
    "category": "space_vehicles",
    "defaultName": "Lander Base Platform"
  },
  {
    "id": "space_spacetruck",
    "file": "kaykit_space/spacetruck.gltf",
    "category": "space_vehicles",
    "defaultName": "Space Rover Truck"
  },
  {
    "id": "space_spacetruck_large",
    "file": "kaykit_space/spacetruck_large.gltf",
    "category": "space_vehicles",
    "defaultName": "Space Rover Large"
  },
  {
    "id": "space_spacetruck_trailer",
    "file": "kaykit_space/spacetruck_trailer.gltf",
    "category": "space_vehicles",
    "defaultName": "Space Truck Trailer"
  },
  {
    "id": "space_drill_structure",
    "file": "kaykit_space/drill_structure.gltf",
    "category": "space_structures",
    "defaultName": "Deep Mining Drill"
  },
  {
    "id": "space_solarpanel",
    "file": "kaykit_space/solarpanel.gltf",
    "category": "space_structures",
    "defaultName": "Solar Panel Array"
  },
  {
    "id": "space_windturbine_tall",
    "file": "kaykit_space/windturbine_tall.gltf",
    "category": "space_structures",
    "defaultName": "Wind Turbine Tall"
  },
  {
    "id": "space_windturbine_low",
    "file": "kaykit_space/windturbine_low.gltf",
    "category": "space_structures",
    "defaultName": "Wind Turbine Low"
  },
  {
    "id": "space_structure_tall",
    "file": "kaykit_space/structure_tall.gltf",
    "category": "space_structures",
    "defaultName": "Comms Mast Tall"
  },
  {
    "id": "space_structure_low",
    "file": "kaykit_space/structure_low.gltf",
    "category": "space_structures",
    "defaultName": "Equipment Structure Low"
  },
  {
    "id": "space_lights",
    "file": "kaykit_space/lights.gltf",
    "category": "space_structures",
    "defaultName": "Floodlight Post"
  },
  {
    "id": "space_cargodepot_a",
    "file": "kaykit_space/cargodepot_A.gltf",
    "category": "space_props",
    "defaultName": "Cargo Depot A"
  },
  {
    "id": "space_cargodepot_b",
    "file": "kaykit_space/cargodepot_B.gltf",
    "category": "space_props",
    "defaultName": "Cargo Depot B"
  },
  {
    "id": "space_cargodepot_c",
    "file": "kaykit_space/cargodepot_C.gltf",
    "category": "space_props",
    "defaultName": "Cargo Depot C"
  },
  {
    "id": "space_cargo_a",
    "file": "kaykit_space/cargo_A.gltf",
    "category": "space_props",
    "defaultName": "Cargo Box A"
  },
  {
    "id": "space_cargo_a_packed",
    "file": "kaykit_space/cargo_A_packed.gltf",
    "category": "space_props",
    "defaultName": "Cargo Box A (Packed)"
  },
  {
    "id": "space_cargo_a_stacked",
    "file": "kaykit_space/cargo_A_stacked.gltf",
    "category": "space_props",
    "defaultName": "Cargo Stack A"
  },
  {
    "id": "space_cargo_b",
    "file": "kaykit_space/cargo_B.gltf",
    "category": "space_props",
    "defaultName": "Cargo Container B"
  },
  {
    "id": "space_cargo_b_packed",
    "file": "kaykit_space/cargo_B_packed.gltf",
    "category": "space_props",
    "defaultName": "Cargo Container B (Packed)"
  },
  {
    "id": "space_cargo_b_stacked",
    "file": "kaykit_space/cargo_B_stacked.gltf",
    "category": "space_props",
    "defaultName": "Cargo Stack B"
  },
  {
    "id": "space_containers_a",
    "file": "kaykit_space/containers_A.gltf",
    "category": "space_props",
    "defaultName": "Tech Containers A"
  },
  {
    "id": "space_containers_b",
    "file": "kaykit_space/containers_B.gltf",
    "category": "space_props",
    "defaultName": "Tech Containers B"
  },
  {
    "id": "space_containers_c",
    "file": "kaykit_space/containers_C.gltf",
    "category": "space_props",
    "defaultName": "Tech Containers C"
  },
  {
    "id": "space_containers_d",
    "file": "kaykit_space/containers_D.gltf",
    "category": "space_props",
    "defaultName": "Tech Containers D"
  },
  {
    "id": "space_rock_a",
    "file": "kaykit_space/rock_A.gltf",
    "category": "space_props",
    "defaultName": "Asteroid Rock A"
  },
  {
    "id": "space_rock_b",
    "file": "kaykit_space/rock_B.gltf",
    "category": "space_props",
    "defaultName": "Asteroid Rock B"
  },
  {
    "id": "space_rocks_a",
    "file": "kaykit_space/rocks_A.gltf",
    "category": "space_props",
    "defaultName": "Rocks Cluster A"
  },
  {
    "id": "space_rocks_b",
    "file": "kaykit_space/rocks_B.gltf",
    "category": "space_props",
    "defaultName": "Rocks Cluster B"
  },
  {
    "id": "npc_commander",
    "file": "kaykit_space/npc_commander.glb",
    "category": "space_crew",
    "defaultName": "NPC: Commander (Bio)"
  },
  {
    "id": "npc_engineer",
    "file": "kaykit_space/npc_engineer.glb",
    "category": "space_crew",
    "defaultName": "NPC: Chief Engineer (Skills)"
  },
  {
    "id": "npc_comms",
    "file": "kaykit_space/npc_comms.glb",
    "category": "space_crew",
    "defaultName": "NPC: Comms Officer (Contacts)"
  },
  {
    "id": "npc_forma",
    "file": "kaykit_space/npc_forma.glb",
    "category": "space_crew",
    "defaultName": "NPC: UI Architect (Forma)"
  },
  {
    "id": "npc_terrascope",
    "file": "kaykit_space/npc_terrascope.glb",
    "category": "space_crew",
    "defaultName": "NPC: Data Analyst (TerraScope)"
  },
  {
    "id": "npc_lumina",
    "file": "kaykit_space/npc_lumina.glb",
    "category": "space_crew",
    "defaultName": "NPC: Photonics Lead (Lumina)"
  },
  {
    "id": "space_mannequin",
    "file": "kaykit_space/Mannequin_Medium.glb",
    "category": "space_crew",
    "defaultName": "Crew Astronaut (Standard)"
  },
];

import { CatalogCategory, CatalogItem } from '../types';

/**
 * @file catalogData.ts
 * @module data/catalogData
 * @description Comprehensive catalog definition including Space Base modular assets,
 * interactive NPC crew members, and legacy Halloween assets.
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
  {
    "id": "necropolis",
    "key": "necropolis"
  }
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
  {
    "id": "halloween_crypt",
    "file": "kaykit_halloween/Crypt.glb",
    "category": "necropolis",
    "defaultName": "Crypt / Mausoleum"
  },
  {
    "id": "halloween_arch_gate",
    "file": "kaykit_halloween/Arch Gate.glb",
    "category": "necropolis",
    "defaultName": "Arch Gate"
  },
  {
    "id": "halloween_arch",
    "file": "kaykit_halloween/Arch.glb",
    "category": "necropolis",
    "defaultName": "Stone Arch"
  },
  {
    "id": "halloween_pillar",
    "file": "kaykit_halloween/Pillar.glb",
    "category": "necropolis",
    "defaultName": "Stone Pillar"
  },
  {
    "id": "halloween_cobblestone_tile",
    "file": "kaykit_halloween/Cobblestone tile.glb",
    "category": "necropolis",
    "defaultName": "Cobblestone Floor Tile"
  },
  {
    "id": "halloween_dirt_tile",
    "file": "kaykit_halloween/Dirt Floor Tile.glb",
    "category": "necropolis",
    "defaultName": "Dirt Floor Tile"
  },
  {
    "id": "halloween_floor_dirt_small",
    "file": "kaykit_halloween/Floor Dirt Small.glb",
    "category": "necropolis",
    "defaultName": "Floor Dirt Small"
  },
  {
    "id": "halloween_path",
    "file": "kaykit_halloween/Path.glb",
    "category": "necropolis",
    "defaultName": "Cobble Path"
  },
  {
    "id": "halloween_path_1",
    "file": "kaykit_halloween/Path-BibMU0BCgk.glb",
    "category": "necropolis",
    "defaultName": "Cobble Path 1"
  },
  {
    "id": "halloween_bench",
    "file": "kaykit_halloween/Bench.glb",
    "category": "necropolis",
    "defaultName": "Stone Bench"
  },
  {
    "id": "halloween_bench_deco",
    "file": "kaykit_halloween/Bench-cp2QnHh7bf.glb",
    "category": "necropolis",
    "defaultName": "Decorated Bench"
  },
  {
    "id": "halloween_coffin",
    "file": "kaykit_halloween/Coffin.glb",
    "category": "necropolis",
    "defaultName": "Coffin (Closed)"
  },
  {
    "id": "halloween_coffin_open",
    "file": "kaykit_halloween/Coffin-ySERERWPgE.glb",
    "category": "necropolis",
    "defaultName": "Coffin (Open)"
  },
  {
    "id": "halloween_grave",
    "file": "kaykit_halloween/Grave.glb",
    "category": "necropolis",
    "defaultName": "Grave"
  },
  {
    "id": "halloween_grave_1",
    "file": "kaykit_halloween/Grave-Yg8Yz6T8A6.glb",
    "category": "necropolis",
    "defaultName": "Grave 1"
  },
  {
    "id": "halloween_damaged_grave",
    "file": "kaykit_halloween/Damaged Grave.glb",
    "category": "necropolis",
    "defaultName": "Damaged Grave"
  },
  {
    "id": "halloween_gravestone",
    "file": "kaykit_halloween/Gravestone.glb",
    "category": "necropolis",
    "defaultName": "Gravestone"
  },
  {
    "id": "halloween_gravestone_1",
    "file": "kaykit_halloween/Gravestone-lrEHKjTy29.glb",
    "category": "necropolis",
    "defaultName": "Gravestone 1"
  },
  {
    "id": "halloween_grave_marker",
    "file": "kaykit_halloween/Grave Marker.glb",
    "category": "necropolis",
    "defaultName": "Grave Marker"
  },
  {
    "id": "halloween_gravemarker_col",
    "file": "kaykit_halloween/Gravemarker.glb",
    "category": "necropolis",
    "defaultName": "Gravemarker Column"
  },
  {
    "id": "halloween_shrine",
    "file": "kaykit_halloween/Shrine.glb",
    "category": "necropolis",
    "defaultName": "Shrine / Altar"
  },
  {
    "id": "halloween_shrine_1",
    "file": "kaykit_halloween/Shrine-Qq8M5LSXQ2.glb",
    "category": "necropolis",
    "defaultName": "Shrine 1"
  },
  {
    "id": "halloween_fence",
    "file": "kaykit_halloween/Fence.glb",
    "category": "necropolis",
    "defaultName": "Wooden Fence"
  },
  {
    "id": "halloween_fence_gate",
    "file": "kaykit_halloween/Fence Gate.glb",
    "category": "necropolis",
    "defaultName": "Fence Gate"
  },
  {
    "id": "halloween_fence_broken",
    "file": "kaykit_halloween/Fence Broken.glb",
    "category": "necropolis",
    "defaultName": "Broken Wooden Fence"
  },
  {
    "id": "halloween_fence_pillar",
    "file": "kaykit_halloween/Fence Pillar.glb",
    "category": "necropolis",
    "defaultName": "Fence Pillar"
  },
  {
    "id": "halloween_broken_pillar",
    "file": "kaykit_halloween/Broken Fence Pillar.glb",
    "category": "necropolis",
    "defaultName": "Broken Fence Pillar"
  },
  {
    "id": "halloween_iron_fence",
    "file": "kaykit_halloween/Iron Fence.glb",
    "category": "necropolis",
    "defaultName": "Iron Fence"
  },
  {
    "id": "halloween_damaged_iron_fence",
    "file": "kaykit_halloween/Damaged Iron fence.glb",
    "category": "necropolis",
    "defaultName": "Damaged Iron Fence"
  },
  {
    "id": "halloween_post",
    "file": "kaykit_halloween/Post.glb",
    "category": "necropolis",
    "defaultName": "Wooden Post"
  },
  {
    "id": "halloween_post_skull",
    "file": "kaykit_halloween/Post With Skull.glb",
    "category": "necropolis",
    "defaultName": "Post with Skull"
  },
  {
    "id": "halloween_dead_tree",
    "file": "kaykit_halloween/Dead tree.glb",
    "category": "necropolis",
    "defaultName": "Dead Tree"
  },
  {
    "id": "halloween_dead_tree_1",
    "file": "kaykit_halloween/Dead tree-68VK0NzgEZ.glb",
    "category": "necropolis",
    "defaultName": "Dead Tree 1"
  },
  {
    "id": "halloween_small_dead_tree",
    "file": "kaykit_halloween/Small Dead tree.glb",
    "category": "necropolis",
    "defaultName": "Small Dead Tree"
  },
  {
    "id": "halloween_tree_dead_large",
    "file": "kaykit_halloween/Tree Dead Large Deco.glb",
    "category": "necropolis",
    "defaultName": "Large Dead Tree"
  },
  {
    "id": "halloween_pine",
    "file": "kaykit_halloween/Autumn pine.glb",
    "category": "necropolis",
    "defaultName": "Autumn Pine"
  },
  {
    "id": "halloween_pine_1",
    "file": "kaykit_halloween/Autumn pine-8wkRed6jU9.glb",
    "category": "necropolis",
    "defaultName": "Autumn Pine 1"
  },
  {
    "id": "halloween_pine_2",
    "file": "kaykit_halloween/Autumn pine-MOuuN8sEWx.glb",
    "category": "necropolis",
    "defaultName": "Autumn Pine 2"
  },
  {
    "id": "halloween_pine_3",
    "file": "kaykit_halloween/Autumn pine-TTXhwPOkpJ.glb",
    "category": "necropolis",
    "defaultName": "Autumn Pine 3"
  },
  {
    "id": "halloween_pine_4",
    "file": "kaykit_halloween/Autumn pine-UBWV4jb52N.glb",
    "category": "necropolis",
    "defaultName": "Autumn Pine 4"
  },
  {
    "id": "halloween_pine_5",
    "file": "kaykit_halloween/Autumn pine-UopgJkSuo9.glb",
    "category": "necropolis",
    "defaultName": "Autumn Pine 5"
  },
  {
    "id": "halloween_rocks",
    "file": "kaykit_halloween/Rocks.glb",
    "category": "necropolis",
    "defaultName": "Rocks / Stones"
  },
  {
    "id": "halloween_lantern",
    "file": "kaykit_halloween/Lantern.glb",
    "category": "necropolis",
    "defaultName": "Lantern"
  },
  {
    "id": "halloween_hanging_lantern",
    "file": "kaykit_halloween/Hanging Lantern.glb",
    "category": "necropolis",
    "defaultName": "Hanging Lantern"
  },
  {
    "id": "halloween_post_lantern",
    "file": "kaykit_halloween/Post Lantern.glb",
    "category": "necropolis",
    "defaultName": "Post Lantern"
  },
  {
    "id": "halloween_candle",
    "file": "kaykit_halloween/Candle.glb",
    "category": "necropolis",
    "defaultName": "Candle"
  },
  {
    "id": "halloween_candle_1",
    "file": "kaykit_halloween/Candle-fYtyVjkX3y.glb",
    "category": "necropolis",
    "defaultName": "Candle 1"
  },
  {
    "id": "halloween_candle_melted",
    "file": "kaykit_halloween/Candle Melted.glb",
    "category": "necropolis",
    "defaultName": "Candle Melted"
  },
  {
    "id": "halloween_candles_group",
    "file": "kaykit_halloween/Candles.glb",
    "category": "necropolis",
    "defaultName": "Candles Group"
  },
  {
    "id": "halloween_plaque_candles",
    "file": "kaykit_halloween/Plaque Candles.glb",
    "category": "necropolis",
    "defaultName": "Plaque with Candles"
  },
  {
    "id": "halloween_skull_candle",
    "file": "kaykit_halloween/Skull Candle.glb",
    "category": "necropolis",
    "defaultName": "Skull with Candle"
  },
  {
    "id": "halloween_jackolantern",
    "file": "kaykit_halloween/Jackolantern.glb",
    "category": "necropolis",
    "defaultName": "Jack O'Lantern"
  },
  {
    "id": "halloween_pumpkin",
    "file": "kaykit_halloween/Pumpkin.glb",
    "category": "necropolis",
    "defaultName": "Pumpkin (Plain)"
  },
  {
    "id": "halloween_pumpkin_orange_jacko",
    "file": "kaykit_halloween/Pumpkin Orange Jacko.glb",
    "category": "necropolis",
    "defaultName": "Pumpkin Jack O'Lantern"
  },
  {
    "id": "halloween_small_pumpkin",
    "file": "kaykit_halloween/Small Pumpkin.glb",
    "category": "necropolis",
    "defaultName": "Small Pumpkin"
  },
  {
    "id": "halloween_small_pumpkin_1",
    "file": "kaykit_halloween/Small Pumpkin-KnfqSrTtUX.glb",
    "category": "necropolis",
    "defaultName": "Small Pumpkin 1"
  },
  {
    "id": "halloween_yellow_pumpkin",
    "file": "kaykit_halloween/Yellow pumpkin.glb",
    "category": "necropolis",
    "defaultName": "Yellow Pumpkin"
  },
  {
    "id": "halloween_skull",
    "file": "kaykit_halloween/Skull.glb",
    "category": "necropolis",
    "defaultName": "Skull"
  },
  {
    "id": "halloween_ribcage",
    "file": "kaykit_halloween/Ribcage.glb",
    "category": "necropolis",
    "defaultName": "Ribcage Skeleton"
  },
  {
    "id": "halloween_bone",
    "file": "kaykit_halloween/Bone.glb",
    "category": "necropolis",
    "defaultName": "Bone"
  },
  {
    "id": "halloween_bone_1",
    "file": "kaykit_halloween/Bone-2jLwMoAb2y.glb",
    "category": "necropolis",
    "defaultName": "Bone 1"
  },
  {
    "id": "halloween_bone_2",
    "file": "kaykit_halloween/Bone-gVT6iydSY6.glb",
    "category": "necropolis",
    "defaultName": "Bone 2"
  },
  {
    "id": "halloween_plaque",
    "file": "kaykit_halloween/Plaque.glb",
    "category": "necropolis",
    "defaultName": "Stone Plaque"
  },
  {
    "id": "halloween_angel_statue",
    "file": "kaykit_halloween/AngelStatue by Zsky - 6v4CL0nKfT.glb",
    "category": "necropolis",
    "defaultName": "Angel Statue (Zsky)"
  },
  {
    "id": "halloween_hero_statue",
    "file": "kaykit_halloween/Statue by Zsky - gieXYyUTYr.glb",
    "category": "necropolis",
    "defaultName": "Hero Statue (Zsky)"
  },
  {
    "id": "halloween_stag_statue",
    "file": "kaykit_halloween/Stag Statue by Quaternius - cKloIsNcT8.glb",
    "category": "necropolis",
    "defaultName": "Stag Totem Statue (Quaternius)"
  }
];

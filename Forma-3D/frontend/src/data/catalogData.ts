import { CatalogCategory, CatalogItem } from '../types';

/**
 * @file catalogData.ts
 * @module data/catalogData
 * @description Comprehensive catalog definition of all 3D furniture, structural architectural blocks,
 * portals, environment terrains, and decorative models with clean standardized naming and indexing.
 * 
 * @author Forma-3D Team
 */

export const catalogCategories: CatalogCategory[] = [
  { id: 'all', key: 'all' },
  { id: 'halloween', key: 'halloween' },
  { id: 'islands', key: 'islands' },
  { id: 'portals', key: 'portals' },
  { id: 'statues', key: 'statues' },
  { id: 'vegetation', key: 'vegetation' },
  { id: 'bridges', key: 'bridges' },
  { id: 'walls', key: 'walls' },
  { id: 'modern', key: 'modern' },
  { id: 'gothic', key: 'gothic' },
  { id: 'sofas', key: 'sofas' },
  { id: 'tables', key: 'tables' },
  { id: 'storage', key: 'storage' },
  { id: 'lighting', key: 'lighting' },
  { id: 'decor', key: 'decor' }
];

export const catalogItems: CatalogItem[] = [
  {
    "id": "island_1",
    "file": "island_base_main1.glb",
    "category": "islands",
    "defaultName": "Island 1 (Large)"
  },
  {
    "id": "island_2",
    "file": "island_base_main2.glb",
    "category": "islands",
    "defaultName": "Island 2 (Rocky)"
  },
  {
    "id": "island_3",
    "file": "island_base_main3.glb",
    "category": "islands",
    "defaultName": "Island 3 (Medium)"
  },
  {
    "id": "island_4",
    "file": "island_base_main4.glb",
    "category": "islands",
    "defaultName": "Island 4 (Small)"
  },
  {
    "id": "portal_1",
    "file": "portal_GlobeScope.glb",
    "category": "portals",
    "defaultName": "Portal 1"
  },
  {
    "id": "portal_2",
    "file": "portal_3D_Furniture_Store.glb",
    "category": "portals",
    "defaultName": "Portal 2"
  },
  {
    "id": "portal_3",
    "file": "portal_MiniLMS..glb",
    "category": "portals",
    "defaultName": "Portal 3"
  },
  {
    "id": "statue_1",
    "file": "statue_bio_hero.glb",
    "category": "statues",
    "defaultName": "Statue 1"
  },
  {
    "id": "statue_2",
    "file": "statue_social_oracle.glb",
    "category": "statues",
    "defaultName": "Statue 2"
  },
  {
    "id": "altar_1",
    "file": "statue_skills_altar.glb",
    "category": "statues",
    "defaultName": "Altar 1"
  },
  {
    "id": "statue_3",
    "file": "gothic_statue1_15.glb",
    "category": "statues",
    "defaultName": "Statue 3"
  },
  {
    "id": "statue_4",
    "file": "gothic_statue2_16.glb",
    "category": "statues",
    "defaultName": "Statue 4"
  },
  {
    "id": "tree_1",
    "file": "magic_tree2.glb",
    "category": "vegetation",
    "defaultName": "Tree 1"
  },
  {
    "id": "tree_2",
    "file": "magic_tree3.glb",
    "category": "vegetation",
    "defaultName": "Tree 2"
  },
  {
    "id": "tree_3",
    "file": "magic_tree4.glb",
    "category": "vegetation",
    "defaultName": "Tree 3"
  },
  {
    "id": "bush_1",
    "file": "bush1.glb",
    "category": "vegetation",
    "defaultName": "Bush 1"
  },
  {
    "id": "hedge_1",
    "file": "house_hedge.glb",
    "category": "vegetation",
    "defaultName": "Hedge 1"
  },
  {
    "id": "bridge_1",
    "file": "rope_bridge1.glb",
    "category": "bridges",
    "defaultName": "Bridge 1"
  },
  {
    "id": "bridge_2",
    "file": "rope_bridge2.glb",
    "category": "bridges",
    "defaultName": "Bridge 2"
  },
  {
    "id": "stairs_1",
    "file": "stone_steps1.glb",
    "category": "bridges",
    "defaultName": "Stairs 1 (Stone)"
  },
  {
    "id": "path_1",
    "file": "house_stone_path.glb",
    "category": "bridges",
    "defaultName": "Path 1"
  },
  {
    "id": "balcony_slab_1",
    "file": "house_balconny.glb",
    "category": "bridges",
    "defaultName": "Balcony Slab 1"
  },
  {
    "id": "railing_1",
    "file": "house_railing.glb",
    "category": "bridges",
    "defaultName": "Railing 1"
  },
  {
    "id": "stairs_2",
    "file": "gothic_gik_longstair1_001_7.glb",
    "category": "bridges",
    "defaultName": "Stairs 2 (Straight)"
  },
  {
    "id": "stairs_3",
    "file": "gothic_gik_cornerstair1_004_14.glb",
    "category": "bridges",
    "defaultName": "Stairs 3 (Corner)"
  },
  {
    "id": "decking_1",
    "file": "floorpattern_002_13.glb",
    "category": "bridges",
    "defaultName": "Decking 1"
  },
  {
    "id": "wall_1",
    "file": "wall_001_1.glb",
    "category": "walls",
    "defaultName": "Wall 1 (White)"
  },
  {
    "id": "wall_2",
    "file": "wall_002_3.glb",
    "category": "walls",
    "defaultName": "Wall 2 (Paneled)"
  },
  {
    "id": "wall_3",
    "file": "wall_003_4.glb",
    "category": "walls",
    "defaultName": "Wall 3 (Paneled)"
  },
  {
    "id": "walldoor_1",
    "file": "walldoor_001_2.glb",
    "category": "walls",
    "defaultName": "Doorway Wall 1"
  },
  {
    "id": "walldoor_2",
    "file": "walldoor_002_5.glb",
    "category": "walls",
    "defaultName": "Doorway Wall 2"
  },
  {
    "id": "walldoor_3",
    "file": "walldoor_003_6.glb",
    "category": "walls",
    "defaultName": "Doorway Wall 3"
  },
  {
    "id": "wallwindow_1",
    "file": "wallwindow_001_7.glb",
    "category": "walls",
    "defaultName": "Window Wall 1"
  },
  {
    "id": "wallwindow_2",
    "file": "wallwindow_002_8.glb",
    "category": "walls",
    "defaultName": "Window Wall 2"
  },
  {
    "id": "wallwindow_3",
    "file": "wallwindow_003_9.glb",
    "category": "walls",
    "defaultName": "Window Wall 3"
  },
  {
    "id": "floor_1",
    "file": "floorpattern_11.glb",
    "category": "walls",
    "defaultName": "Floor 1 (Parquet)"
  },
  {
    "id": "floor_2",
    "file": "floorpattern_001_10.glb",
    "category": "walls",
    "defaultName": "Floor 2 (Tiles)"
  },
  {
    "id": "floor_3",
    "file": "floorpattern_002_13.glb",
    "category": "walls",
    "defaultName": "Floor 3 (Planks)"
  },
  {
    "id": "floor_4",
    "file": "floorpattern_003_14.glb",
    "category": "walls",
    "defaultName": "Floor 4 (Dark Tiles)"
  },
  {
    "id": "door_1",
    "file": "door_12.glb",
    "category": "walls",
    "defaultName": "Door 1"
  },
  {
    "id": "window_1",
    "file": "window_0.glb",
    "category": "walls",
    "defaultName": "Window 1"
  },
  {
    "id": "modern_wall_1",
    "file": "house_wall_5x5.glb",
    "category": "modern",
    "defaultName": "Modern Wall 1 (5x5m)"
  },
  {
    "id": "modern_wall_2",
    "file": "house_wall_5x2_5.glb",
    "category": "modern",
    "defaultName": "Modern Wall 2 (5x2.5m)"
  },
  {
    "id": "modern_wall_3",
    "file": "house_wall_2_5x2_5.glb",
    "category": "modern",
    "defaultName": "Modern Wall 3 (2.5x2.5m)"
  },
  {
    "id": "corner_wall_1",
    "file": "house_corner_wall1_5x5.glb",
    "category": "modern",
    "defaultName": "Corner Wall 1 (5x5m)"
  },
  {
    "id": "corner_wall_2",
    "file": "house_corner_wall2_5x5.glb",
    "category": "modern",
    "defaultName": "Corner Wall 2 (5x5m)"
  },
  {
    "id": "modern_window_1",
    "file": "house_wallwindow1center.glb",
    "category": "modern",
    "defaultName": "Facade Window Wall 1"
  },
  {
    "id": "modern_window_2",
    "file": "house_wallwindow2.glb",
    "category": "modern",
    "defaultName": "Facade Window Wall 2"
  },
  {
    "id": "modern_window_3",
    "file": "house_wallwindow3center.glb",
    "category": "modern",
    "defaultName": "Facade Window Wall 3"
  },
  {
    "id": "modern_window_4",
    "file": "house_wallwindow4.glb",
    "category": "modern",
    "defaultName": "Facade Window Wall 4"
  },
  {
    "id": "modern_window_5",
    "file": "house_wallwindow5high.glb",
    "category": "modern",
    "defaultName": "Facade Window Wall 5"
  },
  {
    "id": "roof_1",
    "file": "house_flatroof_5x5.glb",
    "category": "modern",
    "defaultName": "Roof 1 (Flat 5x5m)"
  },
  {
    "id": "roof_2",
    "file": "house_flatroof_5x2_5.glb",
    "category": "modern",
    "defaultName": "Roof 2 (Flat 5x2.5m)"
  },
  {
    "id": "roof_3",
    "file": "house_slightly_slopedroof_5x5.glb",
    "category": "modern",
    "defaultName": "Roof 3 (Gentle Slope 5x5m)"
  },
  {
    "id": "roof_4",
    "file": "house_sloping_roof_5x5.glb",
    "category": "modern",
    "defaultName": "Roof 4 (Sloping 5x5m)"
  },
  {
    "id": "roof_5",
    "file": "house_heavily_sloped_roof_5x5.glb",
    "category": "modern",
    "defaultName": "Roof 5 (Steep 5x5m)"
  },
  {
    "id": "modern_doors_1",
    "file": "house_doors.glb",
    "category": "modern",
    "defaultName": "Modern Doors 1"
  },
  {
    "id": "street_lamp_1",
    "file": "house_modernlamp.glb",
    "category": "modern",
    "defaultName": "Street Lamp 1"
  },
  {
    "id": "bike_stand_1",
    "file": "house_bike_stand.glb",
    "category": "modern",
    "defaultName": "Bike Stand 1"
  },
  {
    "id": "gothic_arch_1",
    "file": "gothic_gik_arch1_0.glb",
    "category": "gothic",
    "defaultName": "Gothic Arch 1"
  },
  {
    "id": "gothic_cornice_1",
    "file": "gothic_corn_2.glb",
    "category": "gothic",
    "defaultName": "Gothic Cornice 1"
  },
  {
    "id": "gothic_cornice_2",
    "file": "gothic_corn2_4.glb",
    "category": "gothic",
    "defaultName": "Gothic Cornice 2"
  },
  {
    "id": "gothic_column_1",
    "file": "gothic_column2_001_5.glb",
    "category": "gothic",
    "defaultName": "Gothic Column 1"
  },
  {
    "id": "gothic_wall_1",
    "file": "gothic_gik_downwall_001_6.glb",
    "category": "gothic",
    "defaultName": "Gothic Wall 1 (Lower)"
  },
  {
    "id": "gothic_wall_2",
    "file": "gothic_gik_upperwall_001_17.glb",
    "category": "gothic",
    "defaultName": "Gothic Wall 2 (Upper)"
  },
  {
    "id": "gothic_wall_3",
    "file": "gothic_wall2_18.glb",
    "category": "gothic",
    "defaultName": "Gothic Wall 3"
  },
  {
    "id": "gothic_window_1",
    "file": "gothic_minwindow_12.glb",
    "category": "gothic",
    "defaultName": "Gothic Window 1 (Small)"
  },
  {
    "id": "gothic_window_2",
    "file": "gothic_gik_window_21.glb",
    "category": "gothic",
    "defaultName": "Gothic Window 2 (Large)"
  },
  {
    "id": "sofa_1",
    "file": "sofa1.glb",
    "category": "sofas",
    "defaultName": "Sofa 1"
  },
  {
    "id": "sofa_2",
    "file": "sofa2.glb",
    "category": "sofas",
    "defaultName": "Sofa 2"
  },
  {
    "id": "sofa_3",
    "file": "sofa3.glb",
    "category": "sofas",
    "defaultName": "Sofa 3"
  },
  {
    "id": "sofa_4",
    "file": "sofa4.glb",
    "category": "sofas",
    "defaultName": "Sofa 4"
  },
  {
    "id": "armchair_1",
    "file": "Lounge Chair1.glb",
    "category": "sofas",
    "defaultName": "Armchair 1"
  },
  {
    "id": "armchair_2",
    "file": "Lounge Chair2.glb",
    "category": "sofas",
    "defaultName": "Armchair 2"
  },
  {
    "id": "armchair_3",
    "file": "Lounge Chair3.glb",
    "category": "sofas",
    "defaultName": "Armchair 3"
  },
  {
    "id": "armchair_4",
    "file": "Lounge Chair4.glb",
    "category": "sofas",
    "defaultName": "Armchair 4"
  },
  {
    "id": "pouf_1",
    "file": "Pouf1.glb",
    "category": "sofas",
    "defaultName": "Pouf 1"
  },
  {
    "id": "pouf_2",
    "file": "Pouf2.glb",
    "category": "sofas",
    "defaultName": "Pouf 2"
  },
  {
    "id": "chair_1",
    "file": "Dining Chair1.glb",
    "category": "sofas",
    "defaultName": "Chair 1"
  },
  {
    "id": "chair_2",
    "file": "Dining Chair2.glb",
    "category": "sofas",
    "defaultName": "Chair 2"
  },
  {
    "id": "chair_3",
    "file": "Dining Chair3.glb",
    "category": "sofas",
    "defaultName": "Chair 3"
  },
  {
    "id": "chair_4",
    "file": "Dining Chair4.glb",
    "category": "sofas",
    "defaultName": "Chair 4"
  },
  {
    "id": "bar_stool_1",
    "file": "Bar Stool1.glb",
    "category": "sofas",
    "defaultName": "Bar Stool 1"
  },
  {
    "id": "bar_stool_2",
    "file": "Bar Stool2.glb",
    "category": "sofas",
    "defaultName": "Bar Stool 2"
  },
  {
    "id": "bar_stool_3",
    "file": "Bar Stool3.glb",
    "category": "sofas",
    "defaultName": "Bar Stool 3"
  },
  {
    "id": "coffee_table_1",
    "file": "Coffee Table1.glb",
    "category": "tables",
    "defaultName": "Coffee Table 1"
  },
  {
    "id": "coffee_table_2",
    "file": "Coffee Table2.glb",
    "category": "tables",
    "defaultName": "Coffee Table 2"
  },
  {
    "id": "coffee_table_3",
    "file": "Coffee Table3.glb",
    "category": "tables",
    "defaultName": "Coffee Table 3"
  },
  {
    "id": "coffee_table_4",
    "file": "Coffee Table4.glb",
    "category": "tables",
    "defaultName": "Coffee Table 4"
  },
  {
    "id": "dining_table_1",
    "file": "Dining Table1.glb",
    "category": "tables",
    "defaultName": "Dining Table 1"
  },
  {
    "id": "dining_table_2",
    "file": "Dining Table2.glb",
    "category": "tables",
    "defaultName": "Dining Table 2"
  },
  {
    "id": "dining_table_3",
    "file": "Dining Table3.glb",
    "category": "tables",
    "defaultName": "Dining Table 3"
  },
  {
    "id": "bookshelf_1",
    "file": "Bookshelf1.glb",
    "category": "storage",
    "defaultName": "Bookshelf 1"
  },
  {
    "id": "bookshelf_2",
    "file": "Bookshelf2.glb",
    "category": "storage",
    "defaultName": "Bookshelf 2"
  },
  {
    "id": "bookshelf_3",
    "file": "Bookshelf3.glb",
    "category": "storage",
    "defaultName": "Bookshelf 3"
  },
  {
    "id": "bookshelf_4",
    "file": "Bookshelf4.glb",
    "category": "storage",
    "defaultName": "Bookshelf 4"
  },
  {
    "id": "tv_stand_1",
    "file": "TV Stand 1.glb",
    "category": "storage",
    "defaultName": "TV Stand 1"
  },
  {
    "id": "tv_stand_2",
    "file": "TV Stand 2.glb",
    "category": "storage",
    "defaultName": "TV Stand 2"
  },
  {
    "id": "tv_stand_3",
    "file": "TV Stand 3.glb",
    "category": "storage",
    "defaultName": "TV Stand 3"
  },
  {
    "id": "tv_stand_4",
    "file": "TV Stand 4.glb",
    "category": "storage",
    "defaultName": "TV Stand 4"
  },
  {
    "id": "sideboard_1",
    "file": "Sideboard1.glb",
    "category": "storage",
    "defaultName": "Sideboard 1"
  },
  {
    "id": "floor_lamp_1",
    "file": "Floor Lamp1.glb",
    "category": "lighting",
    "defaultName": "Floor Lamp 1"
  },
  {
    "id": "floor_lamp_2",
    "file": "Floor Lamp2.glb",
    "category": "lighting",
    "defaultName": "Floor Lamp 2"
  },
  {
    "id": "floor_lamp_3",
    "file": "Floor Lamp3.glb",
    "category": "lighting",
    "defaultName": "Floor Lamp 3"
  },
  {
    "id": "floor_lamp_4",
    "file": "Floor Lamp4.glb",
    "category": "lighting",
    "defaultName": "Floor Lamp 4"
  },
  {
    "id": "table_lamp_1",
    "file": "Table Lamp1.glb",
    "category": "lighting",
    "defaultName": "Table Lamp 1"
  },
  {
    "id": "table_lamp_2",
    "file": "Table Lamp2.glb",
    "category": "lighting",
    "defaultName": "Table Lamp 2"
  },
  {
    "id": "table_lamp_3",
    "file": "Table Lamp3.glb",
    "category": "lighting",
    "defaultName": "Table Lamp 3"
  },
  {
    "id": "table_lamp_4",
    "file": "Table Lamp4.glb",
    "category": "lighting",
    "defaultName": "Table Lamp 4"
  },
  {
    "id": "chandelier_1",
    "file": "Chandelier1.glb",
    "category": "lighting",
    "defaultName": "Chandelier 1"
  },
  {
    "id": "chandelier_2",
    "file": "Chandelier2.glb",
    "category": "lighting",
    "defaultName": "Chandelier 2"
  },
  {
    "id": "potted_plant_1",
    "file": "Potted Plant 1.glb",
    "category": "decor",
    "defaultName": "Potted Plant 1"
  },
  {
    "id": "potted_plant_2",
    "file": "Potted Plant 2.glb",
    "category": "decor",
    "defaultName": "Potted Plant 2"
  },
  {
    "id": "carpet_1",
    "file": "Carpet1.glb",
    "category": "decor",
    "defaultName": "Carpet 1"
  },
  {
    "id": "painting_1",
    "file": "Painting1.glb",
    "category": "decor",
    "defaultName": "Painting 1"
  },
  {
    "id": "tv_1",
    "file": "TV 1.glb",
    "category": "decor",
    "defaultName": "Smart TV 1"
  },
  {
    "id": "monitor_1",
    "file": "Monitor1.glb",
    "category": "decor",
    "defaultName": "Desktop Monitor 1"
  },
  {
    "id": "halloween_arch_gate",
    "file": "kaykit_halloween/Arch Gate.glb",
    "category": "halloween",
    "defaultName": "Arch Gate"
  },
  {
    "id": "halloween_arch",
    "file": "kaykit_halloween/Arch.glb",
    "category": "halloween",
    "defaultName": "Stone Arch"
  },
  {
    "id": "halloween_pine_1",
    "file": "kaykit_halloween/Autumn pine-8wkRed6jU9.glb",
    "category": "halloween",
    "defaultName": "Autumn Pine 1"
  },
  {
    "id": "halloween_pine_2",
    "file": "kaykit_halloween/Autumn pine-MOuuN8sEWx.glb",
    "category": "halloween",
    "defaultName": "Autumn Pine 2"
  },
  {
    "id": "halloween_pine_3",
    "file": "kaykit_halloween/Autumn pine-TTXhwPOkpJ.glb",
    "category": "halloween",
    "defaultName": "Autumn Pine 3"
  },
  {
    "id": "halloween_pine_4",
    "file": "kaykit_halloween/Autumn pine-UBWV4jb52N.glb",
    "category": "halloween",
    "defaultName": "Autumn Pine 4"
  },
  {
    "id": "halloween_pine_5",
    "file": "kaykit_halloween/Autumn pine-UopgJkSuo9.glb",
    "category": "halloween",
    "defaultName": "Autumn Pine 5"
  },
  {
    "id": "halloween_pine",
    "file": "kaykit_halloween/Autumn pine.glb",
    "category": "halloween",
    "defaultName": "Autumn Pine"
  },
  {
    "id": "halloween_bench_deco",
    "file": "kaykit_halloween/Bench-cp2QnHh7bf.glb",
    "category": "halloween",
    "defaultName": "Bench (Decorated)"
  },
  {
    "id": "halloween_bench",
    "file": "kaykit_halloween/Bench.glb",
    "category": "halloween",
    "defaultName": "Bench"
  },
  {
    "id": "halloween_bone_1",
    "file": "kaykit_halloween/Bone-2jLwMoAb2y.glb",
    "category": "halloween",
    "defaultName": "Bone 1"
  },
  {
    "id": "halloween_bone_2",
    "file": "kaykit_halloween/Bone-gVT6iydSY6.glb",
    "category": "halloween",
    "defaultName": "Bone 2"
  },
  {
    "id": "halloween_bone",
    "file": "kaykit_halloween/Bone.glb",
    "category": "halloween",
    "defaultName": "Bone"
  },
  {
    "id": "halloween_broken_pillar",
    "file": "kaykit_halloween/Broken Fence Pillar.glb",
    "category": "halloween",
    "defaultName": "Broken Fence Pillar"
  },
  {
    "id": "halloween_candle_melted",
    "file": "kaykit_halloween/Candle Melted.glb",
    "category": "halloween",
    "defaultName": "Candle Melted"
  },
  {
    "id": "halloween_candle_1",
    "file": "kaykit_halloween/Candle-fYtyVjkX3y.glb",
    "category": "halloween",
    "defaultName": "Candle 1"
  },
  {
    "id": "halloween_candle",
    "file": "kaykit_halloween/Candle.glb",
    "category": "halloween",
    "defaultName": "Candle"
  },
  {
    "id": "halloween_candles_group",
    "file": "kaykit_halloween/Candles.glb",
    "category": "halloween",
    "defaultName": "Candles Group"
  },
  {
    "id": "halloween_cobblestone_tile",
    "file": "kaykit_halloween/Cobblestone tile.glb",
    "category": "halloween",
    "defaultName": "Cobblestone Floor Tile"
  },
  {
    "id": "halloween_coffin_open",
    "file": "kaykit_halloween/Coffin-ySERERWPgE.glb",
    "category": "halloween",
    "defaultName": "Coffin (Open)"
  },
  {
    "id": "halloween_coffin",
    "file": "kaykit_halloween/Coffin.glb",
    "category": "halloween",
    "defaultName": "Coffin (Closed)"
  },
  {
    "id": "halloween_crypt",
    "file": "kaykit_halloween/Crypt.glb",
    "category": "halloween",
    "defaultName": "Crypt / Mausoleum"
  },
  {
    "id": "halloween_damaged_grave",
    "file": "kaykit_halloween/Damaged Grave.glb",
    "category": "halloween",
    "defaultName": "Damaged Grave"
  },
  {
    "id": "halloween_damaged_iron_fence",
    "file": "kaykit_halloween/Damaged Iron fence.glb",
    "category": "halloween",
    "defaultName": "Damaged Iron Fence"
  },
  {
    "id": "halloween_dead_tree_1",
    "file": "kaykit_halloween/Dead tree-68VK0NzgEZ.glb",
    "category": "halloween",
    "defaultName": "Dead Tree 1"
  },
  {
    "id": "halloween_dead_tree",
    "file": "kaykit_halloween/Dead tree.glb",
    "category": "halloween",
    "defaultName": "Dead Tree"
  },
  {
    "id": "halloween_dirt_tile",
    "file": "kaykit_halloween/Dirt Floor Tile.glb",
    "category": "halloween",
    "defaultName": "Dirt Floor Tile"
  },
  {
    "id": "halloween_fence_broken",
    "file": "kaykit_halloween/Fence Broken.glb",
    "category": "halloween",
    "defaultName": "Fence Broken"
  },
  {
    "id": "halloween_fence_gate",
    "file": "kaykit_halloween/Fence Gate.glb",
    "category": "halloween",
    "defaultName": "Fence Gate"
  },
  {
    "id": "halloween_fence_pillar",
    "file": "kaykit_halloween/Fence Pillar.glb",
    "category": "halloween",
    "defaultName": "Fence Pillar"
  },
  {
    "id": "halloween_fence",
    "file": "kaykit_halloween/Fence.glb",
    "category": "halloween",
    "defaultName": "Fence"
  },
  {
    "id": "halloween_floor_dirt_small",
    "file": "kaykit_halloween/Floor Dirt Small.glb",
    "category": "halloween",
    "defaultName": "Floor Dirt Small"
  },
  {
    "id": "halloween_grave_marker",
    "file": "kaykit_halloween/Grave Marker.glb",
    "category": "halloween",
    "defaultName": "Grave Marker"
  },
  {
    "id": "halloween_grave_1",
    "file": "kaykit_halloween/Grave-Yg8Yz6T8A6.glb",
    "category": "halloween",
    "defaultName": "Grave 1"
  },
  {
    "id": "halloween_grave",
    "file": "kaykit_halloween/Grave.glb",
    "category": "halloween",
    "defaultName": "Grave"
  },
  {
    "id": "halloween_gravemarker_col",
    "file": "kaykit_halloween/Gravemarker.glb",
    "category": "halloween",
    "defaultName": "Gravemarker Column"
  },
  {
    "id": "halloween_gravestone_1",
    "file": "kaykit_halloween/Gravestone-lrEHKjTy29.glb",
    "category": "halloween",
    "defaultName": "Gravestone 1"
  },
  {
    "id": "halloween_gravestone",
    "file": "kaykit_halloween/Gravestone.glb",
    "category": "halloween",
    "defaultName": "Gravestone"
  },
  {
    "id": "halloween_hanging_lantern",
    "file": "kaykit_halloween/Hanging Lantern.glb",
    "category": "halloween",
    "defaultName": "Hanging Lantern"
  },
  {
    "id": "halloween_iron_fence",
    "file": "kaykit_halloween/Iron Fence.glb",
    "category": "halloween",
    "defaultName": "Iron Fence"
  },
  {
    "id": "halloween_jackolantern",
    "file": "kaykit_halloween/Jackolantern.glb",
    "category": "halloween",
    "defaultName": "Jack O'Lantern"
  },
  {
    "id": "halloween_lantern",
    "file": "kaykit_halloween/Lantern.glb",
    "category": "halloween",
    "defaultName": "Lantern"
  },
  {
    "id": "halloween_path_1",
    "file": "kaykit_halloween/Path-BibMU0BCgk.glb",
    "category": "halloween",
    "defaultName": "Cobble Path 1"
  },
  {
    "id": "halloween_path",
    "file": "kaykit_halloween/Path.glb",
    "category": "halloween",
    "defaultName": "Cobble Path"
  },
  {
    "id": "halloween_pillar",
    "file": "kaykit_halloween/Pillar.glb",
    "category": "halloween",
    "defaultName": "Stone Pillar"
  },
  {
    "id": "halloween_plaque_candles",
    "file": "kaykit_halloween/Plaque Candles.glb",
    "category": "halloween",
    "defaultName": "Plaque with Candles"
  },
  {
    "id": "halloween_plaque",
    "file": "kaykit_halloween/Plaque.glb",
    "category": "halloween",
    "defaultName": "Plaque"
  },
  {
    "id": "halloween_post_lantern",
    "file": "kaykit_halloween/Post Lantern.glb",
    "category": "halloween",
    "defaultName": "Post Lantern"
  },
  {
    "id": "halloween_post_skull",
    "file": "kaykit_halloween/Post With Skull.glb",
    "category": "halloween",
    "defaultName": "Post with Skull"
  },
  {
    "id": "halloween_post",
    "file": "kaykit_halloween/Post.glb",
    "category": "halloween",
    "defaultName": "Wooden Post"
  },
  {
    "id": "halloween_pumpkin_orange_jacko",
    "file": "kaykit_halloween/Pumpkin Orange Jacko.glb",
    "category": "halloween",
    "defaultName": "Pumpkin Jack O'Lantern"
  },
  {
    "id": "halloween_pumpkin",
    "file": "kaykit_halloween/Pumpkin.glb",
    "category": "halloween",
    "defaultName": "Pumpkin (Plain)"
  },
  {
    "id": "halloween_ribcage",
    "file": "kaykit_halloween/Ribcage.glb",
    "category": "halloween",
    "defaultName": "Ribcage Skeleton"
  },
  {
    "id": "halloween_rocks",
    "file": "kaykit_halloween/Rocks.glb",
    "category": "halloween",
    "defaultName": "Rocks / Stones"
  },
  {
    "id": "halloween_shrine_1",
    "file": "kaykit_halloween/Shrine-Qq8M5LSXQ2.glb",
    "category": "halloween",
    "defaultName": "Shrine 1"
  },
  {
    "id": "halloween_shrine",
    "file": "kaykit_halloween/Shrine.glb",
    "category": "halloween",
    "defaultName": "Shrine / Altar"
  },
  {
    "id": "halloween_skull_candle",
    "file": "kaykit_halloween/Skull Candle.glb",
    "category": "halloween",
    "defaultName": "Skull with Candle"
  },
  {
    "id": "halloween_skull",
    "file": "kaykit_halloween/Skull.glb",
    "category": "halloween",
    "defaultName": "Skull"
  },
  {
    "id": "halloween_small_dead_tree",
    "file": "kaykit_halloween/Small Dead tree.glb",
    "category": "halloween",
    "defaultName": "Small Dead Tree"
  },
  {
    "id": "halloween_small_pumpkin_1",
    "file": "kaykit_halloween/Small Pumpkin-KnfqSrTtUX.glb",
    "category": "halloween",
    "defaultName": "Small Pumpkin 1"
  },
  {
    "id": "halloween_small_pumpkin",
    "file": "kaykit_halloween/Small Pumpkin.glb",
    "category": "halloween",
    "defaultName": "Small Pumpkin"
  },
  {
    "id": "halloween_tree_dead_large",
    "file": "kaykit_halloween/Tree Dead Large Deco.glb",
    "category": "halloween",
    "defaultName": "Large Dead Tree"
  },
  {
    "id": "halloween_yellow_pumpkin",
    "file": "kaykit_halloween/Yellow pumpkin.glb",
    "category": "halloween",
    "defaultName": "Yellow Pumpkin"
  },
  {
    "id": "halloween_angel_statue",
    "file": "kaykit_halloween/AngelStatue by Zsky - 6v4CL0nKfT.glb",
    "category": "halloween",
    "defaultName": "Angel Statue (Zsky)"
  },
  {
    "id": "halloween_hero_statue",
    "file": "kaykit_halloween/Statue by Zsky - gieXYyUTYr.glb",
    "category": "halloween",
    "defaultName": "Hero Statue (Zsky)"
  },
  {
    "id": "halloween_stag_statue",
    "file": "kaykit_halloween/Stag Statue by Quaternius - cKloIsNcT8.glb",
    "category": "halloween",
    "defaultName": "Stag Totem Statue (Quaternius)"
  }
];

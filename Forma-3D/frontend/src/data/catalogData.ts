import { CatalogCategory, CatalogItem } from '../types';

/**
 * @file catalogData.ts
 * @module data/catalogData
 * @description Comprehensive catalog definition of all 3D furniture, structural architectural blocks,
 * portals, environment terrains, and decorative models with clean standardized naming and indexing.
 * 
 * @author 3D Furniture Configurator Team
 */

export const catalogCategories: CatalogCategory[] = [
  { id: 'all', key: 'all' },
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
  }
];

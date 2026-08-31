import { CatalogCategory, CatalogItem } from '../types';

/**
 * @file catalogData.ts
 * @module data/catalogData
 * @description Comprehensive catalog definition of all 3D furniture, structural architectural blocks,
 * portals, environment terrains, and decorative models with clean standardized naming and indexing.
 */

export const catalogCategories: CatalogCategory[] = [
  { id: 'necropolis', key: 'necropolis' }
];


export const catalogItems: CatalogItem[] = [
  // ── 1. Crypt & Architecture (11 items) ──
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

  // ── 2. Graves & Tombs (11 items) ──
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

  // ── 3. Fences & Gates (9 items) ──
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

  // ── 4. Trees & Nature (11 items) ──
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

  // ── 5. Lighting & Atmosphere (9 items) ──
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

  // ── 6. Decor & Relics (15 items) ──
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

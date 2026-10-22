/**
 * tacticalLandmarks.ts — the only data source for the tactical map.
 *
 * Previously MiniRadar kept LANDMARKS with hardcoded coordinates, and three
 * project pins (Forma-3D, TerraScope, Lumina) used STALE positions: after
 * the map was rebuilt they collapsed into the center and overlapped each other. Here
 * positions come from NPC_POSITIONS (the same resolver as physics, markers
 * and radar).
 *
 * The map shows only the crew: the shuttle is ordinary world decoration, not a route
 * point, so it is intentionally NOT included in the landmarks (the "S" pin and the "DOCKED"
 * line were removed). Its silhouette is no longer drawn on the schematic either.
 *
 * The map is a derivative of the authored map, not a separate list. After any
 * `node scripts/importGameMap.mjs` the coordinates, order and statuses are recalculated
 * automatically; nothing needs manual synchronization.
 */

import rawIslandSceneData from './islandScene.json';
import type { IslandSceneData } from '../types/scene';
import { NPC_DIALOGUES } from './npcDialogues';
import { NPC_POSITIONS } from './npcPlacements';
import { ZONES, ZONE_ORDER, ZoneId } from './zones';
import type { MaterialKey, NPCId } from '../types/store';

const islandSceneData = rawIslandSceneData as unknown as IslandSceneData;

export interface TacticalLabel {
  en: string;
  uk: string;
}

export interface TacticalLandmark {
  /** NPC id: the map shows only the crew. */
  id: string;
  zoneId: ZoneId;
  crewId: NPCId;
  /** Visit order 1..6 — also the number on the pin. */
  order: number;
  name: TacticalLabel;
  sector: TacticalLabel;
  role: TacticalLabel;
  color: string;
  x: number;
  z: number;
  targetType: 'modal' | 'project';
  targetKey: MaterialKey;
}

/** Map normalization: the last 0.44 of width/height — from center to edge. */
export const TACTICAL_MAP_SPREAD_PERCENT = 44;

/** Half-span of the authored map over actual placements (usually 30). */
export const ISLAND_SPAN = (() => {
  let max = 13;
  for (const o of islandSceneData.placedObjects ?? []) {
    max = Math.max(max, Math.abs(o.position[0]), Math.abs(o.position[2]));
  }
  return Math.ceil(max) + 1;
})();

const crewLandmarks: TacticalLandmark[] = ZONE_ORDER.map((zoneId) => {
  const zone = ZONES[zoneId];
  const npc = NPC_DIALOGUES[zone.crewId];
  const pos = NPC_POSITIONS.get(zone.crewId) ?? zone.position;
  return {
    id: zone.crewId,
    zoneId,
    crewId: zone.crewId,
    order: zone.order,
    name: npc.name,
    sector: zone.name,
    role: npc.role,
    color: zone.hexColor,
    x: pos[0],
    z: pos[2],
    targetType: npc.targetType,
    targetKey: npc.targetKey
  };
});

/**
 * Map = crew in visit order. The shuttle was removed from landmarks: it is decoration
 * of the starting pad, not a route point, and the pin with its legend only distracted
 * from the six sectors.
 */
export const CREW_LANDMARKS = crewLandmarks;

/** World point → percentages on a square map (x right, z down). */
export function worldToMapPercent(x: number, z: number): { left: number; top: number } {
  return {
    left: 50 + (x / ISLAND_SPAN) * TACTICAL_MAP_SPREAD_PERCENT,
    top: 50 + (z / ISLAND_SPAN) * TACTICAL_MAP_SPREAD_PERCENT
  };
}

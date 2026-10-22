/**
 * tacticalLandmarks.ts — единственный источник данных для тактической карты.
 *
 * Раньше MiniRadar держал LANDMARKS с захардкоженными координатами, и три
 * пина проектов (Forma-3D, TerraScope, Lumina) брали СТАРЫЕ позиции: после
 * пересборки карты они сбивались в центр и налезали друг на друга. Здесь
 * позиции берутся из NPC_POSITIONS (тот же резолвер, что у физики, маркеров
 * и радара).
 *
 * На карте только экипаж: шаттл — обычная декорация мира, а не точка маршрута,
 * поэтому в лендмарки он намеренно НЕ входит (пин с «S» и строка «DOCKED»
 * убраны). Его силуэт на схеме тоже больше не рисуется.
 *
 * Карта — производная авторской карты, а не отдельный список. После любого
 * `node scripts/importGameMap.mjs` координаты, порядок и статусы пересчитаются
 * сами; руками ничего синхронизировать не нужно.
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
  /** NPC id: карта показывает только экипаж. */
  id: string;
  zoneId: ZoneId;
  crewId: NPCId;
  /** Порядок обхода 1..6 — он же номер на пине. */
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

/** Нормализация карты: последний 0.44 ширины/высоты — от центра к краю. */
export const TACTICAL_MAP_SPREAD_PERCENT = 44;

/** Полуразмах авторской карты по фактическим размещениям (обычно 30). */
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
 * Карта = экипаж в порядке обхода. Шаттл из лендмарков удалён: это декорация
 * стартовой площадки, а не точка маршрута, и пин с легендой только отвлекали
 * от шести секторов.
 */
export const CREW_LANDMARKS = crewLandmarks;

/** Мировая точка → проценты на квадратной карте (x вправо, z вниз). */
export function worldToMapPercent(x: number, z: number): { left: number; top: number } {
  return {
    left: 50 + (x / ISLAND_SPAN) * TACTICAL_MAP_SPREAD_PERCENT,
    top: 50 + (z / ISLAND_SPAN) * TACTICAL_MAP_SPREAD_PERCENT
  };
}

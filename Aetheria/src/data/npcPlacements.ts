/**
 * npcPlacements.ts — где на карте реально стоит каждый член экипажа.
 *
 * Единственный резолвер позиции: размещение из islandScene.json ПОБЕЖДАЕТ то,
 * что лежит в npcDialogues (там оно запасное и синхронизируется вручную), ровно
 * как это делают физика и радар. Пока резолвер был один, расхождений не было;
 * как только маркеры над головами начали считать позицию сами, появился третий
 * независимый ответ на вопрос «где NPC», и он мог разъехаться с двумя другими.
 *
 * Отдельный модуль, а не экспорт из WorldScene: маркеры монтируются ВНУТРИ
 * WorldScene, и импорт оттуда дал бы цикл.
 */

import rawIslandSceneData from './islandScene.json';
import { IslandSceneData } from '../types/scene';
import { NPC_DIALOGUES } from './npcDialogues';
import { NPCId } from '../types/store';

const islandSceneData = rawIslandSceneData as unknown as IslandSceneData;

/** npcId → позиция в мире. Первое совпадение по файлу модели, как и раньше. */
export const NPC_POSITIONS: Map<NPCId, readonly [number, number, number]> = new Map(
  Object.values(NPC_DIALOGUES).map((npc) => {
    const placed = islandSceneData.placedObjects?.find((po) =>
      po.modelPath.endsWith('/' + npc.modelFile)
    );
    return [npc.id, placed ? placed.position : npc.position] as const;
  })
);

/**
 * npcPlacements.ts — where each crew member actually stands on the map.
 *
 * The single position resolver: the placement from islandScene.json WINS over what
 * is stored in npcDialogues (there it is a fallback and is synchronized manually),
 * exactly as physics and radar do it. While there was a single resolver, there were no
 * discrepancies; as soon as the markers above heads started computing position themselves,
 * a third independent answer to the question "where is the NPC" appeared, and it could diverge from the other two.
 *
 * A separate module rather than an export from WorldScene: markers are mounted INSIDE
 * WorldScene, and importing from there would create a cycle.
 */

import rawIslandSceneData from './islandScene.json';
import { IslandSceneData } from '../types/scene';
import { NPC_DIALOGUES } from './npcDialogues';
import { NPCId } from '../types/store';

const islandSceneData = rawIslandSceneData as unknown as IslandSceneData;

/** npcId → world position. First match by model file, as before. */
export const NPC_POSITIONS: Map<NPCId, readonly [number, number, number]> = new Map(
  Object.values(NPC_DIALOGUES).map((npc) => {
    const placed = islandSceneData.placedObjects?.find((po) =>
      po.modelPath.endsWith('/' + npc.modelFile)
    );
    return [npc.id, placed ? placed.position : npc.position] as const;
  })
);

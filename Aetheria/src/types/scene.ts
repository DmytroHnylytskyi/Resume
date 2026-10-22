/**
 * scene.ts — schema of the authored outpost scene.
 * `IslandSceneData` mirrors src/data/islandScene.json (spawn point and placed
 * objects). `DossierKey` is the modal key used by the crew dossier actions:
 * bio, skills and contacts.
 */

export type DossierKey = 'bio' | 'skills' | 'contacts';

export interface PlacedObject {
  id: string;
  modelPath: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number | [number, number, number];
  hiddenParts?: string[];
  colors?: Record<string, string>;
}

export interface IslandSceneData {
  version: string;
  timestamp: string;
  projectName: string;
  spawnPoint: [number, number, number];
  /** Initial camera/character yaw (radians). Optional for older maps. */
  spawnYaw?: number;
  placedObjects: PlacedObject[];
}

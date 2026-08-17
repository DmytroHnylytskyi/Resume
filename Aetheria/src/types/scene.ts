export type StatueKey = 'bio' | 'skills' | 'contacts';
export type PortalKey = 'forma' | 'terrascope' | 'lumina';

export interface PlacedObject {
  id: string;
  modelPath: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number | [number, number, number];
  type?: 'prop' | 'statue' | 'portal';
  statueKey?: StatueKey;
  portalKey?: PortalKey;
  colors?: Record<string, string>;
}

export interface IslandSceneData {
  version: string;
  timestamp: string;
  projectName: string;
  spawnPoint: [number, number, number];
  placedObjects: PlacedObject[];
}

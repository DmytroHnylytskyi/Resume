export type StatueKey = 'bio' | 'contacts' | 'skills';
export type PortalKey = 'globescope' | 'furniture' | 'minilms';

export interface PlacedObject {
  id: string;
  modelPath: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number | [number, number, number];
  colors?: Record<string, string>;
  type?: 'statue' | 'portal' | 'terrain' | 'prop';
  statueKey?: StatueKey;
  portalKey?: PortalKey;
}

export interface IslandSceneData {
  version: string;
  timestamp: string;
  projectName: string;
  spawnPoint: [number, number, number];
  placedObjects: PlacedObject[];
}

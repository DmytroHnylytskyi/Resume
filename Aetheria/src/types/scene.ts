/**
 * 3D Scene Data Types & Geometry Contracts:
 * - Lumina (Microlearning Platform)
 * - Forma 3D (Spatial Interior Studio)
 * - TerraScope (3D Earth & Geospatial Analytics)
 */

export type StatueKey = 'bio' | 'contacts' | 'skills';

export type PortalKey = 'forma' | 'terrascope' | 'lumina';

export interface PlacedObject {
  id: string;
  modelPath: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number | [number, number, number];
  type?: 'terrain' | 'statue' | 'portal' | 'decoration';
  statueKey?: StatueKey;
  portalKey?: PortalKey;
  colors?: Record<string, string>;
  name?: string;
}

export interface IslandSceneData {
  spawnPoint: [number, number, number];
  placedObjects: PlacedObject[];
}

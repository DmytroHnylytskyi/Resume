import * as THREE from 'three';

export interface CatalogCategory {
  id: string;
  key: string;
}

export interface CatalogItem {
  id: string;
  file: string;
  category: string;
  defaultName: string;
}

export interface PlacedObject {
  id: string;
  modelPath: string;
  name?: string;
  nodeName?: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  colors?: Record<string, string>;
  hiddenParts?: string[];
}

export type TransformMode = 'translate' | 'rotate' | 'scale';
export type LightMode = 'day' | 'night';
export type AuthMode = 'login' | 'register';
export type ActiveMode = 'example' | 'custom';

export interface UserProfile {
  id: number;
  email: string;
  name: string;
}

export interface CloudProject {
  id: number;
  name: string;
  data: string;
  created_at: string;
  updated_at: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface NormalizeResult {
  wrapper: THREE.Group;
  normalizedScale: number;
}

export interface FormaStore {
  token: string | null;
  user: UserProfile | null;
  authMode: AuthMode | null;
  setAuthMode: (mode: AuthMode | null) => void;
  setToken: (token: string | null) => void;
  setUser: (user: UserProfile | null) => void;
  logout: () => void;

  lightMode: LightMode;
  toggleLightMode: () => void;
  snapToGrid: boolean;
  gridSize: number;
  toggleSnapToGrid: () => void;
  transformMode: TransformMode;
  setTransformMode: (mode: TransformMode) => void;
  activeMode: ActiveMode;
  currentProjectName: string;

  placedObjects: PlacedObject[];
  selectedObjectId: string | null;
  selectedObjectPart: string | null;
  setSelectedObjectId: (id: string | null) => void;
  setSelectedObjectPart: (part: string | null) => void;
  selectedPart: string | null;
  setSelectedPart: (part: string | null) => void;
  colors: Record<string, string>;
  updateColor: (part: string, color: string) => void;

  placingModelPath: string | null;
  placingObjectColors: Record<string, string>;
  placingObjectScale: number;
  startPlacement: (modelPath: string, colors?: Record<string, string>, scale?: number) => void;
  cancelPlacement: () => void;
  commitPlacement: (position: [number, number, number], rotation?: [number, number, number]) => void;
  addPlacedObject: (obj: PlacedObject) => void;
  updatePlacedObject: (id: string, updates: Partial<PlacedObject>) => void;

  duplicatePlacedObject: (id?: string) => void;
  rotateSelectedObject: (degrees: number) => void;
  scaleSelectedObject: (multiplier: number) => void;
  setSelectedObjectScale: (scaleValue: number) => void;
  updateObjectColor: (id: string, partName: string, color: string) => void;
  removePlacedObject: (id?: string) => void;
  clearAllPlacedObjects: () => void;

  loadAntiquePalace: () => void;
  loadEmptyCanvas: () => void;
  loadUserProject: (project: CloudProject) => void;
  saveToLocalStorage: () => boolean;
  loadFromLocalStorage: () => boolean;
  exportJSON: () => void;
  importJSON: (jsonString: string) => boolean;

  toasts: Toast[];
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

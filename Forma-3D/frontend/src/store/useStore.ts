/**
 * @file useStore.ts
 * @module store/useStore
 * @description Centralized Zustand state management store for the Forma-3D Spatial Configurator application.
 * Manages 3D object scene hierarchy, active selection state, transform modes (Translate/Rotate/Scale),
 * interactive placement engine, custom material color mapping, daytime/nighttime atmosphere presets,
 * magnet grid snapping, localStorage auto-save, JSON project import/export, and FastAPI user authentication.
 */

import { create } from 'zustand';
import { FormaStore, PlacedObject, CloudProject } from '../types';

/**
 * Zustand State Store Hook.
 */
export const useStore = create<FormaStore>()((set, get) => ({
  // ---------------------------------------------------------------------------
  // User Authentication & Cloud Profile State
  // ---------------------------------------------------------------------------
  
  /** @type {string | null} JWT Bearer Access Token string */
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  
  /** @type {Object | null} Authenticated user profile record */
  user: null,

  /** @type {'login' | 'register' | null} State controlling auth modal visibility and active tab */
  authMode: null,

  /** Sets active auth modal mode */
  setAuthMode: (mode) => set({ authMode: mode }),

  /** Sets JWT access token and persists to localStorage */
  setToken: (token) => {
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('token', token);
      else localStorage.removeItem('token');
    }
    set({ token });
  },

  /** Sets active user profile object */
  setUser: (user) => set({ user }),

  /** Logouts user, clears JWT token and user profile state */
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    set({ token: null, user: null });
  },

  // ---------------------------------------------------------------------------
  // 3D Scene Environment & Viewport State
  // ---------------------------------------------------------------------------

  /** @type {'day' | 'night'} Active environment lighting preset */
  lightMode: 'day',

  /** Toggles light mode between warm day sun and cool night environment */
  toggleLightMode: () => set((state) => ({ 
    lightMode: state.lightMode === 'day' ? 'night' : 'day' 
  })),

  /** @type {boolean} Magnet grid snapping toggle state */
  snapToGrid: true,

  /** @type {number} Magnet grid step size in meters (0.5m) */
  gridSize: 0.5,

  /** Toggles magnet grid snapping on/off */
  toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),

  /** @type {'translate' | 'rotate' | 'scale'} Active TransformControls gizmo mode */
  transformMode: 'translate',

  /** Sets active transform gizmo mode */
  setTransformMode: (mode) => set({ transformMode: mode }),

  /** @type {'custom'} Active project workspace mode */
  activeMode: 'custom',

  /** @type {string} Human-readable current project title */
  currentProjectName: 'Forma 3D Workspace',

  // ---------------------------------------------------------------------------
  // 3D Scene Objects & Selection Hierarchy
  // ---------------------------------------------------------------------------

  /** @type {PlacedObject[]} List of all active placed 3D objects in scene */
  placedObjects: [],

  /** @type {string | null} Currently selected object UUID string */
  selectedObjectId: null,

  /** @type {string | null} Currently selected object sub-mesh node name */
  selectedObjectPart: null,

  /** Sets selected object UUID */
  setSelectedObjectId: (id) => set({ selectedObjectId: id, selectedObjectPart: null }),

  /** Sets selected object sub-mesh node name */
  setSelectedObjectPart: (part) => set({ selectedObjectPart: part }),

  /** Legacy single-part color selection backwards compatibility */
  selectedPart: null,
  setSelectedPart: (part) => set({ selectedPart: part }),

  /** Global scene material color map */
  colors: {
    wall: '#ffffff',
    floor: '#e5e7eb',
    door: '#8b5cf6',
    window: '#3b82f6',
    baseboard: '#6b7280',
  },

  /** Updates material color in global scene color map */
  updateColor: (part, color) => set((state) => ({
    colors: { ...state.colors, [part]: color }
  })),

  // ---------------------------------------------------------------------------
  // Interactive 3D Object Placement Engine
  // ---------------------------------------------------------------------------

  /** @type {string | null} Relative URL path to GLB model currently being placed under mouse raycaster */
  placingModelPath: null,

  /** @type {Object.<string, string>} Custom color map for active placement model */
  placingObjectColors: {},

  /** @type {number} Scale factor for active placement model */
  placingObjectScale: 1,

  /**
   * Enters placement mode for a specific 3D model asset.
   * @param {string} modelPath - Relative path to GLB model file.
   * @param {Object.<string, string>} [colors={}] - Optional custom color map.
   * @param {number} [scale=1] - Optional scale factor.
   */
  startPlacement: (modelPath, colors = {}, scale = 1) => set({ 
    placingModelPath: modelPath, 
    placingObjectColors: colors,
    placingObjectScale: scale,
    selectedObjectId: null, 
    selectedObjectPart: null 
  }),

  /** Cancels active object placement mode */
  cancelPlacement: () => set({ 
    placingModelPath: null,
    placingObjectColors: {},
    placingObjectScale: 1
  }),

  /**
   * Commits placement of an object at specified floor coordinates and rotation.
   * @param {[number, number, number]} position - [x, y, z] target coordinates.
   * @param {[number, number, number]} [rotation=[0, 0, 0]] - [rx, ry, rz] initial rotation.
   */
  commitPlacement: (position, rotation = [0, 0, 0]) => set((state) => {
    if (!state.placingModelPath) return state;
    const newId = crypto.randomUUID();
    const newObj: PlacedObject = {
      id: newId,
      modelPath: state.placingModelPath,
      position,
      rotation,
      scale: state.placingObjectScale || 1,
      hiddenParts: [],
      colors: state.placingObjectColors ? { ...state.placingObjectColors } : {}
    };
    return {
      placedObjects: [...state.placedObjects, newObj],
      selectedObjectId: null,
      selectedObjectPart: null,
      placingModelPath: null,
      placingObjectColors: {},
      placingObjectScale: 1
    };
  }),

  /**
   * Directly appends an object to the scene array and selects it.
   * @param {PlacedObject} obj - Prepared object payload.
   */
  addPlacedObject: (obj: PlacedObject) => set((state) => ({ 
    placedObjects: [...state.placedObjects, obj],
    selectedObjectId: obj.id,
    selectedObjectPart: null
  })),

  /**
   * Updates properties of a placed object by UUID.
   * @param {string} id - Object UUID.
   * @param {Partial<PlacedObject>} updates - Object properties to mutate.
   */
  updatePlacedObject: (id: string, updates: Partial<PlacedObject>) => set((state) => ({
    placedObjects: state.placedObjects.map(obj => 
      obj.id === id ? { ...obj, ...updates } : obj
    )
  })),

  // ---------------------------------------------------------------------------
  // Object Modification Actions (Clone, Rotate, Scale, Color, Remove)
  // ---------------------------------------------------------------------------

  /**
   * Duplicates (clones) an object by entering Placement Mode under cursor with preserved scale and colors.
   * @param {string} [id] - Optional target object UUID; defaults to selectedObjectId.
   */
  duplicatePlacedObject: (id) => set((state) => {
    const targetId = (typeof id === 'string' && id) ? id : state.selectedObjectId;
    if (!targetId) return state;
    const obj = state.placedObjects.find(o => o.id === targetId);
    if (!obj) return state;
    
    return {
      placingModelPath: obj.modelPath,
      placingObjectColors: obj.colors ? { ...obj.colors } : {},
      placingObjectScale: obj.scale || 1,
      selectedObjectId: null,
      selectedObjectPart: null
    };
  }),

  /**
   * Rotates selected object around Y-axis by specified degrees.
   * @param {number} degrees - Angle step in degrees (e.g. +90, -45, 180).
   */
  rotateSelectedObject: (degrees) => set((state) => {
    if (!state.selectedObjectId) return state;
    const radians = (degrees * Math.PI) / 180;
    return {
      placedObjects: state.placedObjects.map(obj => {
        if (obj.id === state.selectedObjectId) {
          const currentY = obj.rotation ? obj.rotation[1] : 0;
          return {
            ...obj,
            rotation: [obj.rotation[0] || 0, (currentY + radians) % (Math.PI * 2), obj.rotation[2] || 0]
          };
        }
        return obj;
      })
    };
  }),

  /**
   * Multiplies scale of selected object by a factor (clamped between 0.1x and 10x).
   * @param {number} multiplier - Scale multiplier (e.g. 1.25, 0.8).
   */
  scaleSelectedObject: (multiplier) => set((state) => {
    if (!state.selectedObjectId) return state;
    return {
      placedObjects: state.placedObjects.map(obj => {
        if (obj.id === state.selectedObjectId) {
          const newScale = Math.max(0.1, Math.min(10, (obj.scale || 1) * multiplier));
          return { ...obj, scale: Number(newScale.toFixed(2)) };
        }
        return obj;
      })
    };
  }),

  /**
   * Sets exact scale multiplier for selected object.
   * @param {number} scaleValue - Absolute scale value.
   */
  setSelectedObjectScale: (scaleValue) => set((state) => {
    if (!state.selectedObjectId) return state;
    return {
      placedObjects: state.placedObjects.map(obj => {
        if (obj.id === state.selectedObjectId) {
          return { ...obj, scale: scaleValue };
        }
        return obj;
      })
    };
  }),

  /**
   * Updates color map of a placed object sub-mesh node.
   * @param {string} id - Object UUID.
   * @param {string} partName - Sub-mesh node name.
   * @param {string} color - Hex color code string.
   */
  updateObjectColor: (id, partName, color) => set((state) => ({
    placedObjects: state.placedObjects.map(obj => {
      if (obj.id === id) {
        return {
          ...obj,
          colors: {
            ...obj.colors,
            [partName]: color
          }
        };
      }
      return obj;
    })
  })),

  /**
   * Removes placed object by UUID string.
   * @param {string} [id] - Optional target object UUID; defaults to selectedObjectId.
   */
  removePlacedObject: (id) => set((state) => {
    const targetId = (typeof id === 'string' && id) ? id : state.selectedObjectId;
    if (!targetId) return state;
    return {
      placedObjects: state.placedObjects.filter(obj => obj.id !== targetId),
      selectedObjectId: state.selectedObjectId === targetId ? null : state.selectedObjectId,
      selectedObjectPart: state.selectedObjectId === targetId ? null : state.selectedObjectPart
    };
  }),

  /** Clears all placed 3D objects from scene */
  clearAllPlacedObjects: () => set({ 
    placedObjects: [], 
    selectedObjectId: null, 
    selectedObjectPart: null 
  }),

  // ---------------------------------------------------------------------------
  // Project Persistence Actions (localStorage & Cloud DB)
  // ---------------------------------------------------------------------------

  /**
   * Loads project configuration fetched from FastAPI cloud database.
   * @param {Object} project - Cloud project record containing `name` and `data` JSON string.
   */
  loadUserProject: (project: CloudProject) => {
    try {
      const parsedObjects = JSON.parse(project.data);
      if (Array.isArray(parsedObjects)) {
        set({
          placedObjects: parsedObjects,
          activeMode: 'custom',
          currentProjectName: project.name,
          selectedObjectId: null,
          selectedObjectPart: null
        });
      }
    } catch (err) {
      console.error('Error parsing cloud project payload:', err);
    }
  },

  /**
   * Saves current 3D layout to browser localStorage.
   * @returns {boolean} True if saved successfully.
   */
  saveToLocalStorage: () => {
    if (typeof window === 'undefined') return false;
    try {
      const state = get();
      const payload = {
        placedObjects: state.placedObjects,
        currentProjectName: state.currentProjectName,
        activeMode: state.activeMode
      };
      localStorage.setItem('3d_furniture_scene', JSON.stringify(payload));
      return true;
    } catch (err) {
      console.error('Error saving scene to localStorage:', err);
      return false;
    }
  },

  /**
   * Loads saved 3D layout from browser localStorage.
   * @returns {boolean} True if loaded successfully.
   */
  loadFromLocalStorage: () => {
    if (typeof window === 'undefined') return false;
    try {
      const data = localStorage.getItem('3d_furniture_scene');
      if (!data) return false;
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.placedObjects)) {
        set({
          placedObjects: parsed.placedObjects,
          currentProjectName: parsed.currentProjectName || 'Моє Збереження',
          activeMode: parsed.activeMode || 'custom',
          selectedObjectId: null,
          selectedObjectPart: null
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error loading scene from localStorage:', err);
      return false;
    }
  },

  /** Exports current 3D scene configuration to formatted JSON file download */
  exportJSON: () => {
    const state = get();
    const payload = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      projectName: state.currentProjectName,
      placedObjects: state.placedObjects
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.currentProjectName.replace(/\s+/g, '_')}_3d_scene.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Imports scene layout from JSON string payload.
   * @param {string} jsonString - Formatted JSON file content.
   * @returns {boolean} True if imported successfully.
   */
  importJSON: (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && Array.isArray(parsed.placedObjects)) {
        set({
          placedObjects: parsed.placedObjects,
          currentProjectName: parsed.projectName || 'Імпортований Проєкт',
          activeMode: 'custom',
          selectedObjectId: null,
          selectedObjectPart: null
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error importing JSON file:', err);
      return false;
    }
  },

  // ---------------------------------------------------------------------------
  // Toasts System
  // ---------------------------------------------------------------------------
  toasts: [],
  addToast: (message, type) => set((state) => ({
    toasts: [...state.toasts, { id: crypto.randomUUID(), message, type }]
  })),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),

  // ---------------------------------------------------------------------------
  // Client-Side i18n System (0ms Instant Switch)
  // ---------------------------------------------------------------------------
  locale: (typeof window !== 'undefined' && (localStorage.getItem('forma_locale') as 'en' | 'uk')) || 'uk',
  setLocale: (newLocale) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('forma_locale', newLocale);
      const currentPath = window.location.pathname;
      let cleanPath = currentPath;
      if (cleanPath.startsWith('/en') || cleanPath.startsWith('/uk')) {
        cleanPath = cleanPath.slice(3) || '';
      }
      const targetUrl = `/${newLocale}${cleanPath.startsWith('/') ? cleanPath : (cleanPath ? `/${cleanPath}` : '')}`;
      window.history.replaceState(null, '', targetUrl);
    }
    set({ locale: newLocale });
  },
  toggleLocale: () => {
    const current = get().locale;
    const nextLocale = current === 'en' ? 'uk' : 'en';
    get().setLocale(nextLocale);
  }
}));

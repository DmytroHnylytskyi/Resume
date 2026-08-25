import { create } from 'zustand';

/**
 * @typedef {Object} LayerState
 * @property {boolean} enabled - Whether the layer is active on the 3D globe.
 * @property {any} data - Fetched payload data for the layer.
 * @property {boolean} loading - Loading indicator status.
 * @property {string|null} error - Error message string if fetch fails.
 * @property {Object} filters - Active filter parameters for querying layer endpoints.
 */

/**
 * Global Zustand application store for TerraScope.
 * Manages 3D globe data layers, active inspection selections, camera targets,
 * map display modes (day/night/dynamic/political), and user authentication state.
 */
const useStore = create((set) => ({
  /** @type {Object.<string, LayerState>} Data layers configuration and payload registry */
  layers: {
    earthquakes: { enabled: false, data: null, loading: false, error: null, filters: { period: '7days', minMagnitude: 2.5 } },
    flights: { enabled: false, data: null, loading: false, error: null, filters: {} },
    weather: { enabled: false, data: null, loading: false, error: null, filters: { metric: 'temperature' } },
    countries: { enabled: false, data: null, loading: false, error: null, filters: { metric: 'population' } },
    neo: { enabled: false, data: null, loading: false, error: null, filters: { onlyHazardous: false } },
  },

  /** @type {{type: string, data: any}|null} Currently selected 3D marker object for DetailPanel inspection */
  selectedItem: null,
  /** @type {boolean} Controls visibility of the right inspection DetailPanel */
  detailPanelOpen: false,
  /** @type {boolean} Controls visibility of the left LayerPanel drawer */
  layerPanelOpen: true,
  /** @type {boolean} Controls auto-rotation of the 3D Earth sphere */
  autoRotate: true,
  /** @type {'day'|'night'|'dynamic'|'political'} Active surface map mode */
  dayNightMode: 'dynamic',
  /** @type {boolean} Indicates whether WebGL Canvas and 3D Earth have initialized */
  globeReady: false,
  /** @type {number} Current rendering Frames-Per-Second metric */
  fps: 0,

  /** @type {{lat: number, lng: number, zoom: number}|null} Targeted camera coordinates for smooth Lerp navigation */
  cameraTarget: null,

  /** @type {{email: string}|null} Authenticated user profile object */
  user: null,
  /** @type {string|null} OAuth2 JWT Bearer access token string */
  token: null,

  /** Hydrates stored auth token and profile from localStorage on client mount */
  initAuth: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('terrascope_token') || localStorage.getItem('globescope_token');
      const userStr = localStorage.getItem('terrascope_user') || localStorage.getItem('globescope_user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({ user, token });
        } catch (e) {
          localStorage.removeItem('terrascope_token');
          localStorage.removeItem('terrascope_user');
          localStorage.removeItem('globescope_token');
          localStorage.removeItem('globescope_user');
        }
      }
    }
  },

  /**
   * Toggles activation state of a specific data layer by name.
   * @param {string} layerName - Name of the layer ('earthquakes', 'flights', 'weather', 'neo')
   */
  toggleLayer: (layerName) => set((state) => ({
    layers: {
      ...state.layers,
      [layerName]: { ...state.layers[layerName], enabled: !state.layers[layerName].enabled }
    }
  })),

  /**
   * Updates fetched dataset payload for a layer.
   * @param {string} layerName
   * @param {any} data
   */
  setLayerData: (layerName, data) => set((state) => ({
    layers: {
      ...state.layers,
      [layerName]: { ...state.layers[layerName], data, loading: false, error: null }
    }
  })),

  /**
   * Sets loading spinner status for a layer.
   * @param {string} layerName
   * @param {boolean} loading
   */
  setLayerLoading: (layerName, loading) => set((state) => ({
    layers: {
      ...state.layers,
      [layerName]: { ...state.layers[layerName], loading }
    }
  })),

  /**
   * Sets error state for a layer.
   * @param {string} layerName
   * @param {string} error
   */
  setLayerError: (layerName, error) => set((state) => ({
    layers: {
      ...state.layers,
      [layerName]: { ...state.layers[layerName], error, loading: false }
    }
  })),

  /**
   * Updates specific query filter for a layer (e.g. minMagnitude for earthquakes).
   * @param {string} layerName
   * @param {string} filterKey
   * @param {any} value
   */
  updateLayerFilter: (layerName, filterKey, value) => set((state) => ({
    layers: {
      ...state.layers,
      [layerName]: {
        ...state.layers[layerName],
        filters: { ...state.layers[layerName].filters, [filterKey]: value }
      }
    }
  })),

  /**
   * Selects a 3D marker for inspection and opens DetailPanel.
   * @param {string} type - Item category ('earthquake', 'flight', 'weather', 'country', 'neo')
   * @param {any} data - Associated metadata object
   */
  selectItem: (type, data) => set({ selectedItem: { type, data }, detailPanelOpen: true }),
  
  /** Clears active selection and closes DetailPanel */
  clearSelection: () => set({ selectedItem: null, detailPanelOpen: false }),
  
  /**
   * Sets targeted camera position and halts auto-rotation.
   * @param {{lat: number, lng: number, zoom: number}} target
   */
  setCameraTarget: (target) => set({ cameraTarget: target, autoRotate: false }),

  /**
   * Sets authenticated user credentials and token, saving to localStorage.
   * @param {Object} user
   * @param {string} token
   */
  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('terrascope_token', token);
      if (user) localStorage.setItem('terrascope_user', JSON.stringify(user));
    }
    set({ user, token });
  },

  /** Logs out current user and clears session tokens from localStorage */
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('terrascope_token');
      localStorage.removeItem('terrascope_user');
      localStorage.removeItem('globescope_token');
      localStorage.removeItem('globescope_user');
    }
    set({ user: null, token: null });
  },

  /** Toggles 3D globe auto-rotation */
  toggleAutoRotate: () => set((state) => ({ autoRotate: !state.autoRotate })),

  /**
   * Switches active surface display mode.
   * @param {'day'|'night'|'dynamic'|'political'} mode
   */
  setDayNightMode: (mode) => set({ dayNightMode: mode }),

  /** Toggles left LayerPanel drawer */
  toggleLayerPanel: () => set((state) => ({ layerPanelOpen: !state.layerPanelOpen })),

  /**
   * Updates current FPS metric.
   * @param {number} fps
   */
  setFps: (fps) => set({ fps }),

  /**
   * Sets globe initialization status.
   * @param {boolean} ready
   */
  setGlobeReady: (ready) => set({ globeReady: ready }),
}));

export default useStore;

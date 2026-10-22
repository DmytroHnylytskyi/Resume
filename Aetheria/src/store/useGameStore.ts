import { create } from 'zustand';
import {
  GameState,
  ViewMode,
  ThemeMode,
  CameraMode,
  DossierSnapshot,
  MATERIAL_KEYS,
  MaterialKey,
  NPCId
} from '../types/store';
import { DossierKey } from '../types/scene';
import { Locale } from '../types/portfolio';
import { registerDayNightThemeSync, toggleDayNight } from './dayNightState';
import { getGlobalCyberAudio } from '../hooks/cyberAudio';
import { ZONE_BY_CREW } from '../data/zones';

// ── Crew dossier: persistence ──
// Storage is read and written here, not in page.tsx like theme and language: the dossier
// changes during the game, not once at hydration, so the write must
// happen at the same moment as the state change.
const DOSSIER_STORAGE_KEY = 'aetheria_dossier';

const EMPTY_DOSSIER: DossierSnapshot = { metCrew: [], openedMaterials: [] };

// Identifiers are validated against the sector list: localStorage may contain
// garbage from a previous map version, and it would land directly in the counter and pins.
function isNPCId(value: unknown): value is NPCId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ZONE_BY_CREW, value);
}

function isMaterialKey(value: unknown): value is MaterialKey {
  return typeof value === 'string' && (MATERIAL_KEYS as readonly string[]).includes(value);
}

function readDossier(): DossierSnapshot {
  if (typeof window === 'undefined') return { ...EMPTY_DOSSIER };
  try {
    const raw = window.localStorage.getItem(DOSSIER_STORAGE_KEY);
    if (!raw) return { ...EMPTY_DOSSIER };
    const parsed = JSON.parse(raw) as Partial<DossierSnapshot>;
    return {
      metCrew: Array.isArray(parsed.metCrew) ? parsed.metCrew.filter(isNPCId) : [],
      openedMaterials: Array.isArray(parsed.openedMaterials)
        ? parsed.openedMaterials.filter(isMaterialKey)
        : []
    };
  } catch {
    // Private mode or corrupted JSON — the dossier simply starts over.
    return { ...EMPTY_DOSSIER };
  }
}

function persistDossier(snapshot: DossierSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DOSSIER_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* private mode — the dossier will not survive a reload, but it does not prevent playing */
  }
}

/**
 * useGameStore
 *
 * Central reactive Zustand state store for Aetheria portfolio.
 * Coordinates UI modes, internationalization, theme toggling, modal
 * visibility and 3D interactions.
 */
export const useGameStore = create<GameState>((set) => ({
  // ── Language / Localization ──
  // English is the default entry language (international audience — recruiters,
  // contest juries); visitors can switch to Ukrainian from the HUD at any time.
  language: 'en',
  setLanguage: (lang: Locale) => set({ language: lang }),

  // ── Color Theme (Dark / Light) ──
  // The binary DOM theme is derived from the continuous day/night cycle
  // (dayNightState thresholds); this toggle animates the cycle to the
  // opposite pole through sunset/sunrise instead of flipping instantly.
  theme: 'light',
  setTheme: (theme: ThemeMode) => set({ theme }),
  toggleTheme: () => toggleDayNight(),

  // ── View Mode: 3D WebGL vs Classic Document Resume ──
  viewMode: 'classic',
  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),

  // ── Initial Welcome Mode Selection Modal ──
  // Legacy full-screen welcome gate is retired in favor of the cinematic intro;
  // kept as a store flag because several UI guards branch on it.
  isInitialWelcomeOpen: false,
  setInitialWelcomeOpen: (open: boolean) => set({ isInitialWelcomeOpen: open }),

  // ── Scene Asset Preloader State ──
  isSceneLoaded: false,
  setSceneLoaded: (loaded: boolean) => set({ isSceneLoaded: loaded }),
  isCharacterLoaded: false,
  setCharacterLoaded: (loaded: boolean) => set({ isCharacterLoaded: loaded }),
  isRendererReady: false,
  setRendererReady: (ready: boolean) => set({ isRendererReady: ready }),

  // ── 3D Landmark & Project Modals ──
  activeModal: null,
  setActiveModal: (modal: DossierKey | null) => set({ activeModal: modal }),

  selectedProject: null,
  setSelectedProject: (projectId: string | null) => set({ selectedProject: projectId }),

  // ── Holographic Dialogue State ──
  activeDialogue: null,
  setActiveDialogue: (dialogue) => {
    set({ activeDialogue: dialogue });
    // A conversation is a meeting. We record the meeting here — at the single point
    // where the dialogue actually opens — so the dossier counter cannot
    // diverge from what the player sees on screen.
    if (dialogue?.npcId) useGameStore.getState().markCrewMet(dialogue.npcId);
  },

  // ── Proximity Interaction HUD Prompt ([E] Key) ──
  interactionPrompt: null,
  setInteractionPrompt: (prompt) => set({ interactionPrompt: prompt }),

  // ── Audio & Camera Settings ──
  isAudioMuted: true,
  toggleAudio: () => {
    const currentlyMuted = useGameStore.getState().isAudioMuted;
    const nextEnabled = currentlyMuted;
    void getGlobalCyberAudio().setEnabled(nextEnabled).then((enabled) => {
      useGameStore.setState({ isAudioMuted: !enabled });
    });
  },

  cameraMode: 'third_person',
  setCameraMode: (mode: CameraMode) => set({ cameraMode: mode }),
  toggleCameraMode: () =>
    set((s) => ({ cameraMode: s.cameraMode === 'third_person' ? 'bird_eye' : 'third_person' })),

  // ── Cinematic Intro Swoop ──
  isIntroPlaying: false,
  setIntroPlaying: (playing) => set({ isIntroPlaying: playing }),
  pendingIntro: false,
  setPendingIntro: (pending) => set({ pendingIntro: pending }),
  introTriggerCount: 0,
  triggerIntroSwoop: () => set((s) => ({ introTriggerCount: s.introTriggerCount + 1, isIntroPlaying: true })),

  // ── Tactical Island Map ──
  isTacticalMapOpen: false,
  setTacticalMapOpen: (open: boolean) => set({ isTacticalMapOpen: open }),

  // ── Crew dossier ──
  // Restored from localStorage immediately when the store is created, so the counter does not
  // flicker from zero on every reload.
  ...readDossier(),

  markCrewMet: (npcId) =>
    set((s) => {
      if (s.metCrew.includes(npcId)) return {};
      const metCrew = [...s.metCrew, npcId];
      persistDossier({ metCrew, openedMaterials: s.openedMaterials });
      return { metCrew };
    }),

  markMaterialOpened: (key) =>
    set((s) => {
      if (s.openedMaterials.includes(key)) return {};
      const openedMaterials = [...s.openedMaterials, key];
      persistDossier({ metCrew: s.metCrew, openedMaterials });
      return { openedMaterials };
    }),

  resetDossier: () => {
    persistDossier(EMPTY_DOSSIER);
    set({ metCrew: [], openedMaterials: [] });
  }
}));

// Wire the DOM theme to the continuous day/night cycle (threshold with
// hysteresis — see dayNightState.ts). The setter adopts whatever the cycle
// currently implies, so the store theme stays consistent from first paint.
registerDayNightThemeSync((theme) => useGameStore.setState({ theme }));

import { create } from 'zustand';
import { GameState, ViewMode, ThemeMode, CameraMode } from '../types/store';
import { StatueKey } from '../types/scene';
import { Locale } from '../types/portfolio';
import { registerDayNightThemeSync, toggleDayNight } from './dayNightState';

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
  viewMode: '3d',
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

  // ── 3D Landmark & Project Modals ──
  activeModal: null,
  setActiveModal: (modal: StatueKey | null) => set({ activeModal: modal }),

  selectedProject: null,
  setSelectedProject: (projectId: string | null) => set({ selectedProject: projectId }),

  // ── Proximity Interaction HUD Prompt ([E] Key) ──
  interactionPrompt: null,
  setInteractionPrompt: (prompt) => set({ interactionPrompt: prompt }),

  // ── Secret Levitation Easter Egg Toast ──
  easterEggToast: null,
  setEasterEggToast: (toast) => set({ easterEggToast: toast }),

  // ── Audio & Camera Settings ──
  isAudioMuted: false,
  toggleAudio: () => set((s) => ({ isAudioMuted: !s.isAudioMuted })),

  cameraMode: 'third_person',
  setCameraMode: (mode: CameraMode) => set({ cameraMode: mode }),
  toggleCameraMode: () =>
    set((s) => ({ cameraMode: s.cameraMode === 'third_person' ? 'bird_eye' : 'third_person' })),

  // ── Cinematic Intro Swoop ──
  isIntroPlaying: false,
  setIntroPlaying: (playing) => set({ isIntroPlaying: playing }),
  introTriggerCount: 0,
  triggerIntroSwoop: () => set((s) => ({ introTriggerCount: s.introTriggerCount + 1, isIntroPlaying: true })),

  // ── Tactical Island Map ──
  isTacticalMapOpen: false,
  setTacticalMapOpen: (open: boolean) => set({ isTacticalMapOpen: open })
}));

// Wire the DOM theme to the continuous day/night cycle (threshold with
// hysteresis — see dayNightState.ts). The setter adopts whatever the cycle
// currently implies, so the store theme stays consistent from first paint.
registerDayNightThemeSync((theme) => useGameStore.setState({ theme }));

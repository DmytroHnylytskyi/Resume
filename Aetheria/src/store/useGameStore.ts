import { create } from 'zustand';
import { GameState, ViewMode, ThemeMode } from '../types/store';
import { StatueKey } from '../types/scene';
import { Locale } from '../types/portfolio';

/**
 * useGameStore
 * 
 * Central reactive Zustand state store for Aetheria portfolio.
 * Coordinates UI modes, internationalization, theme toggling, modal visibility, and 3D interactions.
 */
export const useGameStore = create<GameState>((set) => ({
  // ── Language / Localization ──
  language: 'uk',
  setLanguage: (lang: Locale) => set({ language: lang }),

  // ── Color Theme (Dark / Light) ──
  theme: 'dark',
  setTheme: (theme: ThemeMode) => set({ theme }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

  // ── View Mode (3D WebGL vs Classic Document Resume) ──
  viewMode: '3d',
  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),

  // ── Initial Welcome Mode Selection Modal ──
  isInitialWelcomeOpen: true,
  setInitialWelcomeOpen: (open: boolean) => set({ isInitialWelcomeOpen: open }),

  // ── Scene Asset Preloader State ──
  isSceneLoaded: false,
  setSceneLoaded: (loaded: boolean) => set({ isSceneLoaded: loaded }),

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
  setCameraMode: (mode) => set({ cameraMode: mode }),
  toggleCameraMode: () =>
    set((s) => ({ cameraMode: s.cameraMode === 'third_person' ? 'bird_eye' : 'third_person' })),

  // ── Cinematic Intro Swoop ──
  isIntroPlaying: false,
  setIntroPlaying: (playing) => set({ isIntroPlaying: playing }),
  introTriggerCount: 0,
  triggerIntroSwoop: () => set((s) => ({ introTriggerCount: s.introTriggerCount + 1, isIntroPlaying: true }))
}));

/**
 * store.ts — type contract of the central Zustand game store.
 * `GameState` lists every reactive slice (locale, theme, view mode, loading
 * flags, modals, HUD prompt, camera mode) together with its setter actions;
 * the implementation lives in src/store/useGameStore.ts.
 */

import { StatueKey } from './scene';
import { Locale } from './portfolio';

export interface InteractionPrompt {
  title: string;
  action: () => void;
  iconType?: string;
}

export type ViewMode = '3d' | 'classic';
export type ThemeMode = 'dark' | 'light';

export type CameraMode = 'third_person' | 'bird_eye';

export interface GameState {
  // Locale
  language: Locale;
  setLanguage: (lang: Locale) => void;

  // Theme
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;

  // View Mode: 3D interactive vs Classic Web Landing
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Initial Welcome Modal
  isInitialWelcomeOpen: boolean;
  setInitialWelcomeOpen: (open: boolean) => void;

  // Loading state
  isSceneLoaded: boolean;
  setSceneLoaded: (loaded: boolean) => void;
  isCharacterLoaded: boolean;
  setCharacterLoaded: (loaded: boolean) => void;

  // 3D Modals & Prompts
  activeModal: StatueKey | null;
  setActiveModal: (modal: StatueKey | null) => void;
  selectedProject: string | null;
  setSelectedProject: (projectId: string | null) => void;
  interactionPrompt: InteractionPrompt | null;
  setInteractionPrompt: (prompt: InteractionPrompt | null) => void;

  // Easter Egg Toasts
  easterEggToast: { title: string; text: string } | null;
  setEasterEggToast: (toast: { title: string; text: string } | null) => void;

  // Audio & Camera
  isAudioMuted: boolean;
  toggleAudio: () => void;
  cameraMode: CameraMode;
  setCameraMode: (mode: CameraMode) => void;
  toggleCameraMode: () => void;

  // Cinematic Intro Swoop
  isIntroPlaying: boolean;
  setIntroPlaying: (playing: boolean) => void;
  introTriggerCount: number;
  triggerIntroSwoop: () => void;

  // Tactical Island Map
  isTacticalMapOpen: boolean;
  setTacticalMapOpen: (open: boolean) => void;
}

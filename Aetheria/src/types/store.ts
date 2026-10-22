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

export type NPCId =
  | 'commander'
  | 'chief_engineer'
  | 'comms_officer'
  | 'ui_architect'
  | 'geodata_analyst'
  | 'photonics_specialist';

export interface DialogueState {
  npcId: NPCId;
}

/**
 * Материалы портфолио, которые открывает экипаж. Один в один с targetKey в
 * npcDialogues: там тип берётся отсюда, поэтому список объявлен в одном месте.
 */
export const MATERIAL_KEYS = ['bio', 'skills', 'contacts', 'forma', 'terrascope', 'lumina'] as const;
export type MaterialKey = (typeof MATERIAL_KEYS)[number];

/** Персистентная часть досье: то, что переживает перезагрузку страницы. */
export interface DossierSnapshot {
  metCrew: NPCId[];
  openedMaterials: MaterialKey[];
}

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
  /** Материалы прогреты (compileAsync): интро не стартует, пока true не станет. */
  isRendererReady: boolean;
  setRendererReady: (ready: boolean) => void;

  // 3D Modals & Prompts
  activeModal: StatueKey | null;
  setActiveModal: (modal: StatueKey | null) => void;
  selectedProject: string | null;
  setSelectedProject: (projectId: string | null) => void;
  activeDialogue: DialogueState | null;
  setActiveDialogue: (dialogue: DialogueState | null) => void;
  interactionPrompt: InteractionPrompt | null;
  setInteractionPrompt: (prompt: InteractionPrompt | null) => void;

  // Audio & Camera
  isAudioMuted: boolean;
  toggleAudio: () => void;
  cameraMode: CameraMode;
  setCameraMode: (mode: CameraMode) => void;
  toggleCameraMode: () => void;

  // Cinematic Intro Swoop
  isIntroPlaying: boolean;
  setIntroPlaying: (playing: boolean) => void;
  pendingIntro: boolean;
  setPendingIntro: (pending: boolean) => void;
  introTriggerCount: number;
  triggerIntroSwoop: () => void;

  // Tactical Island Map
  isTacticalMapOpen: boolean;
  setTacticalMapOpen: (open: boolean) => void;

  // ── Досье экипажа ──
  // Прогресс обхода станции: кого встретил и какие материалы открыл. Живёт в
  // store, а не в модульном буфере вроде dayNightState, ровно потому что на него
  // реагирует интерфейс — счётчик в HUD и пины на тактической карте; буфер без
  // подписки их бы не разбудил. Переживает перезагрузку (localStorage).
  metCrew: NPCId[];
  openedMaterials: MaterialKey[];
  markCrewMet: (npcId: NPCId) => void;
  markMaterialOpened: (key: MaterialKey) => void;
  resetDossier: () => void;
}

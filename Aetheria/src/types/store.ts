import { StatueKey } from './scene';
import { Locale } from './portfolio';

export interface InteractionPrompt {
  title: string;
  action: () => void;
  iconType?: string;
}

export type ViewMode = '3d' | 'classic';
export type ThemeMode = 'dark' | 'light';

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
  cameraMode: 'third_person' | 'bird_eye';
  setCameraMode: (mode: 'third_person' | 'bird_eye') => void;
  toggleCameraMode: () => void;
}

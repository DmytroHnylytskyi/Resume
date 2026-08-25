import { create } from 'zustand';
import { GameState, ViewMode, ThemeMode } from '../types/store';
import { StatueKey } from '../types/scene';
import { Locale } from '../types/portfolio';

export const useGameStore = create<GameState>((set) => ({
  language: 'uk',
  setLanguage: (lang: Locale) => set({ language: lang }),

  theme: 'dark',
  setTheme: (theme: ThemeMode) => set({ theme }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

  viewMode: '3d',
  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),

  isInitialWelcomeOpen: true,
  setInitialWelcomeOpen: (open: boolean) => set({ isInitialWelcomeOpen: open }),

  isSceneLoaded: false,
  setSceneLoaded: (loaded: boolean) => set({ isSceneLoaded: loaded }),

  activeModal: null,
  setActiveModal: (modal: StatueKey | null) => set({ activeModal: modal }),

  selectedProject: null,
  setSelectedProject: (projectId: string | null) => set({ selectedProject: projectId }),

  interactionPrompt: null,
  setInteractionPrompt: (prompt) => set({ interactionPrompt: prompt }),

  isAudioMuted: false,
  toggleAudio: () => set((s) => ({ isAudioMuted: !s.isAudioMuted })),

  cameraMode: 'third_person',
  setCameraMode: (mode) => set({ cameraMode: mode }),
  toggleCameraMode: () =>
    set((s) => ({ cameraMode: s.cameraMode === 'third_person' ? 'bird_eye' : 'third_person' }))
}));

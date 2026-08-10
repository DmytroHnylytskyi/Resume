import { create } from 'zustand';
import { GameStore, ModalType, InteractionPrompt, CameraMode } from '../types/store';
import { ProjectItem } from '../types/portfolio';

/**
 * Global typed game state for UI modals, player respawn lifecycle,
 * portal teleportation warp VFX, overview camera, audio, and Retro Pixel-Art mode.
 */
export const useGameStore = create<GameStore>((set, get) => ({
  // Modal & Overlay State
  activeModal: null as ModalType,
  setActiveModal: (modal: ModalType) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),

  // Interaction Hover / Proximity
  interactionPrompt: null as InteractionPrompt | null,
  setInteractionPrompt: (prompt: InteractionPrompt | null) => set({ interactionPrompt: prompt }),
  clearInteractionPrompt: () => set({ interactionPrompt: null }),

  // Teleportation & Dimensional Warp
  activePortal: null as ProjectItem | null,
  isWarping: false,
  triggerPortalWarp: (portalData: ProjectItem) => {
    set({ activePortal: portalData, isWarping: true, activeModal: null });
  },
  cancelPortalWarp: () => set({ isWarping: false, activePortal: null }),

  // Camera Overview Mode ('third_person' | 'bird_eye')
  cameraMode: 'third_person' as CameraMode,
  toggleCameraMode: () =>
    set((state) => ({
      cameraMode: state.cameraMode === 'third_person' ? 'bird_eye' : 'third_person'
    })),

  // Player Lifecycle & Void Fall
  isRespawning: false,
  setIsRespawning: (respawning: boolean) => set({ isRespawning: respawning }),

  // Audio Configuration
  isAudioMuted: false,
  toggleAudio: () => set((state) => ({ isAudioMuted: !state.isAudioMuted })),

  // 👾 Retro Pixel-Art Mode (Default: true)
  isPixelArt: true,
  togglePixelArt: () => set((state) => ({ isPixelArt: !state.isPixelArt })),

  // Toast & Notifications
  toastMessage: null as string | null,
  showToast: (msg: string) => {
    set({ toastMessage: msg });
    setTimeout(() => {
      if (get().toastMessage === msg) {
        set({ toastMessage: null });
      }
    }, 3200);
  }
}));

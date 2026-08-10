import { ProjectItem } from './portfolio';
import { StatueKey } from './scene';

export type ModalType = StatueKey | null;
export type CameraMode = 'third_person' | 'bird_eye';

export interface InteractionPrompt {
  type: 'statue' | 'portal';
  title: string;
  key: string;
  action: () => void;
}

export interface GameStoreState {
  activeModal: ModalType;
  interactionPrompt: InteractionPrompt | null;
  activePortal: ProjectItem | null;
  isWarping: boolean;
  cameraMode: CameraMode;
  isRespawning: boolean;
  isAudioMuted: boolean;
  isPixelArt: boolean;
  toastMessage: string | null;
}

export interface GameStoreActions {
  setActiveModal: (modal: ModalType) => void;
  closeModal: () => void;
  setInteractionPrompt: (prompt: InteractionPrompt | null) => void;
  clearInteractionPrompt: () => void;
  triggerPortalWarp: (portalData: ProjectItem) => void;
  cancelPortalWarp: () => void;
  toggleCameraMode: () => void;
  setIsRespawning: (respawning: boolean) => void;
  toggleAudio: () => void;
  togglePixelArt: () => void;
  showToast: (msg: string) => void;
}

export type GameStore = GameStoreState & GameStoreActions;

/**
 * characterAnimState
 *
 * Shared zero-overhead mutable state buffer for character locomotion flags.
 * Written in useFrame (CharacterController) and read in useFrame (AnimatedCharacter)
 * without triggering React reconciliation passes — re-rendering the character
 * subtree 4x/second was measured to cause 40–55 FPS dips and 100ms+ frame
 * stalls on integrated GPUs (mirrors the radarState pattern).
 */
export interface CharacterAnimState {
  isMoving: boolean;
  isSprinting: boolean;
  isJumping: boolean;
}

export const characterAnimState: CharacterAnimState = {
  isMoving: false,
  isSprinting: false,
  isJumping: false
};

/**
 * mobileControlsState.ts
 * 
 * High-performance, zero-allocation mutable telemetry struct for mobile touch input.
 * Shared directly across React UI touch event handlers and Three.js useFrame physics loop.
 */
export interface MobileControlsState {
  isActive: boolean;
  moveX: number; // -1 (left) to 1 (right)
  moveZ: number; // -1 (forward) to 1 (backward)
  isSprinting: boolean;
  isJumping: boolean;
  lookDeltaX: number; // accumulated camera yaw delta per frame
  lookDeltaY: number; // accumulated camera pitch delta per frame
  pinchZoomDelta: number;
}

export const mobileControls: MobileControlsState = {
  isActive: false,
  moveX: 0,
  moveZ: 0,
  isSprinting: false,
  isJumping: false,
  lookDeltaX: 0,
  lookDeltaY: 0,
  pinchZoomDelta: 0
};

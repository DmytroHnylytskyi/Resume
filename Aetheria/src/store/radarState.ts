/**
 * radarState
 * 
 * Shared zero-overhead mutable state buffer for MiniRadar synchronization.
 * Updated in useFrame (CharacterController) and read directly via requestAnimationFrame (MiniRadar)
 * without triggering React reconciliation passes or garbage collection overhead.
 */
export interface RadarState {
  x: number;
  z: number;
  yaw: number;
}

export const radarState: RadarState = {
  x: 0,
  z: 14,
  yaw: 0
};

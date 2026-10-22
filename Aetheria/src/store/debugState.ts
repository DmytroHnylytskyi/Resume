/**
 * debugState.ts — runtime map-debug bridge behind ?debug=1.
 *
 * Contains only mutable state and the teleport function that
 * CharacterController registers on mount. The production client pays zero
 * cost: the physics overlay is mounted only with `?debug=1`, and the bridge is read
 * only from code that already runs in the frame loop.
 */

export interface DebugColliderSnapshot {
  id: string;
  kind: string;
  halfExtents: [number, number, number];
  position: [number, number, number];
}

/** ?debug=1 — the single gate for all debug infrastructure (zero in prod). */
export const DEBUG_MODE =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');

/** QA camera: when active, the frame loop places it after the player controller. */
export const debugCameraState = {
  active: false,
  position: [0, 30, 50] as [number, number, number],
  target: [0, 0, 0] as [number, number, number]
};

export const debugBridge = {
  /** Extra player data, updated in useFrame when debugOverlayOn. */
  x: 0,
  y: 0,
  z: 0,
  /** Set by CharacterController on mount — teleport from the console. */
  teleport: null as null | ((x: number, y: number, z: number) => void),
  /** Set by CharacterController — aim the camera: yaw/pitch in radians, distance in meters. */
  setCamera: null as null | ((yaw: number, pitch: number, distance?: number) => void),
  /** Set by WorldScene on mount — toggle collider wireframes. */
  showColliders: null as null | ((on: boolean) => void),
  /** Set by WorldScene — list colliders within a radius of the player. */
  listNear: null as null | ((radius?: number) => DebugColliderSnapshot[])
};

// ── Render quality (?q=high|low) ──
// The preset is read ONCE when the canvas mounts (toggling shadows at
// runtime forces recompilation of all materials — so this is not a runtime
// flag but a startup mode).
//
// high: shadows, MeshStandardMaterial, full light rig.
// low:  no shadows, MeshLambertMaterial for all geometry (cheaper shader),
//       fewer lights, lower DPR, no antialiasing, sparser particles.
//
// Auto-selection: mobile/touch devices, weak iGPUs and software rendering
// (SwiftShader/llvmpipe) get low immediately — "opens on a toaster".
// ?q=high / ?q=low override the detection for visual checks.
export type QualityTier = 'low' | 'medium' | 'high';

/**
 * Three quality tiers instead of a binary low/high.
 *
 * Previous mistake: any `pointer: coarse` immediately yielded low. A flagship
 * phone got DPR 1.0 and AA off — a render with a quarter of the pixels
 * the screen can do, and an "awfully pixelated" picture, although by hardware it is more powerful
 * than some laptops. Now the pointer type affects only UI and AA policy,
 * while the tier is determined by GPU, cores and memory.
 */
function detectQuality(): {
  tier: QualityTier;
  reason: string;
  touch: boolean;
  coarse: boolean;
} {
  if (typeof window === 'undefined') {
    return { tier: 'low', reason: 'ssr', touch: false, coarse: false };
  }

  const params = new URLSearchParams(window.location.search);
  const override = params.get('q');
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency || 0;
  const memory = nav.deviceMemory || 0;
  const nativeDpr = window.devicePixelRatio || 1;

  // HANDHELD ≠ coarse pointer. A phone in desktop mode (or with a connected
  // mouse/stylus) reports `pointer: fine`, and the previous check erroneously
  // enabled its 4096² planet bake — on a mobile GPU that blocked
  // the thread during baking (the infamous "frozen" splash). We detect handheld
  // by a combination of signals; coarse is kept only for the AA policy.
  const coarse = !!window.matchMedia?.('(pointer: coarse)').matches;
  const maxTouch = nav.maxTouchPoints || 0;
  const handheld =
    coarse ||
    maxTouch > 0 ||
    /android|iphone|ipad|ipod|mobile|silk|kindle/i.test(nav.userAgent) ||
    (window.innerWidth <= 900 && nativeDpr >= 2);

  if (override === 'low' || override === 'medium' || override === 'high') {
    return { tier: override, reason: 'url', touch: handheld, coarse };
  }

  let renderer = '';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false });
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      renderer = String(
        ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || ''
      );
      const lose = gl.getExtension('WEBGL_lose_context');
      lose?.loseContext();
    }
  } catch (_) {
    /* detection failed — cores/memory decide below */
  }
  const gpu = renderer.toLowerCase();

  if (/swiftshader|llvmpipe|software|basic render/.test(gpu)) {
    return { tier: 'low', reason: 'software-gpu', touch: handheld, coarse };
  }

  if (handheld) {
    // Top mobile GPUs: Apple, Adreno 7xx/8xx, Mali-G7xx/G8xx,
    // Immortalis, Xclipse. Clearly more powerful than a "weak" desktop.
    if (
      /apple gpu|apple m\d|adreno.*\b[78]\d{2}\b|mali-g[789]\d|immortalis|xclipse/.test(gpu) ||
      // iOS sometimes hides the GPU string: an Apple Retina device is certain
      // to handle the full preset (adaptive DPR will compensate via FPS).
      (/iphone|ipad|ipod/.test(nav.userAgent) && nativeDpr >= 2)
    ) {
      return { tier: 'high', reason: 'mobile-gpu', touch: true, coarse };
    }
    // Mid-range mobile class: Adreno 6xx, Mali-G5x/G6x, PowerVR.
    if (/adreno.*\b[56]\d{2}\b|mali-[gt][5-8]\d|powervr/.test(gpu)) {
      return { tier: 'medium', reason: 'mobile-gpu', touch: true, coarse };
    }
    // GPU string is sometimes masked on iOS/Android: cores/memory/DPR decide.
    if (cores >= 8 || memory >= 8 || nativeDpr >= 3) {
      return { tier: 'medium', reason: 'device-specs', touch: true, coarse };
    }
    return { tier: 'low', reason: 'mobile-unknown', touch: true, coarse };
  }

  // Desktop: discrete GPUs and Apple Silicon.
  if (/nvidia|geforce|rtx|gtx|quadro|radeon|apple m\d|arc\(tm\)|iris xe/.test(gpu)) {
    return { tier: 'high', reason: 'desktop-gpu', touch: false, coarse };
  }
  // Intel HD/UHD 5xx-6xx — the former "weak" desktop: keep low so as not to
  // enable shadows/PBR where 60 FPS used to be.
  if (/intel.*(hd|uhd) graphics (5|6)\d{2}/.test(gpu)) {
    return { tier: 'low', reason: 'weak-gpu', touch: false, coarse };
  }
  if (cores > 0 && cores <= 4) return { tier: 'low', reason: `cores:${cores}`, touch: false, coarse };
  if (memory > 0 && memory <= 4) return { tier: 'low', reason: `memory:${memory}`, touch: false, coarse };
  return { tier: 'medium', reason: 'desktop-unknown', touch: false, coarse };
}

const DETECTED = detectQuality();
const TIER = DETECTED.tier;
const HIGH = TIER === 'high';
const MEDIUM = TIER === 'medium';
const LOW = TIER === 'low';
const TOUCH = DETECTED.touch;
const COARSE = DETECTED.coarse;
const NATIVE_DPR = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

export const visualQuality: {
  tier: QualityTier;
  /** Handheld/touch device: a phone ≠ weak hardware, but 4096² is not allowed for it. */
  touch: boolean;
  /** Specifically `pointer: coarse` — for the MSAA policy. */
  coarsePointer: boolean;
  nativeDpr: number;
  reason: string;
  shadows: boolean;
  shadowMapSize: number;
  /** DPR ceiling: high on a phone so as not to render "mush" at 1×. */
  dprCap: number;
  dprFloor: number;
  /** Lambert instead of Standard for all static geometry and characters (low). */
  cheapMaterials: boolean;
  /** How many active light sources to keep (sun/moon/ambient always). */
  extraLights: boolean;
  starCount: number;
  dustCount: number;
  dustEveryOtherFrame: boolean;
  /** MSAA: desktop only. On a phone sharpness comes from DPR, and MSAA is expensive. */
  antialias: boolean;
  /** Large visual effects (singularity rings, big lamp halos). */
  richEffects: boolean;
  /** 4096² planet bake: powerful desktop only (an iGPU had a driver hang). */
  planetHighRes: boolean;
} = {
  tier: TIER,
  touch: TOUCH,
  coarsePointer: COARSE,
  nativeDpr: NATIVE_DPR,
  reason: DETECTED.reason,
  shadows: HIGH,
  // Shadows are more expensive in fill rate on a phone: 1024 instead of 1536 with the same
  // visual language (soft contact shadows on stylized shapes).
  shadowMapSize: HIGH ? (TOUCH ? 1024 : 1536) : 0,
  dprCap: HIGH
    ? Math.min(NATIVE_DPR, TOUCH ? 2.0 : 1.5)
    : MEDIUM
      ? Math.min(NATIVE_DPR, 1.5)
      : 1.0,
  dprFloor: HIGH ? (TOUCH ? 0.75 : 0.85) : MEDIUM ? 0.7 : 0.6,
  cheapMaterials: LOW,
  extraLights: HIGH,
  starCount: HIGH ? 1400 : MEDIUM ? 1100 : 700,
  dustCount: HIGH ? 1000 : MEDIUM ? 650 : 350,
  dustEveryOtherFrame: LOW,
  antialias: !COARSE,
  richEffects: !LOW,
  planetHighRes: HIGH && !TOUCH
};

if (typeof window !== 'undefined') {
  // Visible in the console, why the tier was chosen (field diagnostics).
  console.info(
    `[Aetheria] quality=${visualQuality.tier} (${visualQuality.reason}) handheld=${visualQuality.touch} coarse=${visualQuality.coarsePointer}`
  );
}

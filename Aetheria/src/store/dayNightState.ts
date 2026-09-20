import type { Locale } from '../types/portfolio';

/**
 * dayNightState — cyclic time-of-day engine (module-scope mutable buffer).
 *
 * The sky position is a single circular parameter `t ∈ [0, 1)`:
 *   0.00 midnight · 0.25 sunrise · 0.50 noon · 0.75 sunset · wraps to midnight.
 *
 * Consumers:
 * - IslandCanvas/AtmosphereSky polls `version` inside its frame loop: uniform
 *   and light writes happen ONLY when the version changed (zero cost at rest).
 * - TimeOfDaySlider subscribes so the thumb follows while a toggle tween runs.
 * - ClassicLandingView reads `sky` for the DOM sky-tint backdrop.
 * - WorldScene reads `sunElev` to boost the portal glows after dark.
 *
 * Deliberately NOT part of the zustand store: it mutates at up to 60 Hz and
 * must never trigger React re-renders (same zero-overhead contract as
 * characterAnimState / radarState). The binary CSS theme stays in the store
 * and is derived here from the sun elevation with hysteresis, so DOM panels
 * flip exactly when the rendered sky crosses the horizon threshold.
 */

const TAU = Math.PI * 2;
const STORAGE_KEY = 'aetheria_time_of_day';

type RGB = [number, number, number];

interface SkyStop {
  t: number;
  zenith: RGB;
  horizon: RGB;
  sunTint: RGB;
}

function hexToRgb(h: string): RGB {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

// ── Circular key-sky palette ──
// Endpoints reproduce the shipped night/day dome colors; the interior is a
// hand-tuned sunrise/sunset arc. This is a keyframed LUT rather than a naive
// day↔night crossfade, so the middle of any transition IS a sunset/dawn.
const SKY_STOPS: SkyStop[] = [
  { t: 0.00, zenith: hexToRgb('#1a2750'), horizon: hexToRgb('#405a8c'), sunTint: hexToRgb('#c3d6ff') }, // midnight
  { t: 0.14, zenith: hexToRgb('#1c2450'), horizon: hexToRgb('#4a4a75'), sunTint: hexToRgb('#b8c8f0') }, // pre-dawn
  { t: 0.24, zenith: hexToRgb('#3d3a6e'), horizon: hexToRgb('#ff9e6d'), sunTint: hexToRgb('#ffb37e') }, // dawn
  { t: 0.34, zenith: hexToRgb('#3f7fd0'), horizon: hexToRgb('#ffd9a8'), sunTint: hexToRgb('#ffe9b8') }, // morning
  { t: 0.50, zenith: hexToRgb('#2e7fd6'), horizon: hexToRgb('#cfe8fa'), sunTint: hexToRgb('#ffe9b8') }, // noon (shipped day)
  { t: 0.64, zenith: hexToRgb('#3873c9'), horizon: hexToRgb('#ffd9a8'), sunTint: hexToRgb('#ffcf8a') }, // golden hour
  { t: 0.75, zenith: hexToRgb('#5b4a9e'), horizon: hexToRgb('#ff7e5c'), sunTint: hexToRgb('#ff9d5c') }, // sunset
  { t: 0.84, zenith: hexToRgb('#251d4e'), horizon: hexToRgb('#7c5a8e'), sunTint: hexToRgb('#e07a8f') }, // dusk
  { t: 0.93, zenith: hexToRgb('#1a2450'), horizon: hexToRgb('#3d5480'), sunTint: hexToRgb('#c3d6ff') }, // nightfall
  { t: 1.00, zenith: hexToRgb('#1a2750'), horizon: hexToRgb('#405a8c'), sunTint: hexToRgb('#c3d6ff') }  // wrap = midnight
];

export interface SkySample {
  zenith: RGB;
  horizon: RGB;
  sunTint: RGB;
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const wrap01 = (x: number): number => ((x % 1) + 1) % 1;

/** Shortest signed distance between two cycle positions (≤ ±0.5). */
function wrapDelta(d: number): number {
  const w = ((d % 1) + 1) % 1;
  return w > 0.5 ? w - 1 : w;
}

function sampleSkyInto(t: number, out: SkySample): SkySample {
  const tc = wrap01(t);
  let i = 0;
  while (i < SKY_STOPS.length - 2 && SKY_STOPS[i + 1].t <= tc) i++;
  const a = SKY_STOPS[i];
  const b = SKY_STOPS[i + 1];
  const f = clamp01((tc - a.t) / (b.t - a.t));
  const mix = (ca: RGB, cb: RGB): RGB => [
    ca[0] + (cb[0] - ca[0]) * f,
    ca[1] + (cb[1] - ca[1]) * f,
    ca[2] + (cb[2] - ca[2]) * f
  ];
  out.zenith = mix(a.zenith, b.zenith);
  out.horizon = mix(a.horizon, b.horizon);
  out.sunTint = mix(a.sunTint, b.sunTint);
  return out;
}

export const dayNightState = {
  /** Target position on the cycle (what the user asked for). */
  t: 0.5,
  /** Smoothed position actually rendered (exponential follow, ~120 ms). */
  displayT: 0.5,
  /** Sun/moon elevation in [-1, 1], derived from displayT. */
  sunElev: 1,
  moonElev: -1,
  /** Bumped on every applied change; render-side consumers poll it. */
  version: 1,
  /** Current key-sky sample (mutated in place — read it, do not store it). */
  sky: { zenith: [46, 127, 214], horizon: [207, 232, 250], sunTint: [255, 233, 184] } as SkySample
};

/**
 * Broadcasts the live dynamic sky and time-of-day colors directly into
 * document root CSS variables so DOM panels, buttons, borders, and cards
 * dynamically harmonize with the WebGL atmosphere in real-time.
 */
let lastCssSync = 0;

function syncCssDynamicVariables(force = false): void {
  if (typeof document === 'undefined') return;
  const now = performance.now();
  const isMobileScreen = typeof window !== 'undefined' && (window.innerWidth < 820 || 'ontouchstart' in window);
  const minInterval = isMobileScreen ? 120 : 33;
  if (!force && now - lastCssSync < minInterval) return;
  lastCssSync = now;
  const { sky, sunElev } = dayNightState;
  const nf = Math.max(0, Math.min(1, (0.05 - sunElev) / 0.35));
  const glow = nf > 0.5 ? sky.horizon : sky.sunTint;
  const root = document.documentElement;

  const glowRgb = `${Math.round(glow[0])}, ${Math.round(glow[1])}, ${Math.round(glow[2])}`;
  root.style.setProperty('--tod-glow-rgb', glowRgb);
  root.style.setProperty('--tod-glow', `rgb(${glowRgb})`);
  root.style.setProperty('--tod-sky-horizon', `rgb(${Math.round(sky.horizon[0])}, ${Math.round(sky.horizon[1])}, ${Math.round(sky.horizon[2])})`);
  root.style.setProperty('--tod-sky-zenith', `rgb(${Math.round(sky.zenith[0])}, ${Math.round(sky.zenith[1])}, ${Math.round(sky.zenith[2])})`);
  root.style.setProperty('--tod-sky-suntint', `rgb(${Math.round(sky.sunTint[0])}, ${Math.round(sky.sunTint[1])}, ${Math.round(sky.sunTint[2])})`);
  root.style.setProperty('--tod-night-factor', nf.toFixed(3));
}

function applyDerived(): void {
  const t = dayNightState.displayT;
  dayNightState.sunElev = Math.sin((t - 0.25) * TAU);
  dayNightState.moonElev = Math.sin((t + 0.25) * TAU);
  sampleSkyInto(t, dayNightState.sky);
  syncCssDynamicVariables();
}

// Prime the derived fields for the initial (pre-interaction) state.
applyDerived();

// ── CSS theme derivation (hysteresis band around the horizon) ──
// DOM panels are binary, so the continuous cycle quantizes to light/dark
// exactly when the sun crosses the horizon. The dead band stops the theme
// from chattering while the thumb rests near a threshold.
//
// The store is wired in via registerDayNightThemeSync (called from
// useGameStore.ts): importing the store here would create a module cycle
// (store imports this module for toggleDayNight) and crash on first eval.
type ThemeSetter = (theme: 'dark' | 'light') => void;
let themeSetter: ThemeSetter | null = null;
let lastTheme: 'dark' | 'light' = 'light';

/**
 * Wire the zustand store to the derived theme. Must be called once after
 * the store exists. Deliberately does NOT adopt or push any theme yet:
 * the store's initial 'light' default must survive through hydration (SSR
 * rendered with it), and page.tsx adopts the pre-paint html attribute on
 * mount. Threshold writes stay disabled until enableDayNightThemeSync.
 */
export function registerDayNightThemeSync(setter: ThemeSetter): void {
  themeSetter = setter;
}

/**
 * Arm the theme threshold AFTER hydration (called from the page.tsx mount
 * effect, once the store adopted the pre-paint html theme). From this point
 * threshold crossings drive the store theme. Adopting `currentTheme` here
 * also repairs a rare race where the persisted cycle and the persisted
 * binary theme disagree (tab closed inside the persist debounce window).
 */
export function enableDayNightThemeSync(currentTheme: 'dark' | 'light'): void {
  lastTheme = currentTheme;
  syncEnabled = true;
  syncCssDynamicVariables();
  syncThemeIfCrossed();
}

let syncEnabled = false;

function syncThemeIfCrossed(): void {
  if (!syncEnabled || !themeSetter) return;
  const e = dayNightState.sunElev;
  if (e > 0.06 && lastTheme !== 'light') {
    lastTheme = 'light';
    themeSetter('light');
  } else if (e < -0.04 && lastTheme !== 'dark') {
    lastTheme = 'dark';
    themeSetter('dark');
  }
}

// ── Driver loop (self-scheduling rAF; stops itself once fully settled) ──
type Listener = () => void;
const listeners = new Set<Listener>();
let rafId = 0;
let lastFrame = 0;
let tween: { from: number; to: number; start: number; dur: number } | null = null;
let persistTimer: ReturnType<typeof setTimeout> | undefined;

function persistSoon(): void {
  if (typeof localStorage === 'undefined') return;
  if (persistTimer !== undefined) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = undefined;
    try {
      localStorage.setItem(STORAGE_KEY, String(dayNightState.t));
    } catch {
      /* private mode — the cycle simply won't survive a reload */
    }
  }, 600);
}

function ensureLoop(): void {
  if (!rafId && typeof requestAnimationFrame === 'function') {
    lastFrame = performance.now();
    rafId = requestAnimationFrame(frameStep);
  }
}

function frameStep(now: number): void {
  rafId = 0;
  const dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000));
  lastFrame = now;
  let changed = false;

  // Toggle-button tween: forward-only cinematic flight (time always flows
  // forward — day→night passes the sunset, night→day passes the sunrise).
  if (tween) {
    const p = tween.dur <= 0 ? 1 : Math.min(1, (now - tween.start) / tween.dur);
    const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    dayNightState.t = wrap01(tween.from + (tween.to - tween.from) * e);
    changed = true;
    if (p >= 1) {
      tween = null;
      syncCssDynamicVariables(true);
    }
  }

  // "Oily" follow: displayT chases t with exponential smoothing so fast
  // thumb jumps still read as a flowing sky rather than a hard cut.
  // 0.22 s constant ≈ visible glide on release without lagging the thumb
  // while it is actively being dragged.
  const d = wrapDelta(dayNightState.t - dayNightState.displayT);
  if (Math.abs(d) > 0.0004) {
    const k = 1 - Math.exp(-dt / 0.22);
    dayNightState.displayT = wrap01(dayNightState.displayT + d * k);
    changed = true;
  } else if (dayNightState.displayT !== dayNightState.t) {
    dayNightState.displayT = dayNightState.t;
    changed = true;
  }

  if (changed) {
    applyDerived();
    syncThemeIfCrossed();
    dayNightState.version++;
    listeners.forEach((fn) => fn());
    persistSoon();
  }

  if (tween || Math.abs(wrapDelta(dayNightState.t - dayNightState.displayT)) > 0.0004) {
    ensureLoop();
  }
}

// ── Public API ──

/** Scrub: set the cycle position directly (cancels any running tween). */
export function setTimeOfDay(t: number): void {
  const v = wrap01(Number.isFinite(t) ? t : 0.5);
  tween = null;
  if (dayNightState.t !== v) {
    dayNightState.t = v;
    // The thumb/UI follow immediately; the driver animates displayT.
    listeners.forEach((fn) => fn());
  }
  ensureLoop();
}

/**
 * Cinematic forward-only flight to an explicit cycle position (0.5 = noon,
 * 1.0 ≡ 0.0 = midnight). Time always flows forward — day→night passes the
 * sunset, night→day passes the sunrise. Respects prefers-reduced-motion with
 * an instant snap.
 */
export function flyToDayNight(target: number, customDur?: number): void {
  const from = dayNightState.t;
  let delta = (target - from + 1) % 1;
  if (delta < 0.02) delta += 1; // already at the pole — run a full lap rather than a no-op

  let reduced = false;
  try {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    /* no matchMedia — treat as motion-capable */
  }

  if (reduced) {
    tween = null;
    dayNightState.t = wrap01(from + delta);
    dayNightState.displayT = dayNightState.t;
    applyDerived();
    syncThemeIfCrossed();
    syncCssDynamicVariables(true);
    dayNightState.version++;
    listeners.forEach((fn) => fn());
    persistSoon();
    return;
  }

  const isMobile = typeof window !== 'undefined' && (window.innerWidth < 820 || 'ontouchstart' in window);
  const dur = customDur ?? (isMobile
    ? Math.min(520, Math.max(360, delta * 750))
    : Math.min(2800, Math.max(1100, delta * 4500)));

  tween = {
    from,
    to: from + delta,
    start: performance.now(),
    dur
  };
  ensureLoop();
}

/** Toggle button: clean forward flight to noon or midnight. */
export function toggleDayNight(): void {
  const target = lastTheme === 'dark' ? 0.5 : 1;
  const isMobile = typeof window !== 'undefined' && (window.innerWidth < 820 || 'ontouchstart' in window);
  flyToDayNight(target, isMobile ? 420 : 680);
}

export function subscribeToDayNight(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** 0 at full day → 1 at deep night (portal glow boost, star fade, etc.). */
export function getNightFactor(): number {
  return clamp01((0.05 - dayNightState.sunElev) / 0.35);
}

// ── Slider track gradient: horizon colors sampled around the whole cycle ──
const _gradScratch: SkySample = { zenith: [0, 0, 0], horizon: [0, 0, 0], sunTint: [0, 0, 0] };
export const SLIDER_TRACK_CSS = `linear-gradient(90deg, ${[
  0, 0.07, 0.14, 0.22, 0.3, 0.38, 0.46, 0.54, 0.62, 0.7, 0.78, 0.86, 0.93, 1
]
  .map((tt) => {
    sampleSkyInto(tt, _gradScratch);
    const h = _gradScratch.horizon;
    return `rgb(${Math.round(h[0])},${Math.round(h[1])},${Math.round(h[2])}) ${Math.round(tt * 100)}%`;
  })
  .join(', ')})`;

const PERIOD_LABELS: { from: number; uk: string; en: string }[] = [
  { from: 0.97, uk: 'Північ', en: 'Midnight' },
  { from: 0.85, uk: 'Сутінки', en: 'Dusk' },
  { from: 0.71, uk: 'Захід', en: 'Sunset' },
  { from: 0.58, uk: 'Золото', en: 'Golden' },
  { from: 0.44, uk: 'Полудень', en: 'Noon' },
  { from: 0.31, uk: 'Ранок', en: 'Morning' },
  { from: 0.11, uk: 'Світанок', en: 'Dawn' },
  { from: 0.0, uk: 'Північ', en: 'Midnight' }
];

export function getTimeOfDayLabel(t: number, lang: Locale): string {
  const tc = wrap01(t);
  const hit = PERIOD_LABELS.find((p) => tc >= p.from);
  return hit ? (lang === 'uk' ? hit.uk : hit.en) : 'Midnight';
}

// ── Client bootstrap: restore the stored cycle position ──
if (typeof window !== 'undefined') {
  let stored: number | undefined;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) stored = Number.parseFloat(raw);
  } catch {
    /* private mode */
  }

  const attrTheme = document.documentElement.getAttribute('data-theme');

  if (stored !== undefined && Number.isFinite(stored)) {
    dayNightState.t = wrap01(stored);
    dayNightState.displayT = dayNightState.t;
    applyDerived();
  } else if (attrTheme === 'dark') {
    // No saved position yet (first visit): open OS-dark visitors on the
    // moonlit island, matching the pre-theme-paint attribute.
    dayNightState.t = 0;
    dayNightState.displayT = 0;
    applyDerived();
  }

  // Adopt the pre-paint theme as the initial hysteresis state (the inline
  // script could only apply a single threshold; inside the dead band either
  // side is valid). One threshold pass then repairs any stale legacy value.
  lastTheme = attrTheme === 'dark' ? 'dark' : 'light';
  syncThemeIfCrossed();
}

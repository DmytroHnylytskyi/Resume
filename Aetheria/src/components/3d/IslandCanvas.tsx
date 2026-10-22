'use client';

import React, { useRef, Suspense, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { useGLTF, useTexture, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { dayNightState, getNightFactor, setTimeOfDay } from '../../store/dayNightState';
import { debugCameraState, visualQuality } from '../../store/debugState';
import WorldScene from './WorldScene';
import SingularityCelestial from './SingularityCelestial';
import CosmicDust from './CosmicDust';
import Starfield from './Starfield';
import GiantPlanet from './GiantPlanet';
import ShatteredMoon from './ShatteredMoon';
import Megastructure from './Megastructure';
import rawIslandSceneData from '../../data/islandScene.json';
import { IslandSceneData } from '../../types/scene';

// Spawn — a single source with the gates: spawnPoint from islandScene.json (the same one
// checked by scripts/checkColliders.mjs). Previously there was a hardcoded
// [0.3, 1.1, 6.0] here, which drifted from the JSON when the map was rebuilt.
const SCENE_DATA = rawIslandSceneData as unknown as IslandSceneData;
const SPAWN_POINT = SCENE_DATA.spawnPoint;
const SPAWN_YAW = SCENE_DATA.spawnYaw ?? 0;
import CharacterController from './CharacterController';
import { getGlobalCyberAudio } from '../../hooks/cyberAudio';

/**
 * AdaptiveResolution
 *
 * Frame-budget driven render resolution with hysteresis. A continuous
 * factor→dpr mapping (drei PerformanceMonitor) re-settles every 200ms under
 * load: each dpr change reallocates the canvas swapchain, which can present
 * a cleared (black) frame and stall the GPU — the "black flicker + 20-30fps"
 * reported while sprinting. Quantized steps, asymmetric thresholds and a
 * cooldown keep resolution changes rare and one-directional instead.
 */
// ?probe=1 — render probe only (for measurements); ?debug=1 enables it plus
// the physics overlay. They are separate so QA measurements do not pay for 900 EdgesGeometry.
const PROBE_MODE =
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).has('probe') ||
    new URLSearchParams(window.location.search).has('debug'));

const DPR_FLOOR = Math.min(visualQuality.nativeDpr, visualQuality.dprFloor);
const DPR_CAP = Math.min(visualQuality.nativeDpr, visualQuality.dprCap);
// Start at 1.5, not at the cap: on a 3× phone 2.0 right away means an expensive
// swapchain allocation and a hitch on entry. The adaptive step will raise it to the cap
// if the hardware holds >56 FPS.
const DPR_START =
  visualQuality.tier === 'high'
    ? Math.min(DPR_CAP, Math.max(DPR_FLOOR, 1.5))
    : DPR_CAP;

function AdaptiveResolution({
  dpr,
  maxDpr,
  onChange
}: {
  dpr: number;
  maxDpr: number;
  onChange: (dpr: number) => void;
}): null {
  const sampler = useRef({
    frames: 0,
    windowStart: 0,
    badStreak: 0,
    goodStreak: 0,
    cooldownUntil: 0
  });

  useFrame(() => {
    const s = sampler.current;
    const now = performance.now();
    if (!s.windowStart) {
      s.windowStart = now;
      s.frames = 0;
      return;
    }
    s.frames++;
    if (now - s.windowStart < 1000) return;
    const fps = (s.frames * 1000) / (now - s.windowStart);
    s.frames = 0;
    s.windowStart = now;
    if (now < s.cooldownUntil) return;

    if (fps < 42) {
      s.badStreak++;
      s.goodStreak = 0;
    } else if (fps > 56) {
      s.goodStreak++;
      s.badStreak = 0;
    } else {
      s.badStreak = 0;
      s.goodStreak = 0;
      return;
    }

    if (s.badStreak >= 2 && dpr > DPR_FLOOR) {
      onChange(Math.max(DPR_FLOOR, Math.round((dpr - 0.15) * 100) / 100));
      s.cooldownUntil = now + 3000;
      s.badStreak = 0;
    } else if (s.goodStreak >= 4 && dpr < maxDpr) {
      onChange(Math.min(maxDpr, Math.round((dpr + 0.1) * 100) / 100));
      s.cooldownUntil = now + 3000;
      s.goodStreak = 0;
    }
  });

  return null;
}

/**
 * ShaderWarmup
 *
 * Pre-compiles every material program in the scene before the cinematic intro
 * is allowed to start. Without this, the first frame that shows the island
 * triggers first-draw shader compilation — on a phone with shadows/PBR that
 * is a multi-second main-thread stall: the intro title appeared over the
 * planet and simply froze.
 *
 * `compileAsync` (KHR_parallel_shader_compile) is used so linking does not
 * block the JS thread in one long call; the loader waits for the warm flag
 * before it dissolves. A hard timeout releases the gate if a driver never
 * resolves (the scene will then compile lazily, as before).
 */
function ShaderWarmup(): null {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const { active, loaded, total } = useProgress();
  const setRendererReady = useGameStore((s) => s.setRendererReady);

  // A previous 3D session may have left the flag true; every fresh mount must
  // re-earn it, otherwise the loader/intro can start before this scene warms.
  useEffect(() => {
    setRendererReady(false);
  }, [setRendererReady]);

  useEffect(() => {
    // Start from the asset-progress signal, not isSceneLoaded: the loader now
    // deliberately holds isSceneLoaded until this warmup finishes.
    const assetsDone = !active && total > 0 && loaded >= total;
    if (!assetsDone) return;

    let cancelled = false;
    setRendererReady(false);
    const markReady = () => {
      if (!cancelled) setRendererReady(true);
    };
    const hardTimeout = window.setTimeout(markReady, 20000);

    const raf = requestAnimationFrame(() => {
      try {
        const task = gl.compileAsync
          ? gl.compileAsync(scene, camera)
          : Promise.resolve(gl.compile(scene, camera));
        Promise.resolve(task).then(markReady).catch(markReady);
      } catch (_) {
        markReady();
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(hardTimeout);
      cancelAnimationFrame(raf);
    };
  }, [gl, scene, camera, active, loaded, total, setRendererReady]);

  return null;
}

/**
 * AtmosphereSky — continuous day/night cycle renderer.
 *
 * Everything sky-related stays mounted for the whole session; the frame loop
 * polls `dayNightState.version` and rewrites uniform/light VALUES only when
 * the cycle moved (zero cost at rest, zero React re-renders, zero shader
 * recompiles — the light count never changes).
 *
 * Geometry of the cycle (t ∈ [0, 1), see store/dayNightState.ts):
 * - Sun elevation  = sin((t − 0.25)·2π): rises at 0.25, zenith at 0.5, sets at 0.75.
 * - Moon travels the same great-circle plane in anti-phase.
 * - The dome shader is the merged day/night gradient with a sun-bloom term;
 *   its colors come from the keyframed sky LUT (noon/midnight stops reproduce
 *   the previously shipped day/night palettes exactly).
 */
const TAU = Math.PI * 2;
const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

// ── Celestial arc geometry ──
// Hand-designed around the camera rig: the default steadicam pitch is 18°
// down (frame top ≈ +4° elevation, mostly treeline), so the DEFAULT view is
// carried by the dome — gradients, stars, horizon bloom. The discs are the
// look-up reward: the pitch range tops out at ~11.5° up (frame top ≈ 34°),
// so the sun apex sits at 30° and the moon apex at 20° elevation, both
// dead ahead — fully framed with a modest camera tilt. Sunrise/sunset ride
// the frame-edge horizon (dome bloom carries them at default pitch).
// Bodies are slerped across four arc quadrants (rise → high → set → under)
// with segment angles precomputed — zero per-frame allocation.
const SUN_ARC_EAST = new THREE.Vector3(0.42, 0.16, -0.89).normalize();
const SUN_ARC_APEX = new THREE.Vector3(0, 0.5, -0.87).normalize();
const SUN_ARC_WEST = new THREE.Vector3(-0.42, 0.16, -0.89).normalize();
const MOON_ARC_EAST = SUN_ARC_EAST;
const MOON_ARC_APEX = new THREE.Vector3(0, 0.34, -0.94).normalize();
const MOON_ARC_WEST = SUN_ARC_WEST;

interface ArcSegment {
  from: THREE.Vector3;
  to: THREE.Vector3;
  omega: number;
  sinInv: number;
}

interface CelestialArc {
  rise: ArcSegment; // a ∈ [0, π/2)
  high: ArcSegment; // a ∈ [π/2, π)
  set: ArcSegment;  // a ∈ [π, 3π/2)
  under: ArcSegment; // a ∈ [3π/2, 2π)
}

function makeArc(east: THREE.Vector3, apex: THREE.Vector3, west: THREE.Vector3): CelestialArc {
  const under = apex.clone().negate();
  const seg = (from: THREE.Vector3, to: THREE.Vector3): ArcSegment => {
    const omega = Math.acos(THREE.MathUtils.clamp(from.dot(to), -1, 1));
    return { from, to, omega, sinInv: 1 / Math.sin(omega) };
  };
  return {
    rise: seg(east, apex),
    high: seg(apex, west),
    set: seg(west, under),
    under: seg(under, east)
  };
}

const SUN_ARC = makeArc(SUN_ARC_EAST, SUN_ARC_APEX, SUN_ARC_WEST);
const MOON_ARC = makeArc(MOON_ARC_EAST, MOON_ARC_APEX, MOON_ARC_WEST);

const LIGHT_DIST = 60;

// The singularity took the place of the sun and moon: an immobile celestial body inside
// the dome; day/night lighting is still carried by a pair of directional lights.
//
// Placement changed: it used to hang at the top of the solar arc (apogee 30°)
// at a distance of 290 — it read as a small dot high in the sky, detached from
// the island. Now 18° above the horizon at 170 m — the body is visible as soon as the camera
// is raised a little, and it reads as part of the map rather than a distant star.
//
// The height works not only for composition: the clearance to the map depends on it.
// The near edge of the disk is tilted toward the observer, and its height above the island equals
// `170·sin(placement) − 0.179·DISK_OUTER`: scale pulls the edge down, placement
// raises it. Currently (18°, ×1.8) the edge runs at ~36 m — double the margin above the hub
// towers. The body does not touch the dome (r = 360) or the star sphere (r = 330): even at
// ×3 the far edge only reached 319 m.
//
// The frame holds an angle up to ~19°: at the maximum upward look (pitch −0.2) the center
// of the frame sits at +11.5°, and 18° falls below the top edge, while at 20°+ the body
// starts to run into the HUD.
const SINGULARITY_DIST = 170;
const SINGULARITY_POS = new THREE.Vector3(0, 0.309, -0.951)
  .normalize()
  .multiplyScalar(SINGULARITY_DIST);

function celestialPos(out: THREE.Vector3, arc: CelestialArc, a: number): THREE.Vector3 {
  let angle = a % (Math.PI * 2);
  if (angle < 0) angle += Math.PI * 2;
  const q = Math.min(3, Math.floor(angle / (Math.PI / 2)));
  const s = q === 3 ? arc.under : q === 2 ? arc.set : q === 1 ? arc.high : arc.rise;
  const t = (angle - q * (Math.PI / 2)) / (Math.PI / 2);
  const s1 = Math.sin((1 - t) * s.omega) * s.sinInv;
  const s2 = Math.sin(t * s.omega) * s.sinInv;
  return out
    .set(s.from.x * s1 + s.to.x * s2, s.from.y * s1 + s.to.y * s2, s.from.z * s1 + s.to.z * s2)
    .normalize();
}

// Reusable scratch objects — zero per-frame allocation (project convention).
const _dirSun = new THREE.Vector3();
const _dirMoon = new THREE.Vector3();
const _colA = new THREE.Color();
const _colB = new THREE.Color();
const _bgColor = new THREE.Color();

function AtmosphereSky(): React.ReactElement {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  // ── Sky dome material (merged day/night gradient shader) ──
  const domeMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uZenith: { value: new THREE.Color('#2e7fd6') },
        uHorizon: { value: new THREE.Color('#cfe8fa') },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunTint: { value: new THREE.Color('#ffe9b8') },
        uNight: { value: 0 }
      },
      vertexShader: `
        varying vec3 vLocal;
        void main() {
          vLocal = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vLocal;
        uniform vec3 uZenith;
        uniform vec3 uHorizon;
        uniform vec3 uSunDir;
        uniform vec3 uSunTint;
        uniform float uNight;
        void main() {
          vec3 dir = normalize(vLocal);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 col = mix(uHorizon, uZenith, pow(h, 0.6));
          // Warm bloom hugging the sun direction — glows at the horizon
          // during dawn/dusk and fades out once the sun is below it.
          float sunAmt = pow(max(dot(dir, uSunDir), 0.0), 5.0);
          col = mix(col, uSunTint, sunAmt * 0.45);

          // Milky Way: a very faint band with dust clumps. Lives
          // right in the dome, with no new geometry and no extra draw call.
          float band = exp(-pow(dot(dir, normalize(vec3(0.18, 0.56, 0.81))) * 5.2, 2.0));
          float knots = 0.5 + 0.5 * sin(dir.x * 21.0 + dir.z * 17.0) * sin(dir.y * 19.0 + 1.7);
          vec3 mw = vec3(0.42, 0.5, 0.78) * band * (0.32 + 0.5 * knots) * uNight;
          col += mw * 0.22;

          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
  }, []);

  useEffect(() => () => domeMat.dispose(), [domeMat]);

  // ── Refs animated by the director below ──
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const moonLightRef = useRef<THREE.DirectionalLight>(null);
  const fillLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);

  // Own the scene background so it always matches the horizon tone (guards
  // against any dome seam at extreme aspect ratios).
  useEffect(() => {
    scene.background = _bgColor;
    return () => {
      if (scene.background === _bgColor) scene.background = null;
    };
  }, [scene]);

  const lastVersion = useRef(0);
  const lastApplyAt = useRef(0);

  // ── Director: applies the cycle to uniforms/lights only when it moved ──
  // Throttled to ~30 Hz: every uniform write re-uploads uniforms into all
  // scene materials, and sky/light gradients are visually identical at 30
  // samples per second — while scrubbing cost halves. Version is compared
  // AFTER the time gate so no update is ever lost (the freshest state wins).
  useFrame(() => {
    if (dayNightState.version === lastVersion.current) return;
    const now = performance.now();
    if (now - lastApplyAt.current < 33) return;
    lastApplyAt.current = now;
    lastVersion.current = dayNightState.version;

    const s = dayNightState;
    const t = s.displayT;
    celestialPos(_dirSun, SUN_ARC, (t - 0.25) * TAU);
    celestialPos(_dirMoon, MOON_ARC, (t + 0.25) * TAU);

    // LUT colors are sRGB tuples; Color.setRGB with the explicit sRGB space
    // reproduces `new THREE.Color('#hex')` — the pipeline the previous
    // day/night domes were tuned against.
    const sky = s.sky;
    const setSrgb = (c: THREE.Color, rgb: readonly number[]) => {
      c.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace);
    };

    setSrgb(domeMat.uniforms.uZenith.value as THREE.Color, sky.zenith);
    setSrgb(domeMat.uniforms.uHorizon.value as THREE.Color, sky.horizon);
    setSrgb(domeMat.uniforms.uSunTint.value as THREE.Color, sky.sunTint);
    (domeMat.uniforms.uSunDir.value as THREE.Vector3).copy(_dirSun);
    setSrgb(_bgColor, sky.horizon);

    // The singularity is an immobile celestial body: positions are not updated,
    // it updates its own uniforms in its own useFrame.

    // The Milky Way appears only at night; the stars run their own shader.
    const nf = getNightFactor();
    domeMat.uniforms.uNight.value = nf;

    // ── Unified light rig (values only; count never changes) ──
    // Color grading: the previous total light of 6.2 without shadows washed out the scene —
    // the key was lowered to ~2.1, fills to fractions, and the sun shadow became
    // the main source of form. Night branches are lowered proportionally.
    const sunI = Math.sqrt(clamp01(s.sunElev)); // fast warm-up after sunrise
    const sl = sunLightRef.current;
    if (sl) {
      sl.position.copy(_dirSun).multiplyScalar(LIGHT_DIST);
      sl.intensity = 2.1 * sunI;
      _colA.set('#ff8f5a');
      _colB.set('#fff3d6');
      sl.color.lerpColors(_colA, _colB, clamp01(s.sunElev * 2.2));
    }

    const ml = moonLightRef.current;
    if (ml) {
      ml.position.copy(_dirMoon).multiplyScalar(LIGHT_DIST);
      ml.intensity = 1.2 * Math.sqrt(clamp01(s.moonElev)) * nf;
    }

    const fl = fillLightRef.current;
    if (fl) {
      fl.intensity = 0.45 + (0.35 - 0.45) * nf;
      _colA.set('#93c5fd');
      _colB.set('#405a9e');
      fl.color.lerpColors(_colA, _colB, nf);
    }

    const am = ambientRef.current;
    if (am) {
      am.intensity = 0.3 + (1.0 - 0.3) * nf;
      _colA.set('#f0f9ff');
      _colB.set('#2f4485');
      am.color.lerpColors(_colA, _colB, nf);
    }

    const hl = hemiRef.current;
    if (hl) {
      _colA.set('#a5d8ff');
      _colB.set('#4a67a5');
      hl.color.lerpColors(_colA, _colB, nf);
      _colA.set('#cbd5e1');
      _colB.set('#1c2640');
      hl.groundColor.lerpColors(_colA, _colB, nf);
      hl.intensity = 0.55 + 0.15 * nf;
    }

    gl.toneMappingExposure = 1.0 + 0.28 * nf;
  });

  return (
    <group>
      {/* ── Sky dome (single continuous gradient + sun bloom + Milky Way) ── */}
      <mesh material={domeMat} renderOrder={-1000}>
        <sphereGeometry args={[850, 32, 20]} />
      </mesh>

      {/* ── Magnitude star field: small/bright, colored, with twinkle ── */}
      <Starfield />

      {/* ── Giant planet under the platform: covers the emptiness below the island,
          gives scale and explains why the station hangs above the world. ── */}
      <GiantPlanet />

      {/* ── Shattered moon and an ancient torn orbital arc in the sky ── */}
      <ShatteredMoon />
      <Megastructure />

      {/* ── Dust and small debris across the whole sky: dimmed by day, bright at night.
          Replaced the spark swarm that spun only around the singularity. ── */}
      <CosmicDust />

      {/* ── Gravitational singularity instead of the sun and moon:
          black core, accretion disk, lensed halo.
          Immobile at 15° above the horizon, the palette follows the cycle. ── */}
      <SingularityCelestial position={SINGULARITY_POS} />

      {/* ── Permanent unified light rig ──
          Key = sun by day, moon by night (the arc light is carried by these two
          directional lights); cool fill + ambient + hemisphere interpolate
          between the previously shipped day/night rigs.
          Only the sun key casts shadows: its intensity goes to zero
          toward night and the shadows fade with it — one shadow map in the frame. */}
      <directionalLight
        ref={sunLightRef}
        intensity={2.1}
        color="#fff3d6"
        castShadow={visualQuality.shadows}
        shadow-mapSize-width={visualQuality.shadowMapSize}
        shadow-mapSize-height={visualQuality.shadowMapSize}
        // Ortho frustum covering the whole island (±30 m in XZ for the slabs + margin for
        // props): 64 m / 2048 texels ≈ 3 cm — sufficient density,
        // stable without a player-following target.
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-bias={-0.0003}
        shadow-normalBias={0.03}
      />
      <directionalLight ref={moonLightRef} intensity={0} color="#c3d6ff" />
      {/* On the low preset only the three key sources remain (sun/moon/
          ambient): every extra directional means a full lighting calculation
          per MeshStandardMaterial fragment, and on a phone pixels
          are more expensive than half a tone of fill light. */}
      {visualQuality.extraLights && (
        <directionalLight ref={fillLightRef} position={[60, 30, 40]} intensity={0.45} color="#93c5fd" />
      )}
      <ambientLight ref={ambientRef} intensity={0.3} color="#f0f9ff" />
      {visualQuality.extraLights && (
        <hemisphereLight ref={hemiRef} args={['#a5d8ff', '#cbd5e1', 0.55]} />
      )}
    </group>
  );
}

/**
 * CanvasA11y — applies the accessibility contract to the raw <canvas> DOM
 * element. R3F spreads extra props onto its wrapper div only, so the role,
 * label and shortcut hints are set imperatively here, once, right after
 * mount and on every language switch.
 */
/**
 * RenderProbe — ?debug=1 exposes the renderer/scene for field measurements
 * (draw calls, triangles, programs) and for QA screenshots from fixed poses.
 * Never mounted in production.
 */
function RenderProbe(): null {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    if (!PROBE_MODE) return;
    (window as unknown as Record<string, unknown>).__aetheria = {
      gl,
      scene,
      camera,
      info: () => ({
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        points: gl.info.render.points,
        lines: gl.info.render.lines,
        programs: gl.info.programs?.length ?? 0,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        dpr: gl.getPixelRatio()
      }),
      /** Fixed resolution for honest measurements (otherwise adaptive resolution changes dpr). */
      setDpr: (n: number) => {
        gl.setPixelRatio(n);
        gl.setSize(gl.domElement.clientWidth, gl.domElement.clientHeight, false);
      },
      /** Time of day for QA frames: 0.5 — noon, 0.0 — midnight. */
      time: (t: number) => setTimeOfDay(t),
      /** Free camera (QA): position and look-at point in world meters. */
      fly: (px: number, py: number, pz: number, tx: number, ty: number, tz: number) => {
        debugCameraState.position = [px, py, pz];
        debugCameraState.target = [tx, ty, tz];
        debugCameraState.active = true;
      },
      flyOff: () => {
        debugCameraState.active = false;
      }
    };
  }, [gl, scene, camera]);

  return null;
}

/** QA camera on top of the player controller (only when __aetheria.fly is called). */
function DebugFlyCamera(): null {
  const camera = useThree((s) => s.camera);
  useFrame(() => {
    if (!debugCameraState.active) return;
    const [px, py, pz] = debugCameraState.position;
    const [tx, ty, tz] = debugCameraState.target;
    camera.position.set(px, py, pz);
    camera.lookAt(tx, ty, tz);
  });
  return null;
}

function CanvasA11y({ label }: { label: string }): null {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const el = gl.domElement as HTMLCanvasElement;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', label);
    // Global hotkeys available while the island is mounted
    // (E interact · H controls guide · M tactical map · Esc close modal)
    el.setAttribute('aria-keyshortcuts', 'E H M Escape');
  }, [gl, label]);

  return null;
}

/**
 * IslandCanvas
 *
 * Root 3D WebGL Canvas entry point for Aetheria.
 *
 * Architecture & Performance Highlights:
 * - Continuous Day/Night Cycle: AtmosphereSky renders the whole cycle with a
 *   permanent light rig; the theme toggle/slider drive a mutable store, so
 *   the canvas never re-renders or recompiles shaders on theme change.
 * - Rapier 3D Physics: Runs an asynchronous, deterministic physics world at locked 60Hz.
 */
export default function IslandCanvas(): React.ReactElement {
  const playerPosRef = useRef<THREE.Vector3 | null>(null);
  const isSceneLoaded = useGameStore((s) => s.isSceneLoaded);
  const language = useGameStore((s) => s.language);
  const isAudioMuted = useGameStore((s) => s.isAudioMuted);
  // The adaptive resolution value lives in the dpr PROP itself: fiber
  // reconciles viewport.dpr against this prop on re-renders, so driving it
  // from here is the only churn-free way to change resolution at runtime.
  const [dpr, setDpr] = React.useState(DPR_START);

  // Synchronize 3D atmospheric background music & ambient with global audio state
  useEffect(() => {
    const audio = getGlobalCyberAudio();
    if (!isAudioMuted && isSceneLoaded) {
      audio.startBGM();
    } else {
      audio.stopBGM();
    }
    return () => {
      audio.stopBGM();
    };
  }, [isAudioMuted, isSceneLoaded]);

  // Screen readers receive nothing from a WebGL canvas: this label is the
  // only description they can announce (WCAG canvas guidance).
  const canvasAriaLabel = language === 'uk'
    ? 'Інтерактивний 3D-острів-портфоліо. Клавіші WASD або стрілки — рух, Shift — спринт, пробіл — стрибок, миша — огляд камери, E — взаємодія. Доступна класична версія резюме.'
    : 'Interactive 3D portfolio island. Move with WASD or arrow keys, Shift to sprint, Space to jump, drag the mouse to orbit the camera, E to interact. A classic resume view is also available.';

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [-18, 22, 36], fov: 45, far: 1000 }}
      shadows={visualQuality.shadows ? 'soft' : false}
      gl={{
        // MSAA on desktop only: on touch devices sharpness comes from high
        // DPR (up to 2.0), while MSAA is one of the most expensive pixel effects.
        antialias: visualQuality.antialias,
        alpha: false,
        powerPreference: visualQuality.tier === 'low' ? 'default' : 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping
      }}
      performance={{ min: 0.5 }}
    >
      {/* ── Continuous day/night atmosphere (dome, singularity, stars, lights) ── */}
      <AtmosphereSky />

      {/* ── Canvas accessibility contract (role + localized label) ── */}
      <CanvasA11y label={canvasAriaLabel} />

      {/* ── ?debug=1: renderer probe for perf measurements ── */}
      <RenderProbe />

      {/* ── High-Speed Rapier 3D Physics Simulation with Fixed 60Hz Timestep ── */}
      <Suspense fallback={null}>
        {/* interpolate is off on low: it takes a copy of every rigid body
            each physics step, and on a weak CPU the 1–2 frame difference
            is more noticeable than the interpolation micro-jitter. */}
        <Physics gravity={[0, -19.6, 0]} timeStep={1 / 60} interpolate={!visualQuality.cheapMaterials}>
          {/* The floor is built by WorldScene from ground slabs: each slab's collider
              matches its mesh, and the safety floor lies UNDER the island within
              the visual edge. The previous invisible 90×90×10 cube
              (args [45, 5, 45]) reached ±45 m — far beyond the edge of
              the visible island — and allowed walking on emptiness. */}

          {/* Optimized Modular Space Outpost Objects */}
          <WorldScene playerPosRef={playerPosRef} />

          {/* 3rd-Person Playable Animated Character */}
          {/* Spawn is shifted to x=0.3: the spacetruck_large box (yaw 45°, face
              up to x≈0, z 5.1..6.2, y 1..1.69) reached the point [0,1.1,6] —
              the r=0.2 capsule intersected it by ~0.16 m and received a
              depenetration kick at spawn; at x=0.3 the distance to the face is
              0.30 > r + margin. The default [0,1.4,6] in CharacterController is
              a dead path (the prop is always passed), deliberately left untouched. */}
          <CharacterController
            playerPosRef={playerPosRef}
            spawnPoint={[SPAWN_POINT[0], SPAWN_POINT[1], SPAWN_POINT[2]]}
            spawnYaw={SPAWN_YAW}
          />
        </Physics>
      </Suspense>

      {/* ── QA free camera: mounts after the controller so it wins the frame ── */}
      <DebugFlyCamera />

      {/* ── Adaptive render resolution + shader precompile: engage once
          loading settles. ── */}
      {isSceneLoaded && (
        <AdaptiveResolution
          dpr={dpr}
          maxDpr={DPR_CAP}
          onChange={setDpr}
        />
      )}
      <ShaderWarmup />
    </Canvas>
  );
}

useGLTF.preload('/model/kaykit_space/Mannequin_Medium.glb');
useGLTF.preload('/model/kaykit_space/Rig_Medium_MovementBasic.glb');
useGLTF.preload('/model/kaykit_space/Rig_Medium_General.glb');

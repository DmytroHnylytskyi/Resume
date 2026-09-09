'use client';

import React, { useRef, Suspense, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { dayNightState, getNightFactor } from '../../store/dayNightState';
import WorldScene from './WorldScene';
import CharacterController from './CharacterController';

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
const IS_COARSE_POINTER =
  typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
const NATIVE_DPR = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
const DPR_FLOOR = IS_COARSE_POINTER ? 0.75 : 0.85;
const DPR_CAP = Math.min(NATIVE_DPR, IS_COARSE_POINTER ? 1.5 : 2);

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
 * Pre-compiles every material program in the scene after load. Without this,
 * running into a newly visible area triggers first-draw shader compilation —
 * 100ms+ frame stalls that read as hitching mid-gameplay. The light rig is
 * now permanent (day/night animates values only), so a single compile pass
 * covers the whole cycle — no recompile on theme switch anymore.
 */
function ShaderWarmup(): null {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const isSceneLoaded = useGameStore((s) => s.isSceneLoaded);

  useEffect(() => {
    if (!isSceneLoaded) return;
    const id = requestAnimationFrame(() => {
      try {
        gl.compile(scene, camera);
      } catch (_) {}
    });
    return () => cancelAnimationFrame(id);
  }, [gl, scene, camera, isSceneLoaded]);

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

const CELESTIAL_DIST = 290; // dome is at 360; bodies sit just inside it
const LIGHT_DIST = 60;

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

  // ── Procedural textures (baked once, disposed on unmount) ──
  const moonTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const base = ctx.createRadialGradient(118, 110, 16, 128, 128, 126);
      base.addColorStop(0, '#f7f9ff');
      base.addColorStop(0.72, '#dde5f6');
      base.addColorStop(1, '#aebada');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 256, 256);

      const maria: [number, number, number][] = [
        [92, 88, 46], [150, 120, 38], [110, 160, 30], [168, 76, 26]
      ];
      for (const [x, y, r] of maria) {
        const g = ctx.createRadialGradient(x, y, 4, x, y, r);
        g.addColorStop(0, 'rgba(150, 168, 205, 0.4)');
        g.addColorStop(1, 'rgba(150, 168, 205, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      const craters: [number, number, number][] = [
        [80, 70, 9], [140, 90, 6], [60, 130, 11], [170, 150, 8], [120, 55, 5],
        [200, 110, 7], [45, 95, 5], [150, 185, 10], [95, 175, 6], [185, 60, 4]
      ];
      for (const [x, y, r] of craters) {
        ctx.fillStyle = 'rgba(140, 158, 198, 0.45)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(235, 242, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(x - r * 0.2, y - r * 0.25, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const moonHaloTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(128, 128, 40, 128, 128, 128);
      grad.addColorStop(0, 'rgba(210, 224, 255, 0.55)');
      grad.addColorStop(0.5, 'rgba(180, 200, 255, 0.18)');
      grad.addColorStop(1, 'rgba(160, 190, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const sunHaloTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Normal-blended warm gradient: additive over a bright sky would clip
      // straight to white and split the sun into two tones
      const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, 'rgba(255, 214, 110, 0.7)');
      grad.addColorStop(0.25, 'rgba(255, 220, 130, 0.45)');
      grad.addColorStop(0.6, 'rgba(255, 228, 160, 0.18)');
      grad.addColorStop(1, 'rgba(255, 232, 180, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const starTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.35, 'rgba(220, 230, 255, 0.7)');
      grad.addColorStop(1, 'rgba(200, 215, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  useEffect(
    () => () => {
      if (moonTexture) moonTexture.dispose();
      if (moonHaloTexture) moonHaloTexture.dispose();
      if (sunHaloTexture) sunHaloTexture.dispose();
      if (starTexture) starTexture.dispose();
    },
    [moonTexture, moonHaloTexture, sunHaloTexture, starTexture]
  );

  // ── Sky dome material (merged day/night gradient shader) ──
  const domeMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uZenith: { value: new THREE.Color('#2e7fd6') },
        uHorizon: { value: new THREE.Color('#cfe8fa') },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunTint: { value: new THREE.Color('#ffe9b8') }
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
        void main() {
          float h = clamp(normalize(vLocal).y, 0.0, 1.0);
          vec3 col = mix(uHorizon, uZenith, pow(h, 0.6));
          // Warm bloom hugging the sun direction — glows at the horizon
          // during dawn/dusk and fades out once the sun is below it.
          float sunAmt = pow(max(dot(normalize(vLocal), uSunDir), 0.0), 5.0);
          col = mix(col, uSunTint, sunAmt * 0.45);
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
  }, []);

  useEffect(() => () => domeMat.dispose(), [domeMat]);

  // ── Starfield positions (static shell inside the dome, upper sky biased) ──
  const starPositions = useMemo(() => {
    const COUNT = 800;
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const y = -0.9 + Math.random() * 1.9; // [-0.9, 1] — mostly above horizon
      const phi = Math.random() * TAU;
      const r = Math.sqrt(Math.max(0.05, 1 - y * y));
      arr[i * 3] = Math.cos(phi) * r * 330;
      arr[i * 3 + 1] = y * 330;
      arr[i * 3 + 2] = Math.sin(phi) * r * 330;
    }
    return arr;
  }, []);

  // ── Refs animated by the director below ──
  const sunGroupRef = useRef<THREE.Group>(null);
  const moonGroupRef = useRef<THREE.Group>(null);
  const sunDiscMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const sunHaloMatRef = useRef<THREE.SpriteMaterial>(null);
  const moonDiscMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const moonHaloMatRef = useRef<THREE.SpriteMaterial>(null);
  const starsRef = useRef<THREE.Points>(null);
  const starMatRef = useRef<THREE.PointsMaterial>(null);
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

    // Celestial bodies ride their arcs; cross-fade around the horizon so
    // nothing pops (and the sun never shows from "under the world").
    if (sunGroupRef.current) sunGroupRef.current.position.copy(_dirSun).multiplyScalar(CELESTIAL_DIST);
    if (moonGroupRef.current) moonGroupRef.current.position.copy(_dirMoon).multiplyScalar(CELESTIAL_DIST);
    const sunVis = clamp01((s.sunElev + 0.03) * 7);
    const moonVis = clamp01((s.moonElev + 0.03) * 7);
    if (sunDiscMatRef.current) sunDiscMatRef.current.opacity = sunVis;
    if (sunHaloMatRef.current) sunHaloMatRef.current.opacity = 0.6 * sunVis;
    if (moonDiscMatRef.current) moonDiscMatRef.current.opacity = moonVis;
    if (moonHaloMatRef.current) moonHaloMatRef.current.opacity = 0.6 * moonVis;

    // Stars fade in through dusk, out through dawn.
    const nf = getNightFactor();
    if (starMatRef.current) starMatRef.current.opacity = nf * 0.95;
    if (starsRef.current) starsRef.current.visible = nf > 0.002;

    // ── Unified light rig (values only; count never changes) ──
    const sunI = Math.sqrt(clamp01(s.sunElev)); // fast warm-up after sunrise
    const sl = sunLightRef.current;
    if (sl) {
      sl.position.copy(_dirSun).multiplyScalar(LIGHT_DIST);
      sl.intensity = 2.8 * sunI;
      _colA.set('#ff8f5a');
      _colB.set('#fff3d6');
      sl.color.lerpColors(_colA, _colB, clamp01(s.sunElev * 2.2));
    }

    const ml = moonLightRef.current;
    if (ml) {
      ml.position.copy(_dirMoon).multiplyScalar(LIGHT_DIST);
      ml.intensity = 2.3 * Math.sqrt(clamp01(s.moonElev)) * nf;
    }

    const fl = fillLightRef.current;
    if (fl) {
      fl.intensity = 1.1 + (0.95 - 1.1) * nf;
      _colA.set('#93c5fd');
      _colB.set('#405a9e');
      fl.color.lerpColors(_colA, _colB, nf);
    }

    const am = ambientRef.current;
    if (am) {
      am.intensity = 1.0 + (2.2 - 1.0) * nf;
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
      hl.intensity = 1.3 + 0.3 * nf;
    }

    gl.toneMappingExposure = 1.05 + 0.3 * nf;
  });

  return (
    <group>
      {/* ── Sky dome (single continuous gradient + sun bloom) ── */}
      <mesh material={domeMat} renderOrder={-1000}>
        <sphereGeometry args={[360, 32, 20]} />
      </mesh>

      {/* ── Starfield (opacity follows the night factor) ── */}
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={starMatRef}
          size={2.4}
          sizeAttenuation={false}
          map={starTexture || undefined}
          color="#cdd9ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* ── Sun: halo sprite + self-lit disc on the travel arc ── */}
      <group ref={sunGroupRef}>
        <sprite scale={[128, 128, 1]}>
          <spriteMaterial
            ref={sunHaloMatRef}
            map={sunHaloTexture || undefined}
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
        <mesh>
          <sphereGeometry args={[16, 32, 24]} />
          <meshBasicMaterial ref={sunDiscMatRef} color="#fff3c4" toneMapped={false} transparent opacity={1} />
        </mesh>
      </group>

      {/* ── Moon: procedural crater texture + cold halo ── */}
      <group ref={moonGroupRef}>
        <sprite scale={[128, 128, 1]}>
          <spriteMaterial
            ref={moonHaloMatRef}
            map={moonHaloTexture || undefined}
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
        <mesh>
          <sphereGeometry args={[16, 32, 24]} />
          <meshBasicMaterial ref={moonDiscMatRef} map={moonTexture || undefined} toneMapped={false} transparent opacity={1} />
        </mesh>
      </group>

      {/* ── Permanent unified light rig ──
          Key = sun by day, moon by night; cool fill + ambient + hemisphere
          interpolate between the previously shipped day/night rigs. */}
      <directionalLight ref={sunLightRef} intensity={2.8} color="#fff3d6" />
      <directionalLight ref={moonLightRef} intensity={0} color="#c3d6ff" />
      <directionalLight ref={fillLightRef} position={[60, 30, 40]} intensity={1.1} color="#93c5fd" />
      <ambientLight ref={ambientRef} intensity={1.0} color="#f0f9ff" />
      <hemisphereLight ref={hemiRef} args={['#a5d8ff', '#cbd5e1', 1.3]} />
    </group>
  );
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
  // The adaptive resolution value lives in the dpr PROP itself: fiber
  // reconciles viewport.dpr against this prop on re-renders, so driving it
  // from here is the only churn-free way to change resolution at runtime.
  const [dpr, setDpr] = React.useState(DPR_CAP);

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [-18, 22, 36], fov: 45, far: 900 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping
      }}
      performance={{ min: 0.5 }}
    >
      {/* ── Continuous day/night atmosphere (dome, sun/moon, stars, lights) ── */}
      <AtmosphereSky />

      {/* ── High-Speed Rapier 3D Physics Simulation with Fixed 60Hz Timestep ── */}
      <Suspense fallback={null}>
        <Physics gravity={[0, -19.6, 0]} timeStep={1 / 60} interpolate={true}>
          {/* Seamless Solid Ground Foundation aligned with surface plane (Y=0.55) */}
          <RigidBody type="fixed" colliders={false} position={[0, -4.45, 0]}>
            <CuboidCollider args={[45, 5.0, 45]} friction={0.8} />
          </RigidBody>

          {/* 379 Optimized Modular Map Objects */}
          <WorldScene playerPosRef={playerPosRef} />

          {/* 3rd-Person Playable Animated Character */}
          <CharacterController playerPosRef={playerPosRef} spawnPoint={[0.0, 1.4, 14.0]} />
        </Physics>
      </Suspense>

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

useGLTF.preload('/model/kaykit_halloween/character.glb');
useTexture.preload('/model/kaykit_halloween/Arissa_diffuse.webp');
useTexture.preload('/model/kaykit_halloween/Arissa_normal.webp');
useTexture.preload('/model/kaykit_halloween/Arissa_specular.webp');

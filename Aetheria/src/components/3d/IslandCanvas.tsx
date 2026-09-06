'use client';

import React, { useRef, Suspense, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
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
 *
 * Resolution quality: the canvas runs with hardware MSAA and the dpr cap
 * sits at native device pixels (≤2 desktop, ≤1.5 touch devices) — the old
 * sub-native caps (0.7–0.75) with antialias off rendered the island at
 * ~540p, which read as jagged edges on desktop and as pixel mush on phones
 * (a 3x devicePixelRatio panel got ~1/16 of its pixels). Weak GPUs settle
 * at the floor through the steps below instead of falling into mush.
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
 * Pre-compiles every material program in the scene after load (and after a
 * theme toggle, which swaps the light rig). Without this, running into a
 * newly visible area triggers first-draw shader compilation — 100ms+ frame
 * stalls that read as hitching/black flicker mid-gameplay.
 */
function ShaderWarmup(): null {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const isSceneLoaded = useGameStore((s) => s.isSceneLoaded);
  const isLight = useGameStore((s) => s.theme === 'light');

  useEffect(() => {
    if (!isSceneLoaded) return;
    const id = requestAnimationFrame(() => {
      try {
        gl.compile(scene, camera);
      } catch (_) {}
    });
    return () => cancelAnimationFrame(id);
  }, [gl, scene, camera, isSceneLoaded, isLight]);

  return null;
}

/**
 * NightSkyDome
 *
 * Cheap vertical-gradient night sky (deep indigo zenith → moonlit horizon).
 * A flat-shaded gradient dome costs a fraction of the Preetham "Sky" shader
 * per pixel — important on integrated GPUs at full-HD windows.
 */
function NightSkyDome(): React.ReactElement {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uZenith: { value: new THREE.Color('#1a2750') },
        uHorizon: { value: new THREE.Color('#405a8c') }
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
        void main() {
          float h = clamp(normalize(vLocal).y, 0.0, 1.0);
          vec3 col = mix(uHorizon, uZenith, pow(h, 0.7));
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh material={material} renderOrder={-1000}>
      <sphereGeometry args={[360, 32, 20]} />
    </mesh>
  );
}

/**
 * Moon
 *
 * 3D sphere with a procedurally baked crater texture and limb darkening
 * (edges darker than the center — reads spherical even as a self-lit body),
 * plus a soft additive halo. Parked high over the cemetery as the key-light
 * anchor of the night scene.
 */
function Moon(): React.ReactElement {
  const moonTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Base disc with limb darkening
      const base = ctx.createRadialGradient(118, 110, 16, 128, 128, 126);
      base.addColorStop(0, '#f7f9ff');
      base.addColorStop(0.72, '#dde5f6');
      base.addColorStop(1, '#aebada');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 256, 256);

      // Maria — large soft dark patches
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

      // Craters — small dark circles with a light rim
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

  const haloTexture = useMemo(() => {
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

  useEffect(() => () => { if (moonTexture) moonTexture.dispose(); }, [moonTexture]);
  useEffect(() => () => { if (haloTexture) haloTexture.dispose(); }, [haloTexture]);

  return (
    <group position={[-90, 110, -260]}>
      {haloTexture && (
        <sprite scale={[128, 128, 1]}>
          <spriteMaterial
            map={haloTexture}
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      )}
      <mesh>
        <sphereGeometry args={[16, 32, 24]} />
        <meshBasicMaterial map={moonTexture} toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * DaySkyDome
 *
 * Cheap azure gradient dome — the day counterpart of the NightSkyDome.
 * Preetham's "Sky" washes to white near the horizon; a hand-authored
 * gradient guarantees the blue-sky art direction at a fraction of the cost.
 */
function DaySkyDome(): React.ReactElement {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uZenith: { value: new THREE.Color('#2e7fd6') },
        uHorizon: { value: new THREE.Color('#cfe8fa') },
        uSunDir: { value: new THREE.Vector3(0.688, 0.501, 0.531).normalize() },
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
          vec3 col = mix(uHorizon, uZenith, pow(h, 0.55));
          // Warm yellow glow spreading around the sun direction
          float sunAmt = pow(max(dot(normalize(vLocal), uSunDir), 0.0), 5.0);
          col = mix(col, uSunTint, sunAmt * 0.45);
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh material={material} renderOrder={-1000}>
      <sphereGeometry args={[360, 32, 20]} />
    </mesh>
  );
}

/**
 * Sun
 *
 * 3D sphere with a procedurally baked plasma texture (white-hot core fading
 * to a warm orange rim) + additive halo — the day-theme counterpart of the
 * Moon. A sphere reads correctly from any viewing angle, unlike a flat disc.
 */
function Sun(): React.ReactElement {
  const haloTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Normal-blended warm gradient: additive over the light day sky would
      // clip straight to white and split the sun into two tones
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

  useEffect(() => () => { if (haloTexture) haloTexture.dispose(); }, [haloTexture]);

  return (
    <group position={[140, 102, 108]}>
      {haloTexture && (
        <sprite scale={[128, 128, 1]}>
          <spriteMaterial
            map={haloTexture}
            transparent
            opacity={0.6}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      )}
      <mesh>
        <sphereGeometry args={[16, 32, 24]} />
        <meshBasicMaterial color="#fff3c4" toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * IslandCanvas
 *
 * Root 3D WebGL Canvas entry point for Aetheria.
 *
 * Architecture & Performance Highlights:
 * - High-Performance WebGL: Configured with dpr=1, powerPreference='high-performance', ACESFilmic tonemapping.
 * - Rapier 3D Physics: Runs an asynchronous, deterministic physics world at locked 60Hz.
 * - Dual-Theme Atmosphere: moonlit starry night (dark) vs sunlit blue-sky day (light).
 */
export default function IslandCanvas(): React.ReactElement {
  const playerPosRef = useRef<THREE.Vector3 | null>(null);
  // Granular subscriptions: a whole-store subscription here re-rendered the
  // Canvas on EVERY store change (interaction prompt edges fire while
  // running), and fiber re-applies the `dpr` prop on each of those renders —
  // snapping the adaptive resolution back and churning the swapchain.
  const theme = useGameStore((s) => s.theme);
  const isSceneLoaded = useGameStore((s) => s.isSceneLoaded);
  const isLight = theme === 'light';
  // The adaptive resolution value lives in the dpr PROP itself: fiber
  // reconciles viewport.dpr against this prop on re-renders, so driving it
  // from here is the only churn-free way to change resolution at runtime.
  const [dpr, setDpr] = React.useState(DPR_CAP);

  React.useEffect(() => {
    setDpr(DPR_CAP);
  }, [isLight]);

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [-18, 22, 36], fov: 45, far: 900 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: isLight ? 1.05 : 1.35
      }}
      performance={{ min: 0.5 }}
    >
      {/* ── Sky Background ── */}
      <color attach="background" args={[isLight ? '#dbeafe' : '#101736']} />

      {/* ── Night: gradient dome + moon + stars (dark theme only) ── */}
      {!isLight && (
        <>
          <NightSkyDome />
          <Moon />
          <Stars radius={90} depth={40} count={850} factor={3.2} saturation={0.8} fade speed={0.4} />
        </>
      )}

      {/* ── Day: azure gradient dome + visible sun (light theme) ── */}
      {isLight && (
        <>
          <DaySkyDome />
          <Sun />
        </>
      )}

      {/* ── Scene Lighting ──
          Dark: cold moonlight key + deep blue ambient — warm accents (candles,
          lanterns, pumpkins) read as the contrast anchors of the night scene.
          Light: warm sun + sky-blue fill. ── */}
      {isLight ? (
        <>
          <directionalLight position={[55, 38, 43]} intensity={2.8} color="#fff3d6" />
          <directionalLight position={[-30, 30, -30]} intensity={1.1} color="#93c5fd" />
          <ambientLight intensity={1.0} color="#f0f9ff" />
          <hemisphereLight args={['#a5d8ff', '#cbd5e1', 1.3]} />
        </>
      ) : (
        <>
          {/* Moonlight key: cold silver-blue from the moon direction */}
          <directionalLight position={[-60, 80, -95]} intensity={2.3} color="#c3d6ff" />
          {/* Cool fill from the opposite side keeps shadowed faces readable */}
          <directionalLight position={[60, 30, 40]} intensity={0.95} color="#405a9e" />
          <ambientLight intensity={2.2} color="#2f4485" />
          <hemisphereLight args={['#4a67a5', '#1c2640', 1.6]} />
        </>
      )}

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
          loading settles. Both themes cap below native for the soft
          "polished" texture look (day 0.75, night 0.7). ── */}
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

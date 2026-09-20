'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { QuasarAccretionShader, QuasarHorizonShader } from './shaders/QuasarSingularityShader';
import { getNightFactor } from '../../store/dayNightState';
import { useGameStore } from '../../store/useGameStore';

interface SingularityBackgroundProps {
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  warpActive?: boolean;
  onWarpComplete?: () => void;
}

// Shared mutable buffer for 60/120 FPS continuous physics without triggering React re-renders
interface SharedPhysics {
  scrollVelocity: number;
  scrollProgress: number;
  warpProgress: number;
}

// Background GPU Particle Vortex
function InfallStarfield({
  physicsRef
}: {
  physicsRef: React.RefObject<SharedPhysics>;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const isMobile = typeof window !== 'undefined' && (window.innerWidth < 820 || 'ontouchstart' in window);
  const count = isMobile ? 600 : 1600;

  const { positions, colors, orbits } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const orb = new Float32Array(count * 3);

    const colorCyan = new THREE.Color('#4ef2d2');
    const colorGold = new THREE.Color('#f59e0b');
    const colorWhite = new THREE.Color('#ffffff');

    for (let i = 0; i < count; i++) {
      const r = 2.4 + Math.pow(Math.random(), 2.2) * 14.0;
      const theta = Math.random() * Math.PI * 2;
      const speed = (0.6 / Math.sqrt(r)) * (0.8 + Math.random() * 0.4);

      orb[i * 3 + 0] = r;
      orb[i * 3 + 1] = theta;
      orb[i * 3 + 2] = speed;

      pos[i * 3 + 0] = Math.cos(theta) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.5 * Math.exp(-r * 0.1);
      pos[i * 3 + 2] = Math.sin(theta) * r;

      const pick = Math.random();
      const pColor = pick < 0.4 ? colorCyan : pick < 0.8 ? colorGold : colorWhite;
      col[i * 3 + 0] = pColor.r;
      col[i * 3 + 1] = pColor.g;
      col[i * 3 + 2] = pColor.b;
    }

    return { positions: pos, colors: col, orbits: orb };
  }, [count]);

  const circleTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.7)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;

    const physics = physicsRef.current;
    const scrollVel = physics ? physics.scrollVelocity : 0;
    const warpProg = physics ? physics.warpProgress : 0;
    const speedBoost = 1.0 + Math.min(Math.abs(scrollVel) * 0.35, 1.0) + warpProg * 5.0;
    const radialSuction = warpProg * 8.5;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      let r = orbits[idx + 0];
      let theta = orbits[idx + 1];
      const speed = orbits[idx + 2];

      theta += (speed * speedBoost + warpProg * 4.5) * delta;
      r -= (0.05 * speedBoost + radialSuction) * delta;

      if (r < 0.25) {
        r = warpProg > 0.4 ? 0.05 : (14.0 + Math.random() * 2.0);
        theta = Math.random() * Math.PI * 2;
      }

      orbits[idx + 0] = r;
      orbits[idx + 1] = theta;

      posArray[i * 3 + 0] = Math.cos(theta) * r;
      posArray[i * 3 + 2] = Math.sin(theta) * r;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.065}
        map={circleTexture ?? undefined}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// 3D Core with Quasar / Singularity Shaders (Zero React re-render design)
function GravitationalCoreMesh({
  physicsRef
}: {
  physicsRef: React.RefObject<SharedPhysics>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const diskMatRef = useRef<THREE.ShaderMaterial>(null);
  const warpedDiskMatRef = useRef<THREE.ShaderMaterial>(null);
  const horizonMatRef = useRef<THREE.ShaderMaterial>(null);
  const rotationAngleRef = useRef(0);

  const diskMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      ...QuasarAccretionShader,
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, []);

  const warpedDiskMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      ...QuasarAccretionShader,
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, []);

  const horizonMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      ...QuasarHorizonShader,
      transparent: true
    });
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // Read day/night directly from the module buffer without any React re-render
    const dayNightFactor = 1.0 - getNightFactor();

    const physics = physicsRef.current;
    const scrollVelocity = physics ? physics.scrollVelocity : 0;
    const scrollProgress = physics ? physics.scrollProgress : 0;
    const warpProgress = physics ? physics.warpProgress : 0;

    // Smooth monotonic rotation: dignified base speed, gentle boost on scroll (never spins wildly or in reverse)
    const scrollSpeedBoost = Math.min(Math.abs(scrollVelocity) * 0.10, 0.22);
    const warpSpeedBoost = warpProgress * 2.5;
    rotationAngleRef.current += delta * (0.12 + scrollSpeedBoost + warpSpeedBoost);

    // Dampen scroll velocity natively inside Three.js frame loop
    if (physics) {
      physics.scrollVelocity *= 0.88;
      if (Math.abs(physics.scrollVelocity) < 0.005) physics.scrollVelocity = 0;
    }

    // Update uniform values directly on GPU
    if (diskMatRef.current) {
      diskMatRef.current.uniforms.uTime.value = t;
      diskMatRef.current.uniforms.uRotationAngle.value = rotationAngleRef.current;
      diskMatRef.current.uniforms.uScrollVelocity.value = scrollVelocity;
      diskMatRef.current.uniforms.uDayNightFactor.value = dayNightFactor;
      diskMatRef.current.uniforms.uWarpProgress.value = warpProgress;
    }
    if (warpedDiskMatRef.current) {
      warpedDiskMatRef.current.uniforms.uTime.value = t;
      warpedDiskMatRef.current.uniforms.uRotationAngle.value = rotationAngleRef.current * 0.85;
      warpedDiskMatRef.current.uniforms.uScrollVelocity.value = scrollVelocity;
      warpedDiskMatRef.current.uniforms.uDayNightFactor.value = dayNightFactor;
      warpedDiskMatRef.current.uniforms.uWarpProgress.value = warpProgress;
    }
    if (horizonMatRef.current) {
      horizonMatRef.current.uniforms.uDayNightFactor.value = dayNightFactor;
      horizonMatRef.current.uniforms.uWarpProgress.value = warpProgress;
    }

    // Spatial positioning responding to scroll progress
    if (groupRef.current) {
      const isMobile = state.size.width < 820;
      const targetX = isMobile ? 0 : THREE.MathUtils.lerp(2.2, 1.4, scrollProgress);
      const targetY = isMobile ? -0.7 : THREE.MathUtils.lerp(0.2, -0.3, scrollProgress);
      const targetZ = isMobile
        ? THREE.MathUtils.lerp(-4.6, -8.8, scrollProgress)
        : THREE.MathUtils.lerp(-2.2, -7.8, scrollProgress);

      const targetScale = isMobile ? 0.72 : 1.0;

      groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, targetX, 3.5, delta);
      groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetY, 3.5, delta);
      groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, targetZ, 3.5, delta);

      groupRef.current.scale.setScalar(THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 3.5, delta));

      groupRef.current.rotation.y = THREE.MathUtils.lerp(0.15, -0.25, scrollProgress);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(-0.1, 0.15, scrollProgress);
    }
  });

  return (
    <group ref={groupRef} position={[2.2, 0.2, -2.2]}>
      {/* ── 1. The Event Horizon Core ── */}
      <mesh>
        <sphereGeometry args={[1.25, 48, 48]} />
        <meshBasicMaterial color="#000000" side={THREE.DoubleSide} />
      </mesh>

      {/* ── 2. Photon Sphere Fresnel Rim ── */}
      <mesh>
        <sphereGeometry args={[1.32, 48, 48]} />
        <primitive object={horizonMaterial} ref={horizonMatRef} attach="material" />
      </mesh>

      {/* ── 3. Primary Equatorial Accretion Disk ── */}
      <mesh rotation={[-Math.PI / 2 + 0.18, 0, 0]}>
        <ringGeometry args={[1.34, 5.8, 80, 1]} />
        <primitive object={diskMaterial} ref={diskMatRef} attach="material" />
      </mesh>

      {/* ── 4. Gravitational Lensed Vertical Halo ── */}
      <mesh rotation={[0, 0, Math.PI * 0.48]}>
        <ringGeometry args={[1.32, 4.4, 80, 1]} />
        <primitive object={warpedDiskMaterial} ref={warpedDiskMatRef} attach="material" />
      </mesh>

      {/* ── Orbiting Particles ── */}
      <InfallStarfield physicsRef={physicsRef} />
    </group>
  );
}

// Camera Rig managing idle parallax and 3D warp jump
function BackgroundCameraRig({
  warpActive,
  onWarpComplete,
  physicsRef
}: {
  warpActive: boolean;
  onWarpComplete?: () => void;
  physicsRef: React.RefObject<SharedPhysics>;
}) {
  const progressRef = useRef(0);
  const completedRef = useRef(false);

  useFrame((state, delta) => {
    if (warpActive) {
      // ~2.4 seconds total majestic transition timing
      progressRef.current = Math.min(1.0, progressRef.current + delta * 0.42);
      const prog = progressRef.current;
      if (physicsRef.current) {
        physicsRef.current.warpProgress = prog;
      }

      const isMobile = state.size.width < 820;
      const targetCoreX = isMobile ? 0 : 2.2;
      const targetCoreY = isMobile ? -0.7 : 0.2;

      // Two-phase camera plunge:
      // Phase 1 (0 to 0.55, ~1.3s): Hold position so user can clearly see elements swirl into the singularity
      // Phase 2 (0.55 to 1.0, ~1.1s): Exponential dive through the photon ring into the horizon core
      if (prog < 0.55) {
        const prepT = prog / 0.55;
        state.camera.position.z = THREE.MathUtils.lerp(7.5, 6.7, prepT);
        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetCoreX, prepT * 0.4);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetCoreY, prepT * 0.4);
      } else {
        const diveT = (prog - 0.55) / 0.45;
        const diveEase = Math.pow(diveT, 2.5);
        state.camera.position.z = THREE.MathUtils.lerp(6.7, -2.5, diveEase);
        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetCoreX, diveT);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetCoreY, diveT);
      }

      if (prog >= 0.98 && !completedRef.current) {
        completedRef.current = true;
        onWarpComplete?.();
      }
    } else {
      progressRef.current = 0;
      completedRef.current = false;
      if (physicsRef.current) {
        physicsRef.current.warpProgress = 0;
      }
      state.camera.position.set(0, 0.5, 7.5);
    }
  });

  return null;
}

export default function SingularityBackground({
  scrollContainerRef,
  warpActive = false,
  onWarpComplete
}: SingularityBackgroundProps): React.ReactElement {
  // Pure mutable ref for physics: ZERO React state, ZERO re-renders on scroll, theme, or animation
  const physicsRef = useRef<SharedPhysics>({
    scrollVelocity: 0,
    scrollProgress: 0,
    warpProgress: 0
  });

  const lastScrollTop = useRef(0);
  const lastTime = useRef(performance.now());

  // Passive scroll tracker updating mutable ref only (0 React re-renders)
  useEffect(() => {
    const container = scrollContainerRef.current || window;

    const handleScroll = () => {
      const now = performance.now();
      const dt = Math.max(16, now - lastTime.current) / 1000;
      const currentScrollTop = scrollContainerRef.current
        ? scrollContainerRef.current.scrollTop
        : window.scrollY;

      const maxScroll = scrollContainerRef.current
        ? scrollContainerRef.current.scrollHeight - scrollContainerRef.current.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight;

      const progress = maxScroll > 0 ? Math.min(1.0, Math.max(0.0, currentScrollTop / maxScroll)) : 0;
      physicsRef.current.scrollProgress = progress;

      const rawDelta = (currentScrollTop - lastScrollTop.current) / dt;
      const targetVel = Math.max(-1.8, Math.min(1.8, rawDelta / 1200));
      // Low-pass filter to eliminate discrete mouse wheel click impulses
      physicsRef.current.scrollVelocity = physicsRef.current.scrollVelocity * 0.3 + targetVel * 0.7;
      lastScrollTop.current = currentScrollTop;
      lastTime.current = now;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [scrollContainerRef]);

  const [isMobile, setIsMobile] = React.useState(false);
  const theme = useGameStore((s) => s.theme);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 820 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const baseOpacity = warpActive
    ? 1.0
    : isMobile
      ? (theme === 'dark' ? 0.52 : 0.32)
      : (theme === 'dark' ? 0.88 : 0.78);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        opacity: baseOpacity,
        transition: 'opacity 0.4s ease'
      }}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0.5, 7.5], fov: 46, near: 0.1, far: 50 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true
        }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.5} />

        <BackgroundCameraRig
          warpActive={warpActive}
          onWarpComplete={onWarpComplete}
          physicsRef={physicsRef}
        />

        <GravitationalCoreMesh
          physicsRef={physicsRef}
        />
      </Canvas>

      {/* ── Event Horizon Blackout Veil (Smooth Hand-off to 3D) ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#000000',
          pointerEvents: 'none',
          opacity: warpActive ? 1 : 0,
          transition: warpActive ? 'opacity 0.48s cubic-bezier(0.7, 0, 1, 0.3) 1.95s' : 'none'
        }}
      />
    </div>
  );
}

'use client';

/**
 * SingularityCelestial — a gravitational singularity in the game scene's sky.
 *
 * This is a VERBATIM port of the core from the classic version: `GravitationalCoreMesh`
 * in src/components/singularity/SingularityBackground.tsx. Its composition, proportions,
 * tilts, draw order and shader settings replicate it one to one —
 * if you need to verify, compare against that function, not this
 * comment.
 *
 * There are exactly three differences from the classic core, and all are forced:
 *
 *  1. Scale. The classic draws the core right next to the camera (the group sits at
 *     z ≈ −2.2, the core r = 1.25), here it hangs as a celestial body 170 m away.
 *     All radii are multiplied by a single factor SINGULARITY_SCALE — the classic
 *     proportions are preserved, only the overall size changes.
 *  2. There is no position and scroll animation: the game has no scrolling, so
 *     uScrollVelocity and uWarpProgress are always 0, and the group does not move.
 *  3. The materials get a COPY of the uniforms (UniformsUtils.clone) instead of a shared
 *     reference, as in the classic. In the classic code `{ ...QuasarAccretionShader }`
 *     hands the same uniforms object to both the disk and the halo, so writing
 *     uRotationAngle for the "disk" and the "halo" overwrites each other; we do not do that here,
 *     but it does not affect the look — the difference is only in the rotation phase of the pattern.
 *
 * There are no shader patches here anymore: the band, density and opacity are taken
 * stock, as in the classic.
 *
 * Shader materials bypass ACES tone mapping (ShaderMaterial has no
 * tonemapping chunk), so the disk brightness is specified in the quasar's "raw" colors
 * and does not require recomputing the scene exposure.
 *
 * There is deliberately no swarm of infalling particles (InfallStarfield) here: the sparks that spun
 * tightly around the hole read as a local gimmick and emphasized that all
 * the rest of the sky was empty. Instead the dust is smeared across the whole sky — CosmicDust.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  QuasarAccretionShader,
  QuasarHorizonShader
} from '../singularity/shaders/QuasarSingularityShader';
import { getNightFactor } from '../../store/dayNightState';
import { visualQuality } from '../../store/debugState';

// The classic core proportions (core 1.25 / rim 1.32 / disk 1.34..5.8 /
// halo 1.32..4.4) are multiplied by a single factor.
//
// Currently ×1.8: core 18 instead of 1.25, disk up to 83.5 — at a distance of 170 m this is
// a core of ~12.1° angular diameter.
//
// The factor is also a geometry limiter, and both constraints
// are checked against it. The near edge of the disk goes inland linearly, but its
// height grows with the placement (see SINGULARITY_POS): at the current 18° with
// ×1.8 it passes at ~37 m — with a large margin above the hub towers. The visible
// halo edge drops below the horizon by only ~4°; at ×3 it was 18° and was
// the only thing that actually went below the horizon.
const SINGULARITY_SCALE = 1.8;
// ×8 converts classic units to world units: the classic draws the core right next to the
// camera (r = 1.25 with the group at z ≈ −2.2), in the game it hangs 170 m away. This is NOT
// part of the size control and must not change; SINGULARITY_SCALE is a separate
// factor on top of it.
const CLASSIC_TO_WORLD = 8;
const S = CLASSIC_TO_WORLD * SINGULARITY_SCALE;
const CORE_R = 1.25 * S;
const HORIZON_R = 1.32 * S;
const DISK_INNER = 1.34 * S;
const DISK_OUTER = 5.8 * S;
// The halo's inner radius is 1.32, not 1.34: in the classic it starts flush
// with the photon sphere rim, not with the disk.
const HALO_INNER = 1.32 * S;
const HALO_OUTER = 4.4 * S;

// Segmentation as in the classic: 48 for spheres, 80 for rings. On the low preset —
// half as dense: the disk is drawn with an additive shader anyway, where silhouette
// matters more than polygon density.
const SPHERE_SEGMENTS = visualQuality.richEffects ? 48 : 24;
const RING_SEGMENTS = visualQuality.richEffects ? 80 : 48;

function makeAccretionMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    ...QuasarAccretionShader,
    // The uniforms copy overrides the one that came with the spread (otherwise the disk and halo
    // would share one object — see item 3 in the file header).
    uniforms: THREE.UniformsUtils.clone(QuasarAccretionShader.uniforms),
    side: THREE.DoubleSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
}

function makeHorizonMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    ...QuasarHorizonShader,
    uniforms: THREE.UniformsUtils.clone(QuasarHorizonShader.uniforms),
    side: THREE.FrontSide
  });
}

/** Singularity: continuous value animation, without React re-renders. */
export default function SingularityCelestial({ position }: { position: THREE.Vector3 }): React.ReactElement {
  const diskMaterial = useMemo(makeAccretionMaterial, []);
  const haloMaterial = useMemo(makeAccretionMaterial, []);
  const horizonMaterial = useMemo(makeHorizonMaterial, []);

  const rotationAngle = useRef(0);
  const elapsed = useRef(0);

  useEffect(
    () => () => {
      diskMaterial.dispose();
      haloMaterial.dispose();
      horizonMaterial.dispose();
    },
    [diskMaterial, haloMaterial, horizonMaterial]
  );

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    // Base speed 0.12 rad/s — as in the classic without scrolling; the halo runs
    // at 0.75 of it (the same coupling in the classic).
    rotationAngle.current += delta * 0.12;
    elapsed.current += delta;
    const dayFactor = 1 - getNightFactor();

    diskMaterial.uniforms.uTime.value = elapsed.current;
    diskMaterial.uniforms.uRotationAngle.value = rotationAngle.current;
    diskMaterial.uniforms.uScrollVelocity.value = 0;
    diskMaterial.uniforms.uDayNightFactor.value = dayFactor;
    diskMaterial.uniforms.uWarpProgress.value = 0;

    haloMaterial.uniforms.uTime.value = elapsed.current;
    haloMaterial.uniforms.uRotationAngle.value = rotationAngle.current * 0.75;
    haloMaterial.uniforms.uScrollVelocity.value = 0;
    haloMaterial.uniforms.uDayNightFactor.value = dayFactor;
    haloMaterial.uniforms.uWarpProgress.value = 0;

    horizonMaterial.uniforms.uDayNightFactor.value = dayFactor;
    horizonMaterial.uniforms.uWarpProgress.value = 0;
  });

  return (
    <group name="SingularityCelestial" position={position}>
      {/* ── 1. Event horizon: purely black core ── */}
      <mesh>
        <sphereGeometry args={[CORE_R, SPHERE_SEGMENTS, SPHERE_SEGMENTS]} />
        <meshBasicMaterial color="#000000" side={THREE.DoubleSide} />
      </mesh>

      {/* ── 2. Photon sphere: Fresnel rim ── */}
      <mesh material={horizonMaterial}>
        <sphereGeometry args={[HORIZON_R, SPHERE_SEGMENTS, SPHERE_SEGMENTS]} />
      </mesh>

      {/* ── 3. Equatorial accretion disk ── */}
      <group rotation={[-Math.PI / 2 + 0.18, 0, 0]}>
        <mesh material={diskMaterial} renderOrder={10}>
          <ringGeometry args={[DISK_INNER, DISK_OUTER, RING_SEGMENTS, 1]} />
        </mesh>
      </group>

      {/* ── 4. Gravitationally lensed vertical halo ── */}
      <group rotation={[0, 0, Math.PI * 0.48]}>
        <mesh material={haloMaterial} renderOrder={11}>
          <ringGeometry args={[HALO_INNER, HALO_OUTER, RING_SEGMENTS, 1]} />
        </mesh>
      </group>
    </group>
  );
}

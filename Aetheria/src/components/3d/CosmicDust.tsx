'use client';

/**
 * CosmicDust — dust and small debris smeared across the WHOLE sky.
 *
 * Introduced to replace the spark swarm that spun tightly around the singularity:
 * the local swarm read as a separate gimmick at the hole and emphasized that all
 * the rest of the sky was empty. Here particles are distributed over a thick shell around
 * the scene, each drifts on its own course and reflects off the shell bounds, so
 * "life" is visible in every direction you turn.
 *
 * Particles are visible both by day (dimmed) and at night (bright): by day the sky should not
 * look empty, and at night the dust blends with the star field.
 *
 * The shell starts at 110 m — noticeably beyond the map edge (±29 m), so
 * the dust never hangs in the player's face and never sinks below the terrain; in height
 * the lower bound is raised above the tallest structures so particles do not
 * hang between buildings.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getNightFactor } from '../../store/dayNightState';
import { visualQuality } from '../../store/debugState';

const COUNT = visualQuality.dustCount;
const R_MIN = 110;
const R_MAX = 330;
const Y_MIN = 35;
// Each particle's drift is a few meters per second: at a distance of 200–300 m that is
// tenths of a degree per second, i.e. calm motion noticeable to the eye,
// but not a "snowfall".
const SPEED_MIN = 3;
const SPEED_MAX = 9;
const FIELD_SPIN = 0.004; // rad/s — slow rotation of the whole field

export default function CosmicDust(): React.ReactElement {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  // Soft particle sprite: 64×64 radial gradient, baked once.
  const spotTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.35, 'rgba(226, 238, 255, 0.62)');
      grad.addColorStop(1, 'rgba(200, 215, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  useEffect(() => () => spotTexture?.dispose(), [spotTexture]);

  const field = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      // Uniform over the upper hemisphere of the shell: y in [0,1) gives uniform
      // coverage of the spherical segment, not a clump at the pole.
      const yDir = Math.random();
      const rXZ = Math.sqrt(Math.max(0, 1 - yDir * yDir));
      const phi = Math.random() * Math.PI * 2;
      const r = R_MIN + Math.random() * (R_MAX - R_MIN);

      let x = Math.cos(phi) * rXZ * r;
      let y = yDir * r;
      let z = Math.sin(phi) * rXZ * r;
      if (y < Y_MIN) y = Y_MIN + (y % (Y_MIN + 1));

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
      const dir = new THREE.Vector3().randomDirection();
      velocities[i * 3] = dir.x * speed;
      velocities[i * 3 + 1] = dir.y * speed * 0.4;
      velocities[i * 3 + 2] = dir.z * speed;
    }
    return { positions, velocities };
  }, []);

  const elapsed = useRef(0);
  const frameParity = useRef(0);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    elapsed.current += delta;

    const g = groupRef.current;
    if (g) g.rotation.y = elapsed.current * FIELD_SPIN;

    // On the low preset the buffer updates every other frame: 350 particles at 30 Hz
    // look no different from 60 Hz, while the upload and array loop are cheaper.
    frameParity.current ^= 1;
    const attr = pointsRef.current?.geometry.getAttribute('position');
    if (!(attr instanceof THREE.BufferAttribute)) return;
    if (visualQuality.dustEveryOtherFrame && frameParity.current === 1) {
      if (materialRef.current) {
        const nf = getNightFactor();
        materialRef.current.opacity = 0.42 + 0.53 * nf;
      }
      return;
    }

    const arr = attr.array as Float32Array;
    const vel = field.velocities;
    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      let x = arr[ix] + vel[ix] * delta;
      let y = arr[ix + 1] + vel[ix + 1] * delta;
      let z = arr[ix + 2] + vel[ix + 2] * delta;

      const r = Math.sqrt(x * x + y * y + z * z) || 1;

      // Reflection off the shell bounds: we cancel the radial velocity component
      // so particles stay in their layer instead of flying off to infinity and
      // bunching into a ball at the camera.
      if (r > R_MAX || r < R_MIN || y < Y_MIN) {
        const nx = x / r;
        const ny = y / r;
        const nz = z / r;
        const dot = vel[ix] * nx + vel[ix + 1] * ny + vel[ix + 2] * nz;
        vel[ix] -= 2 * dot * nx;
        vel[ix + 1] -= 2 * dot * ny;
        vel[ix + 2] -= 2 * dot * nz;
        if (y < Y_MIN && vel[ix + 1] < 0) vel[ix + 1] = Math.abs(vel[ix + 1]);
        const clamped = Math.min(Math.max(r, R_MIN), R_MAX);
        x = nx * clamped;
        y = ny * clamped;
        z = nz * clamped;
      }

      arr[ix] = x;
      arr[ix + 1] = y;
      arr[ix + 2] = z;
    }
    attr.needsUpdate = true;

    if (materialRef.current) {
      const nf = getNightFactor();
      materialRef.current.opacity = 0.42 + 0.53 * nf;
    }
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[field.positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={materialRef}
          size={1.5}
          map={spotTexture || undefined}
          color="#dbe6ff"
          transparent
          opacity={0.42}
          depthWrite={false}
          // The dust lies in space (110–330 m), while fog is the station's atmosphere:
          // at such a distance it would extinguish it entirely.
          fog={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

'use client';

/**
 * LampGlow — scattered light from street lamps.
 *
 * Three layers, all without real point lights:
 *  1. emissive mask on the lamp heads themselves (see InstancedModelGroup + kitAssets):
 *     only the two heads glow, the stem and base stay dark;
 *  2. a wide soft halo around each head — one Points object for all
 *     62 heads, additive, with a soft gradient from core to edge (this is the
 *     scattering in the air, without volumetric light or post-processing);
 *  3. a warm pool on the ground under each lamp — one InstancedMesh of 31
 *     quads. It reads as light falling on the deck and costs one draw call.
 *
 * The halos and pools intensify toward night and fade during the day. Depth is
 * genuinely tested: the pool and halo do not show through walls.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import rawIslandSceneData from '../../data/islandScene.json';
import type { IslandSceneData } from '../../types/scene';
import { getNightFactor } from '../../store/dayNightState';
import { visualQuality } from '../../store/debugState';

const islandSceneData = rawIslandSceneData as unknown as IslandSceneData;

const HEAD_LOCAL_X = 0.27;
const HEAD_LOCAL_Y = 0.94;
// At night the core is small and the halo wide — it reads as scattering,
// not as just another bright spot.
const GLOW_SIZE = visualQuality.richEffects ? 1.7 : 1.35;
const POOL_SIZE = visualQuality.richEffects ? 3.0 : 2.4;

interface LampRecord {
  x: number;
  z: number;
  baseY: number;
  headY: number;
  yaw: number;
  fs: number;
}

function makeGlowTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const c = 64;
    const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0, 'rgba(255, 252, 235, 1)');
    grad.addColorStop(0.08, 'rgba(255, 226, 150, 0.95)');
    grad.addColorStop(0.24, 'rgba(255, 184, 84, 0.45)');
    grad.addColorStop(0.56, 'rgba(255, 160, 70, 0.12)');
    grad.addColorStop(1, 'rgba(255, 140, 50, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePoolTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const c = 128;
    const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0, 'rgba(255, 238, 200, 0.72)');
    grad.addColorStop(0.32, 'rgba(255, 196, 110, 0.34)');
    grad.addColorStop(0.68, 'rgba(255, 170, 80, 0.09)');
    grad.addColorStop(1, 'rgba(255, 150, 60, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function LampGlow(): React.ReactElement | null {
  const glowTexture = useMemo(makeGlowTexture, []);
  const poolTexture = useMemo(makePoolTexture, []);
  const poolRef = useRef<THREE.InstancedMesh>(null);

  const lamps = useMemo<LampRecord[]>(() => {
    const out: LampRecord[] = [];
    for (const o of islandSceneData.placedObjects) {
      const filename = (o.modelPath.split('/').pop() || '').toLowerCase();
      if (!filename.startsWith('lights')) continue;
      const fs = Array.isArray(o.scale) ? o.scale[0] : o.scale || 1;
      out.push({
        x: o.position[0],
        z: o.position[2],
        baseY: o.position[1],
        headY: o.position[1] + HEAD_LOCAL_Y * fs,
        yaw: o.rotation[1],
        fs
      });
    }
    return out;
  }, []);

  const headGeometry = useMemo(() => {
    if (lamps.length === 0) return null;
    const positions: number[] = [];
    for (const lamp of lamps) {
      const c = Math.cos(lamp.yaw);
      const s = Math.sin(lamp.yaw);
      for (const side of [-1, 1]) {
        const lx = side * HEAD_LOCAL_X * lamp.fs;
        // Rotation around Y: x' = x·cos + z·sin, z' = −x·sin + z·cos (z=0).
        positions.push(lamp.x + lx * c, lamp.headY, lamp.z - lx * s);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeBoundingSphere();
    return geo;
  }, [lamps]);

  const glowMaterial = useMemo(() => {
    if (!glowTexture) return null;
    return new THREE.PointsMaterial({
      map: glowTexture,
      color: new THREE.Color('#ffd39a'),
      size: GLOW_SIZE,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      fog: false
    });
  }, [glowTexture]);

  const poolGeometry = useMemo(() => {
    if (lamps.length === 0) return null;
    return new THREE.PlaneGeometry(1, 1);
  }, [lamps.length]);

  const poolMaterial = useMemo(() => {
    if (!poolTexture) return null;
    return new THREE.MeshBasicMaterial({
      map: poolTexture,
      color: new THREE.Color('#ffc27a'),
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      toneMapped: false
    });
  }, [poolTexture]);

  useEffect(() => {
    const mesh = poolRef.current;
    if (!mesh || lamps.length === 0) return;
    const dummy = new THREE.Object3D();
    lamps.forEach((lamp, i) => {
      dummy.position.set(lamp.x, lamp.baseY + 0.02, lamp.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(POOL_SIZE, POOL_SIZE, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [lamps]);

  useEffect(
    () => () => {
      headGeometry?.dispose();
      glowMaterial?.dispose();
      glowTexture?.dispose();
      poolGeometry?.dispose();
      poolMaterial?.dispose();
      poolTexture?.dispose();
    },
    [headGeometry, glowMaterial, glowTexture, poolGeometry, poolMaterial, poolTexture]
  );

  useFrame(() => {
    const nf = getNightFactor();
    if (glowMaterial) glowMaterial.opacity = 0.34 + 0.46 * nf;
    if (poolMaterial) poolMaterial.opacity = 0.14 + 0.4 * nf;
  });

  if (!headGeometry || !glowMaterial || !poolGeometry || !poolMaterial) return null;

  return (
    <>
      <points
        geometry={headGeometry}
        material={glowMaterial}
        frustumCulled={true}
        renderOrder={4}
      />
      <instancedMesh
        ref={poolRef}
        args={[poolGeometry, poolMaterial, lamps.length]}
        frustumCulled={true}
        renderOrder={2}
      />
    </>
  );
}

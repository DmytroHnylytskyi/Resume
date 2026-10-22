'use client';

/**
 * LampGlow — рассеянный свет уличных фонарей.
 *
 * Три слоя, все без реальных point light:
 *  1. emissive-маска на самих плафонах (см. InstancedModelGroup + kitAssets):
 *     светятся только две головы, ножка и база тёмные;
 *  2. широкое мягкое гало вокруг каждого плафона — один Points-объект на все
 *     62 головы, аддитивное, с мягким градиентом от ядра к краю (это и есть
 *     рассеивание в воздухе, без объёмного света и постобработки);
 *  3. тёплое пятно на земле под каждым фонарём — один InstancedMesh из 31
 *     квада. Оно читается как свет, упавший на палубу, и стоит один draw call.
 *
 * Гало и пятна усиливаются к ночи и гаснут днём. Глубина проверяется
 * по-настоящему: за стеной пятно и гало не просвечивают.
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
// Ночью ядро маленькое, а ореол широкий — это читается как рассеивание,
// а не как ещё одна яркая точка.
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
        // Поворот вокруг Y: x' = x·cos + z·sin, z' = −x·sin + z·cos (z=0).
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

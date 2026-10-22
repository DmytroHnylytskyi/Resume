'use client';

/**
 * CosmicDust — пыль и мелкие обломки, размазанные по ВСЕМУ небу.
 *
 * Появилась взамен роя искр, который крутился вплотную вокруг сингулярности:
 * локальный рой читался отдельным гиммиком у дыры и подчёркивал, что всё
 * остальное небо пустое. Здесь частицы распределены по толстой оболочке вокруг
 * сцены, каждая дрейфует своим ходом и отражается от границ оболочки, поэтому
 * «жизнь» видна в любую сторону, куда ни повернись.
 *
 * Частицы видны и днём (приглушённо), и ночью (ярко): днём небо не должно
 * выглядеть пустым, а ночью пыль сливается со звёздным полем.
 *
 * Оболочка начинается на 110 м — заметно дальше края карты (±29 м), поэтому
 * пыль никогда не висит в лицо игроку и не проваливается под рельеф; по высоте
 * нижняя граница поднята над самыми высокими постройками, чтобы частицы не
 * висели между зданиями.
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
// Дрейф каждой частицы — единицы метров в секунду: на дистанции 200–300 м это
// десятые доли градуса в секунду, то есть спокойное движение, заметное глазом,
// но не «снегопад».
const SPEED_MIN = 3;
const SPEED_MAX = 9;
const FIELD_SPIN = 0.004; // рад/с — медленный оборот всего поля

export default function CosmicDust(): React.ReactElement {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  // Мягкий спрайт частицы: радиальный градиент 64×64, печётся один раз.
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
      // Равномерно по верхней полусфере оболочки: y в [0,1) даёт равномерное
      // покрытие сферического сегмента, а не сгусток у полюса.
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

    // На low-пресете буфер обновляется через кадр: 350 частиц на 30 Гц
    // визуально не отличаются от 60 Гц, а upload и цикл по массиву дешевле.
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

      // Отражение от границ оболочки: гасим радиальную составляющую скорости,
      // чтобы частицы оставались в своём слое, а не улетали в бесконечность и
      // не сбивались в шар у камеры.
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
          // Пыль лежит в космосе (110–330 м), а туман — атмосфера станции:
          // на такой дистанции он погасил бы её целиком.
          fog={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

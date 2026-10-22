'use client';

/**
 * Starfield — звёздное поле с магнитудным разбросом.
 *
 * Старая версия рисовала 1400 одинаковых точек 2.4 px одним цветом с мягким
 * спрайтом: небо читалось как крупная «крупа». Здесь у каждой звезды свои
 * размер, цвет и фаза мерцания. Большинство — мелкие 0.8–1.4 px, яркие
 * 1.5–2.2 px редкие, как в реальном ночном небе. Никаких текстур: ядро и
 * короткий ореол считаются в шейдере по gl_PointCoord, один draw call.
 *
 * Радиус 800: звёзды должны быть дальше горизонта планеты (~636 м), иначе
 * часть звёзд оказывалась бы перед планетой и просвечивала сквозь неё.
 */

import React, { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getNightFactor } from '../../store/dayNightState';
import { visualQuality } from '../../store/debugState';

const STAR_RADIUS = 800;

const VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uDpr;
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vColor = aColor;
    vTwinkle = 0.78 + 0.22 * sin(uTime * 0.7 + aPhase);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    // CSS-пиксели → физические: иначе на dpr 2 звёзды вдвое мельче.
    gl_PointSize = aSize * uDpr;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    float halo = smoothstep(0.5, 0.18, d);
    float alpha = (core * 0.95 + halo * 0.22) * uOpacity;
    gl_FragColor = vec4(vColor * (0.85 + vTwinkle * 0.25), alpha);
  }
`;

export default function Starfield(): React.ReactElement | null {
  const gl = useThree((s) => s.gl);

  const data = useMemo(() => {
    const count = visualQuality.starCount;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const palette = [
      new THREE.Color('#cfddff'),
      new THREE.Color('#ffffff'),
      new THREE.Color('#ffe8c4'),
      new THREE.Color('#ffc9c2'),
      new THREE.Color('#b9e2ff')
    ];

    for (let i = 0; i < count; i++) {
      // Верхняя полусфера с небольшим заходом под горизонт; нижние звёзды
      // всё равно закрывает планета.
      const y = -0.9 + Math.random() * 1.9;
      const phi = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.max(0.05, 1 - y * y));
      positions[i * 3] = Math.cos(phi) * r * STAR_RADIUS;
      positions[i * 3 + 1] = y * STAR_RADIUS;
      positions[i * 3 + 2] = Math.sin(phi) * r * STAR_RADIUS;

      const roll = Math.random();
      sizes[i] = roll < 0.7 ? 0.75 + Math.random() * 0.6 : roll < 0.95 ? 1.35 + Math.random() * 0.55 : 1.9 + Math.random() * 0.5;

      phases[i] = Math.random() * Math.PI * 2;
      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.computeBoundingSphere();

    return geometry;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 1 },
          uDpr: { value: 1 }
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        fog: false
      }),
    []
  );

  useEffect(
    () => () => {
      data.dispose();
      material.dispose();
    },
    [data, material]
  );

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.getElapsedTime();
    material.uniforms.uOpacity.value = getNightFactor() * 0.95;
    const dpr = gl.getPixelRatio();
    if (material.uniforms.uDpr.value !== dpr) material.uniforms.uDpr.value = dpr;
  });

  return <points geometry={data} material={material} frustumCulled={false} renderOrder={-900} />;
}

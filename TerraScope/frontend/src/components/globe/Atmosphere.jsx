/**
 * @file Atmosphere.jsx
 * @description Fresnel Atmospheric Halo Glow mesh component.
 * Uses a BackSide ShaderMaterial with additive blending to render a soft blue cyan outer space atmosphere.
 */

'use client';

import { useMemo, useEffect } from 'react';
import * as THREE from 'three';

const vertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 4.0);
    gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
  }
`;

/**
 * Fresnel Outer Atmosphere Glow mesh component.
 * @returns {JSX.Element} BackSide sphere mesh with custom additive glow shader.
 */
export default function Atmosphere() {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
  }, []);

  useEffect(() => {
    return () => {
      if (material) material.dispose();
    };
  }, [material]);

  return (
    <mesh material={material}>
      {/* Slightly larger sphere surrounding Earth (radius 1.2) */}
      <sphereGeometry args={[1.2, 64, 64]} />
    </mesh>
  );
}

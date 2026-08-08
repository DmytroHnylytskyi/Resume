/**
 * @file PostProcessing.jsx
 * @description Hardware-accelerated post-processing pipeline using @react-three/postprocessing.
 * Configures Bloom glow for glowing 3D markers and Vignette dark corners for cinematic aesthetic.
 */

'use client';

import React from 'react';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

const VIGNETTE_CENTER = new THREE.Vector2(0.5, 0.5);

/**
 * Post-Processing Effects pipeline component.
 * @returns {JSX.Element} EffectComposer mounting Bloom and Vignette shaders.
 */
export default function PostProcessing() {
  return (
    <EffectComposer multisampling={0} disableNormalPass>
      <Bloom 
        luminanceThreshold={0.4} 
        intensity={0.4} 
        mipmapBlur={false} 
      />
      <Vignette 
        eskil={false} 
        offset={0.1} 
        darkness={0.5} 
        center={VIGNETTE_CENTER}
      />
    </EffectComposer>
  );
}

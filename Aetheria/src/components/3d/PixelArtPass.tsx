'use client';

import React, { useMemo, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';

/**
 * High-Performance Retro 3D Pixel-Art Screen Pass:
 * - Quantizes the 3D viewport into authentic low-res pixel blocks (3.5px grid).
 * - Applies 4x4 Bayer Dithering matrix for nostalgic PS1/GBA color blending.
 * - Dynamic ON/OFF toggle in HUD without performance penalty.
 */
export default function PixelArtPass(): React.ReactElement | null {
  const { gl, scene, camera, size } = useThree();
  const { isPixelArt } = useGameStore();

  const renderTarget = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(size.width, size.height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType
    });
    return target;
  }, []);

  useEffect(() => {
    renderTarget.setSize(size.width, size.height);
  }, [size, renderTarget]);

  // Fullscreen Quad Scene & Shader Material
  const { postScene, postCamera, material } = useMemo(() => {
    const pScene = new THREE.Scene();
    const pCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2(size.width, size.height) },
        pixelSize: { value: 3.5 }, // Authentic Retro Pixel density
        ditherStrength: { value: 0.08 },
        colorLevels: { value: 48.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float pixelSize;
        uniform float ditherStrength;
        uniform float colorLevels;
        varying vec2 vUv;

        // 4x4 Bayer Matrix for authentic retro dithering
        float bayer4(vec2 uv) {
          int x = int(mod(uv.x, 4.0));
          int y = int(mod(uv.y, 4.0));
          int index = x + y * 4;
          float dither[16] = float[16](
            0.0 / 16.0,  8.0 / 16.0,  2.0 / 16.0, 10.0 / 16.0,
            12.0 / 16.0, 4.0 / 16.0, 14.0 / 16.0,  6.0 / 16.0,
            3.0 / 16.0, 11.0 / 16.0,  1.0 / 16.0,  9.0 / 16.0,
            15.0 / 16.0, 7.0 / 16.0, 13.0 / 16.0,  5.0 / 16.0
          );
          for(int i = 0; i < 16; i++) {
            if(i == index) return dither[i] - 0.5;
          }
          return 0.0;
        }

        void main() {
          // 1. Pixel coordinate grid snapping
          vec2 dxy = pixelSize / resolution;
          vec2 coord = dxy * floor(vUv / dxy) + dxy * 0.5;

          vec4 texel = texture2D(tDiffuse, coord);

          // 2. Subtle Dithering & Color Banding for authentic Retro Pixel-Art
          float dither = bayer4(gl_FragCoord.xy / pixelSize) * ditherStrength;
          vec3 col = texel.rgb + dither;
          col = floor(col * colorLevels + 0.5) / colorLevels;

          gl_FragColor = vec4(clamp(col, 0.0, 1.0), texel.a);
        }
      `,
      depthWrite: false,
      depthTest: false
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    pScene.add(quad);

    return { postScene: pScene, postCamera: pCamera, material: mat };
  }, []);

  useEffect(() => {
    material.uniforms.resolution.value.set(size.width, size.height);
  }, [size, material]);

  useFrame(() => {
    if (!isPixelArt) {
      // Standard Crisp 3D Render
      gl.setRenderTarget(null);
      gl.render(scene, camera);
      return;
    }

    // 1. Render 3D Scene into RenderTarget
    gl.setRenderTarget(renderTarget);
    gl.render(scene, camera);

    // 2. Apply Retro Pixel-Art Screen Shader directly to Canvas
    material.uniforms.tDiffuse.value = renderTarget.texture;
    gl.setRenderTarget(null);
    gl.render(postScene, postCamera);
  }, 1);

  return null;
}

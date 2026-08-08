/**
 * @file Earth.jsx
 * @description Primary 3D Earth sphere component with custom GLSL ShaderMaterial.
 * Features single-pass GPU day/night blending, real-time astronomical sun direction rotation,
 * photorealistic twilight atmospheric scattering, and rotating cloud coverage layer.
 */

'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import useStore from '../../store/useStore';

/**
 * 3D Earth Mesh component with GLSL ShaderMaterial and rotating Cloud layer.
 * @returns {JSX.Element} Earth group containing surface mesh and clouds mesh.
 */
export default function Earth() {
  const earthRef = useRef();
  const cloudsRef = useRef();
  const dayNightMode = useStore((state) => state.dayNightMode);

  // Load clean Day & Night textures
  const [dayMap, nightMap] = useTexture([
    '/textures/earth_daymap.jpg',
    '/textures/earth_nightmap.jpg',
  ]);

  // Create custom shader material for day/night/dynamic/political modes
  const earthMaterial = useMemo(() => {
    if (dayMap) dayMap.colorSpace = THREE.SRGBColorSpace;
    if (nightMap) nightMap.colorSpace = THREE.SRGBColorSpace;

    return new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayMap },
        nightTexture: { value: nightMap },
        sunDirection: { value: new THREE.Vector3(5, 2.5, 5).normalize() },
        mode: { value: 2 }, // 0 = day, 1 = night, 2 = dynamic, 3 = political
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalWorld;
        
        void main() {
          vUv = uv;
          // Transform normal to World Space to match sunDirection in World Space!
          vNormalWorld = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform vec3 sunDirection;
        uniform int mode;
        
        varying vec2 vUv;
        varying vec3 vNormalWorld;
        
        void main() {
          vec3 dayColor = texture2D(dayTexture, vUv).rgb;
          vec3 nightColor = texture2D(nightTexture, vUv).rgb;
          
          vec3 finalColor = dayColor;

          if (mode == 0) {
            finalColor = dayColor * 0.92; // Calibrated Full Day
          } else if (mode == 1) {
            finalColor = nightColor * 1.5; // Full Night
          } else if (mode == 3) {
            // Political Map Mode: High contrast dark navy vector base for crisp 3D country borders
            float luminance = dot(dayColor, vec3(0.299, 0.587, 0.114));
            vec3 darkNavy = vec3(0.04, 0.07, 0.15);
            vec3 continentColor = vec3(0.12, 0.18, 0.32);
            finalColor = mix(darkNavy, continentColor, smoothstep(0.15, 0.45, luminance));
          } else {
            // Realistic Atmospheric Sun Terminator with Golden Sunset Glow
            float sunDot = dot(vNormalWorld, sunDirection);
            
            // Soft wide atmospheric transition zone (-0.32 to +0.18)
            float dayFactor = smoothstep(-0.32, 0.18, sunDot);
            
            // City lights fade in naturally as dusk approaches
            float nightFactor = 1.0 - smoothstep(-0.08, 0.22, sunDot);
            
            // Smoothly blend daytime terrain and night city lights
            vec3 blendedMap = mix(nightColor * 1.4 * nightFactor, dayColor * 0.92, dayFactor);

            // Warm Golden Sunset / Twilight atmospheric scatter along the terminator band
            float twilightZone = smoothstep(0.0, 0.28, 0.28 - abs(sunDot));
            vec3 sunsetAmber = vec3(0.20, 0.10, 0.03) * twilightZone;  // Golden/Orange dusk glow
            vec3 skyIndigo = vec3(0.03, 0.08, 0.20) * twilightZone;   // Deep indigo atmospheric scattering

            finalColor = clamp(blendedMap + sunsetAmber + skyIndigo, 0.0, 1.0);
          }
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });
  }, [dayMap, nightMap]);

  // Clean up material on unmount
  useEffect(() => {
    return () => {
      if (earthMaterial) earthMaterial.dispose();
    };
  }, [earthMaterial]);

  // Update uniforms when mode changes (no needsUpdate required for uniforms!)
  useEffect(() => {
    if (earthMaterial.uniforms) {
      let modeVal = 2;
      if (dayNightMode === 'day') modeVal = 0;
      else if (dayNightMode === 'night') modeVal = 1;
      else if (dayNightMode === 'political') modeVal = 3;
      else modeVal = 2;
      
      earthMaterial.uniforms.mode.value = modeVal;
    }
  }, [dayNightMode, earthMaterial]);

  // Animate sun direction and cloud rotation
  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = elapsedTime * 0.015;
    }

    if (dayNightMode === 'dynamic' && earthMaterial.uniforms) {
      const angle = elapsedTime * 0.05;
      earthMaterial.uniforms.sunDirection.value.set(
        Math.cos(angle) * 5,
        2.5,
        Math.sin(angle) * 5
      ).normalize();
    }
  });

  return (
    <group>
      {/* Earth Sphere with direct material binding */}
      <mesh ref={earthRef} material={earthMaterial}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>

      {/* Cloud layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[1.007, 64, 64]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent={true}
          opacity={dayNightMode === 'political' ? 0.01 : 0.04}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

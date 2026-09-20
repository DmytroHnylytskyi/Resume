import * as THREE from 'three';

/**
 * QuasarSingularityShader.ts
 * 
 * Advanced GLSL Shader Material for the Gravitational Core in Classic Resume.
 * Features:
 * - Relativistic Doppler Beaming driven by scroll velocity.
 * - Dynamic Day/Night morphing between Deep Cosmic Singularity and Solar Quasar.
 * - Event Horizon contraction and warp dive expansion.
 */

export const QuasarAccretionShader = {
  uniforms: {
    uTime: { value: 0 },
    uRotationAngle: { value: 0 },
    uScrollVelocity: { value: 0 },
    uDayNightFactor: { value: 0 }, // 0 = Deep Night (Cyan/Violet), 1 = Solar Day (Quasar Gold/White)
    uWarpProgress: { value: 0 },    // 0 = Normal, 1 = Plunge into Horizon
    uColorNightInner: { value: new THREE.Color('#4ef2d2') }, // Electric cyan
    uColorNightMid: { value: new THREE.Color('#ff8c3b') },   // Relativistic amber
    uColorNightOuter: { value: new THREE.Color('#8b1446') }, // Deep redshifted crimson
    uColorDayInner: { value: new THREE.Color('#ffffff') },   // Blazing white
    uColorDayMid: { value: new THREE.Color('#f59e0b') },     // Quasar gold
    uColorDayOuter: { value: new THREE.Color('#0284c7') }    // Sky blue perimeter
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,

  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uRotationAngle;
    uniform float uScrollVelocity;
    uniform float uDayNightFactor;
    uniform float uWarpProgress;

    uniform vec3 uColorNightInner;
    uniform vec3 uColorNightMid;
    uniform vec3 uColorNightOuter;

    uniform vec3 uColorDayInner;
    uniform vec3 uColorDayMid;
    uniform vec3 uColorDayOuter;

    varying vec2 vUv;
    varying vec3 vWorldPosition;

    // Simplex 2D noise
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
               -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
        dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    float fbm(vec2 p) {
      float total = 0.0;
      float amp = 0.55;
      for (int i = 0; i < 4; i++) {
        total += snoise(p) * amp;
        p *= 2.15;
        amp *= 0.48;
      }
      return total;
    }

    void main() {
      vec2 p = (vUv - 0.5) * 2.0;
      float r = length(p);
      float theta = atan(p.y, p.x);

      // Radial boundaries with warp expansion
      float rInner = 0.28 * (1.0 - uWarpProgress * 0.4);
      float rOuter = 0.98 + uWarpProgress * 0.5;

      if (r < rInner || r > rOuter) {
        discard;
      }

      float diskT = (r - rInner) / (rOuter - rInner);

      // Bounded relativistic shear that preserves organic clouds and never winds into vinyl grooves
      float staticShear = 1.1 / (r * 1.5 + 0.25);
      // Smooth monotonic rotation angle integrated on CPU (never multiplies uTime by boost)
      float angle = theta + staticShear + uRotationAngle;

      // Stable 2D coordinate system keeping isotropic cloud scale (Screenshot 1)
      vec2 noiseCoord = vec2(cos(angle) * r, sin(angle) * r) * 2.5;
      
      // Gentle bounded plasma drift (living fluid evolution)
      vec2 plasmaDrift = vec2(sin(uTime * 0.14) * 0.12, cos(uTime * 0.10) * 0.12);
      float turbulence = fbm(noiseCoord + plasmaDrift);

      // Continuous solid density curve across all angles (edges never fade or cut off)
      float innerRing = smoothstep(0.0, 0.08, diskT) * (1.0 - smoothstep(0.08, 0.35, diskT)) * 2.5;
      float mainBody = smoothstep(0.0, 0.14, diskT) * (1.0 - smoothstep(0.68, 1.0, diskT));
      float density = innerRing * 1.6 + mainBody * (0.7 + turbulence * 0.55);

      // Soft relativistic Doppler luminance gradient (purely visual, never cuts off alpha)
      float dopplerLuminance = 1.0 - sin(theta) * 0.20;

      // Gentle plasma excitation from scroll velocity (warm energy pulse during scroll)
      float scrollExcitation = clamp(abs(uScrollVelocity) * 0.15, 0.0, 0.35);

      // Color temperature interpolation
      float heat = clamp(1.0 - diskT + (turbulence * 0.25) + scrollExcitation * 0.12, 0.0, 1.0);

      // Night palette
      vec3 colorNight = mix(uColorNightOuter, uColorNightMid, smoothstep(0.15, 0.65, heat));
      colorNight = mix(colorNight, uColorNightInner, smoothstep(0.65, 1.0, heat));
      colorNight += uColorNightInner * pow(1.0 - diskT, 3.8) * 1.9;

      // Day Quasar palette: rich amber and gold without nuclear overexposure
      vec3 colorDay = mix(uColorDayOuter, uColorDayMid, smoothstep(0.15, 0.65, heat));
      colorDay = mix(colorDay, uColorDayInner, smoothstep(0.65, 1.0, heat));
      colorDay += uColorDayInner * pow(1.0 - diskT, 3.5) * 1.1;

      // Blend between Night Singularity and Day Quasar
      vec3 finalColor = mix(colorNight, colorDay * 0.82, uDayNightFactor);
      finalColor *= dopplerLuminance + scrollExcitation;

      // Warp flare
      finalColor += vec3(uWarpProgress * 1.5);

      // In day mode, softly adjust alpha so the quasar stays translucent and luminous
      float dayAlphaMod = mix(1.0, 0.75, uDayNightFactor);
      float alpha = clamp(density * (1.1 + uWarpProgress * 0.8) * dayAlphaMod, 0.0, 0.95);

      float colorScale = mix(1.35, 0.96, uDayNightFactor);
      gl_FragColor = vec4(finalColor * colorScale, alpha);
    }
  `
};

export const QuasarHorizonShader = {
  uniforms: {
    uDayNightFactor: { value: 0 },
    uWarpProgress: { value: 0 },
    uColorNightGlow: { value: new THREE.Color('#4ef2d2') },
    uColorDayGlow: { value: new THREE.Color('#ffe9b8') },
    uRimPower: { value: 3.5 }
  },

  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  fragmentShader: /* glsl */ `
    uniform float uDayNightFactor;
    uniform float uWarpProgress;
    uniform vec3 uColorNightGlow;
    uniform vec3 uColorDayGlow;
    uniform float uRimPower;

    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);

      float rim = 1.0 - max(0.0, dot(viewDir, normal));
      float photonRing = pow(rim, uRimPower) * (1.8 + uWarpProgress * 2.5);

      vec3 glowColor = mix(uColorNightGlow, uColorDayGlow, uDayNightFactor);
      vec3 finalColor = glowColor * photonRing;
      float alpha = clamp(photonRing, 0.0, 1.0);

      gl_FragColor = vec4(finalColor, max(1.0, alpha));
    }
  `
};

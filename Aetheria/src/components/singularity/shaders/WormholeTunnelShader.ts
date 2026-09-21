import * as THREE from 'three';

/**
 * WormholeTunnelShader.ts
 *
 * Fullscreen GLSL shader for the wormhole transit effect.
 * Renders a hyperspace-jump tunnel with:
 *  - Radial speed lines racing from center to edges
 *  - Spiral angular offset increasing with progress
 *  - Pulsing depth rings creating infinite tube illusion
 *  - Day/Night themed color evolution
 *  - Smooth intensity ramp and final flash-to-black
 */

export const WormholeTunnelShader = {
  uniforms: {
    uTime: { value: 0 },
    uTunnelProgress: { value: 0 },     // 0 = invisible, 0→0.85 = tunnel, 0.85→1 = flash & fade
    uDayNightFactor: { value: 0 },     // 0 = Night (Cyan), 1 = Day (Gold)
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uTunnelProgress;
    uniform float uDayNightFactor;

    varying vec2 vUv;

    // Hash-based pseudo-random
    float hash(float n) { return fract(sin(n) * 43758.5453123); }

    // Simplex-like 2D noise
    vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                          -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                                    + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m * m;
      m = m * m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      // Center UV to [-1, 1] with aspect correction
      vec2 uv = vUv * 2.0 - 1.0;

      // Polar coordinates
      float r = length(uv);
      float theta = atan(uv.y, uv.x);

      // Tunnel intensity envelope: 0→peak→flash→black
      float tunnelIntensity = smoothstep(0.0, 0.15, uTunnelProgress)
                            * (1.0 - smoothstep(0.88, 1.0, uTunnelProgress));

      // ─── Speed Lines (Radial Streaks) ───
      // Spiral twist increases with progress
      float spiralTwist = uTunnelProgress * 6.0;
      float twistedAngle = theta + spiralTwist * (1.0 - r * 0.3);

      // Create angular speed lines (like hyperspace jump)
      float numLines = 48.0;
      float lineAngle = fract(twistedAngle * numLines / (2.0 * 3.14159265));
      float speedLine = pow(1.0 - abs(lineAngle - 0.5) * 2.0, 12.0);

      // Radial motion: lines race outward from center
      float radialSpeed = uTime * 3.0 + uTunnelProgress * 8.0;
      float radialWave = fract(r * 3.0 - radialSpeed);
      float radialPulse = smoothstep(0.0, 0.15, radialWave) * smoothstep(0.3, 0.15, radialWave);

      // Combine speed lines with radial motion
      float streaks = speedLine * radialPulse * smoothstep(0.05, 0.3, r);

      // ─── Depth Rings (Tunnel Walls) ───
      float ringDepth = uTime * 2.5 + uTunnelProgress * 12.0;
      float rings = 0.0;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float ringR = fract(ringDepth * 0.3 + fi * 0.2) * 1.5;
        float ringWidth = 0.02 + fi * 0.008;
        float ring = smoothstep(ringWidth, 0.0, abs(r - ringR)) * (1.0 - fi * 0.15);
        rings += ring;
      }

      // ─── Turbulent Plasma Fog ───
      vec2 noiseCoord = vec2(theta * 2.0, r * 4.0 - uTime * 1.5);
      float plasma = snoise(noiseCoord) * 0.5 + 0.5;
      plasma *= smoothstep(0.0, 0.5, r) * (1.0 - smoothstep(0.8, 1.4, r));

      // ─── Color Palette ───
      // Night: cyan → electric blue → violet
      vec3 nightInner = vec3(0.3, 1.0, 0.9);   // bright cyan
      vec3 nightMid   = vec3(0.15, 0.4, 1.0);  // electric blue
      vec3 nightOuter = vec3(0.5, 0.1, 0.8);   // violet

      // Day: gold → amber → white
      vec3 dayInner = vec3(1.0, 0.95, 0.8);    // warm white
      vec3 dayMid   = vec3(1.0, 0.65, 0.15);   // amber
      vec3 dayOuter = vec3(0.9, 0.35, 0.1);    // deep orange

      // Interpolate along radius
      vec3 innerColor = mix(nightInner, dayInner, uDayNightFactor);
      vec3 midColor   = mix(nightMid, dayMid, uDayNightFactor);
      vec3 outerColor = mix(nightOuter, dayOuter, uDayNightFactor);

      vec3 tunnelColor = mix(innerColor, midColor, smoothstep(0.0, 0.5, r));
      tunnelColor = mix(tunnelColor, outerColor, smoothstep(0.5, 1.2, r));

      // ─── Compose Final ───
      float totalBrightness = streaks * 1.8 + rings * 0.6 + plasma * 0.3;
      vec3 color = tunnelColor * totalBrightness;

      // Center glow (wormhole core light)
      float coreGlow = exp(-r * r * 8.0) * uTunnelProgress * 1.5;
      color += innerColor * coreGlow;

      // ─── Final Flash (near end of tunnel) ───
      float flashProgress = smoothstep(0.75, 0.92, uTunnelProgress);
      vec3 flashColor = mix(innerColor, vec3(1.0), 0.7);
      color = mix(color, flashColor, flashProgress * flashProgress);

      // Overall intensity & alpha
      float alpha = clamp(totalBrightness + coreGlow, 0.0, 1.0) * tunnelIntensity;
      alpha = max(alpha, flashProgress * flashProgress); // flash overrides alpha

      gl_FragColor = vec4(color, alpha);
    }
  `
};

'use client';

/**
 * GiantPlanet — an Earth-like world beneath the station platform.
 *
 * Geometry: sphere r=800 centered at y=−920 (top at −120 below the deck).
 * Surface — ocean, continents, mountain provinces, rock, snow, beaches;
 * clouds — a separate sphere r+10; atmosphere — a sphere r×1.012 with a halo.
 *
 * ── Why everything is baked ───────────────────────────────────────────────
 * Procedural terrain requires 15–20 3D noise samples per pixel every frame.
 * On desktop that is ~12 FPS, on a phone — unacceptable. So the heavy
 * shader runs EXACTLY ONCE when entering 3D: the surface and clouds
 * are rendered into two textures (ortho camera from above, 36° polar cap).
 * What remains per frame: one texture sample, cheap detail from two
 * value-noise octaves, specular, haze/limb and night tint. The per-frame cost is a few
 * instructions instead of hundreds.
 *
 * A polar cap rather than equirect: the platform hangs over the planet point
 * closest to it and sees only ~30° around it. The 36° cap covers
 * the whole visible disk with margin and has no polar compression. The cap
 * orientation is tied to the planet axis tilt (PLANET_AXIS/T/B), so the
 * baked light stays correct in world space.
 *
 * The planet is static: the baked diffuse light is fixed in local
 * coordinates. The clouds rotate slowly together with their texture.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getNightFactor } from '../../store/dayNightState';
import { visualQuality } from '../../store/debugState';

// 4096² bake only for a powerful desktop: medium (modern phones)
// gets 2048² — on a mobile GPU 4096 is too expensive both in VRAM and bake time,
// and the difference from a 2× screen DPR is no longer visible.
const HQ = visualQuality.planetHighRes;

const PLANET_RADIUS = 800;
const PLANET_CENTER = new THREE.Vector3(0, -920, 0);
const PLANET_TILT: [number, number, number] = [1.05, 0.4, 0.15];
const PLANET_QUAT = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(PLANET_TILT[0], PLANET_TILT[1], PLANET_TILT[2])
);

// The planet silhouette is the main carrier of "sphericity": on high we give 128
// segments around the equator, on low we keep a cheap 64.
const PLANET_WIDTH_SEGMENTS = HQ ? 128 : 64;
const PLANET_HEIGHT_SEGMENTS = HQ ? 96 : 48;

// Planet lighting. Physically it is the singularity, but it hangs almost exactly above
// the planet point closest to the station: with a vertical key the derivative of
// ndl with respect to normal tilt is zero, and any terrain looks like a flat
// fill. So the key is shifted by ~35° — grazing light reads the slopes.
const SUN_DIR = new THREE.Vector3(0.42, 0.8, -0.43).normalize();

// ── Baking ────────────────────────────────────────────────────────────────
// A 36° cap around the point closest to the platform. The disk visible from the deck is
// ~30°, the 6° margin goes below the horizon.
const CAP_RAD = THREE.MathUtils.degToRad(36);
const CAP_SIN = Math.sin(CAP_RAD);
// The planet is seen from the deck at 3–4 screen pixels per texel, so 1024²
// (the former low) read as large squares — exactly what a weak GPU saw.
// Low is now 2048² (2× linear resolution), HQ — 4096². 4096 on a weak
// iGPU in a cold production build stalled the driver thread, so it is only
// for HQ: a stable first launch beats extra texels.
// MSAA is not needed in the bake — the cap has no geometric silhouettes.
// visualQuality.touch means handheld (UA/maxTouchPoints/DPR), not just
// `pointer: coarse`: a phone in desktop mode reports a fine pointer, and the previous
// check gave it 4096², which blocked the thread on a mobile GPU.
const TOUCH = visualQuality.touch;
const SURFACE_TEX_SIZE = TOUCH ? 2048 : HQ ? 4096 : 2048;
const CLOUD_TEX_SIZE = TOUCH ? 1024 : HQ ? 2048 : 1024;

// Cap axes in the planet's LOCAL coordinates. The planet is tilted, so the world
// "up" is not its local +Y. A is the direction toward the platform,
// T/B is the tangent basis for UV.
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const PLANET_AXIS = WORLD_UP.clone().applyQuaternion(PLANET_QUAT.clone().invert()).normalize();
const PLANET_T = new THREE.Vector3().crossVectors(WORLD_UP, PLANET_AXIS).normalize();
const PLANET_B = new THREE.Vector3().crossVectors(PLANET_AXIS, PLANET_T).normalize();
// The same basis in world coordinates — for the detail normal (modelMatrix is
// not available in the fragment shader).
const PLANET_AXIS_W = PLANET_AXIS.clone().applyQuaternion(PLANET_QUAT).normalize();
const PLANET_T_W = PLANET_T.clone().applyQuaternion(PLANET_QUAT).normalize();
const PLANET_B_W = PLANET_B.clone().applyQuaternion(PLANET_QUAT).normalize();
// The sun in local coordinates — for the baked diffuse light.
const SUN_LOCAL = SUN_DIR.clone().applyQuaternion(PLANET_QUAT.clone().invert()).normalize();

// Clouds are not tilted (their cap looks along world +Y).
const CLOUD_AXIS = new THREE.Vector3(0, 1, 0);
const CLOUD_T = new THREE.Vector3(1, 0, 0);
const CLOUD_B = new THREE.Vector3(0, 0, -1);

const CLOUD_SPIN = 0.0012;
const SHELL_SEGMENTS: [number, number] = HQ ? [96, 64] : [48, 32];
const CLOUD_SEGMENTS: [number, number] = HQ ? [96, 64] : [64, 48];

// ShaderMaterial writes directly into the sRGB framebuffer, without a colorspace chunk.
// We treat hex as already linear, otherwise THREE.Color converts it to linear
// and the planet comes out noticeably darker than intended.
const srgb = (hex: string) => new THREE.Color().setStyle(hex, THREE.LinearSRGBColorSpace);

const PALETTE = {
  uSeaDeep: srgb('#062a44'),
  uSeaShallow: srgb('#0d5878'),
  uSeaCoast: srgb('#2fc0b8'),
  uLandLow: srgb('#4f7d3f'),
  uLandDry: srgb('#b08a4a'),
  uLandRock: srgb('#8d8070'),
  uLandSnow: srgb('#f2f6f8'),
  uSand: srgb('#cbb684'),
  uHaze: srgb('#8fc8ea'),
  uRim: srgb('#7fe9df'),
  uSun: srgb('#fff3dc'),
  uCloudCol: srgb('#f2f7fb')
};

/**
 * Tiled normal map for close-up: 256² (low — 128²), RGB = normal
 * in the tangent basis, A = height for albedo grain. Periodic
 * value-noise, so the texture tiles seamlessly (tile 14 m).
 *
 * Why: the baked 2048² surface gives ~0.46 m/texel; up close that is
 * stair-stepping. This texture adds shading at the 0.5–2 m scale and
 * masks the blocks while staying one sample per frame.
 */
function makeDetailTexture(size: number): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const height = new Float32Array(size * size);

  const hash = (x: number, y: number, seed: number) => {
    let h = (x * 374761393 + y * 668265263 + seed * 1013904223) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const noise = (u: number, v: number, freq: number, seed: number) => {
    const x = u * freq;
    const y = v * freq;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = smooth(x - x0);
    const ty = smooth(y - y0);
    const wrap = (n: number) => ((n % freq) + freq) % freq;
    const h00 = hash(wrap(x0), wrap(y0), seed);
    const h10 = hash(wrap(x0 + 1), wrap(y0), seed);
    const h01 = hash(wrap(x0), wrap(y0 + 1), seed);
    const h11 = hash(wrap(x0 + 1), wrap(y0 + 1), seed);
    const a = h00 + (h10 - h00) * tx;
    const b = h01 + (h11 - h01) * tx;
    return a + (b - a) * ty;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      height[y * size + x] =
        0.6 * noise(u, v, 8, 1) + 0.28 * noise(u, v, 16, 2) + 0.12 * noise(u, v, 32, 3);
    }
  }

  // 12, not 16: at 16 the fine relief read as a "carpet". At this slope
  // the normals already give noticeable shading without turning the planet into noise.
  const strength = 12;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xl = (x - 1 + size) % size;
      const xr = (x + 1) % size;
      const yd = (y - 1 + size) % size;
      const yu = (y + 1) % size;
      const dx = (height[y * size + xr] - height[y * size + xl]) * strength;
      const dy = (height[yu * size + x] - height[yd * size + x]) * strength;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * size + x) * 4;
      data[i] = Math.round((-dx * inv * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round((-dy * inv * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round((inv * 0.5 + 0.5) * 255);
      data[i + 3] = Math.round(height[y * size + x] * 255);
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const DETAIL_TILE_METERS = 20;

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vLocalNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vLocalNormal = normalize(normal);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/**
 * Heavy surface shader. Used ONLY for baking into a texture:
 * the output is diffusely lit color without specular, haze or limb (they
 * depend on the camera and are computed at runtime).
 */
const SURFACE_BAKE_FRAGMENT = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uSeaDeep;
  uniform vec3 uSeaShallow;
  uniform vec3 uSeaCoast;
  uniform vec3 uLandLow;
  uniform vec3 uLandDry;
  uniform vec3 uLandRock;
  uniform vec3 uLandSnow;
  uniform vec3 uSand;
  uniform vec3 uSun;
  varying vec3 vLocalNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  // ── 3D value noise ─────────────────────────────────────────────────────
  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }

  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    float n000 = hash31(i);
    float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
    return mix(
      mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
      mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
      u.z
    );
  }

  float fbm2(vec3 p) {
    float a = vnoise(p) * 0.6667;
    p = p * 2.03 + vec3(5.1, 3.7, 8.3);
    a += vnoise(p) * 0.3333;
    return a;
  }

  float fbm3(vec3 p) {
    float a = vnoise(p) * 0.5714;
    p = p * 2.03 + vec3(5.1, 3.7, 8.3);
    a += vnoise(p) * 0.2857;
    p = p * 2.03 + vec3(5.1, 3.7, 8.3);
    a += vnoise(p) * 0.1429;
    return a;
  }

  float fbm4(vec3 p) {
    float a = vnoise(p) * 0.5333;
    p = p * 2.03 + vec3(5.1, 3.7, 8.3);
    a += vnoise(p) * 0.2667;
    p = p * 2.03 + vec3(5.1, 3.7, 8.3);
    a += vnoise(p) * 0.1333;
    p = p * 2.03 + vec3(5.1, 3.7, 8.3);
    a += vnoise(p) * 0.0667;
    return a;
  }

  // Ridged multifractal — sharp ridges instead of hills.
  float ridged(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;
    float weight = 1.0;
    for (int i = 0; i < 4; i++) {
      float n = 1.0 - abs(vnoise(p) * 2.0 - 1.0);
      n *= n;
      sum += n * amp * weight;
      weight = clamp(n * 2.0, 0.0, 1.0);
      p = p * 2.11 + vec3(3.1, 6.2, 1.7);
      amp *= 0.6;
    }
    return clamp(sum / 0.95, 0.0, 1.0);
  }

  void main() {
    vec3 p = normalize(vLocalNormal);
    vec3 nGeo = normalize(vWorldNormal);

    // Domain warp: curved coastlines instead of cells.
    vec3 w = vec3(
      vnoise(p * 1.9 + vec3(2.4, 8.1, 1.3)),
      vnoise(p * 1.9 + vec3(7.7, 1.9, 5.2)),
      vnoise(p * 1.9 + vec3(13.1, 4.4, 9.8))
    );
    vec3 q = normalize(p + (w - 0.5) * 0.7);

    float cont = fbm4(q * 3.1 + vec3(3.0, 1.0, 7.0));
    float land = smoothstep(0.494, 0.506, cont);

    // Mountain provinces: a main large belt + a second, finer one.
    // In total the mountains occupy noticeably more land than in the first version.
    float mount = smoothstep(0.445, 0.535, fbm2(q * 4.5 + vec3(17.0, 5.0, 11.0)));
    float mount2 = smoothstep(0.535, 0.620, fbm2(q * 11.0 + vec3(9.0, 3.0, 5.0)));
    mount = max(mount, mount2 * 0.80);

    float ridge = ridged(q * 80.0 + vec3(5.0, 2.0, 9.0));
    float micro = fbm2(q * 38.0 + vec3(2.0, 7.0, 3.0));
    float crust = fbm2(q * 110.0 + vec3(9.0, 1.0, 5.0));
    float fine = 1.0 - abs(vnoise(q * 150.0 + vec3(21.0, 3.0, 6.0)) * 2.0 - 1.0);
    fine *= fine;
    float elev = land * (0.02 + 0.75 * mount * ridge + 0.12 * micro + 0.04 * crust + 0.04 * fine);

    // ── Albedo ──
    float shelf = smoothstep(0.40, 0.494, cont);
    vec3 sea = mix(uSeaDeep, uSeaShallow, shelf);
    sea = mix(sea, uSeaCoast, smoothstep(0.470, 0.496, cont) * 0.9);

    float biome = fbm2(q * 7.0 + vec3(31.0, 3.0, 17.0));
    vec3 ground = mix(uLandLow, uLandDry, smoothstep(0.44, 0.70, biome));
    float biome2 = fbm2(q * 24.0 + vec3(7.0, 2.0, 11.0));
    float veg = smoothstep(0.53, 0.59, biome2);
    ground = mix(ground, ground * vec3(0.58, 0.74, 0.48), veg * 0.75);
    ground *= 0.90 + 0.18 * crust;
    ground *= 0.86 + 0.28 * fine;
    float mShade = mix(0.50, 1.18, smoothstep(0.30, 0.70, ridge));
    ground *= mix(1.0, mShade, mount);
    ground = mix(ground, uLandRock, smoothstep(0.48, 0.84, mount * ridge) * 0.72);
    float snow = smoothstep(0.82, 0.96, mount * ridge);
    ground = mix(ground, uLandSnow, snow * 0.72);
    ground *= 0.87 + 0.26 * vnoise(q * 240.0 + vec3(6.0, 2.0, 8.0));
    ground = mix(uSand, ground, smoothstep(0.506, 0.528, cont));

    vec3 albedo = mix(sea, ground, land);

    // ── Relief bump from height derivatives ──
    // In the bake this is an ortho camera from above: the derivatives are uniform, with no
    // stretching at the limb, so mountain slopes get the correct tilt.
    float relief = elev * 70.0;
    vec3 dpdx = dFdx(vWorldPos);
    vec3 dpdy = dFdy(vWorldPos);
    float dhx = dFdx(relief);
    float dhy = dFdy(relief);
    vec3 r1 = cross(dpdy, nGeo);
    vec3 r2 = cross(nGeo, dpdx);
    float det = dot(dpdx, r1);
    vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
    vec3 N = normalize(abs(det) * nGeo - grad * 0.95);

    float ndl = max(dot(N, uSunDir), 0.0);
    float term = pow(ndl, 0.85);
    vec3 color = albedo * (0.15 + 0.9 * term) * uSun;

    // Valleys and foothills are darker than peaks: without this the land read as a fill,
    // not as relief. Soft and cheap — AO from the height itself, with no new samples.
    float valleyAO = mix(0.74, 1.0, smoothstep(0.0, 0.22, elev));
    color *= mix(1.0, valleyAO, land);

    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * Surface runtime: texture + cheap detail + camera-dependent
 * specular/haze/limb/night.
 */
const SURFACE_RUNTIME_FRAGMENT = /* glsl */ `
  uniform sampler2D uSurface;
  uniform sampler2D uDetail;
  uniform sampler2D uCloud;
  uniform float uCloudSpin;
  uniform vec3 uCapT;
  uniform vec3 uCapB;
  uniform vec3 uCapA;
  uniform vec3 uDetT;
  uniform vec3 uDetB;
  uniform vec3 uDetA;
  uniform float uCapSin;
  uniform float uDetailScale;
  uniform float uLodBias;
  uniform vec3 uSunDir;
  uniform vec3 uHaze;
  uniform vec3 uRim;
  uniform float uNight;
  varying vec3 vLocalNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 p = normalize(vLocalNormal);
    vec3 nGeo = normalize(vWorldNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);

    // Tangent basis of the cap in the planet's local coordinates.
    vec2 basis = vec2(dot(p, uCapT), dot(p, uCapB));

    // Grain: normal and grain from the tiled texture. One sample for everything.
    vec4 det = texture2D(uDetail, basis * uDetailScale);
    vec3 dn = det.xyz * 2.0 - 1.0;
    float footprint = length(fwidth(p)) * 800.0;
    float detailFade = 1.0 - smoothstep(1.2, 6.0, footprint);

    // Slight LOD bias: up close the 2048 texture is magnified to 3–6 px per
    // texel and edges read as stair-steps. Half a mip smooths them; fine
    // sharpness is restored by the detail normal map below.
    vec2 uv = basis / (2.0 * uCapSin) + 0.5;
    vec3 color = texture2D(uSurface, uv, uLodBias).rgb;

    // Directional micro-shading: the same baked base, but the slopes of
    // fine relief catch the light pixel by pixel.
    vec3 nDetail = normalize(uDetT * dn.x + uDetB * dn.y + uDetA * dn.z);
    float baseNdl = max(dot(nGeo, uSunDir), 0.0);
    float detailNdl = max(dot(nDetail, uSunDir), 0.0);
    float shade = clamp(1.0 + (detailNdl - baseNdl) * 1.35, 0.62, 1.38);
    color *= mix(1.0, shade, detailFade);
    color *= mix(1.0, 0.93 + 0.14 * det.a, detailFade * 0.9);
    // A second layer, larger and offset: breaks the repetition of the 20-meter
    // tile that made the land look uniform.
    vec4 det2 = texture2D(uDetail, basis * uDetailScale * 0.37 + vec2(0.23, 0.61));
    color *= mix(1.0, 0.90 + 0.10 * det2.a, detailFade * 0.7);

    // Cloud shadows — the main volumetric cue after relief: the cloud
    // sphere rotates, so we unrotate the sample direction back by its
    // current angle and take coverage from the already baked cloud texture.
    float cs = cos(uCloudSpin);
    float sn = sin(uCloudSpin);
    vec3 pc = vec3(cs * nGeo.x - sn * nGeo.z, nGeo.y, sn * nGeo.x + cs * nGeo.z);
    vec2 cuv = vec2(pc.x, -pc.z) / (2.0 * uCapSin) + 0.5;
    float cloudCover = texture2D(uCloud, cuv).a;
    float sunward = max(dot(nGeo, uSunDir), 0.0);
    color *= 1.0 - cloudCover * 0.24 * (0.35 + 0.65 * sunward);

    // Specular from the geometric normal: separates water from land.
    float ocean = smoothstep(0.0, 0.08, color.b - color.r);
    float term = max(dot(nGeo, uSunDir), 0.0);
    vec3 hv = normalize(uSunDir + viewDir);
    float spec = pow(max(dot(nGeo, hv), 0.0), 120.0) * ocean * 1.1 * term;
    color += vec3(1.0, 0.95, 0.86) * spec;

    // Haze and limb depend on the camera — computed here, not baked.
    float muGeo = max(dot(nGeo, viewDir), 0.0);
    float haze = pow(1.0 - muGeo, 4.0);
    color = mix(color, uHaze, haze * 0.28);
    float rimLit = 0.25 + 0.75 * pow(term, 0.85);
    color += uRim * pow(1.0 - muGeo, 2.2) * 0.10 * rimLit;
    color += uRim * pow(1.0 - muGeo, 7.0) * 0.55 * rimLit;

    color = mix(color, color * vec3(0.72, 0.82, 1.0), uNight * 0.32);
    gl_FragColor = vec4(color, 1.0);
  }
`;
const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uAtmo;
  uniform float uNight;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 wn = normalize(vWorldNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float mu = clamp(abs(dot(wn, viewDir)), 0.0, 1.0);
    float halo = pow(1.0 - mu, 4.5);
    vec3 radial = normalize(vWorldPos - vec3(0.0, -920.0, 0.0));
    float lit = 0.22 + 0.78 * smoothstep(-0.25, 0.55, dot(radial, uSunDir));
    float night = mix(1.0, 0.5, uNight);
    gl_FragColor = vec4(uAtmo * halo * lit * 0.16 * night, 1.0);
  }
`;

const CLOUD_VERTEX = /* glsl */ `
  varying vec3 vLocalNormal;
  varying vec3 vWorldNormal;

  void main() {
    vLocalNormal = normalize(normal);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Cloud bake: the same procedural shader that used to run at runtime.
 * Used once; the output is the cloud RGB color and A = final
 * coverage (with alpha), without the night tint.
 */
const CLOUD_BAKE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uCloudCol;
  varying vec3 vLocalNormal;
  varying vec3 vWorldNormal;

  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }

  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    float n000 = hash31(i);
    float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
    return mix(
      mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
      mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
      u.z
    );
  }

  float fbm2(vec3 p) {
    float a = vnoise(p) * 0.6667;
    p = p * 2.03 + vec3(5.1, 3.7, 8.3);
    a += vnoise(p) * 0.3333;
    return a;
  }

  float fbm3(vec3 p) {
    float a = vnoise(p) * 0.5714;
    p = p * 2.03 + vec3(5.1, 3.7, 8.3);
    a += vnoise(p) * 0.2857;
    p = p * 2.03 + vec3(5.1, 3.7, 8.3);
    a += vnoise(p) * 0.1429;
    return a;
  }

  vec3 rotateY(vec3 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  }

  void main() {
    vec3 p = normalize(vLocalNormal);
    vec3 cp = rotateY(p, uTime * 0.0018);
    float cwarp = fbm2(cp * 9.0 + vec3(1.0, 7.0, 3.0));
    float cl = fbm3(cp * 42.0 + vec3(4.0, 9.0, 2.0) + vec3(cwarp - 0.5) * 2.2);
    float cover = smoothstep(0.600, 0.648, cl);
    cover *= 0.85 + 0.15 * vnoise(cp * 120.0);
    if (cover < 0.02) discard;

    vec3 n = normalize(vWorldNormal);
    float ndl = max(dot(n, uSunDir), 0.0);
    float edge = smoothstep(0.648, 0.600, cl);
    vec3 col = uCloudCol * (0.62 + 0.38 * ndl);
    col *= 0.86 + 0.20 * smoothstep(0.60, 0.68, cl);
    col = mix(col, col * vec3(0.80, 0.86, 0.94), edge * 0.6);
    col *= 0.93 + 0.10 * vnoise(cp * 160.0);
    gl_FragColor = vec4(col, cover * 0.90);
  }
`;

const CLOUD_RUNTIME_FRAGMENT = /* glsl */ `
  uniform sampler2D uCloud;
  uniform vec3 uCapT;
  uniform vec3 uCapB;
  uniform float uCapSin;
  uniform float uNight;
  varying vec3 vLocalNormal;

  void main() {
    vec3 p = normalize(vLocalNormal);
    vec2 uv = vec2(dot(p, uCapT), dot(p, uCapB)) / (2.0 * uCapSin) + 0.5;
    vec4 c = texture2D(uCloud, uv);
    if (c.a < 0.02) discard;
    vec3 col = c.rgb * mix(vec3(1.0), vec3(0.55, 0.65, 0.85), uNight * 0.7);
    gl_FragColor = vec4(col, c.a);
  }
`;

/** One heavy pass into a render target with an ortho camera above the cap. */
function bakeCap(
  gl: THREE.WebGLRenderer,
  target: THREE.WebGLRenderTarget,
  material: THREE.ShaderMaterial,
  radius: number,
  axis: THREE.Vector3,
  screenUp: THREE.Vector3,
  segments: [number, number]
): void {
  const scene = new THREE.Scene();
  const geometry = new THREE.SphereGeometry(radius, segments[0], segments[1]);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const extent = radius * CAP_SIN;
  const camera = new THREE.OrthographicCamera(-extent, extent, extent, -extent, 400, 4000);
  camera.position.copy(axis).multiplyScalar(2000);
  camera.up.copy(screenUp);
  camera.lookAt(0, 0, 0);

  const prevTarget = gl.getRenderTarget();
  const prevColor = new THREE.Color();
  gl.getClearColor(prevColor);
  const prevAlpha = gl.getClearAlpha();

  gl.setClearColor(0x000000, 0);
  gl.setRenderTarget(target);
  gl.clear();
  gl.render(scene, camera);
  // Restoring the target generates the render target mipmaps (three, setRenderTarget).
  gl.setRenderTarget(prevTarget);
  gl.setClearColor(prevColor, prevAlpha);

  geometry.dispose();
  material.dispose();
}

export default function GiantPlanet(): React.ReactElement {
  const gl = useThree((s) => s.gl);
  const cloudMeshRef = useRef<THREE.Mesh>(null);

  // Placeholders during the bake: while the texture is not ready, the planet is a dark disk,
  // not a black hole in the scene.
  const surfacePlaceholder = useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array([8, 26, 40, 255]), 1, 1, THREE.RGBAFormat);
    t.colorSpace = THREE.NoColorSpace;
    t.needsUpdate = true;
    return t;
  }, []);
  const cloudPlaceholder = useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 0]), 1, 1, THREE.RGBAFormat);
    t.colorSpace = THREE.NoColorSpace;
    t.needsUpdate = true;
    return t;
  }, []);
  const detailTexture = useMemo(() => makeDetailTexture(256), []);

  const surfaceMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uSurface: { value: surfacePlaceholder },
          uDetail: { value: detailTexture },
          uCloud: { value: cloudPlaceholder },
          uCloudSpin: { value: 0 },
          uCapT: { value: PLANET_T.clone() },
          uCapB: { value: PLANET_B.clone() },
          uDetT: { value: PLANET_T_W.clone() },
          uDetB: { value: PLANET_B_W.clone() },
          uDetA: { value: PLANET_AXIS_W.clone() },
          uCapSin: { value: CAP_SIN },
          uDetailScale: { value: PLANET_RADIUS / DETAIL_TILE_METERS },
          // 2048/3072 are barely magnified — a strong bias is no longer needed
          // and would only bring back the "soap" that was complained about before.
          uLodBias: { value: HQ ? 0.35 : 0.25 },
          uSunDir: { value: SUN_DIR.clone() },
          uHaze: { value: PALETTE.uHaze },
          uRim: { value: PALETTE.uRim.clone() },
          uNight: { value: 0 }
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: SURFACE_RUNTIME_FRAGMENT
      }),
    [surfacePlaceholder, detailTexture, cloudPlaceholder]
  );

  const atmoMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uNight: { value: 0 },
          uSunDir: { value: SUN_DIR.clone() },
          uAtmo: { value: srgb('#8fd9ff') }
        },
        vertexShader: ATMOSPHERE_VERTEX,
        fragmentShader: ATMOSPHERE_FRAGMENT,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false
      }),
    []
  );

  const cloudMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uCloud: { value: cloudPlaceholder },
          uCapT: { value: CLOUD_T.clone() },
          uCapB: { value: CLOUD_B.clone() },
          uCapSin: { value: CAP_SIN },
          uNight: { value: 0 }
        },
        vertexShader: CLOUD_VERTEX,
        fragmentShader: CLOUD_RUNTIME_FRAGMENT,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        fog: false
      }),
    [cloudPlaceholder]
  );

  // ── Bake once on mount ───────────────────────────────────────────────────
  useEffect(() => {
    // 8×: at the limb the texture is compressed the most, and without this the horizon ring
    // smears into a band. 16× on this machine caused a driver freeze.
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    const surfaceRT = new THREE.WebGLRenderTarget(SURFACE_TEX_SIZE, SURFACE_TEX_SIZE, {
      // MSAA is useless in the cap: inside the cap there are no geometric silhouettes
      // for it to smooth — only shader color.
      samples: 0,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      anisotropy,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      colorSpace: THREE.NoColorSpace
    });
    const cloudRT = new THREE.WebGLRenderTarget(CLOUD_TEX_SIZE, CLOUD_TEX_SIZE, {
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      anisotropy,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      colorSpace: THREE.NoColorSpace
    });

    const surfaceBake = new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: { value: SUN_LOCAL.clone() },
        uSeaDeep: { value: PALETTE.uSeaDeep },
        uSeaShallow: { value: PALETTE.uSeaShallow },
        uSeaCoast: { value: PALETTE.uSeaCoast },
        uLandLow: { value: PALETTE.uLandLow },
        uLandDry: { value: PALETTE.uLandDry },
        uLandRock: { value: PALETTE.uLandRock },
        uLandSnow: { value: PALETTE.uLandSnow },
        uSand: { value: PALETTE.uSand },
        uSun: { value: PALETTE.uSun }
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: SURFACE_BAKE_FRAGMENT
    });

    const cloudBake = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSunDir: { value: SUN_DIR.clone() },
        uCloudCol: { value: PALETTE.uCloudCol }
      },
      vertexShader: CLOUD_VERTEX,
      fragmentShader: CLOUD_BAKE_FRAGMENT,
      side: THREE.FrontSide,
      transparent: false,
      depthTest: false,
      depthWrite: false
    });

    // More segments than texels across the diameter makes no sense, but 384×256
    // removes the faceting of interpolated normals on large-scale relief.
    bakeCap(gl, surfaceRT, surfaceBake, PLANET_RADIUS, PLANET_AXIS, PLANET_B, [384, 256]);
    bakeCap(gl, cloudRT, cloudBake, PLANET_RADIUS + 10, CLOUD_AXIS, CLOUD_B, [192, 128]);

    surfaceMaterial.uniforms.uSurface.value = surfaceRT.texture;
    surfaceMaterial.uniforms.uCloud.value = cloudRT.texture;
    cloudMaterial.uniforms.uCloud.value = cloudRT.texture;

    return () => {
      if (surfaceMaterial.uniforms.uSurface.value === surfaceRT.texture) {
        surfaceMaterial.uniforms.uSurface.value = surfacePlaceholder;
      }
      if (surfaceMaterial.uniforms.uCloud.value === cloudRT.texture) {
        surfaceMaterial.uniforms.uCloud.value = cloudPlaceholder;
      }
      if (cloudMaterial.uniforms.uCloud.value === cloudRT.texture) {
        cloudMaterial.uniforms.uCloud.value = cloudPlaceholder;
      }
      surfaceRT.dispose();
      cloudRT.dispose();
    };
  }, [gl, surfaceMaterial, cloudMaterial, surfacePlaceholder, cloudPlaceholder]);

  useEffect(
    () => () => {
      surfaceMaterial.dispose();
      atmoMaterial.dispose();
      cloudMaterial.dispose();
      surfacePlaceholder.dispose();
      cloudPlaceholder.dispose();
      detailTexture.dispose();
    },
    [surfaceMaterial, atmoMaterial, cloudMaterial, surfacePlaceholder, cloudPlaceholder, detailTexture]
  );

  const nightRim = useMemo(() => srgb('#4ef2d2'), []);
  const dayRim = useMemo(() => srgb('#d8ecff'), []);

  useFrame((_, delta) => {
    const nf = getNightFactor();
    surfaceMaterial.uniforms.uNight.value = nf;
    cloudMaterial.uniforms.uNight.value = nf;
    atmoMaterial.uniforms.uNight.value = nf;
    // By day the limb is warm, at night — electric cyan, like the singularity.
    (surfaceMaterial.uniforms.uRim.value as THREE.Color).copy(nightRim).lerp(dayRim, 1 - nf);
    // Clouds drift by rotating their baked texture. The same angle
    // is passed to the surface shader — it uses it to place the cloud shadows.
    const cm = cloudMeshRef.current;
    if (cm) {
      cm.rotateY(delta * CLOUD_SPIN);
      surfaceMaterial.uniforms.uCloudSpin.value = cm.rotation.y;
    }
  });

  return (
    <group>
      <mesh
        position={PLANET_CENTER}
        rotation={PLANET_TILT}
        material={surfaceMaterial}
        frustumCulled={false}
        renderOrder={-50}
      >
        <sphereGeometry args={[PLANET_RADIUS, PLANET_WIDTH_SEGMENTS, PLANET_HEIGHT_SEGMENTS]} />
      </mesh>
      <mesh
        position={PLANET_CENTER}
        material={atmoMaterial}
        frustumCulled={false}
        renderOrder={-49}
      >
        <sphereGeometry args={[PLANET_RADIUS * 1.012, SHELL_SEGMENTS[0], SHELL_SEGMENTS[1]]} />
      </mesh>
      <mesh
        ref={cloudMeshRef}
        position={PLANET_CENTER}
        material={cloudMaterial}
        frustumCulled={false}
        renderOrder={-48}
      >
        <sphereGeometry args={[PLANET_RADIUS + 10, CLOUD_SEGMENTS[0], CLOUD_SEGMENTS[1]]} />
      </mesh>
    </group>
  );
}

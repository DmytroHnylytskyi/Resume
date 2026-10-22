'use client';

/**
 * ShatteredMoon — a shattered moon in the southern sky.
 *
 * A small dead world (r≈32 m at a distance of ~260 m) with jagged terrain and
 * a debris cloud: it tells where the asteroid platform came from.
 * Main mesh + Fresnel rim + 12 instanced fragments + an arc of fine
 * dust — four draw calls, with no light sources and no textures.
 *
 * Lambert material: the moon genuinely reacts to the day/night light, but at
 * night a faint emissive glow remains so the silhouette does not disappear.
 */

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';

const MOON_RADIUS = 32;
const MOON_POSITION: [number, number, number] = [150, 62, 205];

const RIM_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const RIM_FRAGMENT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.6);
    gl_FragColor = vec4(vec3(0.42, 0.82, 1.0) * rim * 1.15, rim * 0.75);
  }
`;

function hash(x: number, y: number, z: number): number {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function displacedMoonGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(MOON_RADIUS, 2);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = hash(Math.round(v.x * 13), Math.round(v.y * 13), Math.round(v.z * 13));
    const n2 = hash(Math.round(v.x * 31) + 7, Math.round(v.y * 31) - 3, Math.round(v.z * 31) + 11);
    const scale = 1 + (n - 0.5) * 0.26 + (n2 - 0.5) * 0.1;
    v.multiplyScalar(scale);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export default function ShatteredMoon(): React.ReactElement {
  const moonGeometry = useMemo(displacedMoonGeometry, []);
  const fragmentGeometry = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);

  const material = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        color: '#8f9aa8',
        emissive: '#1c2736',
        emissiveIntensity: 0.75,
        flatShading: true
      }),
    []
  );

  const rimMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: RIM_VERTEX,
        fragmentShader: RIM_FRAGMENT,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      }),
    []
  );

  const fragments = useMemo(() => {
    const count = 12;
    const list: { position: [number, number, number]; scale: number; yaw: number }[] = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + hash(i, 3, 7) * 0.5;
      const r = MOON_RADIUS * (1.35 + hash(i, 11, 17) * 1.5);
      list.push({
        position: [
          Math.cos(a) * r,
          (hash(i, 19, 23) - 0.5) * MOON_RADIUS * 1.1,
          Math.sin(a) * r
        ],
        scale: (0.25 + hash(i, 29, 31) * 0.85) * (MOON_RADIUS / 8),
        yaw: hash(i, 37, 41) * Math.PI * 2
      });
    }
    return list;
  }, []);

  const debrisGeometry = useMemo(() => {
    const count = 70;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = MOON_RADIUS * (1.5 + hash(i, 43, 47) * 1.9);
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = (hash(i, 53, 59) - 0.5) * MOON_RADIUS * 0.9;
      positions[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const debrisMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#9aa7b8',
        size: 0.55 * (MOON_RADIUS / 8),
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        fog: false
      }),
    []
  );

  // There are no glowing cracks on the surface: only a thin Fresnel rim,
  // so the silhouette reads against the stars.
  useEffect(
    () => () => {
      moonGeometry.dispose();
      fragmentGeometry.dispose();
      material.dispose();
      rimMaterial.dispose();
      debrisGeometry.dispose();
      debrisMaterial.dispose();
    },
    [moonGeometry, fragmentGeometry, material, rimMaterial, debrisGeometry, debrisMaterial]
  );

  const fragmentMatrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    return fragments.map((f) => {
      dummy.position.set(...f.position);
      dummy.rotation.set(f.yaw * 0.5, f.yaw, f.yaw * 0.25);
      dummy.scale.setScalar(f.scale);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [fragments]);

  const fragmentRef = React.useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const mesh = fragmentRef.current;
    if (!mesh) return;
    fragmentMatrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [fragmentMatrices]);

  return (
    <group name="ShatteredMoon" position={MOON_POSITION}>
      <mesh geometry={moonGeometry} material={material} />
      <mesh geometry={moonGeometry} material={rimMaterial} scale={1.015} />
      <instancedMesh
        ref={fragmentRef}
        args={[fragmentGeometry, material, fragments.length]}
      />
      <points geometry={debrisGeometry} material={debrisMaterial} />
    </group>
  );
}

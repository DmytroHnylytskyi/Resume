'use client';

/**
 * Megastructure — разорванная древняя орбитальная дуга в небе.
 *
 * Не полное кольцо и не второй «бублик» рядом с аккреционным диском: две
 * тонкие дуги с большими пропусками и редкими огнями вдоль них. Читается
 * как остаток мегаструктуры, а не как природное кольцо. Три draw call:
 * две дуги + один Points с огнями; без текстуры и без источников света.
 */

import React, { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getNightFactor } from '../../store/dayNightState';

const ARCS = [
  { start: 0.18, length: 1.05 },
  { start: 1.82, length: 0.85 }
];
const INNER = 54;
const OUTER = 58.5;
const GROUP_POSITION: [number, number, number] = [0, 76, 232];
const GROUP_ROTATION: [number, number, number] = [0.28, 0.35, 0.12];

export default function Megastructure(): React.ReactElement {
  const arcMaterials = useMemo(
    () =>
      ARCS.map(
        () =>
          new THREE.MeshBasicMaterial({
            color: '#7dd3fc',
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
            toneMapped: false
          })
      ),
    []
  );

  const arcGeometries = useMemo(
    () => ARCS.map((a) => new THREE.RingGeometry(INNER, OUTER, 72, 1, a.start, a.length)),
    []
  );

  const lightGeometry = useMemo(() => {
    const positions: number[] = [];
    for (const arc of ARCS) {
      const count = 16;
      for (let i = 0; i < count; i++) {
        const angle = arc.start + (i / (count - 1)) * arc.length;
        const r = (INNER + OUTER) / 2;
        positions.push(Math.cos(angle) * r, Math.sin(angle) * r, 0);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const lightMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#d9f4ff',
        size: 1.2,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false
      }),
    []
  );

  // Поперечные рёбра превращают светящуюся полосу в решётку мегаструктуры.
  const ribGeometry = useMemo(
    () => new THREE.BoxGeometry(0.5, OUTER - INNER + 2.6, 0.9),
    []
  );
  const ribMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#9fe8ff',
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      }),
    []
  );
  const ribMatrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    const out: THREE.Matrix4[] = [];
    for (const arc of ARCS) {
      const count = Math.max(4, Math.round(arc.length * 12));
      for (let i = 0; i < count; i++) {
        const angle = arc.start + (i / (count - 1)) * arc.length;
        const r = (INNER + OUTER) / 2;
        dummy.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
        dummy.rotation.set(0, 0, angle - Math.PI / 2);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        out.push(dummy.matrix.clone());
      }
    }
    return out;
  }, []);
  const ribRef = React.useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = ribRef.current;
    if (!mesh) return;
    ribMatrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ribMatrices]);

  useEffect(
    () => () => {
      arcGeometries.forEach((g) => g.dispose());
      arcMaterials.forEach((m) => m.dispose());
      lightGeometry.dispose();
      lightMaterial.dispose();
      ribGeometry.dispose();
      ribMaterial.dispose();
    },
    [arcGeometries, arcMaterials, lightGeometry, lightMaterial, ribGeometry, ribMaterial]
  );

  useFrame(() => {
    const nf = getNightFactor();
    arcMaterials.forEach((m) => {
      m.opacity = 0.18 + 0.44 * nf;
    });
    lightMaterial.opacity = 0.3 + 0.52 * nf;
    ribMaterial.opacity = 0.16 + 0.34 * nf;
  });

  return (
    <group name="Megastructure" position={GROUP_POSITION} rotation={GROUP_ROTATION}>
      {arcGeometries.map((geo, i) => (
        <mesh key={i} geometry={geo} material={arcMaterials[i]} />
      ))}
      <instancedMesh
        ref={ribRef}
        args={[ribGeometry, ribMaterial, ribMatrices.length]}
      />
      <points geometry={lightGeometry} material={lightMaterial} />
    </group>
  );
}

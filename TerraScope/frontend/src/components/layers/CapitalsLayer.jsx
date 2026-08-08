/**
 * @file CapitalsLayer.jsx
 * @description GPU-instanced 3D capital markers layer rendered in Political Map Mode.
 * Visualizes 177 world capitals using sleek 16-segment tapered 3D architectural pins.
 * Styled as solid white (#ffffff), turning vibrant neon green (#22c55e) upon selection.
 */

'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { latLngToVector3 } from '../../hooks/useGeoConvert';
import useStore from '../../store/useStore';
import WORLD_CAPITALS from '../../data/worldCapitals.json';

/** Dummy Object3D used for GPU instanced matrix computations without memory allocation */
const dummy = new THREE.Object3D();
const colorDefault = new THREE.Color('#ffffff'); // Clean crisp solid white
const colorSelected = new THREE.Color('#22c55e'); // Vibrant Neon Green upon selection
const upVector = new THREE.Vector3(0, 1, 0);

// Pre-create sleek 16-segment tapered capital pin geometry (base wider at bottom, tapered at top)
const capitalPinGeometry = new THREE.CylinderGeometry(0.0018, 0.0035, 0.022, 16);
capitalPinGeometry.translate(0, 0.011, 0);

/**
 * 3D Capital Markers Instanced Layer component.
 * @returns {JSX.Element|null} InstancedMesh of capital pins in Political Mode.
 */
export default function CapitalsLayer() {
  const dayNightMode = useStore((state) => state.dayNightMode);
  const selectItem = useStore((state) => state.selectItem);
  const selectedItem = useStore((state) => state.selectedItem);
  
  const meshRef = useRef();

  const isPolitical = dayNightMode === 'political';
  const count = WORLD_CAPITALS.length;

  const parsedCapitals = useMemo(() => {
    return WORLD_CAPITALS.map((c, i) => {
      const pos = latLngToVector3(c.lat, c.lng, 1.002);
      return {
        id: `cap-${i}`,
        pos,
        lat: c.lat,
        lng: c.lng,
        name: c.capital,
        country: c.country,
        raw: c
      };
    });
  }, []);

const normVec = new THREE.Vector3();

  const selectedCapName = useMemo(() => {
    if (selectedItem?.type !== 'country' || !selectedItem.data) return null;
    return selectedItem.data.capital || selectedItem.data.name;
  }, [selectedItem]);

  // Event-driven update of instance matrices & colors (only runs when mode, capitals, or selection changes)
  useEffect(() => {
    if (isPolitical && meshRef.current && count > 0) {
      parsedCapitals.forEach((c, i) => {
        const isSelected = selectedCapName && (c.name === selectedCapName || c.country === selectedCapName);
        normVec.set(...c.pos).normalize();

        dummy.position.set(...c.pos);
        dummy.quaternion.setFromUnitVectors(upVector, normVec);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();

        meshRef.current.setMatrixAt(i, dummy.matrix);
        meshRef.current.setColorAt(i, isSelected ? colorSelected : colorDefault);
      });

      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [isPolitical, parsedCapitals, count, selectedCapName]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && parsedCapitals[e.instanceId]) {
      const c = parsedCapitals[e.instanceId];
      selectItem('country', c.raw);
    }
  };

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  if (!isPolitical) return null;

  return (
    <group>
      {/* Sleek White 3D Capital Pins */}
      <instancedMesh
        key={`cap-core-${count}`}
        ref={meshRef}
        args={[capitalPinGeometry, null, count]}
        onClick={handleClick}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

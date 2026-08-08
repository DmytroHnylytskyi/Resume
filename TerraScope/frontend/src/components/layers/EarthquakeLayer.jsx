/**
 * @file EarthquakeLayer.jsx
 * @description GPU-instanced 3D seismic columns layer (USGS GeoJSON dataset).
 * Visualizes global earthquakes as solid 3D columns extending upwards from the Earth's surface.
 * Column thickness and height scale with magnitude (Mw), color-coded by focal depth (Shallow/Medium/Deep),
 * with clean cyan highlight on selection.
 */

'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLayerData } from '../../hooks/useLayerData';
import { latLngToVector3 } from '../../hooks/useGeoConvert';
import useStore from '../../store/useStore';

/** Dummy Object3D used for GPU instanced matrix computations without memory allocation */
const dummy = new THREE.Object3D();
const color = new THREE.Color();
const selectedColor = new THREE.Color('#38bdf8'); // Bright Cyan highlight on selection
const upVector = new THREE.Vector3(0, 1, 0);

// Pre-create smooth 16-segment 3D pillar geometry translated so bottom base sits at (0,0,0) and extends along +Y
const pillarGeometry = new THREE.CylinderGeometry(1, 1, 1, 16);
pillarGeometry.translate(0, 0.5, 0);

/**
 * 3D Instanced Earthquake Layer component.
 * @returns {JSX.Element|null} InstancedMesh of 3D magnitude pillars.
 */
export default function EarthquakeLayer() {
  const { data } = useLayerData('earthquakes');
  const enabled = useStore((state) => state.layers.earthquakes.enabled);
  const minMag = useStore((state) => state.layers.earthquakes.filters?.minMagnitude || 0);
  const selectItem = useStore((state) => state.selectItem);
  const selectedItem = useStore((state) => state.selectedItem);
  
  const meshRef = useRef();

  const features = useMemo(() => {
    if (!data || !data.features) return [];
    return data.features.filter(f => (f.properties?.mag || 0) >= minMag);
  }, [data, minMag]);
  
  const parsedData = useMemo(() => {
    return features.map((feature, idx) => {
      const [lng, lat, depth] = feature.geometry.coordinates;
      const mag = feature.properties?.mag || 1;
      const id = feature.id || feature.properties?.url || `eq-${idx}`;
      
      // Surface coordinates on the sphere
      const pos = latLngToVector3(lat, lng, 1.002);

      // Height of pillar extending upwards into space proportional to magnitude (Mw)
      const height = 0.025 + (mag * 0.015);
      
      // Thick 3D column radius
      const radius = 0.0055 + (mag * 0.0014);

      // Color coding based on focal depth (km)
      let depthColor = '#ffb300'; // Shallow (<70km): Bright Neon Amber
      if (depth > 300) depthColor = '#ff1744'; // Deep (>300km): High-Intensity Crimson Red
      else if (depth > 70) depthColor = '#ff6d00'; // Medium (70-300km): Vibrant Coral Orange

      return {
        id,
        pos,
        lat,
        lng,
        depth,
        mag,
        height,
        radius,
        depthColor,
        properties: feature.properties
      };
    });
  }, [features]);

  const count = parsedData.length;

const normVector = new THREE.Vector3();

  // Selected Earthquake ID
  const selectedEqId = useMemo(() => {
    if (selectedItem?.type !== 'earthquake' || !selectedItem.data) return null;
    return selectedItem.data.id || selectedItem.data.url;
  }, [selectedItem]);

  // Event-driven update of instance matrices & colors (only runs when data or selection changes)
  useEffect(() => {
    if (!enabled || !meshRef.current || count === 0) return;

    parsedData.forEach((item, i) => {
      const isSelected = selectedEqId && (item.id === selectedEqId || item.properties?.url === selectedEqId);
      normVector.set(...item.pos).normalize();

      dummy.position.set(...item.pos);
      dummy.quaternion.setFromUnitVectors(upVector, normVector);
      dummy.scale.set(item.radius, item.height, item.radius);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, isSelected ? selectedColor : color.set(item.depthColor));
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [enabled, parsedData, count, selectedEqId]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && parsedData[e.instanceId]) {
      const item = parsedData[e.instanceId];
      selectItem('earthquake', item.properties);
    }
  };

  if (!enabled || count === 0) return null;

  return (
    <group>
      {/* Clean, Solid 3D Earthquake Pillars */}
      <instancedMesh
        key={`eq-core-${count}`}
        ref={meshRef}
        args={[pillarGeometry, null, count]}
        onClick={handleClick}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

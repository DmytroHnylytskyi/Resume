/**
 * @file CountryBordersLayer.jsx
 * @description 3D Vector Country Borders layer rendering GeoJSON boundary polygon lines on the Earth surface.
 * Active in Political Map Mode or when Country Layer is enabled.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { latLngToVector3 } from '../../hooks/useGeoConvert';
import useStore from '../../store/useStore';

/**
 * 3D Country Vector Borders Layer Component.
 * @returns {JSX.Element|null} LineSegments mesh of 3D international country border lines.
 */
export default function CountryBordersLayer() {
  const dayNightMode = useStore((state) => state.dayNightMode);
  const countriesEnabled = useStore((state) => state.layers?.countries?.enabled);

  const [geoJsonData, setGeoJsonData] = useState(null);

  const visible = dayNightMode === 'political' || countriesEnabled;

  useEffect(() => {
    if (!visible || geoJsonData) return;
    const controller = new AbortController();

    fetch('/data/countries.geojson', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setGeoJsonData(data))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Failed to load countries.geojson:', err);
        }
      });

    return () => controller.abort();
  }, [visible, geoJsonData]);

  // Convert GeoJSON polygons to 3D line segment geometries
  const borderGeometries = useMemo(() => {
    if (!geoJsonData || !geoJsonData.features) return null;

    const linePoints = [];

    geoJsonData.features.forEach((feature) => {
      const geometry = feature.geometry;
      if (!geometry) return;

      const processPolygon = (coordinates) => {
        coordinates.forEach((ring) => {
          for (let i = 0; i < ring.length - 1; i++) {
            const [lng1, lat1] = ring[i];
            const [lng2, lat2] = ring[i + 1];

            const p1 = latLngToVector3(lat1, lng1, 1.003);
            const p2 = latLngToVector3(lat2, lng2, 1.003);

            linePoints.push(p1[0], p1[1], p1[2]);
            linePoints.push(p2[0], p2[1], p2[2]);
          }
        });
      };

      if (geometry.type === 'Polygon') {
        processPolygon(geometry.coordinates);
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach((polygonCoords) => processPolygon(polygonCoords));
      }
    });

    if (linePoints.length === 0) return null;

    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(linePoints, 3)
    );
    
    bufferGeometry.computeBoundingSphere();

    return bufferGeometry;
  }, [geoJsonData]);

  // Clean up WebGL BufferGeometry memory on unmount
  useEffect(() => {
    return () => {
      if (borderGeometries) {
        borderGeometries.dispose();
      }
    };
  }, [borderGeometries]);

  if (!visible || !borderGeometries) return null;

  return (
    <lineSegments geometry={borderGeometries} raycast={() => null}>
      <lineBasicMaterial
        color={dayNightMode === 'political' ? '#38bdf8' : '#60a5fa'}
        transparent
        opacity={dayNightMode === 'political' ? 0.75 : 0.45}
        linewidth={1}
      />
    </lineSegments>
  );
}

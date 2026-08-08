/**
 * @file WeatherLayer.jsx
 * @description GPU-instanced 3D global weather metrics layer (Open-Meteo dataset).
 * Renders floating climate satellites and pulsing aura halos across 177 capital cities.
 * Color-coded by temperature range (Cobalt Blue -> Emerald Green -> Copper Gold -> Crimson Red).
 */

'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLayerData } from '../../hooks/useLayerData';
import { latLngToVector3 } from '../../hooks/useGeoConvert';
import useStore from '../../store/useStore';
import WORLD_CAPITALS from '../../data/worldCapitals.json';

/** Dummy Object3D instances for GPU instanced matrix updates without heap allocations */
const orbDummy = new THREE.Object3D();
const haloDummy = new THREE.Object3D();
const colorObj = new THREE.Color();

/**
 * 3D Global Weather Metrics Instanced Layer Component.
 * @returns {JSX.Element|null} InstancedMesh of climate satellite orbs and pulsing aura rings.
 */
export default function WeatherLayer() {
  const { data } = useLayerData('weather');
  const enabled = useStore((state) => state.layers.weather.enabled);
  const selectItem = useStore((state) => state.selectItem);
  
  const orbMeshRef = useRef();
  const haloMeshRef = useRef();

  // Map real Open-Meteo weather items from backend API
  const cities = useMemo(() => {
    if (Array.isArray(data) && data.length > 0) {
      return data.map((item) => ({
        name: item.name || "Capital",
        country: item.country || "Global",
        lat: item.lat,
        lng: item.lng,
        temp: item.temp ?? 20,
        desc: item.desc || "Clear Sky",
        humidity: item.humidity ?? 65,
        wind: item.wind ?? 10
      }));
    }

    // Fallback to WORLD_CAPITALS if backend is offline
    return WORLD_CAPITALS.slice(0, 70).map((c) => ({
      name: c.capital,
      country: c.country,
      lat: c.lat,
      lng: c.lng,
      temp: 20,
      desc: "Clear Sky",
      humidity: 60,
      wind: 12
    }));
  }, [data]);

  const count = cities.length;

  // Rich, deep, highly saturated color palette tailored for dark cosmic UI
  const getWeatherColor = (temp) => {
    if (temp <= 5) return '#0284c7'; // Deep Saturated Cobalt Blue
    if (temp <= 15) return '#0f766e'; // Rich Saturated Deep Teal
    if (temp <= 25) return '#15803d'; // Deep Saturated Emerald Green
    if (temp <= 32) return '#d97706'; // Rich Deep Copper Gold
    return '#b91c1c'; // Deep Saturated Dark Crimson Red
  };

  useEffect(() => {
    if (!enabled || !orbMeshRef.current || count === 0) return;

    cities.forEach((city, i) => {
      const pos = latLngToVector3(city.lat, city.lng, 1.03);

      // Elevated Climate Satellite Orb
      orbDummy.position.set(...pos);
      orbDummy.scale.set(0.009, 0.009, 0.009);
      orbDummy.updateMatrix();

      orbMeshRef.current.setMatrixAt(i, orbDummy.matrix);
      colorObj.set(getWeatherColor(city.temp));
      orbMeshRef.current.setColorAt(i, colorObj);

      // Outer Halo Ring
      if (haloMeshRef.current) {
        haloDummy.position.set(...pos);
        haloDummy.scale.set(0.016, 0.016, 0.016);
        haloDummy.updateMatrix();

        haloMeshRef.current.setMatrixAt(i, haloDummy.matrix);
        haloMeshRef.current.setColorAt(i, colorObj);
      }
    });

    orbMeshRef.current.instanceMatrix.needsUpdate = true;
    if (orbMeshRef.current.instanceColor) orbMeshRef.current.instanceColor.needsUpdate = true;

    if (haloMeshRef.current) {
      haloMeshRef.current.instanceMatrix.needsUpdate = true;
      if (haloMeshRef.current.instanceColor) haloMeshRef.current.instanceColor.needsUpdate = true;
    }
  }, [enabled, cities, count]);

  useFrame((state) => {
    if (!enabled || !orbMeshRef.current || count === 0) return;
    const time = state.clock.getElapsedTime();

    cities.forEach((city, i) => {
      // Floating climate satellite bobbing & pulse animation
      const hoverOffset = Math.sin(time * 2.2 + i * 0.25) * 0.0035;
      const pos = latLngToVector3(city.lat, city.lng, 1.03 + hoverOffset);
      
      orbDummy.position.set(...pos);
      orbDummy.scale.set(0.009, 0.009, 0.009);
      orbDummy.updateMatrix();

      orbMeshRef.current.setMatrixAt(i, orbDummy.matrix);

      if (haloMeshRef.current) {
        haloDummy.position.set(...pos);
        const pulse = 0.015 + Math.sin(time * 3 + i) * 0.003;
        haloDummy.scale.set(pulse, pulse, pulse);
        haloDummy.updateMatrix();

        haloMeshRef.current.setMatrixAt(i, haloDummy.matrix);
      }
    });

    orbMeshRef.current.instanceMatrix.needsUpdate = true;
    if (haloMeshRef.current) haloMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  const handleClick = (e) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && cities[e.instanceId]) {
      const city = cities[e.instanceId];
      selectItem('weather', {
        name: `${city.name} (${city.country})`,
        temperature: city.temp,
        description: city.desc,
        humidity: city.humidity,
        wind: city.wind,
        lat: city.lat,
        lng: city.lng
      });
    }
  };

  if (!enabled) return null;

  return (
    <group>
      {/* Sleek Floating Climate Orbs */}
      <instancedMesh
        key={`weather-orb-${count}`}
        ref={orbMeshRef}
        args={[null, null, count]}
        onClick={handleClick}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* Pulsing Outer Halo Auras */}
      <instancedMesh
        key={`weather-halo-${count}`}
        ref={haloMeshRef}
        args={[null, null, count]}
        onClick={handleClick}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.35} wireframe={true} />
      </instancedMesh>
    </group>
  );
}

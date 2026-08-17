/**
 * @file NeoLayer.jsx
 * @description GPU-instanced Near-Earth Objects (NEOs) asteroids layer (NASA NeoWs dataset).
 * Visualizes orbiting 3D asteroids and orbital ring trajectories around Earth.
 * Features hover-pause freezing and magnification for easy cursor interaction.
 */

'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLayerData } from '../../hooks/useLayerData';
import useStore from '../../store/useStore';

/** Dummy Object3D used for GPU instanced matrix computations without memory allocation */
const dummy = new THREE.Object3D();
const colorObj = new THREE.Color();

// Fallback NEO dataset for 100% offline availability
const FALLBACK_NEO_LIST = [
  { name: "433 Eros (1898 DQ)", is_hazardous: false, diameter: 16.84, distance: "22,000,000 km", speed: "84,600 km/h", radius: 1.65, speedVal: 0.03, inc: 0.2 },
  { name: "(2010 PK9)", is_hazardous: true, diameter: 0.31, distance: "7,400,000 km", speed: "62,100 km/h", radius: 1.35, speedVal: 0.04, inc: 0.7 },
  { name: "99942 Apophis (2004 MN4)", is_hazardous: true, diameter: 0.45, distance: "3,100,000 km", speed: "109,000 km/h", radius: 1.25, speedVal: 0.05, inc: 0.4 },
  { name: "1862 Apollo (1932 HA)", is_hazardous: true, diameter: 1.7, distance: "15,000,000 km", speed: "54,000 km/h", radius: 1.52, speedVal: 0.025, inc: 1.1 },
  { name: "(2015 TB145)", is_hazardous: false, diameter: 0.7, distance: "12,500,000 km", speed: "126,000 km/h", radius: 1.45, speedVal: 0.035, inc: 1.5 },
  { name: "1566 Icarus (1949 MA)", is_hazardous: true, diameter: 1.4, distance: "8,100,000 km", speed: "104,000 km/h", radius: 1.3, speedVal: 0.045, inc: 0.9 },
  { name: "(2020 SW)", is_hazardous: false, diameter: 0.01, distance: "27,000 km", speed: "27,700 km/h", radius: 1.18, speedVal: 0.06, inc: 0.3 },
  { name: "3200 Phaethon (1983 TB)", is_hazardous: true, diameter: 5.8, distance: "10,300,000 km", speed: "118,000 km/h", radius: 1.58, speedVal: 0.03, inc: 1.8 }
];

/**
 * 3D Near-Earth Objects Orbiting Asteroids Instanced Layer Component.
 * @returns {JSX.Element|null} InstancedMesh of 3D asteroids and orbital path lines.
 */
export default function NeoLayer() {
  const { data } = useLayerData('neo');
  const enabled = useStore((state) => state.layers.neo.enabled);
  const onlyHazardous = useStore((state) => state.layers.neo.filters?.onlyHazardous);
  const selectItem = useStore((state) => state.selectItem);
  
  const meshRef = useRef();
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const pausedTimes = useRef({});

  const neos = useMemo(() => {
    let list = [];
    if (data && data.near_earth_objects) {
      Object.values(data.near_earth_objects).forEach(dateArray => {
        dateArray.forEach((n, idx) => {
          const missDist = n.close_approach_data?.[0]?.miss_distance?.kilometers || '10000000';
          const distVal = parseFloat(missDist);
          const orbitRadius = 1.25 + Math.min(0.5, distVal / 25000000);
          const velocity = n.close_approach_data?.[0]?.relative_velocity?.kilometers_per_hour || '50000';
          // Smooth, majestic, slow orbital speed (0.015 to 0.045 rad/sec)
          const speedVal = 0.015 + Math.min(0.03, parseFloat(velocity) / 400000);
          
          list.push({
            name: n.name,
            is_hazardous: !!n.is_potentially_hazardous_asteroid,
            diameter: n.estimated_diameter?.kilometers?.estimated_diameter_max || 0.2,
            distance: `${Math.round(distVal).toLocaleString()} km`,
            speed: `${Math.round(parseFloat(velocity)).toLocaleString()} km/h`,
            radius: orbitRadius,
            speedVal,
            inc: ((idx * 1.3) % 2.5) - 1.2,
            raw: n
          });
        });
      });
    }

    if (list.length === 0) {
      list = FALLBACK_NEO_LIST;
    }

    if (onlyHazardous) {
      return list.filter(n => n.is_hazardous);
    }
    return list;
  }, [data, onlyHazardous]);
  
  const count = neos.length;

  // Generate 3D Orbit Ring lines
  const orbitRings = useMemo(() => {
    return neos.map((neo) => {
      const points = [];
      const segments = 64;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = neo.radius * Math.cos(angle);
        const z = neo.radius * Math.sin(angle);
        const y = x * Math.sin(neo.inc);
        points.push(new THREE.Vector3(x * Math.cos(neo.inc), y, z));
      }
      const bufferGeom = new THREE.BufferGeometry().setFromPoints(points);
      bufferGeom.computeBoundingSphere();

      return {
        geometry: bufferGeom,
        color: neo.is_hazardous ? '#dc2626' : '#7c3aed'
      };
    });
  }, [neos]);

  // Dispose previous orbit geometries to ensure zero GPU memory leakage
  useEffect(() => {
    return () => {
      orbitRings.forEach((ring) => ring.geometry.dispose());
    };
  }, [orbitRings]);

  useEffect(() => {
    if (meshRef.current && count > 0) {
      neos.forEach((neo, i) => {
        colorObj.set(neo.is_hazardous ? '#dc2626' : '#8b5cf6');
        meshRef.current.setColorAt(i, colorObj);
      });
      if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [neos, count]);
  
  useFrame((state) => {
    if (!meshRef.current || count === 0) return;
    const time = state.clock.getElapsedTime();
    
    neos.forEach((neo, i) => {
      // If hovered, lock/freeze time so asteroid stays completely static under cursor!
      if (hoveredIdx === i) {
        if (pausedTimes.current[i] === undefined) {
          pausedTimes.current[i] = time;
        }
      } else {
        delete pausedTimes.current[i];
      }

      const activeTime = pausedTimes.current[i] !== undefined ? pausedTimes.current[i] : time;
      const angle = activeTime * neo.speedVal + i * 1.5;
      const x = neo.radius * Math.cos(angle);
      const z = neo.radius * Math.sin(angle);
      const y = x * Math.sin(neo.inc);
      
      dummy.position.set(x * Math.cos(neo.inc), y, z);
      
      let scale = Math.max(0.022, Math.min(0.045, neo.diameter * 0.015));
      if (hoveredIdx === i) {
        scale *= 2.2; // Magnify asteroid on hover for easy clicking!
      }
      
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.x = activeTime * 0.5 + i;
      dummy.rotation.y = activeTime * 0.3;
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const handleClick = (e) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && neos[e.instanceId]) {
      const neo = neos[e.instanceId];
      selectItem('neo', neo.raw || {
        name: neo.name,
        is_potentially_hazardous_asteroid: neo.is_hazardous,
        estimated_diameter: { kilometers: { estimated_diameter_min: neo.diameter * 0.7, estimated_diameter_max: neo.diameter } },
        close_approach_data: [{
          miss_distance: { kilometers: neo.distance },
          relative_velocity: { kilometers_per_hour: neo.speed },
          close_approach_date: "2026-08-06"
        }]
      });
    }
  };

  if (!enabled || count === 0) return null;

  return (
    <group>
      {/* Orbital Path Lines */}
      {orbitRings.map((ring, idx) => (
        <line key={idx} geometry={ring.geometry} raycast={() => null}>
          <lineBasicMaterial color={ring.color} transparent opacity={0.2} linewidth={1} />
        </line>
      ))}

      {/* Glowing 3D Asteroids */}
      <instancedMesh
        key={count}
        ref={meshRef}
        args={[null, null, count]}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredIdx(e.instanceId);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHoveredIdx(null);
          document.body.style.cursor = 'auto';
        }}
      >
        <dodecahedronGeometry args={[1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

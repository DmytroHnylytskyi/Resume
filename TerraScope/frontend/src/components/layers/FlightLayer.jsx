/**
 * @file FlightLayer.jsx
 * @description GPU-instanced 3D live flights layer (OpenSky Network dataset).
 * Visualizes airborne commercial aircraft with real-time heading rotations and altitude offset.
 */

'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useLayerData } from '../../hooks/useLayerData';
import { latLngToVector3 } from '../../hooks/useGeoConvert';
import useStore from '../../store/useStore';

/** Dummy Object3D used for GPU instanced matrix computations without memory allocation */
const dummy = new THREE.Object3D();
const defaultPlaneColor = new THREE.Color('#2563eb'); // Sleek royal blue
const selectedPlaneColor = new THREE.Color('#ef4444'); // Vivid neon red for high contrast against land
const upVector = new THREE.Vector3(0, 0, 1);
const normalVec = new THREE.Vector3();

/**
 * Live Airborne Flights 3D Layer Component.
 * @returns {JSX.Element|null} InstancedMesh of airborne flight markers.
 */
export default function FlightLayer() {
  const { data } = useLayerData('flights');
  const enabled = useStore((state) => state.layers.flights.enabled);
  const selectItem = useStore((state) => state.selectItem);
  const selectedItem = useStore((state) => state.selectedItem);
  
  const meshRef = useRef();

  // Load 2D SVG plane texture
  const planeTexture = useTexture('/textures/plane_icon.svg');

  // Filter airborne live flights from OpenSky API
  const flights = useMemo(() => {
    if (!data || !data.states) return [];
    
    const airborne = data.states.filter(state => {
      const lon = state[5];
      const lat = state[6];
      const onGround = state[8];
      return lon !== null && lat !== null && !onGround;
    });

    // Balanced flight count for a clean, non-cluttered map (400 active flights)
    return airborne.slice(0, 400);
  }, [data]);
  
  const count = flights.length;
  const selectedFlightId = selectedItem?.type === 'flight' && selectedItem.data?.icao24
    ? String(selectedItem.data.icao24).trim().toLowerCase()
    : null;

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  useEffect(() => {
    if (meshRef.current && count > 0) {
      flights.forEach((flight, i) => {
        const flightId = String(flight[0] || `flight_${i}`).trim().toLowerCase();
        const lng = flight[5];
        const lat = flight[6];
        const heading = flight[10] || 0;
        
        // Plane sits elevated at radius 1.018 so it floats above terrain
        const pos = latLngToVector3(lat, lng, 1.018); 
        dummy.position.set(...pos);
        
        // Orient 2D quad FLAT on sphere surface facing OUTWARDS towards space
        normalVec.set(...pos).normalize();
        dummy.quaternion.setFromUnitVectors(upVector, normalVec);
        
        // Rotate in tangent plane by flight heading angle
        dummy.rotateZ(THREE.MathUtils.degToRad(-heading));
        
        // Prominent 2D scale
        const isSelected = Boolean(selectedFlightId) && flightId === selectedFlightId;
        const scale = isSelected ? 0.055 : 0.038;
        dummy.scale.set(scale, scale, scale);
        
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        meshRef.current.setColorAt(i, isSelected ? selectedPlaneColor : defaultPlaneColor);
      });

      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [flights, count, selectedFlightId]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && flights[e.instanceId]) {
      const flight = flights[e.instanceId];
      const flightId = String(flight[0] || `flight_${e.instanceId}`).trim();
      const callsign = flight[1]?.trim() || `FLT-${flightId.toUpperCase()}`;
      const velocityMs = flight[9] || 0;
      const velocityKmh = Math.round(velocityMs * 3.6);
      const altitudeMeters = Math.round(flight[7] || 10000);

      const flightData = {
        id: flightId,
        icao24: flightId,
        callsign: callsign,
        origin_country: flight[2] || 'International Transponder',
        altitude: altitudeMeters,
        velocity: velocityKmh,
        heading: Math.round(flight[10] || 0),
        longitude: flight[5],
        latitude: flight[6],
        trackingType: "Live ADS-B Radar Vector"
      };

      selectItem('flight', flightData);
    }
  };

  if (!enabled) return null;

  return (
    <group>
      {/* Live 2D Plane Sprites */}
      {count > 0 && (
        <instancedMesh
          key={count}
          ref={meshRef}
          args={[null, null, count]}
          onClick={handleClick}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = 'auto'; }}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={planeTexture}
            transparent={true}
            alphaTest={0.1}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </instancedMesh>
      )}
    </group>
  );
}

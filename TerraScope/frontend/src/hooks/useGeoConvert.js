/**
 * @file useGeoConvert.js
 * @description Coordinate transformation utilities converting Geographic Coordinates (Latitude/Longitude)
 * to 3D Cartesian Coordinates (X, Y, Z) on a unit sphere, and generating 3D Bezier flight paths.
 */

import * as THREE from 'three';

/**
 * Converts geographic latitude and longitude (in degrees) to 3D Cartesian coordinates.
 *
 * @param {number} lat - Latitude in degrees (-90 to +90).
 * @param {number} lng - Longitude in degrees (-180 to +180).
 * @param {number} [radius=1.01] - Radial altitude offset from sphere origin.
 * @returns {[number, number, number]} 3D coordinate array [x, y, z].
 */
export function latLngToVector3(lat, lng, radius = 1.01) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return [x, y, z];
}

/**
 * Converts 3D Cartesian coordinates back to geographic latitude and longitude.
 *
 * @param {number} x - 3D X coordinate.
 * @param {number} y - 3D Y coordinate.
 * @param {number} z - 3D Z coordinate.
 * @returns {{lat: number, lng: number}} Object containing latitude and longitude.
 */
export function vector3ToLatLng(x, y, z) {
  const radius = Math.sqrt(x * x + y * y + z * z);
  const lat = 90 - (Math.acos(y / radius) * 180 / Math.PI);
  
  let lng = (Math.atan2(z, -x) * 180 / Math.PI) - 180;
  while (lng < -180) lng += 360;
  while (lng > 180) lng -= 360;
  
  return { lat, lng };
}

/**
 * Generates a 3D Quadratic Bezier arc curve elevated above the sphere surface between two points.
 *
 * @param {{lat: number, lng: number}} startLatLng - Departure coordinates.
 * @param {{lat: number, lng: number}} endLatLng - Arrival coordinates.
 * @param {number} [radius=1.01] - Base surface radius.
 * @param {number} [segments=64] - Number of interpolated curve sample points.
 * @returns {THREE.Vector3[]} Array of 3D points forming the flight trajectory arc.
 */
export function createArc(startLatLng, endLatLng, radius = 1.01, segments = 64) {
  const start = new THREE.Vector3(...latLngToVector3(startLatLng.lat, startLatLng.lng, radius));
  const end = new THREE.Vector3(...latLngToVector3(endLatLng.lat, endLatLng.lng, radius));
  
  const distance = start.distanceTo(end);
  const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  
  const elevation = radius + (distance * 0.5);
  midPoint.normalize().multiplyScalar(elevation);

  const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);
  return curve.getPoints(segments);
}

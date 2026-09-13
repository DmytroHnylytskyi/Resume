/**
 * @file useGeoConvert.js
 * @description Coordinate transformation utilities converting Geographic Coordinates (Latitude/Longitude)
 * to 3D Cartesian Coordinates (X, Y, Z) on a unit sphere for globe layer positioning.
 */

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

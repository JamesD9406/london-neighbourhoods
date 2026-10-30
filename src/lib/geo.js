// Shared map projection, used by the basemap build script and the site.
// A simple equirectangular projection is accurate enough at city scale.
export const BBOX = { west: -81.45, east: -81.08, south: 42.86, north: 43.08 };
export const WIDTH = 1000;

const kx = Math.cos(((BBOX.north + BBOX.south) / 2) * (Math.PI / 180));
export const HEIGHT = Math.round((WIDTH * (BBOX.north - BBOX.south)) / ((BBOX.east - BBOX.west) * kx));

/** @returns {[number, number]} SVG x, y for a latitude/longitude. */
export function project(lat, lon) {
  return [
    ((lon - BBOX.west) / (BBOX.east - BBOX.west)) * WIDTH,
    ((BBOX.north - lat) / (BBOX.north - BBOX.south)) * HEIGHT,
  ];
}

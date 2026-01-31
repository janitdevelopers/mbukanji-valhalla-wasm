/**
 * Geometry utilities for coordinate calculations
 * @packageDocumentation
 */

import type { Location } from '../types/route'

/** Earth radius in meters (WGS84 mean radius) */
const EARTH_RADIUS = 6371000

/** Convert degrees to radians */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** Convert radians to degrees */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

/**
 * Calculate the Haversine distance between two points
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS * c
}

/**
 * Calculate distance between two Location objects
 * @param loc1 - First location
 * @param loc2 - Second location
 * @returns Distance in meters
 */
export function distanceBetweenLocations(
  loc1: Location,
  loc2: Location
): number {
  return haversineDistance(loc1.lat, loc1.lon, loc2.lat, loc2.lon)
}

/**
 * Calculate the midpoint between two coordinates
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Midpoint [lat, lon]
 */
export function midpoint(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): [number, number] {
  const radLat1 = toRadians(lat1)
  const radLon1 = toRadians(lon1)
  const radLat2 = toRadians(lat2)
  const dLon = toRadians(lon2 - lon1)

  const bx = Math.cos(radLat2) * Math.cos(dLon)
  const by = Math.cos(radLat2) * Math.sin(dLon)

  const midLat = Math.atan2(
    Math.sin(radLat1) + Math.sin(radLat2),
    Math.sqrt((Math.cos(radLat1) + bx) ** 2 + by ** 2)
  )
  const midLon = radLon1 + Math.atan2(by, Math.cos(radLat1) + bx)

  return [toDegrees(midLat), toDegrees(midLon)]
}

/**
 * Calculate the bearing from one point to another
 * @param lat1 - Latitude of start point
 * @param lon1 - Longitude of start point
 * @param lat2 - Latitude of end point
 * @param lon2 - Longitude of end point
 * @returns Bearing in degrees (0-360)
 */
export function bearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = toRadians(lon2 - lon1)
  const radLat1 = toRadians(lat1)
  const radLat2 = toRadians(lat2)

  const y = Math.sin(dLon) * Math.cos(radLat2)
  const x =
    Math.cos(radLat1) * Math.sin(radLat2) -
    Math.sin(radLat1) * Math.cos(radLat2) * Math.cos(dLon)

  let brng = toDegrees(Math.atan2(y, x))
  return (brng + 360) % 360
}

/**
 * Calculate a destination point given start, bearing, and distance
 * @param lat - Start latitude
 * @param lon - Start longitude
 * @param bearingDeg - Bearing in degrees
 * @param distanceMeters - Distance in meters
 * @returns Destination [lat, lon]
 */
export function destinationPoint(
  lat: number,
  lon: number,
  bearingDeg: number,
  distanceMeters: number
): [number, number] {
  const angularDistance = distanceMeters / EARTH_RADIUS
  const bearingRad = toRadians(bearingDeg)
  const latRad = toRadians(lat)
  const lonRad = toRadians(lon)

  const destLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  )

  const destLonRad =
    lonRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(destLatRad)
    )

  return [toDegrees(destLatRad), toDegrees(destLonRad)]
}

/**
 * Calculate the bounding box for an array of locations
 * @param locations - Array of locations
 * @param padding - Optional padding in meters
 * @returns Bounding box [minLon, minLat, maxLon, maxLat]
 */
export function boundingBox(
  locations: Location[],
  padding: number = 0
): [number, number, number, number] {
  if (locations.length === 0) {
    return [0, 0, 0, 0]
  }

  let minLat = Infinity
  let maxLat = -Infinity
  let minLon = Infinity
  let maxLon = -Infinity

  for (const loc of locations) {
    if (loc.lat < minLat) minLat = loc.lat
    if (loc.lat > maxLat) maxLat = loc.lat
    if (loc.lon < minLon) minLon = loc.lon
    if (loc.lon > maxLon) maxLon = loc.lon
  }

  if (padding > 0) {
    const centerLat = (minLat + maxLat) / 2
    const latDegPerMeter = 1 / 111320
    const lonDegPerMeter = 1 / (111320 * Math.cos(toRadians(centerLat)))

    const latPadding = padding * latDegPerMeter
    const lonPadding = padding * lonDegPerMeter

    minLat -= latPadding
    maxLat += latPadding
    minLon -= lonPadding
    maxLon += lonPadding
  }

  return [minLon, minLat, maxLon, maxLat]
}

/**
 * Check if a point is within a bounding box
 * @param lat - Point latitude
 * @param lon - Point longitude
 * @param bbox - Bounding box [minLon, minLat, maxLon, maxLat]
 * @returns True if point is within bounds
 */
export function isWithinBounds(
  lat: number,
  lon: number,
  bbox: [number, number, number, number]
): boolean {
  const [minLon, minLat, maxLon, maxLat] = bbox
  return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon
}

/**
 * Calculate the center point of a bounding box
 * @param bbox - Bounding box [minLon, minLat, maxLon, maxLat]
 * @returns Center [lat, lon]
 */
export function bboxCenter(
  bbox: [number, number, number, number]
): [number, number] {
  const [minLon, minLat, maxLon, maxLat] = bbox
  return [(minLat + maxLat) / 2, (minLon + maxLon) / 2]
}

/**
 * Format a distance for display
 * @param meters - Distance in meters
 * @param units - Units to use
 * @returns Formatted distance string
 */
export function formatDistance(
  meters: number,
  units: 'kilometers' | 'miles' = 'kilometers'
): string {
  if (units === 'miles') {
    const miles = meters / 1609.344
    if (miles < 0.1) {
      const feet = meters * 3.28084
      return `${Math.round(feet)} ft`
    }
    return `${miles.toFixed(1)} mi`
  }
  
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

/**
 * Format a duration for display
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`
  }
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours === 0) {
    return `${minutes} min`
  }
  
  if (minutes === 0) {
    return `${hours} hr`
  }
  
  return `${hours} hr ${minutes} min`
}

/**
 * Polyline encoding/decoding utilities
 * Supports both polyline5 (1e5) and polyline6 (1e6) precision
 * @packageDocumentation
 */

export type PolylineFormat = 'polyline5' | 'polyline6'

/** Coordinate pair [longitude, latitude] */
export type Coordinate = [number, number]

/** GeoJSON LineString geometry */
export interface LineStringGeometry {
  type: 'LineString'
  coordinates: Coordinate[]
}

/** Get precision factor for polyline format */
function getPrecision(format: PolylineFormat): number {
  return format === 'polyline6' ? 1e6 : 1e5
}

/**
 * Decode an encoded polyline string into an array of coordinates
 * @param encoded - The encoded polyline string
 * @param format - The polyline format ('polyline5' or 'polyline6')
 * @returns Array of [longitude, latitude] coordinates
 */
export function decodePolyline(
  encoded: string,
  format: PolylineFormat = 'polyline6'
): Coordinate[] {
  const precision = getPrecision(format)
  const coordinates: Coordinate[] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    // Decode latitude
    let shift = 0
    let result = 0
    let byte: number

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1
    lat += deltaLat

    // Decode longitude
    shift = 0
    result = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1
    lng += deltaLng

    // Return as [lng, lat] (GeoJSON format)
    coordinates.push([lng / precision, lat / precision])
  }

  return coordinates
}

/**
 * Encode an array of coordinates into a polyline string
 * @param coordinates - Array of [longitude, latitude] coordinates
 * @param format - The polyline format ('polyline5' or 'polyline6')
 * @returns Encoded polyline string
 */
export function encodePolyline(
  coordinates: Coordinate[],
  format: PolylineFormat = 'polyline6'
): string {
  const precision = getPrecision(format)
  let encoded = ''
  let prevLat = 0
  let prevLng = 0

  for (const [lng, lat] of coordinates) {
    const scaledLat = Math.round(lat * precision)
    const scaledLng = Math.round(lng * precision)

    encoded += encodeNumber(scaledLat - prevLat)
    encoded += encodeNumber(scaledLng - prevLng)

    prevLat = scaledLat
    prevLng = scaledLng
  }

  return encoded
}

/** Encode a single number for polyline */
function encodeNumber(num: number): string {
  let value = num < 0 ? ~(num << 1) : num << 1
  let encoded = ''

  while (value >= 0x20) {
    encoded += String.fromCharCode((0x20 | (value & 0x1f)) + 63)
    value >>= 5
  }

  encoded += String.fromCharCode(value + 63)
  return encoded
}

/**
 * Convert polyline coordinates to GeoJSON LineString
 * @param encoded - The encoded polyline string
 * @param format - The polyline format
 * @returns GeoJSON LineString geometry
 */
export function polylineToGeoJSON(
  encoded: string,
  format: PolylineFormat = 'polyline6'
): LineStringGeometry {
  const coordinates = decodePolyline(encoded, format)
  return {
    type: 'LineString',
    coordinates,
  }
}

/**
 * Convert GeoJSON LineString to encoded polyline
 * @param geojson - GeoJSON LineString geometry
 * @param format - The polyline format
 * @returns Encoded polyline string
 */
export function geoJSONToPolyline(
  geojson: LineStringGeometry,
  format: PolylineFormat = 'polyline6'
): string {
  return encodePolyline(geojson.coordinates, format)
}

/**
 * Calculate the bounding box of a polyline
 * @param encoded - The encoded polyline string
 * @param format - The polyline format
 * @returns Bounding box [minLng, minLat, maxLng, maxLat]
 */
export function polylineBounds(
  encoded: string,
  format: PolylineFormat = 'polyline6'
): [number, number, number, number] {
  const coordinates = decodePolyline(encoded, format)

  if (coordinates.length === 0) {
    return [0, 0, 0, 0]
  }

  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  for (const [lng, lat] of coordinates) {
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }

  return [minLng, minLat, maxLng, maxLat]
}

/**
 * Simplify a polyline using the Douglas-Peucker algorithm
 * @param encoded - The encoded polyline string
 * @param tolerance - Simplification tolerance in degrees
 * @param format - The polyline format
 * @returns Simplified encoded polyline
 */
export function simplifyPolyline(
  encoded: string,
  tolerance: number = 0.00001,
  format: PolylineFormat = 'polyline6'
): string {
  const coordinates = decodePolyline(encoded, format)

  if (coordinates.length <= 2) {
    return encoded
  }

  const simplified = douglasPeucker(coordinates, tolerance)
  return encodePolyline(simplified, format)
}

/** Douglas-Peucker simplification algorithm */
function douglasPeucker(points: Coordinate[], tolerance: number): Coordinate[] {
  if (points.length <= 2) {
    return points
  }

  let maxDistance = 0
  let maxIndex = 0

  const start = points[0]
  const end = points[points.length - 1]

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end)
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = i
    }
  }

  if (maxDistance > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance)
    const right = douglasPeucker(points.slice(maxIndex), tolerance)
    return left.slice(0, -1).concat(right)
  }

  return [start, end]
}

/** Calculate perpendicular distance from point to line */
function perpendicularDistance(
  point: Coordinate,
  lineStart: Coordinate,
  lineEnd: Coordinate
): number {
  const [x, y] = point
  const [x1, y1] = lineStart
  const [x2, y2] = lineEnd

  const A = x - x1
  const B = y - y1
  const C = x2 - x1
  const D = y2 - y1

  const dot = A * C + B * D
  const lenSq = C * C + D * D

  let param = -1
  if (lenSq !== 0) {
    param = dot / lenSq
  }

  let xx: number
  let yy: number

  if (param < 0) {
    xx = x1
    yy = y1
  } else if (param > 1) {
    xx = x2
    yy = y2
  } else {
    xx = x1 + param * C
    yy = y1 + param * D
  }

  const dx = x - xx
  const dy = y - yy

  return Math.sqrt(dx * dx + dy * dy)
}

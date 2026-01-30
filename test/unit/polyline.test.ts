import { describe, it, expect } from 'vitest'
import {
  decodePolyline,
  encodePolyline,
  polylineToGeoJSON,
  polylineBounds,
  simplifyPolyline,
} from '../../src/utils/polyline'

describe('Polyline Utils', () => {
  describe('decodePolyline', () => {
    it('should decode polyline5 format', () => {
      // Encoded polyline for [[-122.395, 37.793], [-122.394, 37.794]]
      const encoded = '_p~iF~ps|U_ulLnnqC'
      const coords = decodePolyline(encoded, 'polyline5')
      
      expect(coords.length).toBeGreaterThan(0)
      expect(coords[0]).toHaveLength(2)
    })

    it('should decode polyline6 format', () => {
      // Higher precision encoding
      const encoded = 'o}~~~B_gsia@_ibE_ibE'
      const coords = decodePolyline(encoded, 'polyline6')
      
      expect(coords.length).toBeGreaterThan(0)
    })

    it('should handle empty string', () => {
      const coords = decodePolyline('')
      expect(coords).toEqual([])
    })
  })

  describe('encodePolyline', () => {
    it('should encode coordinates to polyline5', () => {
      const coords: [number, number][] = [
        [-122.395, 37.793],
        [-122.394, 37.794],
      ]
      const encoded = encodePolyline(coords, 'polyline5')
      
      expect(typeof encoded).toBe('string')
      expect(encoded.length).toBeGreaterThan(0)
    })

    it('should roundtrip encode/decode', () => {
      const original: [number, number][] = [
        [9.7679, 4.0511],
        [9.7680, 4.0512],
        [9.7681, 4.0513],
      ]
      
      const encoded = encodePolyline(original, 'polyline6')
      const decoded = decodePolyline(encoded, 'polyline6')
      
      expect(decoded.length).toBe(original.length)
      
      // Check coordinates are close (precision loss expected)
      for (let i = 0; i < original.length; i++) {
        expect(decoded[i][0]).toBeCloseTo(original[i][0], 5)
        expect(decoded[i][1]).toBeCloseTo(original[i][1], 5)
      }
    })
  })

  describe('polylineToGeoJSON', () => {
    it('should convert to GeoJSON LineString', () => {
      const encoded = 'o}~~~B_gsia@_ibE_ibE'
      const geojson = polylineToGeoJSON(encoded, 'polyline6')
      
      expect(geojson.type).toBe('LineString')
      expect(Array.isArray(geojson.coordinates)).toBe(true)
    })
  })

  describe('polylineBounds', () => {
    it('should calculate bounding box', () => {
      const coords: [number, number][] = [
        [9.0, 4.0],
        [10.0, 5.0],
        [9.5, 4.5],
      ]
      const encoded = encodePolyline(coords, 'polyline6')
      const bounds = polylineBounds(encoded, 'polyline6')
      
      expect(bounds).toHaveLength(4)
      expect(bounds[0]).toBeCloseTo(9.0, 1)  // minLon
      expect(bounds[1]).toBeCloseTo(4.0, 1)  // minLat
      expect(bounds[2]).toBeCloseTo(10.0, 1) // maxLon
      expect(bounds[3]).toBeCloseTo(5.0, 1)  // maxLat
    })

    it('should handle empty polyline', () => {
      const bounds = polylineBounds('')
      expect(bounds).toEqual([0, 0, 0, 0])
    })
  })

  describe('simplifyPolyline', () => {
    it('should reduce points', () => {
      // Create a line with many points that can be simplified
      const coords: [number, number][] = []
      for (let i = 0; i < 100; i++) {
        coords.push([i * 0.001, i * 0.001])
      }
      
      const encoded = encodePolyline(coords, 'polyline6')
      const simplified = simplifyPolyline(encoded, 0.0001, 'polyline6')
      
      const originalCoords = decodePolyline(encoded, 'polyline6')
      const simplifiedCoords = decodePolyline(simplified, 'polyline6')
      
      expect(simplifiedCoords.length).toBeLessThan(originalCoords.length)
    })

    it('should preserve endpoints', () => {
      const coords: [number, number][] = [
        [0, 0],
        [0.5, 0.5],
        [1, 1],
      ]
      
      const encoded = encodePolyline(coords, 'polyline6')
      const simplified = simplifyPolyline(encoded, 0.01, 'polyline6')
      const result = decodePolyline(simplified, 'polyline6')
      
      expect(result[0][0]).toBeCloseTo(coords[0][0], 4)
      expect(result[0][1]).toBeCloseTo(coords[0][1], 4)
      expect(result[result.length - 1][0]).toBeCloseTo(coords[coords.length - 1][0], 4)
      expect(result[result.length - 1][1]).toBeCloseTo(coords[coords.length - 1][1], 4)
    })
  })
})

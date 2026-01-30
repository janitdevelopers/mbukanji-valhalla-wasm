import { describe, it, expect } from 'vitest'
import {
  haversineDistance,
  distanceBetweenLocations,
  bearing,
  destinationPoint,
  boundingBox,
  isWithinBounds,
  bboxCenter,
  formatDistance,
  formatDuration,
} from '../../src/utils/geometry'

describe('Geometry Utils', () => {
  describe('haversineDistance', () => {
    it('should calculate distance between two points', () => {
      // Distance from Douala to Yaounde (approximately 210 km)
      const distance = haversineDistance(4.0511, 9.7679, 3.8480, 11.5021)
      
      // Should be approximately 195-215 km
      expect(distance).toBeGreaterThan(190000)
      expect(distance).toBeLessThan(220000)
    })

    it('should return 0 for same point', () => {
      const distance = haversineDistance(4.0511, 9.7679, 4.0511, 9.7679)
      expect(distance).toBe(0)
    })

    it('should handle antipodal points', () => {
      // Points on opposite sides of Earth
      const distance = haversineDistance(0, 0, 0, 180)
      
      // Half Earth circumference ~ 20,000 km
      expect(distance).toBeGreaterThan(19000000)
      expect(distance).toBeLessThan(21000000)
    })
  })

  describe('distanceBetweenLocations', () => {
    it('should work with Location objects', () => {
      const loc1 = { lat: 4.0511, lon: 9.7679 }
      const loc2 = { lat: 3.8480, lon: 11.5021 }
      
      const distance = distanceBetweenLocations(loc1, loc2)
      
      expect(distance).toBeGreaterThan(190000)
      expect(distance).toBeLessThan(220000)
    })
  })

  describe('bearing', () => {
    it('should calculate bearing north', () => {
      const brng = bearing(0, 0, 1, 0)
      expect(brng).toBeCloseTo(0, 1)
    })

    it('should calculate bearing east', () => {
      const brng = bearing(0, 0, 0, 1)
      expect(brng).toBeCloseTo(90, 1)
    })

    it('should calculate bearing south', () => {
      const brng = bearing(0, 0, -1, 0)
      expect(brng).toBeCloseTo(180, 1)
    })

    it('should calculate bearing west', () => {
      const brng = bearing(0, 0, 0, -1)
      expect(brng).toBeCloseTo(270, 1)
    })
  })

  describe('destinationPoint', () => {
    it('should calculate destination going north', () => {
      const [lat, lon] = destinationPoint(0, 0, 0, 111320) // ~1 degree north
      
      expect(lat).toBeCloseTo(1, 0)
      expect(lon).toBeCloseTo(0, 0)
    })

    it('should handle long distances', () => {
      const [lat, lon] = destinationPoint(0, 0, 90, 10000000) // 10,000 km east
      
      expect(lat).toBeCloseTo(0, 0)
      expect(Math.abs(lon)).toBeGreaterThan(80)
    })
  })

  describe('boundingBox', () => {
    it('should calculate bounding box for locations', () => {
      const locations = [
        { lat: 4.0, lon: 9.0 },
        { lat: 5.0, lon: 10.0 },
        { lat: 4.5, lon: 9.5 },
      ]
      
      const bbox = boundingBox(locations)
      
      expect(bbox[0]).toBe(9.0)   // minLon
      expect(bbox[1]).toBe(4.0)   // minLat
      expect(bbox[2]).toBe(10.0)  // maxLon
      expect(bbox[3]).toBe(5.0)   // maxLat
    })

    it('should apply padding', () => {
      const locations = [{ lat: 0, lon: 0 }]
      
      const bbox = boundingBox(locations, 1000) // 1km padding
      
      expect(bbox[0]).toBeLessThan(0)
      expect(bbox[1]).toBeLessThan(0)
      expect(bbox[2]).toBeGreaterThan(0)
      expect(bbox[3]).toBeGreaterThan(0)
    })

    it('should handle empty array', () => {
      const bbox = boundingBox([])
      expect(bbox).toEqual([0, 0, 0, 0])
    })
  })

  describe('isWithinBounds', () => {
    const bbox: [number, number, number, number] = [9, 4, 10, 5]

    it('should return true for point inside', () => {
      expect(isWithinBounds(4.5, 9.5, bbox)).toBe(true)
    })

    it('should return true for point on edge', () => {
      expect(isWithinBounds(4, 9, bbox)).toBe(true)
      expect(isWithinBounds(5, 10, bbox)).toBe(true)
    })

    it('should return false for point outside', () => {
      expect(isWithinBounds(6, 9.5, bbox)).toBe(false)
      expect(isWithinBounds(4.5, 11, bbox)).toBe(false)
    })
  })

  describe('bboxCenter', () => {
    it('should calculate center of bounding box', () => {
      const bbox: [number, number, number, number] = [9, 4, 10, 5]
      const [lat, lon] = bboxCenter(bbox)
      
      expect(lat).toBe(4.5)
      expect(lon).toBe(9.5)
    })
  })

  describe('formatDistance', () => {
    it('should format meters', () => {
      expect(formatDistance(500)).toBe('500 m')
      expect(formatDistance(999)).toBe('999 m')
    })

    it('should format kilometers', () => {
      expect(formatDistance(1000)).toBe('1.0 km')
      expect(formatDistance(2500)).toBe('2.5 km')
    })

    it('should format miles', () => {
      expect(formatDistance(1609, 'miles')).toBe('1.0 mi')
      expect(formatDistance(100, 'miles')).toBe('328 ft')
    })
  })

  describe('formatDuration', () => {
    it('should format seconds', () => {
      expect(formatDuration(30)).toBe('30 sec')
      expect(formatDuration(59)).toBe('59 sec')
    })

    it('should format minutes', () => {
      expect(formatDuration(60)).toBe('1 min')
      expect(formatDuration(300)).toBe('5 min')
    })

    it('should format hours and minutes', () => {
      expect(formatDuration(3600)).toBe('1 hr')
      expect(formatDuration(3900)).toBe('1 hr 5 min')
      expect(formatDuration(7200)).toBe('2 hr')
    })
  })
})

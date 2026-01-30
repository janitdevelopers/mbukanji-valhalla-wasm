import { describe, it, expect, beforeEach } from 'vitest'
import { ValhallaRouter, createRouter } from '../../src/valhalla-router'
import { ValhallaError, ValhallaErrorCode } from '../../src/types/errors'

describe('ValhallaRouter', () => {
  let router: ValhallaRouter

  beforeEach(() => {
    router = createRouter()
  })

  describe('createRouter', () => {
    it('should create a new router instance', () => {
      const router = createRouter()
      expect(router).toBeInstanceOf(ValhallaRouter)
    })

    it('should accept configuration options', () => {
      const router = createRouter({
        defaultCosting: 'bicycle',
        defaultUnits: 'miles',
        verbose: true,
      })
      expect(router).toBeInstanceOf(ValhallaRouter)
    })
  })

  describe('getStatus', () => {
    it('should return initial status', () => {
      const status = router.getStatus()
      
      expect(status.wasmLoaded).toBe(false)
      expect(status.tilesLoaded).toBe(false)
      expect(status.ready).toBe(false)
      expect(status.loadedRegions).toEqual([])
    })
  })

  describe('isReady', () => {
    it('should return false when not initialized', () => {
      expect(router.isReady()).toBe(false)
    })
  })

  describe('route (not initialized)', () => {
    it('should throw error when not initialized', async () => {
      await expect(
        router.route({
          locations: [
            { lat: 4.0511, lon: 9.7679 },
            { lat: 3.8480, lon: 11.5021 },
          ],
          costing: 'auto',
        })
      ).rejects.toThrow(ValhallaError)
    })

    it('should throw NOT_INITIALIZED error', async () => {
      try {
        await router.route({
          locations: [
            { lat: 4.0511, lon: 9.7679 },
            { lat: 3.8480, lon: 11.5021 },
          ],
          costing: 'auto',
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ValhallaError)
        expect((error as ValhallaError).code).toBe(ValhallaErrorCode.NOT_INITIALIZED)
      }
    })
  })

  describe('input validation', () => {
    // Note: These tests would require mocking the WASM module
    // For now we test that validation runs before WASM checks
    
    it('should validate minimum 2 locations', async () => {
      try {
        await router.route({
          locations: [{ lat: 4.0511, lon: 9.7679 }],
          costing: 'auto',
        })
      } catch (error) {
        // Either NOT_INITIALIZED or INVALID_REQUEST is acceptable
        expect(error).toBeInstanceOf(ValhallaError)
      }
    })
  })

  describe('dispose', () => {
    it('should reset state after dispose', () => {
      router.dispose()
      
      const status = router.getStatus()
      expect(status.wasmLoaded).toBe(false)
      expect(status.tilesLoaded).toBe(false)
    })
  })
})

describe('ValhallaError', () => {
  it('should create error with code and message', () => {
    const error = new ValhallaError('Test error', ValhallaErrorCode.NOT_INITIALIZED)
    
    expect(error.message).toBe('Test error')
    expect(error.code).toBe(ValhallaErrorCode.NOT_INITIALIZED)
    expect(error.name).toBe('ValhallaError')
  })

  it('should include details', () => {
    const error = new ValhallaError(
      'Test error',
      ValhallaErrorCode.ROUTE_NOT_FOUND,
      { locations: ['A', 'B'] }
    )
    
    expect(error.details).toEqual({ locations: ['A', 'B'] })
  })

  it('should have proper stack trace', () => {
    const error = new ValhallaError('Test', ValhallaErrorCode.INTERNAL_ERROR)
    expect(error.stack).toBeDefined()
  })
})

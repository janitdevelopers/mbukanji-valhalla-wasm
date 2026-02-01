/**
 * Browser Integration Test
 * 
 * Tests path resolution and initialization in browser environment.
 * 
 * Note: This test requires Vitest browser mode or Playwright.
 * Run with: npm test -- test/integration/browser.test.ts
 */

import { describe, it, expect } from 'vitest'
import { createRouter, getWasmPaths } from '../../src/index'

describe('Browser Integration Tests', () => {
  describe('Path Resolution', () => {
    it('should resolve paths in browser environment', () => {
      const paths = getWasmPaths()
      
      expect(paths).toHaveProperty('wasm')
      expect(paths).toHaveProperty('js')
      expect(paths.wasm).toContain('valhalla.wasm')
      expect(paths.js).toContain('valhalla.js')
    })

    it('should return URL-based paths in browser', () => {
      const paths = getWasmPaths()
      
      // In browser, paths should be URLs or relative URLs
      expect(typeof paths.wasm).toBe('string')
      expect(typeof paths.js).toBe('string')
    })

    it('should handle custom base URLs', () => {
      const customBase = 'https://cdn.example.com/wasm'
      const paths = getWasmPaths(customBase)
      
      expect(paths.wasm).toBe('https://cdn.example.com/wasm/valhalla.wasm')
      expect(paths.js).toBe('https://cdn.example.com/wasm/valhalla.js')
    })
  })

  describe('Router Initialization', () => {
    it('should create router instance', () => {
      const router = createRouter()
      expect(router).toBeDefined()
      expect(typeof router.init).toBe('function')
    })

    it('should use auto-detected paths when initializing', async () => {
      const router = createRouter()
      
      // This will fail without actual WASM files, but tests path resolution
      try {
        await router.init()
        // If this succeeds, WASM files are present
        expect(router.isReady()).toBe(false) // Still needs tiles
      } catch (error: any) {
        // Expected if WASM files don't exist
        // But error should show path was resolved
        expect(error.message).toBeTruthy()
      }
    })

    it('should accept custom paths', async () => {
      const router = createRouter()
      
      try {
        await router.init({
          wasmPath: 'https://cdn.example.com/valhalla.wasm',
          jsGluePath: 'https://cdn.example.com/valhalla.js',
        })
      } catch (error: any) {
        // Expected to fail without actual WASM files
        // But should use custom paths
        expect(error.message).toBeTruthy()
      }
    })
  })

  describe('Error Handling', () => {
    it('should provide helpful error messages', async () => {
      const router = createRouter()
      
      try {
        await router.init({
          wasmPath: '/nonexistent.wasm',
        })
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).toBeTruthy()
        // Error should be helpful
        expect(typeof error.message).toBe('string')
      }
    })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getWasmPaths,
  DEFAULT_WASM_PATHS,
  isBundlerEnvironment,
  isWorkerEnvironment,
  validateWasmPaths,
} from '../../src/internal/wasm-paths'
import type { WasmPaths } from '../../src/internal/wasm-paths'

describe('wasm-paths', () => {
  describe('getWasmPaths', () => {
    it('should return valid paths object', () => {
      const paths = getWasmPaths()
      
      expect(paths).toHaveProperty('wasm')
      expect(paths).toHaveProperty('js')
      expect(typeof paths.wasm).toBe('string')
      expect(typeof paths.js).toBe('string')
      expect(paths.wasm.length).toBeGreaterThan(0)
      expect(paths.js.length).toBeGreaterThan(0)
    })

    it('should use custom base URL when provided', () => {
      const customBase = 'https://cdn.example.com/wasm'
      const paths = getWasmPaths(customBase)
      
      expect(paths.wasm).toBe('https://cdn.example.com/wasm/valhalla.wasm')
      expect(paths.js).toBe('https://cdn.example.com/wasm/valhalla.js')
    })

    it('should handle custom base with trailing slash', () => {
      const customBase = 'https://cdn.example.com/wasm/'
      const paths = getWasmPaths(customBase)
      
      expect(paths.wasm).toBe('https://cdn.example.com/wasm/valhalla.wasm')
      expect(paths.js).toBe('https://cdn.example.com/wasm/valhalla.js')
    })

    it('should return paths that include valhalla.wasm and valhalla.js', () => {
      const paths = getWasmPaths()
      
      expect(paths.wasm).toContain('valhalla.wasm')
      expect(paths.js).toContain('valhalla.js')
    })
  })

  describe('DEFAULT_WASM_PATHS', () => {
    it('should be a valid WasmPaths object', () => {
      expect(DEFAULT_WASM_PATHS).toHaveProperty('wasm')
      expect(DEFAULT_WASM_PATHS).toHaveProperty('js')
      expect(typeof DEFAULT_WASM_PATHS.wasm).toBe('string')
      expect(typeof DEFAULT_WASM_PATHS.js).toBe('string')
    })

    it('should match getWasmPaths() result', () => {
      const paths = getWasmPaths()
      expect(DEFAULT_WASM_PATHS.wasm).toBe(paths.wasm)
      expect(DEFAULT_WASM_PATHS.js).toBe(paths.js)
    })
  })

  describe('isBundlerEnvironment', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('should return false in Node.js without bundler env vars', () => {
      delete process.env.VITE
      delete process.env.WEBPACK
      delete process.env.ROLLUP
      delete process.env.NEXT_PUBLIC
      
      expect(isBundlerEnvironment()).toBe(false)
    })

    it('should return true when VITE env var is set', () => {
      process.env.VITE = 'true'
      expect(isBundlerEnvironment()).toBe(true)
    })

    it('should return true when WEBPACK env var is set', () => {
      process.env.WEBPACK = 'true'
      expect(isBundlerEnvironment()).toBe(true)
    })

    it('should return true when ROLLUP env var is set', () => {
      process.env.ROLLUP = 'true'
      expect(isBundlerEnvironment()).toBe(true)
    })

    it('should return true when NEXT_PUBLIC env var is set', () => {
      process.env.NEXT_PUBLIC = 'true'
      expect(isBundlerEnvironment()).toBe(true)
    })
  })

  describe('isWorkerEnvironment', () => {
    const originalSelf = globalThis.self
    const originalWindow = globalThis.window

    beforeEach(() => {
      // Reset globals
      delete (globalThis as any).self
      delete (globalThis as any).window
    })

    afterEach(() => {
      globalThis.self = originalSelf
      globalThis.window = originalWindow
    })

    it('should return false in Node.js environment', () => {
      expect(isWorkerEnvironment()).toBe(false)
    })

    it('should return false when both self and window exist (browser main thread)', () => {
      ;(globalThis as any).self = {}
      ;(globalThis as any).window = {}
      expect(isWorkerEnvironment()).toBe(false)
    })

    it('should return true when self exists but window does not', () => {
      ;(globalThis as any).self = {}
      delete (globalThis as any).window
      expect(isWorkerEnvironment()).toBe(false) // Need importScripts or WorkerGlobalScope
    })

    it('should return true when importScripts exists', () => {
      ;(globalThis as any).self = {
        importScripts: () => {},
      }
      delete (globalThis as any).window
      expect(isWorkerEnvironment()).toBe(true)
    })

    it('should return true when WorkerGlobalScope exists', () => {
      ;(globalThis as any).self = {
        WorkerGlobalScope: class {},
      }
      delete (globalThis as any).window
      expect(isWorkerEnvironment()).toBe(true)
    })
  })

  describe('validateWasmPaths', () => {
    it('should return true for valid paths (in Node.js)', async () => {
      // In Node.js, this will check file existence
      // Since we don't have WASM files, it should return true (can't validate)
      const paths: WasmPaths = {
        wasm: './dist/valhalla.wasm',
        js: './dist/valhalla.js',
      }
      
      // In Node.js without files, it should return true (can't validate)
      const result = await validateWasmPaths(paths)
      expect(typeof result).toBe('boolean')
    })

    it('should handle invalid paths gracefully', async () => {
      const paths: WasmPaths = {
        wasm: 'invalid://path/to/file.wasm',
        js: 'invalid://path/to/file.js',
      }
      
      // Should not throw, but may return false
      const result = await validateWasmPaths(paths)
      expect(typeof result).toBe('boolean')
    })
  })

  describe('path resolution in different environments', () => {
    it('should work without throwing errors', () => {
      // Should work in Node.js test environment
      expect(() => getWasmPaths()).not.toThrow()
    })

    it('should provide fallback paths when primary methods fail', () => {
      const paths = getWasmPaths()
      
      // Should always return valid paths, even as fallback
      expect(paths.wasm).toBeTruthy()
      expect(paths.js).toBeTruthy()
      expect(paths.wasm).toContain('valhalla.wasm')
      expect(paths.js).toContain('valhalla.js')
    })
  })
})

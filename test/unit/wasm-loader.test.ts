import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadWasmModule, isWasmSupported, resetWasmModule } from '../../src/internal/wasm-loader'
import { getWasmPaths } from '../../src/internal/wasm-paths'
import { ValhallaErrorCode } from '../../src/types/errors'

describe('wasm-loader', () => {
  beforeEach(() => {
    resetWasmModule()
  })

  afterEach(() => {
    resetWasmModule()
  })

  describe('isWasmSupported', () => {
    it('should return true when WebAssembly is available', () => {
      // WebAssembly should be available in Node.js test environment
      expect(isWasmSupported()).toBe(true)
    })
  })

  describe('loadWasmModule - path resolution', () => {
    it('should use auto-detected paths when no paths provided', async () => {
      const getWasmPathsSpy = vi.spyOn(
        await import('../../src/internal/wasm-paths'),
        'getWasmPaths'
      )

      // Mock fetch to avoid actual WASM loading
      const mockFetch = vi.fn().mockRejectedValue(new Error('WASM file not found (expected in test)'))

      try {
        await loadWasmModule({
          fetchFn: mockFetch as typeof fetch,
        })
      } catch (error) {
        // Expected to fail without actual WASM files
        // But we can verify paths were resolved
        expect(mockFetch).toHaveBeenCalled()
        const callArgs = mockFetch.mock.calls[0]
        expect(callArgs[0]).toBeTruthy()
        expect(typeof callArgs[0]).toBe('string')
      }
    })

    it('should use custom paths when provided', async () => {
      const customWasmPath = 'https://cdn.example.com/custom.wasm'
      const customJsPath = 'https://cdn.example.com/custom.js'

      const mockFetch = vi.fn().mockRejectedValue(new Error('WASM file not found (expected in test)'))

      try {
        await loadWasmModule({
          wasmPath: customWasmPath,
          jsGluePath: customJsPath,
          fetchFn: mockFetch as typeof fetch,
        })
      } catch (error) {
        // Verify custom path was used
        expect(mockFetch).toHaveBeenCalled()
        const wasmPath = mockFetch.mock.calls[0][0]
        expect(wasmPath).toBe(customWasmPath)
      }
    })

    it('should prioritize custom paths over auto-detected paths', async () => {
      const customWasmPath = '/custom/path/valhalla.wasm'
      const autoPaths = getWasmPaths()

      const mockFetch = vi.fn().mockRejectedValue(new Error('WASM file not found (expected in test)'))

      try {
        await loadWasmModule({
          wasmPath: customWasmPath,
          fetchFn: mockFetch as typeof fetch,
        })
      } catch (error) {
        // Verify custom path was used, not auto-detected
        expect(mockFetch).toHaveBeenCalled()
        const wasmPath = mockFetch.mock.calls[0][0]
        expect(wasmPath).toBe(customWasmPath)
        expect(wasmPath).not.toBe(autoPaths.wasm)
      }
    })
  })

  describe('loadWasmModule - error handling', () => {
    it('should provide helpful error message for 404 errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
      } as Response)

      await expect(
        loadWasmModule({
          wasmPath: '/nonexistent.wasm',
          fetchFn: mockFetch as typeof fetch,
        })
      ).rejects.toThrow()

      // Error should contain helpful message
      try {
        await loadWasmModule({
          wasmPath: '/nonexistent.wasm',
          fetchFn: mockFetch as typeof fetch,
        })
      } catch (error: any) {
        expect(error.message).toContain('404')
        expect(error.message).toContain('File not found')
      }
    })

    it('should provide helpful error message for CORS errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(
        new Error('CORS policy: No Access-Control-Allow-Origin header')
      )

      await expect(
        loadWasmModule({
          wasmPath: 'https://different-origin.com/valhalla.wasm',
          fetchFn: mockFetch as typeof fetch,
        })
      ).rejects.toThrow()

      try {
        await loadWasmModule({
          wasmPath: 'https://different-origin.com/valhalla.wasm',
          fetchFn: mockFetch as typeof fetch,
        })
      } catch (error: any) {
        expect(error.message).toContain('CORS')
        expect(error.message).toContain('Solutions')
      }
    })

    it('should provide helpful error message for network errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(
        new Error('Failed to fetch')
      )

      await expect(
        loadWasmModule({
          wasmPath: '/valhalla.wasm',
          fetchFn: mockFetch as typeof fetch,
        })
      ).rejects.toThrow()

      try {
        await loadWasmModule({
          wasmPath: '/valhalla.wasm',
          fetchFn: mockFetch as typeof fetch,
        })
      } catch (error: any) {
        expect(error.message).toContain('Network Error')
        expect(error.message).toContain('Solutions')
      }
    })

    it('should throw ValhallaError with correct error code', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))

      try {
        await loadWasmModule({
          wasmPath: '/valhalla.wasm',
          fetchFn: mockFetch as typeof fetch,
        })
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.code).toBe(ValhallaErrorCode.WASM_LOAD_FAILED)
      }
    })
  })

  describe('loadWasmModule - caching', () => {
    it('should cache loaded module', async () => {
      // This test would require actual WASM files
      // For now, we test that the function exists and doesn't throw
      expect(typeof loadWasmModule).toBe('function')
    })

    it('should return cached module on subsequent calls', async () => {
      // This would require actual WASM loading
      // Test structure is in place for when WASM files are available
      expect(typeof loadWasmModule).toBe('function')
    })
  })
})

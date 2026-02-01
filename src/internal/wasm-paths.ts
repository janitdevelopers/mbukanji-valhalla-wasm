/**
 * WASM Path Resolution Utility
 * 
 * Provides environment-aware path resolution for WASM files.
 * Handles Node.js, browser, bundlers, and Web Workers.
 */

/**
 * WASM file paths
 */
export interface WasmPaths {
  /** Path to the WASM file */
  wasm: string
  /** Path to the JS glue code */
  js: string
}

/**
 * Detect if running in a bundler environment
 */
export function isBundlerEnvironment(): boolean {
  if (typeof process === 'undefined') {
    return false
  }

  return !!(
    process.env.VITE ||
    process.env.WEBPACK ||
    process.env.ROLLUP ||
    process.env.NEXT_PUBLIC ||
    // Check for common bundler variables
    (typeof process.env !== 'undefined' && Object.keys(process.env).some((key) =>
      key.includes('VITE') || key.includes('WEBPACK') || key.includes('ROLLUP')
    ))
  )
}

/**
 * Detect if running in a Web Worker environment
 */
export function isWorkerEnvironment(): boolean {
  // Web Workers have 'self' but not 'window'
  if (typeof self !== 'undefined' && typeof window === 'undefined') {
    // Check for worker-specific APIs
    return (
      typeof importScripts !== 'undefined' ||
      typeof WorkerGlobalScope !== 'undefined' ||
      (self as unknown as { WorkerGlobalScope?: unknown }).WorkerGlobalScope !== undefined
    )
  }
  return false
}

/**
 * Get base URL for path resolution
 */
function getBaseUrl(): string {
  // Method 1: ESM with import.meta.url (browser, Node.js ESM, bundlers)
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      // For workers, use self.location if available
      if (isWorkerEnvironment()) {
        try {
          // In workers, self.location might be available
          if (typeof self !== 'undefined' && (self as unknown as { location?: Location }).location) {
            const workerLocation = (self as unknown as { location: Location }).location
            if (workerLocation) {
              return new URL('.', workerLocation.href).href
            }
          }
        } catch {
          // Fall through to import.meta.url
        }
      }

      // Use import.meta.url to resolve relative to current module
      return new URL('.', import.meta.url).href
    }
  } catch {
    // import.meta.url not available (CJS or older environments)
  }

  // Method 2: Node.js CJS with __dirname
  if (typeof __dirname !== 'undefined') {
    // Convert to file:// URL for consistency
    const { fileURLToPath } = require('node:url')
    const { dirname } = require('node:path')
    try {
      return new URL('.', `file://${__dirname}/`).href
    } catch {
      return `file://${__dirname}/`
    }
  }

  // Method 3: Browser fallback (relative to current script)
  if (typeof document !== 'undefined' && document.currentScript) {
    const script = document.currentScript as HTMLScriptElement
    if (script.src) {
      return new URL('.', script.src).href
    }
  }

  // Method 4: Worker fallback
  if (isWorkerEnvironment() && typeof self !== 'undefined') {
    try {
      // Try to get location from worker context
      const workerSelf = self as unknown as { location?: Location }
      if (workerSelf.location) {
        return new URL('.', workerSelf.location.href).href
      }
    } catch {
      // Fall through
    }
  }

  // Method 5: Ultimate fallback
  return './'
}

/**
 * Resolve WASM file paths
 * 
 * @param customBase - Optional custom base URL/path for WASM files
 * @returns Resolved WASM paths
 * 
 * @example
 * ```typescript
 * // Auto-detect paths (default)
 * const paths = getWasmPaths()
 * 
 * // Custom base URL
 * const paths = getWasmPaths('https://cdn.example.com/wasm')
 * ```
 */
export function getWasmPaths(customBase?: string): WasmPaths {
  // If custom base is provided, use it directly
  if (customBase) {
    // Ensure trailing slash
    const base = customBase.endsWith('/') ? customBase : `${customBase}/`
    return {
      wasm: `${base}valhalla.wasm`,
      js: `${base}valhalla.js`,
    }
  }

  // Auto-detect paths based on environment
  const baseUrl = getBaseUrl()

  // In Node.js, try to resolve to actual file paths if baseUrl is a file:// URL
  // This works in both ESM and CJS contexts
  if (typeof process !== 'undefined' && process.versions?.node && baseUrl.startsWith('file://')) {
    try {
      // Try to use Node.js path utilities
      // In CJS: require works
      // In ESM: bundler will handle this or we fall back to URL resolution
      let fileURLToPath: (url: string | URL) => string
      let join: (...paths: string[]) => string
      let dirname: (path: string) => string
      
      if (typeof require !== 'undefined') {
        const nodeUrl = require('node:url')
        const nodePath = require('node:path')
        fileURLToPath = nodeUrl.fileURLToPath
        join = nodePath.join
        dirname = nodePath.dirname
        
        const basePath = dirname(fileURLToPath(baseUrl))
        // Resolve relative to dist/ directory (where JS files are)
        const distPath = join(basePath, '..', 'dist')
        return {
          wasm: join(distPath, 'valhalla.wasm'),
          js: join(distPath, 'valhalla.js'),
        }
      }
    } catch {
      // Fall through to URL-based resolution (works in ESM)
    }
  }

  // For browser/bundler environments, use URL resolution
  // Paths are relative to the dist/ directory (same as JS files)
  try {
    return {
      wasm: new URL('valhalla.wasm', baseUrl).href,
      js: new URL('valhalla.js', baseUrl).href,
    }
  } catch {
    // Fallback to relative paths
    return {
      wasm: './valhalla.wasm',
      js: './valhalla.js',
    }
  }
}

/**
 * Default WASM paths (for convenience)
 * Uses auto-detection
 */
export const DEFAULT_WASM_PATHS: WasmPaths = getWasmPaths()

/**
 * Validate WASM paths
 * 
 * @param paths - Paths to validate
 * @returns Promise that resolves to true if paths are valid
 */
export async function validateWasmPaths(paths: WasmPaths): Promise<boolean> {
  try {
    // In browser, try to fetch the WASM file
    if (typeof fetch !== 'undefined') {
      const response = await fetch(paths.wasm, { method: 'HEAD' })
      return response.ok
    }

    // In Node.js, check if file exists
    if (typeof process !== 'undefined' && process.versions?.node) {
      const { existsSync } = require('node:fs')
      return existsSync(paths.wasm)
    }

    // Can't validate in this environment
    return true
  } catch {
    return false
  }
}

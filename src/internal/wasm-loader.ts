/**
 * WASM Module Loader
 * Handles loading and instantiation of the Valhalla WASM module
 */

import type { ValhallaInitOptions, LoadProgress } from '../types/config'
import { ValhallaError, ValhallaErrorCode, createError } from '../types/errors'
import { getWasmPaths } from './wasm-paths'

/** WASM Module interface - matches Emscripten output */
export interface ValhallaWasmModule {
  /** Calculate a route */
  route: (requestJson: string) => string
  /** Load tiles from base64-encoded tar (single string for C++ std::string) */
  loadTiles: (base64TarData: string) => boolean
  /** Load tiles from raw bytes to avoid string encoding issues */
  loadTilesFromBytes?: (bytes: Uint8Array) => boolean
  /** Check if tiles are loaded */
  hasTiles: () => boolean
  /** Get version string */
  getVersion: () => string
  /** Last native error from tile loading path */
  getLastError?: () => string
  /** Clear loaded tiles */
  clearTiles: () => void
  /** Get memory usage */
  getMemoryUsage: () => number
  /** Heap access for data transfer */
  HEAPU8: Uint8Array
  /** Memory allocation */
  _malloc: (size: number) => number
  /** Memory deallocation */
  _free: (ptr: number) => void
  /** Ready promise (Emscripten) */
  ready?: Promise<ValhallaWasmModule>
}

/** Factory function type for creating WASM module */
export type ValhallaWasmFactory = (options?: {
  locateFile?: (path: string, prefix: string) => string
  onRuntimeInitialized?: () => void
  print?: (text: string) => void
  printErr?: (text: string) => void
  INITIAL_MEMORY?: number
  TOTAL_MEMORY?: number
}) => Promise<ValhallaWasmModule>

/** Global WASM module instance */
let wasmModule: ValhallaWasmModule | null = null
let wasmInitPromise: Promise<ValhallaWasmModule> | null = null

/**
 * Check if WebAssembly is supported
 */
export function isWasmSupported(): boolean {
  try {
    if (typeof WebAssembly === 'object') {
      // Check for streaming compilation support
      if (typeof WebAssembly.instantiateStreaming === 'function') {
        return true
      }
      // Fallback check
      if (typeof WebAssembly.instantiate === 'function') {
        return true
      }
    }
  } catch {
    // WebAssembly not available
  }
  return false
}

/**
 * Report progress during loading
 */
function reportProgress(
  onProgress: ((progress: LoadProgress) => void) | undefined,
  phase: LoadProgress['phase'],
  percent: number,
  message: string,
  bytesLoaded?: number,
  bytesTotal?: number
): void {
  if (onProgress) {
    onProgress({
      phase,
      percent,
      message,
      bytesLoaded,
      bytesTotal,
    })
  }
}

/**
 * Load WASM module from URL with progress tracking
 */
async function loadWasmWithProgress(
  wasmPath: string,
  fetchFn: typeof fetch,
  onProgress?: (progress: LoadProgress) => void
): Promise<ArrayBuffer> {
  reportProgress(onProgress, 'wasm', 0, 'Starting WASM download...')

  let response: Response
  try {
    response = await fetchFn(wasmPath)
  } catch (error) {
    // Provide helpful error message for common issues
    const errorMessage = error instanceof Error ? error.message : String(error)
    let helpfulMessage = `Failed to load WASM from: ${wasmPath}\n`
    
    if (errorMessage.includes('CORS') || errorMessage.includes('cross-origin')) {
      helpfulMessage += '\nCORS Error: The WASM file cannot be loaded due to CORS restrictions.\n'
      helpfulMessage += 'Solutions:\n'
      helpfulMessage += '  1. Ensure your server sends proper CORS headers\n'
      helpfulMessage += '  2. Use a bundler (Vite, Webpack) that handles WASM files automatically\n'
      helpfulMessage += '  3. Copy WASM files to your public folder and reference them there\n'
    } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('network')) {
      helpfulMessage += '\nNetwork Error: Could not fetch the WASM file.\n'
      helpfulMessage += 'Solutions:\n'
      helpfulMessage += '  1. Check that the WASM file exists at the specified path\n'
      helpfulMessage += '  2. Verify the path is correct (use getWasmPaths() to see auto-detected paths)\n'
      helpfulMessage += '  3. For Node.js, ensure fetch is available (Node 18+ or provide fetch polyfill)\n'
    } else {
      helpfulMessage += `\nError: ${errorMessage}\n`
    }
    
    throw createError(ValhallaErrorCode.WASM_LOAD_FAILED, helpfulMessage)
  }
  
  if (!response.ok) {
    let errorMessage = `Failed to fetch WASM: ${response.status} ${response.statusText}\n`
    errorMessage += `Path: ${wasmPath}\n`
    
    if (response.status === 404) {
      errorMessage += '\nFile not found. Possible solutions:\n'
      errorMessage += '  1. Run "npm run build:wasm" to build WASM files\n'
      errorMessage += '  2. Ensure WASM files are copied to dist/ during build\n'
      errorMessage += '  3. Check that the path is correct\n'
    } else if (response.status === 403) {
      errorMessage += '\nAccess forbidden. Check file permissions and CORS settings.\n'
    }
    
    throw createError(ValhallaErrorCode.WASM_LOAD_FAILED, errorMessage)
  }

  const contentLength = response.headers.get('content-length')
  const total = contentLength ? parseInt(contentLength, 10) : undefined

  if (!response.body) {
    // No streaming support, just get the buffer
    const buffer = await response.arrayBuffer()
    reportProgress(onProgress, 'wasm', 100, 'WASM downloaded', buffer.byteLength, buffer.byteLength)
    return buffer
  }

  // Stream the response with progress
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0

  while (true) {
    const { done, value } = await reader.read()
    
    if (done) break
    
    chunks.push(value)
    loaded += value.length
    
    const percent = total ? Math.round((loaded / total) * 100) : 0
    reportProgress(onProgress, 'wasm', percent, 'Downloading WASM...', loaded, total)
  }

  // Combine chunks
  const buffer = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    buffer.set(chunk, offset)
    offset += chunk.length
  }

  reportProgress(onProgress, 'wasm', 100, 'WASM downloaded', loaded, total)
  return buffer.buffer
}

/**
 * Load and initialize the WASM module
 */
export async function loadWasmModule(
  options: ValhallaInitOptions = {}
): Promise<ValhallaWasmModule> {
  // Return cached module if already loaded
  if (wasmModule) {
    return wasmModule
  }

  // Return pending promise if loading
  if (wasmInitPromise) {
    return wasmInitPromise
  }

  wasmInitPromise = doLoadWasmModule(options)
  
  try {
    wasmModule = await wasmInitPromise
    return wasmModule
  } catch (error) {
    wasmInitPromise = null
    throw error
  }
}

/**
 * Internal implementation of WASM loading
 */
async function doLoadWasmModule(
  options: ValhallaInitOptions
): Promise<ValhallaWasmModule> {
  // Resolve WASM paths (use custom if provided, otherwise auto-detect)
  const defaultPaths = getWasmPaths()
  const {
    wasmPath = defaultPaths.wasm,
    jsGluePath,  // Only use default if not explicitly provided
    fetchFn = fetch,
    onProgress,
    onError,
    onReady,
  } = options
  
  // Use default JS path only if jsGluePath is not provided
  const resolvedJsGluePath = jsGluePath ?? defaultPaths.js

  // Check WASM support
  if (!isWasmSupported()) {
    const error = createError(ValhallaErrorCode.WASM_NOT_SUPPORTED)
    onError?.(error)
    throw error
  }

  try {
    reportProgress(onProgress, 'init', 0, 'Initializing WASM...')

    // If a JS glue path is provided (or auto-detected), dynamically import it
    // This is the Emscripten-generated JS file
    if (resolvedJsGluePath) {
      reportProgress(onProgress, 'init', 10, 'Loading WASM glue code...')
      
      // Dynamic import of the glue code with bundler ignore comments
      const glueModule = await import(
        /* @vite-ignore */ /* webpackIgnore: true */ resolvedJsGluePath
      )
      const factory: ValhallaWasmFactory = glueModule.default || glueModule
      
      reportProgress(onProgress, 'init', 30, 'Instantiating WASM module...')

      // Reserve more initial memory for large tile payload marshalling through embind strings.
      // Defaults are conservative enough for browser use while avoiding common allocation aborts.
      const initialPages = options.memory?.initial ?? 1024 // 64MB
      const initialBytes = initialPages * 64 * 1024

      // Emscripten attaches embind exports (createRouter, ValhallaRouter) only after onRuntimeInitialized.
      // Wait for that before reading Module so we don't read before bindings exist.
      let resolveRuntimeReady: () => void
      const runtimeReady = new Promise<void>((resolve) => { resolveRuntimeReady = resolve })

      const rawModule = await factory({
        locateFile: (path: string) => {
          if (path.endsWith('.wasm')) {
            return wasmPath
          }
          return path
        },
        onRuntimeInitialized: () => {
          resolveRuntimeReady()
        },
        print: (text: string) => {
          if (options.memory?.initial) {
            console.log('[Valhalla]', text)
          }
        },
        printErr: (text: string) => {
          console.error('[Valhalla]', text)
        },
        INITIAL_MEMORY: initialBytes,
        TOTAL_MEMORY: initialBytes,
      })

      // Wait for Emscripten runtime (embind exports are then on Module); fallback to rawModule.ready
      await Promise.race([
        runtimeReady,
        rawModule.ready ?? Promise.resolve(),
      ])

      // Yield so any pending microtasks (embind registration) can run before we read Module
      await new Promise<void>((r) => setTimeout(r, 0))

      // Emscripten bindings expose a class ValhallaRouter and createRouter(); loadTiles/route
      // are on the instance, not on the Module. Get the instance and merge with Module (for HEAPU8/_malloc/_free).
      const raw = rawModule as Record<string, unknown>
      // #region agent log
      const rawKeys = Object.keys(raw).filter((k) => typeof raw[k] === 'function' || k === 'HEAPU8' || k === 'ready').slice(0, 30)
      const payloadA = { location: 'wasm-loader.ts:afterReady', message: 'raw Module after ready', data: { hasCreateRouter: typeof raw.createRouter === 'function', hasValhallaRouter: typeof raw.ValhallaRouter === 'function', hasLoadTiles: typeof raw.loadTiles === 'function', rawKeysSample: rawKeys }, hypothesisId: 'A', timestamp: Date.now() }
      console.warn('[ValhallaDebug]', JSON.stringify(payloadA))
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('valhalla-debug', { detail: payloadA }))
      fetch('http://127.0.0.1:7243/ingest/8b1ca911-bddf-4de9-aabd-fbcca21e0d3e', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadA) }).catch(() => {})
      // #endregion
      // Prefer new ValhallaRouter() so we get a real instance with loadTiles/route; createRouter() may return a handle in some Emscripten builds.
      // If loadTiles is already on Module (some builds attach directly), use rawModule as the instance.
      let routerInstance: ValhallaWasmModule
      if (typeof raw.loadTiles === 'function') {
        routerInstance = rawModule as ValhallaWasmModule
      } else if (typeof raw.ValhallaRouter === 'function') {
        routerInstance = new (raw.ValhallaRouter as new () => ValhallaWasmModule)()
      } else if (typeof raw.createRouter === 'function') {
        routerInstance = (raw.createRouter as () => ValhallaWasmModule)()
      } else {
        routerInstance = rawModule as ValhallaWasmModule
      }
      // #region agent log
      const ri = routerInstance as Record<string, unknown>
      const riKeys = ri ? Object.keys(ri).filter((k) => typeof ri[k] === 'function').slice(0, 20) : []
      const payloadB = { location: 'wasm-loader.ts:routerInstance', message: 'routerInstance', data: { hasLoadTiles: typeof ri?.loadTiles === 'function', routerInstanceKeysSample: riKeys, routerInstanceType: typeof routerInstance }, hypothesisId: 'B', timestamp: Date.now() }
      console.warn('[ValhallaDebug]', JSON.stringify(payloadB))
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('valhalla-debug', { detail: payloadB }))
      fetch('http://127.0.0.1:7243/ingest/8b1ca911-bddf-4de9-aabd-fbcca21e0d3e', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadB) }).catch(() => {})
      // #endregion

      // Emscripten embind instance methods are on the prototype (non-enumerable), so Object.assign
      // does not copy them. Explicitly copy the router API onto the merged object and bind to the instance.
      const module: ValhallaWasmModule = {
        ...(rawModule as ValhallaWasmModule),
        loadTiles: typeof ri.loadTiles === 'function' ? (ri.loadTiles as (base64TarData: string) => boolean).bind(routerInstance) : (rawModule as ValhallaWasmModule).loadTiles,
        loadTilesFromBytes: typeof ri.loadTilesFromBytes === 'function'
          ? (ri.loadTilesFromBytes as (bytes: Uint8Array) => boolean).bind(routerInstance)
          : (rawModule as ValhallaWasmModule).loadTilesFromBytes,
        route: typeof ri.route === 'function' ? (ri.route as (requestJson: string) => string).bind(routerInstance) : (rawModule as ValhallaWasmModule).route,
        hasTiles: typeof ri.hasTiles === 'function' ? (ri.hasTiles as () => boolean).bind(routerInstance) : (rawModule as ValhallaWasmModule).hasTiles,
        clearTiles: typeof ri.clearTiles === 'function' ? (ri.clearTiles as () => void).bind(routerInstance) : (rawModule as ValhallaWasmModule).clearTiles,
        getVersion: typeof ri.getVersion === 'function' ? (ri.getVersion as () => string).bind(routerInstance) : (rawModule as ValhallaWasmModule).getVersion,
        getLastError: typeof ri.getLastError === 'function'
          ? (ri.getLastError as () => string).bind(routerInstance)
          : (rawModule as ValhallaWasmModule).getLastError,
        getMemoryUsage: typeof ri.getMemoryUsage === 'function' ? (ri.getMemoryUsage as () => number).bind(routerInstance) : (rawModule as ValhallaWasmModule).getMemoryUsage,
      } as ValhallaWasmModule

      // #region agent log
      const mergedKeys = Object.keys(module as Record<string, unknown>).filter((k) => (typeof (module as Record<string, unknown>)[k] === 'function')).slice(0, 25)
      const payloadC = { location: 'wasm-loader.ts:merged', message: 'merged module returned', data: { hasLoadTiles: typeof (module as Record<string, unknown>).loadTiles === 'function', mergedKeysSample: mergedKeys }, hypothesisId: 'C', timestamp: Date.now() }
      console.warn('[ValhallaDebug]', JSON.stringify(payloadC))
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('valhalla-debug', { detail: payloadC }))
      fetch('http://127.0.0.1:7243/ingest/8b1ca911-bddf-4de9-aabd-fbcca21e0d3e', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadC) }).catch(() => {})
      // #endregion

      const merged = module as Record<string, unknown>
      if (typeof merged.loadTiles !== 'function') {
        const msg = [
          'Valhalla WASM glue did not expose loadTiles (routing API missing).',
          `Glue URL: ${resolvedJsGluePath}`,
          `WASM URL: ${wasmPath}`,
          'Ensure valhalla.js/valhalla.wasm are from a build that includes the Valhalla C++ bindings (native build with wasm_bindings.cpp).',
          'In the package repo run: pnpm run build:wasm then pnpm run build. In the app run: pnpm run copy-valhalla-glue.',
        ].join(' ')
        throw createError(ValhallaErrorCode.WASM_INIT_FAILED, msg)
      }

      reportProgress(onProgress, 'init', 100, 'WASM ready')
      onReady?.()
      
      return module
    }

    // Direct WASM loading (when glue code is bundled)
    // This path is used when the WASM module has a bundled JS wrapper
    reportProgress(onProgress, 'wasm', 0, 'Loading WASM module...')
    
    const wasmBuffer = await loadWasmWithProgress(wasmPath, fetchFn, onProgress)
    
    reportProgress(onProgress, 'init', 50, 'Compiling WASM...')
    
    // For direct WASM loading, we need to instantiate with imports
    // This is a fallback when no glue code is provided
    const { instance } = await WebAssembly.instantiate(wasmBuffer, {
      env: {
        // Minimal environment - real implementation needs proper Emscripten env
        memory: new WebAssembly.Memory({ 
          initial: options.memory?.initial || 256,
          maximum: options.memory?.maximum || 4096,
        }),
        __memory_base: 0,
        __table_base: 0,
        abort: () => { throw new Error('WASM abort') },
      },
    })

    reportProgress(onProgress, 'init', 100, 'WASM ready')
    onReady?.()

    // Note: Direct instantiation returns raw exports
    // The actual implementation would need the Emscripten glue
    return instance.exports as unknown as ValhallaWasmModule
    
  } catch (error) {
    const valhallaError = error instanceof ValhallaError
      ? error
      : createError(
          ValhallaErrorCode.WASM_INIT_FAILED,
          error instanceof Error ? error.message : 'Unknown error during WASM initialization'
        )
    
    onError?.(valhallaError)
    throw valhallaError
  }
}

/**
 * Get the current WASM module instance
 */
export function getWasmModule(): ValhallaWasmModule | null {
  return wasmModule
}

/**
 * Reset the WASM module (for testing or cleanup)
 */
export function resetWasmModule(): void {
  wasmModule = null
  wasmInitPromise = null
}

/**
 * Copy data to WASM memory and return pointer
 */
export function copyToWasmMemory(
  module: ValhallaWasmModule,
  data: Uint8Array
): number {
  const ptr = module._malloc(data.length)
  module.HEAPU8.set(data, ptr)
  return ptr
}

/**
 * Free WASM memory
 */
export function freeWasmMemory(
  module: ValhallaWasmModule,
  ptr: number
): void {
  module._free(ptr)
}

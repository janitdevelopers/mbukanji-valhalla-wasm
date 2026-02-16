/**
 * ValhallaRouter - Main routing engine class
 * Provides turn-by-turn routing using Valhalla WASM
 */

import type {
  RouteRequest,
  RouteResponse,
  RouteError,
} from './types/route'
import type {
  ValhallaInitOptions,
  TileLoadOptions,
  RouterConfig,
  RouterStatus,
} from './types/config'
import {
  ValhallaError,
  ValhallaErrorCode,
  createError,
  mapApiErrorCode,
} from './types/errors'
import {
  loadWasmModule,
  resetWasmModule,
  type ValhallaWasmModule,
} from './internal/wasm-loader'
import { logger } from './internal/logger'

/** Encode ArrayBuffer as base64 so C++ loadTiles(std::string) can receive binary safely. */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

/** Encode ArrayBuffer as a raw binary string (latin1-style, 1 byte per code unit). */
function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
    binary += String.fromCharCode(...chunk)
  }
  return binary
}

/**
 * Default router configuration
 */
const DEFAULT_CONFIG: Required<RouterConfig> = {
  defaultCosting: 'auto',
  defaultUnits: 'kilometers',
  defaultLanguage: 'en-US',
  defaultShapeFormat: 'polyline6',
  verbose: false,
}

/**
 * ValhallaRouter - Offline routing engine powered by WebAssembly
 *
 * @example
 * ```typescript
 * import { createRouter } from '@jansoft/mbujkanji-valhalla-wasm'
 *
 * const router = createRouter()
 * await router.init({ wasmPath: '/valhalla.wasm' })
 * await router.loadTiles(tilesArrayBuffer)
 *
 * const route = await router.route({
 *   locations: [
 *     { lat: 4.0511, lon: 9.7679 },
 *     { lat: 3.8480, lon: 11.5021 }
 *   ],
 *   costing: 'auto'
 * })
 * ```
 */
export class ValhallaRouter {
  private module: ValhallaWasmModule | null = null
  private config: Required<RouterConfig>
  private tilesLoaded = false
  private loadedRegions: string[] = []
  private initialized = false

  constructor(config: RouterConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    if (this.config.verbose) {
      logger.setLevel('debug')
    }
  }

  /**
   * Initialize the router by loading the WASM module
   *
   * @param options - Initialization options
   * @returns Promise that resolves when initialized
   *
   * @example
   * ```typescript
   * await router.init({
   *   wasmPath: '/valhalla.wasm',
   *   jsGluePath: '/valhalla.js',
   *   onProgress: (p) => console.log(p.percent + '%')
   * })
   * ```
   */
  async init(options: ValhallaInitOptions = {}): Promise<void> {
    if (this.initialized) {
      logger.warn('Router already initialized')
      return
    }

    logger.info('Initializing Valhalla router...')

    try {
      this.module = await loadWasmModule(options)
      this.initialized = true
      logger.info('Router initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize router:', error)
      throw error
    }
  }

  /**
   * Load routing tiles from an ArrayBuffer
   *
   * @param tiles - Tile data as ArrayBuffer (tar format)
   * @param options - Loading options
   * @returns Promise that resolves when tiles are loaded
   *
   * @example
   * ```typescript
   * const response = await fetch('/tiles/cameroon.tar')
   * const tiles = await response.arrayBuffer()
   * await router.loadTiles(tiles, { regionId: 'cameroon' })
   * ```
   */
  async loadTiles(
    tiles: ArrayBuffer,
    options: TileLoadOptions = {}
  ): Promise<void> {
    this.ensureInitialized()

    // #region agent log
    const m = this.module as unknown as Record<string, unknown>
    const modKeys = m ? Object.keys(m).filter((k) => typeof m[k] === 'function').slice(0, 25) : []
    const payloadD = { location: 'valhalla-router.ts:loadTiles', message: 'this.module at loadTiles entry', data: { typeofLoadTiles: typeof m?.loadTiles, hasCreateRouter: typeof m?.createRouter === 'function', hasValhallaRouter: typeof m?.ValhallaRouter === 'function', moduleKeysSample: modKeys }, hypothesisId: 'D', timestamp: Date.now() }
    console.warn('[ValhallaDebug]', JSON.stringify(payloadD))
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('valhalla-debug', { detail: payloadD }))
    fetch('http://127.0.0.1:7243/ingest/8b1ca911-bddf-4de9-aabd-fbcca21e0d3e', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadD) }).catch(() => {})
    // #endregion

    // Ensure module has loadTiles (Emscripten exposes it on the router instance, not the raw Module)
    if (typeof m?.loadTiles !== 'function') {
      let instance: Record<string, unknown> | null = null
      if (typeof m?.ValhallaRouter === 'function') {
        instance = new (m.ValhallaRouter as new () => Record<string, unknown>)()
      } else if (typeof m?.createRouter === 'function') {
        const created = (m.createRouter as () => unknown)()
        instance = created && typeof created === 'object' && typeof (created as Record<string, unknown>).loadTiles === 'function' ? (created as Record<string, unknown>) : null
      }
      if (instance && typeof instance.loadTiles === 'function') {
        this.module = Object.assign({}, m, instance) as unknown as ValhallaWasmModule
      }
    }

    const { onProgress, validate = true, regionId } = options

    logger.info('Loading tiles...', { size: tiles.byteLength, regionId })

    onProgress?.({
      phase: 'tiles',
      percent: 0,
      message: 'Preparing tiles...',
      bytesTotal: tiles.byteLength,
    })

    try {
      onProgress?.({
        phase: 'tiles',
        percent: 50,
        message: 'Loading tiles into router...',
        bytesLoaded: tiles.byteLength,
        bytesTotal: tiles.byteLength,
      })

      let success = false
      let preferredError: unknown = null

      // Prefer direct byte transfer when the native binding exposes it.
      // This avoids UTF/base64 string transport ambiguity for binary tar payloads.
      if (typeof this.module!.loadTilesFromBytes === 'function') {
        try {
          success = this.module!.loadTilesFromBytes(new Uint8Array(tiles))
        } catch (e) {
          preferredError = e
        }
      }

      // Fallback chain for older builds: base64 then raw-binary string.
      if (!success) {
        const base64 = arrayBufferToBase64(tiles)
        let base64Error: unknown = null
        try {
          success = this.module!.loadTiles(base64)
        } catch (e) {
          base64Error = e
          if (!preferredError) preferredError = e
        }
        if (!success) {
          const rawBinary = arrayBufferToBinaryString(tiles)
          try {
            const fallbackSuccess = this.module!.loadTiles(rawBinary)
            if (fallbackSuccess) {
              success = true
              logger.warn(
                'loadTiles succeeded via raw-binary fallback; native binding likely expects direct bytes'
              )
            }
          } catch (fallbackError) {
            if (!preferredError) preferredError = fallbackError
            if (base64Error) throw base64Error
            throw fallbackError
          }
        }
      }

      if (!success && preferredError) {
        throw preferredError
      }
      if (!success) {
        const nativeDetail =
          typeof this.module!.getLastError === 'function'
            ? this.module!.getLastError() || ''
            : ''
        if (nativeDetail) {
          throw createError(
            ValhallaErrorCode.TILES_LOAD_FAILED,
            `Failed to load routing tiles: ${nativeDetail}`
          )
        }
      }

      onProgress?.({
        phase: 'tiles',
        percent: 75,
        message: 'Tiles loaded, validating...',
        bytesLoaded: tiles.byteLength,
        bytesTotal: tiles.byteLength,
      })

      if (!success) {
        throw createError(ValhallaErrorCode.TILES_LOAD_FAILED)
      }

      // Validate tiles are usable
      if (validate && !this.module!.hasTiles()) {
        throw createError(
          ValhallaErrorCode.TILES_INVALID_FORMAT,
          'Tiles loaded but router reports no tiles available'
        )
      }

      this.tilesLoaded = true
      if (regionId) {
        this.loadedRegions.push(regionId)
      }

      onProgress?.({
        phase: 'tiles',
        percent: 100,
        message: 'Tiles loaded successfully',
        bytesLoaded: tiles.byteLength,
        bytesTotal: tiles.byteLength,
      })

      logger.info('Tiles loaded successfully', { regionId })
    } catch (error) {
      logger.error('Failed to load tiles:', error)
      const message =
        error instanceof ValhallaError
          ? error.message
          : error instanceof Error
            ? error.message
            : error != null && typeof (error as { message?: string }).message === 'string'
              ? (error as { message: string }).message
              : String(error)
      if (error instanceof ValhallaError) {
        throw error
      }
      throw createError(ValhallaErrorCode.TILES_LOAD_FAILED, message || 'Unknown error loading tiles')
    }
  }

  /**
   * Load tiles from a URL
   *
   * @param url - URL to fetch tiles from
   * @param options - Loading options
   * @returns Promise that resolves when tiles are loaded
   *
   * @example
   * ```typescript
   * await router.loadTilesFromUrl(
   *   'https://cdn.example.com/tiles/cameroon.tar',
   *   { regionId: 'cameroon' }
   * )
   * ```
   */
  async loadTilesFromUrl(
    url: string,
    options: TileLoadOptions & { fetchFn?: typeof fetch } = {}
  ): Promise<void> {
    const { fetchFn = fetch, onProgress, ...loadOptions } = options

    logger.info('Fetching tiles from URL...', { url })

    onProgress?.({
      phase: 'tiles',
      percent: 0,
      message: 'Downloading tiles...',
    })

    const response = await fetchFn(url)
    
    if (!response.ok) {
      throw createError(
        ValhallaErrorCode.TILES_LOAD_FAILED,
        `Failed to fetch tiles: ${response.status} ${response.statusText}`
      )
    }

    // Track download progress if possible
    const contentLength = response.headers.get('content-length')
    const total = contentLength ? parseInt(contentLength, 10) : undefined

    let tiles: ArrayBuffer

    if (response.body && total) {
      // Stream with progress
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let loaded = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        chunks.push(value)
        loaded += value.length

        onProgress?.({
          phase: 'tiles',
          percent: Math.round((loaded / total) * 50), // 0-50% for download
          message: 'Downloading tiles...',
          bytesLoaded: loaded,
          bytesTotal: total,
        })
      }

      // Combine chunks
      const combined = new Uint8Array(loaded)
      let offset = 0
      for (const chunk of chunks) {
        combined.set(chunk, offset)
        offset += chunk.length
      }
      tiles = combined.buffer
    } else {
      tiles = await response.arrayBuffer()
    }

    // Load the tiles
    await this.loadTiles(tiles, {
      ...loadOptions,
      onProgress: (p) => {
        // Adjust progress to 50-100% range
        onProgress?.({
          ...p,
          percent: 50 + Math.round(p.percent / 2),
        })
      },
    })
  }

  /**
   * Calculate a route between locations
   *
   * @param request - Route request parameters
   * @returns Promise that resolves with the route response
   *
   * @example
   * ```typescript
   * const route = await router.route({
   *   locations: [
   *     { lat: 4.0511, lon: 9.7679 },
   *     { lat: 3.8480, lon: 11.5021 }
   *   ],
   *   costing: 'auto',
   *   directions_type: 'maneuvers'
   * })
   *
   * console.log(`Distance: ${route.trip.summary.length} km`)
   * console.log(`Time: ${route.trip.summary.time} seconds`)
   * ```
   */
  async route(request: RouteRequest): Promise<RouteResponse> {
    this.ensureInitialized()
    this.ensureTilesLoaded()

    // Validate request
    this.validateRouteRequest(request)

    // Apply defaults
    const fullRequest = this.applyDefaults(request)

    logger.debug('Calculating route...', { 
      from: fullRequest.locations[0],
      to: fullRequest.locations[fullRequest.locations.length - 1],
      costing: fullRequest.costing,
    })

    try {
      const requestJson = JSON.stringify(fullRequest)
      const responseJson = this.module!.route(requestJson)
      const response = JSON.parse(responseJson)

      // Check for error response
      if (response.error_code !== undefined) {
        const errorResponse = response as RouteError
        throw createError(
          mapApiErrorCode(errorResponse.error_code),
          errorResponse.error,
          { error_code: errorResponse.error_code }
        )
      }

      logger.debug('Route calculated', {
        distance: response.trip?.summary?.length,
        time: response.trip?.summary?.time,
      })

      return response as RouteResponse
    } catch (error) {
      if (error instanceof ValhallaError) {
        throw error
      }

      logger.error('Route calculation failed:', error)
      
      throw createError(
        ValhallaErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Unknown error during routing'
      )
    }
  }

  /**
   * Get the current router status
   *
   * @returns Router status information
   */
  getStatus(): RouterStatus {
    return {
      wasmLoaded: this.initialized && this.module !== null,
      tilesLoaded: this.tilesLoaded,
      ready: this.initialized && this.tilesLoaded,
      loadedRegions: [...this.loadedRegions],
      memoryUsage: this.module?.getMemoryUsage?.(),
      version: this.module?.getVersion?.(),
    }
  }

  /**
   * Check if the router is ready for routing
   *
   * @returns True if router is initialized and has tiles loaded
   */
  isReady(): boolean {
    return this.initialized && this.tilesLoaded
  }

  /**
   * Clear loaded tiles from memory
   */
  clearTiles(): void {
    if (this.module?.clearTiles) {
      this.module.clearTiles()
    }
    this.tilesLoaded = false
    this.loadedRegions = []
    logger.info('Tiles cleared')
  }

  /**
   * Dispose of the router and release resources
   */
  dispose(): void {
    this.clearTiles()
    resetWasmModule()
    this.module = null
    this.initialized = false
    logger.info('Router disposed')
  }

  /**
   * Ensure router is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.module) {
      throw createError(ValhallaErrorCode.NOT_INITIALIZED)
    }
  }

  /**
   * Ensure tiles are loaded
   */
  private ensureTilesLoaded(): void {
    if (!this.tilesLoaded) {
      throw createError(ValhallaErrorCode.TILES_NOT_LOADED)
    }
  }

  /**
   * Validate route request
   */
  private validateRouteRequest(request: RouteRequest): void {
    if (!request.locations || request.locations.length < 2) {
      throw createError(
        ValhallaErrorCode.ROUTE_INVALID_REQUEST,
        'At least 2 locations are required'
      )
    }

    for (let i = 0; i < request.locations.length; i++) {
      const loc = request.locations[i]
      
      if (typeof loc.lat !== 'number' || typeof loc.lon !== 'number') {
        throw createError(
          ValhallaErrorCode.ROUTE_INVALID_REQUEST,
          `Invalid location at index ${i}: lat and lon must be numbers`
        )
      }

      if (loc.lat < -90 || loc.lat > 90) {
        throw createError(
          ValhallaErrorCode.ROUTE_INVALID_REQUEST,
          `Invalid latitude at index ${i}: must be between -90 and 90`
        )
      }

      if (loc.lon < -180 || loc.lon > 180) {
        throw createError(
          ValhallaErrorCode.ROUTE_INVALID_REQUEST,
          `Invalid longitude at index ${i}: must be between -180 and 180`
        )
      }
    }
  }

  /**
   * Apply default values to route request
   */
  private applyDefaults(request: RouteRequest): RouteRequest {
    return {
      ...request,
      costing: request.costing || this.config.defaultCosting,
      units: request.units || this.config.defaultUnits,
      language: request.language || this.config.defaultLanguage,
      shape_format: request.shape_format || this.config.defaultShapeFormat,
      directions_type: request.directions_type || 'maneuvers',
    }
  }
}

/**
 * Create a new ValhallaRouter instance
 *
 * @param config - Router configuration
 * @returns New ValhallaRouter instance
 *
 * @example
 * ```typescript
 * import { createRouter } from '@jansoft/mbujkanji-valhalla-wasm'
 *
 * const router = createRouter({
 *   defaultCosting: 'auto',
 *   defaultUnits: 'kilometers',
 *   verbose: true
 * })
 * ```
 */
export function createRouter(config?: RouterConfig): ValhallaRouter {
  return new ValhallaRouter(config)
}

/**
 * Valhalla Configuration Types
 */

/** WASM module initialization options */
export interface ValhallaInitOptions {
  /** 
   * Path to the WASM file
   * @default '/valhalla.wasm'
   */
  wasmPath?: string
  
  /**
   * Path to the JS glue code (if separate from main bundle)
   * @default undefined (uses bundled glue code)
   */
  jsGluePath?: string
  
  /**
   * Whether to load WASM in a Web Worker
   * @default false
   */
  useWorker?: boolean
  
  /**
   * Custom fetch function for loading WASM
   * Useful for custom authentication or caching
   */
  fetchFn?: typeof fetch
  
  /**
   * Memory configuration for WASM
   */
  memory?: {
    /** Initial memory pages (64KB each) */
    initial?: number
    /** Maximum memory pages */
    maximum?: number
  }
  
  /**
   * Callback when WASM module is ready
   */
  onReady?: () => void
  
  /**
   * Callback for progress during initialization
   */
  onProgress?: (progress: LoadProgress) => void
  
  /**
   * Callback for errors during initialization
   */
  onError?: (error: Error) => void
}

/** Progress information during loading */
export interface LoadProgress {
  /** Current phase */
  phase: 'wasm' | 'tiles' | 'init'
  /** Progress percentage (0-100) */
  percent: number
  /** Bytes loaded (if applicable) */
  bytesLoaded?: number
  /** Total bytes (if known) */
  bytesTotal?: number
  /** Human-readable message */
  message: string
}

/** Tile loading options */
export interface TileLoadOptions {
  /**
   * Callback for progress during tile loading
   */
  onProgress?: (progress: LoadProgress) => void
  
  /**
   * Whether to validate tile data
   * @default true
   */
  validate?: boolean
  
  /**
   * Region identifier for the tiles
   * Used for cache management
   */
  regionId?: string
}

/** Tile source configuration */
export interface TileSource {
  /** Unique identifier for this tile source */
  id: string
  /** Human-readable name */
  name: string
  /** URL pattern or base URL for tiles */
  url: string
  /** Bounding box [minLon, minLat, maxLon, maxLat] */
  bounds?: [number, number, number, number]
  /** Attribution text */
  attribution?: string
  /** Version of the tiles */
  version?: string
  /** Size in bytes (if known) */
  size?: number
}

/** Router configuration */
export interface RouterConfig {
  /**
   * Default costing model
   * @default 'auto'
   */
  defaultCosting?: 'auto' | 'bicycle' | 'pedestrian' | 'truck'
  
  /**
   * Default units
   * @default 'kilometers'
   */
  defaultUnits?: 'kilometers' | 'miles'
  
  /**
   * Default language for instructions
   * @default 'en-US'
   */
  defaultLanguage?: string
  
  /**
   * Default shape format
   * @default 'polyline6'
   */
  defaultShapeFormat?: 'polyline5' | 'polyline6' | 'geojson'
  
  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean
}

/** Status of the Valhalla router */
export interface RouterStatus {
  /** Whether WASM module is loaded */
  wasmLoaded: boolean
  /** Whether tiles are loaded */
  tilesLoaded: boolean
  /** Whether router is ready for queries */
  ready: boolean
  /** Loaded tile regions */
  loadedRegions: string[]
  /** Memory usage in bytes */
  memoryUsage?: number
  /** Version information */
  version?: string
}

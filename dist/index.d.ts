/**
 * Valhalla Route Types
 * Based on Valhalla API specification
 */
/** Supported costing models for routing */
type CostingModel = 'auto' | 'bicycle' | 'pedestrian' | 'truck';
/** Coordinate location */
interface Location {
    lat: number;
    lon: number;
    /** Optional: Type of location (break, through, via) */
    type?: 'break' | 'through' | 'via';
    /** Optional: Preferred side of street */
    side_of_street?: 'same' | 'opposite' | 'either';
    /** Optional: Search radius in meters */
    search_radius?: number;
    /** Optional: Heading in degrees (0-360) */
    heading?: number;
    /** Optional: Heading tolerance in degrees */
    heading_tolerance?: number;
    /** Optional: Street name hint */
    street?: string;
    /** Optional: Minimum road class */
    minimum_reachability?: number;
    /** Optional: Radius for snapping to road */
    radius?: number;
}
/** Auto/Car costing options */
interface AutoCostingOptions {
    /** Preference for toll roads (0-1, default 0.5) */
    toll_booth_penalty?: number;
    /** Preference for highways (0-1, default 1.0) */
    use_highways?: number;
    /** Preference for toll roads (0-1, default 0.5) */
    use_tolls?: number;
    /** Preference for ferry routes (0-1, default 0.5) */
    use_ferry?: number;
    /** Vehicle height in meters */
    height?: number;
    /** Vehicle width in meters */
    width?: number;
    /** Top speed in km/h */
    top_speed?: number;
}
/** Bicycle costing options */
interface BicycleCostingOptions {
    /** Bicycle type */
    bicycle_type?: 'Road' | 'Hybrid' | 'Cross' | 'Mountain';
    /** Cycling speed in km/h */
    cycling_speed?: number;
    /** Preference for hills (0-1, default 0.5) */
    use_hills?: number;
    /** Preference for roads (vs paths) (0-1, default 0.5) */
    use_roads?: number;
    /** Avoid bad surfaces (0-1, default 0.25) */
    avoid_bad_surfaces?: number;
}
/** Pedestrian costing options */
interface PedestrianCostingOptions {
    /** Walking speed in km/h (default 5.1) */
    walking_speed?: number;
    /** Walkway factor (default 1.0) */
    walkway_factor?: number;
    /** Sidewalk factor (default 1.0) */
    sidewalk_factor?: number;
    /** Alley factor (default 2.0) */
    alley_factor?: number;
    /** Driveway factor (default 5.0) */
    driveway_factor?: number;
    /** Step penalty in seconds */
    step_penalty?: number;
    /** Max hiking difficulty (0-6) */
    max_hiking_difficulty?: number;
}
/** Truck costing options */
interface TruckCostingOptions {
    /** Vehicle height in meters */
    height?: number;
    /** Vehicle width in meters */
    width?: number;
    /** Vehicle length in meters */
    length?: number;
    /** Vehicle weight in metric tons */
    weight?: number;
    /** Axle load in metric tons */
    axle_load?: number;
    /** Hazardous materials */
    hazmat?: boolean;
}
/** Costing options union type */
type CostingOptions = AutoCostingOptions | BicycleCostingOptions | PedestrianCostingOptions | TruckCostingOptions;
/** Directions output type */
type DirectionsType = 'none' | 'maneuvers' | 'instructions';
/** Route request parameters */
interface RouteRequest {
    /** Array of locations (minimum 2) */
    locations: Location[];
    /** Costing model to use */
    costing: CostingModel;
    /** Costing options for the selected model */
    costing_options?: {
        auto?: AutoCostingOptions;
        bicycle?: BicycleCostingOptions;
        pedestrian?: PedestrianCostingOptions;
        truck?: TruckCostingOptions;
    };
    /** Type of directions to return */
    directions_type?: DirectionsType;
    /** Units for distance (km or mi) */
    units?: 'kilometers' | 'miles';
    /** Language for maneuver instructions */
    language?: string;
    /** Include shape in response */
    shape_format?: 'polyline5' | 'polyline6' | 'geojson';
    /** Number of alternate routes to return */
    alternates?: number;
    /** Exclude specific road types */
    exclude_locations?: Location[];
    /** Date/time for time-dependent routing */
    date_time?: {
        type: 0 | 1 | 2 | 3;
        value: string;
    };
}
/** Maneuver type enumeration */
type ManeuverType = 'kNone' | 'kStart' | 'kStartRight' | 'kStartLeft' | 'kDestination' | 'kDestinationRight' | 'kDestinationLeft' | 'kBecomes' | 'kContinue' | 'kSlightRight' | 'kRight' | 'kSharpRight' | 'kUturnRight' | 'kUturnLeft' | 'kSharpLeft' | 'kLeft' | 'kSlightLeft' | 'kRampStraight' | 'kRampRight' | 'kRampLeft' | 'kExitRight' | 'kExitLeft' | 'kStayStraight' | 'kStayRight' | 'kStayLeft' | 'kMerge' | 'kRoundaboutEnter' | 'kRoundaboutExit' | 'kFerryEnter' | 'kFerryExit' | 'kTransit' | 'kTransitTransfer' | 'kTransitRemainOn' | 'kTransitConnectionStart' | 'kTransitConnectionTransfer' | 'kTransitConnectionDestination' | 'kPostTransitConnectionDestination';
/** Turn-by-turn maneuver */
interface Maneuver {
    /** Type of maneuver */
    type: number;
    /** Human-readable instruction */
    instruction: string;
    /** Verbal instruction for TTS */
    verbal_pre_transition_instruction?: string;
    /** Post-transition verbal instruction */
    verbal_post_transition_instruction?: string;
    /** Verbal alert instruction */
    verbal_succinct_transition_instruction?: string;
    /** Street names */
    street_names?: string[];
    /** Begin street names */
    begin_street_names?: string[];
    /** Length of this maneuver in units specified */
    length: number;
    /** Estimated time in seconds */
    time: number;
    /** Begin shape index */
    begin_shape_index: number;
    /** End shape index */
    end_shape_index: number;
    /** Toll road indicator */
    toll?: boolean;
    /** Highway indicator */
    highway?: boolean;
    /** Rough surface indicator */
    rough?: boolean;
    /** Travel mode for this maneuver */
    travel_mode: string;
    /** Travel type for this maneuver */
    travel_type: string;
}
/** Route leg (between two consecutive locations) */
interface RouteLeg {
    /** Summary information */
    summary: {
        /** Total length in units specified */
        length: number;
        /** Total time in seconds */
        time: number;
        /** Minimum latitude */
        min_lat: number;
        /** Minimum longitude */
        min_lon: number;
        /** Maximum latitude */
        max_lat: number;
        /** Maximum longitude */
        max_lon: number;
    };
    /** Array of maneuvers */
    maneuvers: Maneuver[];
    /** Encoded polyline shape */
    shape: string;
}
/** Complete route response */
interface RouteResponse {
    /** Route ID */
    id?: string;
    /** Trip information */
    trip: {
        /** Array of route legs */
        legs: RouteLeg[];
        /** Trip summary */
        summary: {
            /** Total length */
            length: number;
            /** Total time in seconds */
            time: number;
            /** Minimum latitude */
            min_lat: number;
            /** Minimum longitude */
            min_lon: number;
            /** Maximum latitude */
            max_lat: number;
            /** Maximum longitude */
            max_lon: number;
        };
        /** Status code */
        status: number;
        /** Status message */
        status_message: string;
        /** Units used */
        units: string;
        /** Language used */
        language: string;
        /** Locations with additional info */
        locations: Array<Location & {
            original_index?: number;
        }>;
    };
    /** Alternate routes if requested */
    alternates?: RouteResponse[];
}
/** Route calculation error */
interface RouteError {
    /** Error code */
    error_code: number;
    /** Error message */
    error: string;
    /** HTTP status code */
    status_code: number;
    /** Status text */
    status: string;
}

/**
 * Valhalla Configuration Types
 */
/** WASM module initialization options */
interface ValhallaInitOptions {
    /**
     * Path to the WASM file
     *
     * If not provided, paths are auto-detected from the package location.
     * Works in browser, Node.js, and bundler environments.
     *
     * @default Auto-detected from package location
     *
     * @example
     * ```typescript
     * // Auto-detection (recommended)
     * await router.init()
     *
     * // Custom path (for CDN or custom locations)
     * await router.init({ wasmPath: 'https://cdn.example.com/valhalla.wasm' })
     *
     * // Local custom path
     * await router.init({ wasmPath: '/custom/path/valhalla.wasm' })
     * ```
     */
    wasmPath?: string;
    /**
     * Path to the JS glue code (if separate from main bundle)
     *
     * If not provided, paths are auto-detected from the package location.
     * Only needed if the JS glue code is in a different location than the WASM file.
     *
     * @default Auto-detected from package location
     *
     * @example
     * ```typescript
     * // Auto-detection (recommended)
     * await router.init()
     *
     * // Custom paths for both files
     * await router.init({
     *   wasmPath: 'https://cdn.example.com/valhalla.wasm',
     *   jsGluePath: 'https://cdn.example.com/valhalla.js'
     * })
     * ```
     */
    jsGluePath?: string;
    /**
     * Whether to load WASM in a Web Worker
     * @default false
     */
    useWorker?: boolean;
    /**
     * Custom fetch function for loading WASM
     * Useful for custom authentication or caching
     */
    fetchFn?: typeof fetch;
    /**
     * Memory configuration for WASM
     */
    memory?: {
        /** Initial memory pages (64KB each) */
        initial?: number;
        /** Maximum memory pages */
        maximum?: number;
    };
    /**
     * Callback when WASM module is ready
     */
    onReady?: () => void;
    /**
     * Callback for progress during initialization
     */
    onProgress?: (progress: LoadProgress) => void;
    /**
     * Callback for errors during initialization
     */
    onError?: (error: Error) => void;
}
/** Progress information during loading */
interface LoadProgress {
    /** Current phase */
    phase: 'wasm' | 'tiles' | 'init';
    /** Progress percentage (0-100) */
    percent: number;
    /** Bytes loaded (if applicable) */
    bytesLoaded?: number;
    /** Total bytes (if known) */
    bytesTotal?: number;
    /** Human-readable message */
    message: string;
}
/** Tile loading options */
interface TileLoadOptions {
    /**
     * Callback for progress during tile loading
     */
    onProgress?: (progress: LoadProgress) => void;
    /**
     * Whether to validate tile data
     * @default true
     */
    validate?: boolean;
    /**
     * Region identifier for the tiles
     * Used for cache management
     */
    regionId?: string;
}
/** Tile source configuration */
interface TileSource {
    /** Unique identifier for this tile source */
    id: string;
    /** Human-readable name */
    name: string;
    /** URL pattern or base URL for tiles */
    url: string;
    /** Bounding box [minLon, minLat, maxLon, maxLat] */
    bounds?: [number, number, number, number];
    /** Attribution text */
    attribution?: string;
    /** Version of the tiles */
    version?: string;
    /** Size in bytes (if known) */
    size?: number;
}
/** Router configuration */
interface RouterConfig {
    /**
     * Default costing model
     * @default 'auto'
     */
    defaultCosting?: 'auto' | 'bicycle' | 'pedestrian' | 'truck';
    /**
     * Default units
     * @default 'kilometers'
     */
    defaultUnits?: 'kilometers' | 'miles';
    /**
     * Default language for instructions
     * @default 'en-US'
     */
    defaultLanguage?: string;
    /**
     * Default shape format
     * @default 'polyline6'
     */
    defaultShapeFormat?: 'polyline5' | 'polyline6' | 'geojson';
    /**
     * Enable verbose logging
     * @default false
     */
    verbose?: boolean;
}
/** Status of the Valhalla router */
interface RouterStatus {
    /** Whether WASM module is loaded */
    wasmLoaded: boolean;
    /** Whether tiles are loaded */
    tilesLoaded: boolean;
    /** Whether router is ready for queries */
    ready: boolean;
    /** Loaded tile regions */
    loadedRegions: string[];
    /** Memory usage in bytes */
    memoryUsage?: number;
    /** Version information */
    version?: string;
}

/**
 * ValhallaRouter - Main routing engine class
 * Provides turn-by-turn routing using Valhalla WASM
 */

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
declare class ValhallaRouter {
    private module;
    private config;
    private tilesLoaded;
    private loadedRegions;
    private initialized;
    constructor(config?: RouterConfig);
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
    init(options?: ValhallaInitOptions): Promise<void>;
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
    loadTiles(tiles: ArrayBuffer, options?: TileLoadOptions): Promise<void>;
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
    loadTilesFromUrl(url: string, options?: TileLoadOptions & {
        fetchFn?: typeof fetch;
    }): Promise<void>;
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
    route(request: RouteRequest): Promise<RouteResponse>;
    /**
     * Get the current router status
     *
     * @returns Router status information
     */
    getStatus(): RouterStatus;
    /**
     * Check if the router is ready for routing
     *
     * @returns True if router is initialized and has tiles loaded
     */
    isReady(): boolean;
    /**
     * Clear loaded tiles from memory
     */
    clearTiles(): void;
    /**
     * Dispose of the router and release resources
     */
    dispose(): void;
    /**
     * Ensure router is initialized
     */
    private ensureInitialized;
    /**
     * Ensure tiles are loaded
     */
    private ensureTilesLoaded;
    /**
     * Validate route request
     */
    private validateRouteRequest;
    /**
     * Apply default values to route request
     */
    private applyDefaults;
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
declare function createRouter(config?: RouterConfig): ValhallaRouter;

/**
 * Valhalla Error Types
 */
/** Base error class for Valhalla errors */
declare class ValhallaError extends Error {
    readonly code: ValhallaErrorCode;
    readonly details?: Record<string, unknown> | undefined;
    constructor(message: string, code: ValhallaErrorCode, details?: Record<string, unknown> | undefined);
}
/** Error codes for Valhalla operations */
declare enum ValhallaErrorCode {
    WASM_LOAD_FAILED = 100,
    WASM_INIT_FAILED = 101,
    WASM_NOT_SUPPORTED = 102,
    TILES_NOT_LOADED = 200,
    TILES_LOAD_FAILED = 201,
    TILES_INVALID_FORMAT = 202,
    TILES_REGION_NOT_FOUND = 203,
    ROUTE_NOT_FOUND = 300,
    ROUTE_INVALID_REQUEST = 301,
    ROUTE_LOCATION_NOT_FOUND = 302,
    ROUTE_NO_PATH = 303,
    ROUTE_LOCATIONS_TOO_CLOSE = 304,
    ROUTE_LOCATIONS_TOO_FAR = 305,
    NOT_INITIALIZED = 900,
    INVALID_ARGUMENT = 901,
    INTERNAL_ERROR = 999
}
/** Create a ValhallaError with proper message */
declare function createError(code: ValhallaErrorCode, customMessage?: string, details?: Record<string, unknown>): ValhallaError;
/** Check if an error is a ValhallaError */
declare function isValhallaError(error: unknown): error is ValhallaError;

/**
 * WASM Path Resolution Utility
 *
 * Provides environment-aware path resolution for WASM files.
 * Handles Node.js, browser, bundlers, and Web Workers.
 */
/**
 * WASM file paths
 */
interface WasmPaths {
    /** Path to the WASM file */
    wasm: string;
    /** Path to the JS glue code */
    js: string;
}
/**
 * Detect if running in a bundler environment
 */
declare function isBundlerEnvironment(): boolean;
/**
 * Detect if running in a Web Worker environment
 */
declare function isWorkerEnvironment(): boolean;
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
declare function getWasmPaths(customBase?: string): WasmPaths;
/**
 * Default WASM paths (for convenience)
 * Uses auto-detection
 */
declare const DEFAULT_WASM_PATHS: WasmPaths;
/**
 * Validate WASM paths
 *
 * @param paths - Paths to validate
 * @returns Promise that resolves to true if paths are valid
 */
declare function validateWasmPaths(paths: WasmPaths): Promise<boolean>;

/**
 * Polyline encoding/decoding utilities
 * Supports both polyline5 (1e5) and polyline6 (1e6) precision
 * @packageDocumentation
 * @module polyline
 */
type PolylineFormat = 'polyline5' | 'polyline6';
/** Coordinate pair [longitude, latitude] */
type Coordinate = [number, number];
/** GeoJSON LineString geometry */
interface LineStringGeometry {
    type: 'LineString';
    coordinates: Coordinate[];
}
/**
 * Decode an encoded polyline string into an array of coordinates
 * @param encoded - The encoded polyline string
 * @param format - The polyline format ('polyline5' or 'polyline6')
 * @returns Array of [longitude, latitude] coordinates
 */
declare function decodePolyline(encoded: string, format?: PolylineFormat): Coordinate[];
/**
 * Encode an array of coordinates into a polyline string
 * @param coordinates - Array of [longitude, latitude] coordinates
 * @param format - The polyline format ('polyline5' or 'polyline6')
 * @returns Encoded polyline string
 */
declare function encodePolyline(coordinates: Coordinate[], format?: PolylineFormat): string;
/**
 * Convert polyline coordinates to GeoJSON LineString
 * @param encoded - The encoded polyline string
 * @param format - The polyline format
 * @returns GeoJSON LineString geometry
 */
declare function polylineToGeoJSON(encoded: string, format?: PolylineFormat): LineStringGeometry;
/**
 * Convert GeoJSON LineString to encoded polyline
 * @param geojson - GeoJSON LineString geometry
 * @param format - The polyline format
 * @returns Encoded polyline string
 */
declare function geoJSONToPolyline(geojson: LineStringGeometry, format?: PolylineFormat): string;
/**
 * Calculate the bounding box of a polyline
 * @param encoded - The encoded polyline string
 * @param format - The polyline format
 * @returns Bounding box [minLng, minLat, maxLng, maxLat]
 */
declare function polylineBounds(encoded: string, format?: PolylineFormat): [number, number, number, number];
/**
 * Simplify a polyline using the Douglas-Peucker algorithm
 * @param encoded - The encoded polyline string
 * @param tolerance - Simplification tolerance in degrees
 * @param format - The polyline format
 * @returns Simplified encoded polyline
 */
declare function simplifyPolyline(encoded: string, tolerance?: number, format?: PolylineFormat): string;

/**
 * Geometry utilities for coordinate calculations
 * @packageDocumentation
 * @module geometry
 */

/**
 * Calculate the Haversine distance between two points
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in meters
 */
declare function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
/**
 * Calculate distance between two Location objects
 * @param loc1 - First location
 * @param loc2 - Second location
 * @returns Distance in meters
 */
declare function distanceBetweenLocations(loc1: Location, loc2: Location): number;
/**
 * Calculate the midpoint between two coordinates
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Midpoint [lat, lon]
 */
declare function midpoint(lat1: number, lon1: number, lat2: number, lon2: number): [number, number];
/**
 * Calculate the bearing from one point to another
 * @param lat1 - Latitude of start point
 * @param lon1 - Longitude of start point
 * @param lat2 - Latitude of end point
 * @param lon2 - Longitude of end point
 * @returns Bearing in degrees (0-360)
 */
declare function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number;
/**
 * Calculate a destination point given start, bearing, and distance
 * @param lat - Start latitude
 * @param lon - Start longitude
 * @param bearingDeg - Bearing in degrees
 * @param distanceMeters - Distance in meters
 * @returns Destination [lat, lon]
 */
declare function destinationPoint(lat: number, lon: number, bearingDeg: number, distanceMeters: number): [number, number];
/**
 * Calculate the bounding box for an array of locations
 * @param locations - Array of locations
 * @param padding - Optional padding in meters
 * @returns Bounding box [minLon, minLat, maxLon, maxLat]
 */
declare function boundingBox(locations: Location[], padding?: number): [number, number, number, number];
/**
 * Check if a point is within a bounding box
 * @param lat - Point latitude
 * @param lon - Point longitude
 * @param bbox - Bounding box [minLon, minLat, maxLon, maxLat]
 * @returns True if point is within bounds
 */
declare function isWithinBounds(lat: number, lon: number, bbox: [number, number, number, number]): boolean;
/**
 * Calculate the center point of a bounding box
 * @param bbox - Bounding box [minLon, minLat, maxLon, maxLat]
 * @returns Center [lat, lon]
 */
declare function bboxCenter(bbox: [number, number, number, number]): [number, number];
/**
 * Format a distance for display
 * @param meters - Distance in meters
 * @param units - Units to use
 * @returns Formatted distance string
 */
declare function formatDistance(meters: number, units?: 'kilometers' | 'miles'): string;
/**
 * Format a duration for display
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
declare function formatDuration(seconds: number): string;

/**
 * @jansoft/mbujkanji-valhalla-wasm
 *
 * Valhalla routing engine compiled to WebAssembly for offline-first web applications.
 * Framework-agnostic - works with React, Vue, Svelte, vanilla JS, and Node.js.
 *
 * @example
 * ```typescript
 * import { createRouter } from '@jansoft/mbujkanji-valhalla-wasm'
 *
 * // Create and initialize router (auto-detects WASM paths)
 * const router = createRouter()
 * await router.init()  // No paths needed - auto-detected!
 *
 * // Load your own tiles (BYOT - Bring Your Own Tiles)
 * const response = await fetch('/tiles/my-region.tar')
 * await router.loadTiles(await response.arrayBuffer())
 *
 * // Calculate routes
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
 * console.log(`Duration: ${route.trip.summary.time} seconds`)
 *
 * // Cleanup when done
 * router.dispose()
 * ```
 *
 * @example
 * ```typescript
 * // Custom WASM paths (for advanced use cases)
 * import { createRouter, getWasmPaths } from '@jansoft/mbujkanji-valhalla-wasm'
 *
 * // Get auto-detected paths
 * const paths = getWasmPaths()
 * console.log('WASM path:', paths.wasm)
 * console.log('JS path:', paths.js)
 *
 * // Or provide custom paths
 * const router = createRouter()
 * await router.init({
 *   wasmPath: 'https://cdn.example.com/valhalla.wasm',
 *   jsGluePath: 'https://cdn.example.com/valhalla.js'
 * })
 * ```
 *
 * @packageDocumentation
 */

declare const VERSION = "0.1.0";

export { type AutoCostingOptions, type BicycleCostingOptions, type Coordinate, type CostingModel, type CostingOptions, DEFAULT_WASM_PATHS, type DirectionsType, type LineStringGeometry, type LoadProgress, type Location, type Maneuver, type ManeuverType, type PedestrianCostingOptions, type PolylineFormat, type RouteError, type RouteLeg, type RouteRequest, type RouteResponse, type RouterConfig, type RouterStatus, type TileLoadOptions, type TileSource, type TruckCostingOptions, VERSION, ValhallaError, ValhallaErrorCode, type ValhallaInitOptions, ValhallaRouter, type WasmPaths, bboxCenter, bearing, boundingBox, createError, createRouter, decodePolyline, destinationPoint, distanceBetweenLocations, encodePolyline, formatDistance, formatDuration, geoJSONToPolyline, getWasmPaths, haversineDistance, isBundlerEnvironment, isValhallaError, isWithinBounds, isWorkerEnvironment, midpoint, polylineBounds, polylineToGeoJSON, simplifyPolyline, validateWasmPaths };

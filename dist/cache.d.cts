/**
 * Optional tile caching module using IndexedDB
 * Import separately: import { TileCache } from '@jansoft/mbujkanji-valhalla-wasm/cache'
 *
 * This module is tree-shakeable and only loaded when explicitly imported.
 * Requires 'idb' as an optional peer dependency.
 */
/** Cache entry metadata */
interface CacheEntry {
    /** Source identifier */
    sourceId: string;
    /** Region identifier */
    regionId: string;
    /** When the entry was cached */
    cachedAt: number;
    /** When the entry expires (0 = never) */
    expiresAt: number;
    /** Size in bytes */
    size: number;
    /** Version of the tiles */
    version?: string;
}
/** Cache options */
interface CacheOptions {
    /** Database name */
    dbName?: string;
    /** Store name for tiles */
    storeName?: string;
    /** Default TTL in milliseconds (0 = never expire) */
    defaultTtl?: number;
    /** Maximum cache size in bytes (0 = unlimited) */
    maxSize?: number;
}
/** Cache statistics */
interface CacheStats {
    /** Total entries */
    entryCount: number;
    /** Total size in bytes */
    totalSize: number;
    /** Oldest entry timestamp */
    oldestEntry?: number;
    /** Newest entry timestamp */
    newestEntry?: number;
}
/**
 * TileCache - IndexedDB-based tile caching
 *
 * @example
 * ```typescript
 * import { TileCache } from '@jansoft/mbujkanji-valhalla-wasm/cache'
 *
 * const cache = new TileCache()
 * await cache.init()
 *
 * // Store tiles
 * await cache.put('cameroon', tilesArrayBuffer, {
 *   version: '2024.01',
 *   ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
 * })
 *
 * // Retrieve tiles
 * const tiles = await cache.get('cameroon')
 * if (tiles) {
 *   await router.loadTiles(tiles)
 * }
 * ```
 */
declare class TileCache {
    private options;
    private db;
    private dbPromise;
    constructor(options?: CacheOptions);
    /**
     * Initialize the cache database
     */
    init(): Promise<void>;
    /**
     * Open or create the IndexedDB database
     */
    private openDatabase;
    /**
     * Ensure database is initialized
     */
    private ensureDb;
    /**
     * Store tiles in the cache
     *
     * @param regionId - Unique identifier for the region
     * @param tiles - Tile data as ArrayBuffer
     * @param options - Storage options
     */
    put(regionId: string, tiles: ArrayBuffer, options?: {
        version?: string;
        ttl?: number;
        sourceId?: string;
    }): Promise<void>;
    /**
     * Retrieve tiles from the cache
     *
     * @param regionId - Region identifier
     * @returns Tile data or null if not found/expired
     */
    get(regionId: string): Promise<ArrayBuffer | null>;
    /**
     * Get cache entry metadata
     *
     * @param regionId - Region identifier
     * @returns Cache entry or null
     */
    getEntry(regionId: string): Promise<CacheEntry | null>;
    /**
     * Check if a region is cached (and not expired)
     *
     * @param regionId - Region identifier
     * @returns True if cached and valid
     */
    has(regionId: string): Promise<boolean>;
    /**
     * Delete a cached region
     *
     * @param regionId - Region identifier
     */
    delete(regionId: string): Promise<void>;
    /**
     * Clear all cached tiles
     */
    clear(): Promise<void>;
    /**
     * List all cached regions
     *
     * @returns Array of cache entries
     */
    list(): Promise<CacheEntry[]>;
    /**
     * Get cache statistics
     *
     * @returns Cache statistics
     */
    getStats(): Promise<CacheStats>;
    /**
     * Evict old entries to make room for new data
     *
     * @param bytesNeeded - Bytes to free up
     */
    private evictToFit;
    /**
     * Remove expired entries
     *
     * @returns Number of entries removed
     */
    cleanup(): Promise<number>;
    /**
     * Close the database connection
     */
    close(): void;
}
/**
 * Create a new TileCache instance
 *
 * @param options - Cache options
 * @returns New TileCache instance
 */
declare function createTileCache(options?: CacheOptions): TileCache;

export { type CacheEntry, type CacheOptions, type CacheStats, TileCache, createTileCache };

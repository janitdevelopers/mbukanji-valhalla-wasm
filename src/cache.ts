/**
 * Optional tile caching module using IndexedDB
 * Import separately: import { TileCache } from '@jansoft/mbujkanji-valhalla-wasm/cache'
 *
 * This module is tree-shakeable and only loaded when explicitly imported.
 * Requires 'idb' as an optional peer dependency.
 */

/** Cache entry metadata */
export interface CacheEntry {
  /** Source identifier */
  sourceId: string
  /** Region identifier */
  regionId: string
  /** When the entry was cached */
  cachedAt: number
  /** When the entry expires (0 = never) */
  expiresAt: number
  /** Size in bytes */
  size: number
  /** Version of the tiles */
  version?: string
}

/** Cache options */
export interface CacheOptions {
  /** Database name */
  dbName?: string
  /** Store name for tiles */
  storeName?: string
  /** Default TTL in milliseconds (0 = never expire) */
  defaultTtl?: number
  /** Maximum cache size in bytes (0 = unlimited) */
  maxSize?: number
}

/** Cache statistics */
export interface CacheStats {
  /** Total entries */
  entryCount: number
  /** Total size in bytes */
  totalSize: number
  /** Oldest entry timestamp */
  oldestEntry?: number
  /** Newest entry timestamp */
  newestEntry?: number
}

const DEFAULT_OPTIONS: Required<CacheOptions> = {
  dbName: 'valhalla-tiles',
  storeName: 'tiles',
  defaultTtl: 0,
  maxSize: 0,
}

/**
 * TileCache - IndexedDB-based tile caching
 *
 * @example
 * ```typescript
 * import { TileCache } from '@mbujkanji/valhalla-wasm/cache'
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
export class TileCache {
  private options: Required<CacheOptions>
  private db: IDBDatabase | null = null
  private dbPromise: Promise<IDBDatabase> | null = null

  constructor(options: CacheOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Initialize the cache database
   */
  async init(): Promise<void> {
    if (this.db) return

    if (this.dbPromise) {
      await this.dbPromise
      return
    }

    this.dbPromise = this.openDatabase()
    this.db = await this.dbPromise
  }

  /**
   * Open or create the IndexedDB database
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.options.dbName, 1)

      request.onerror = () => {
        reject(new Error(`Failed to open cache database: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create tiles store
        if (!db.objectStoreNames.contains(this.options.storeName)) {
          const store = db.createObjectStore(this.options.storeName, {
            keyPath: 'regionId',
          })
          store.createIndex('cachedAt', 'cachedAt', { unique: false })
          store.createIndex('expiresAt', 'expiresAt', { unique: false })
        }

        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'regionId' })
        }
      }
    })
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDb(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init()
    }
    return this.db!
  }

  /**
   * Store tiles in the cache
   *
   * @param regionId - Unique identifier for the region
   * @param tiles - Tile data as ArrayBuffer
   * @param options - Storage options
   */
  async put(
    regionId: string,
    tiles: ArrayBuffer,
    options: {
      version?: string
      ttl?: number
      sourceId?: string
    } = {}
  ): Promise<void> {
    const db = await this.ensureDb()
    const { version, ttl = this.options.defaultTtl, sourceId = 'default' } = options

    const now = Date.now()
    const entry: CacheEntry = {
      sourceId,
      regionId,
      cachedAt: now,
      expiresAt: ttl > 0 ? now + ttl : 0,
      size: tiles.byteLength,
      version,
    }

    // Check max size limit
    if (this.options.maxSize > 0) {
      const stats = await this.getStats()
      const newTotal = stats.totalSize + tiles.byteLength

      if (newTotal > this.options.maxSize) {
        // Need to evict old entries
        await this.evictToFit(tiles.byteLength)
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [this.options.storeName, 'metadata'],
        'readwrite'
      )

      transaction.onerror = () => {
        reject(new Error(`Failed to store tiles: ${transaction.error?.message}`))
      }

      transaction.oncomplete = () => {
        resolve()
      }

      // Store tile data
      const tileStore = transaction.objectStore(this.options.storeName)
      tileStore.put({ regionId, data: tiles })

      // Store metadata
      const metaStore = transaction.objectStore('metadata')
      metaStore.put(entry)
    })
  }

  /**
   * Retrieve tiles from the cache
   *
   * @param regionId - Region identifier
   * @returns Tile data or null if not found/expired
   */
  async get(regionId: string): Promise<ArrayBuffer | null> {
    const db = await this.ensureDb()

    // Check metadata first
    const entry = await this.getEntry(regionId)
    if (!entry) return null

    // Check expiration
    if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
      // Entry expired, remove it
      await this.delete(regionId)
      return null
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.options.storeName, 'readonly')
      const store = transaction.objectStore(this.options.storeName)
      const request = store.get(regionId)

      request.onerror = () => {
        reject(new Error(`Failed to retrieve tiles: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        const result = request.result
        resolve(result?.data || null)
      }
    })
  }

  /**
   * Get cache entry metadata
   *
   * @param regionId - Region identifier
   * @returns Cache entry or null
   */
  async getEntry(regionId: string): Promise<CacheEntry | null> {
    const db = await this.ensureDb()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('metadata', 'readonly')
      const store = transaction.objectStore('metadata')
      const request = store.get(regionId)

      request.onerror = () => {
        reject(new Error(`Failed to get entry: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve(request.result || null)
      }
    })
  }

  /**
   * Check if a region is cached (and not expired)
   *
   * @param regionId - Region identifier
   * @returns True if cached and valid
   */
  async has(regionId: string): Promise<boolean> {
    const entry = await this.getEntry(regionId)
    if (!entry) return false

    if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
      return false
    }

    return true
  }

  /**
   * Delete a cached region
   *
   * @param regionId - Region identifier
   */
  async delete(regionId: string): Promise<void> {
    const db = await this.ensureDb()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [this.options.storeName, 'metadata'],
        'readwrite'
      )

      transaction.onerror = () => {
        reject(new Error(`Failed to delete: ${transaction.error?.message}`))
      }

      transaction.oncomplete = () => {
        resolve()
      }

      transaction.objectStore(this.options.storeName).delete(regionId)
      transaction.objectStore('metadata').delete(regionId)
    })
  }

  /**
   * Clear all cached tiles
   */
  async clear(): Promise<void> {
    const db = await this.ensureDb()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [this.options.storeName, 'metadata'],
        'readwrite'
      )

      transaction.onerror = () => {
        reject(new Error(`Failed to clear cache: ${transaction.error?.message}`))
      }

      transaction.oncomplete = () => {
        resolve()
      }

      transaction.objectStore(this.options.storeName).clear()
      transaction.objectStore('metadata').clear()
    })
  }

  /**
   * List all cached regions
   *
   * @returns Array of cache entries
   */
  async list(): Promise<CacheEntry[]> {
    const db = await this.ensureDb()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('metadata', 'readonly')
      const store = transaction.objectStore('metadata')
      const request = store.getAll()

      request.onerror = () => {
        reject(new Error(`Failed to list entries: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve(request.result || [])
      }
    })
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const entries = await this.list()

    let totalSize = 0
    let oldestEntry: number | undefined
    let newestEntry: number | undefined

    for (const entry of entries) {
      totalSize += entry.size

      if (oldestEntry === undefined || entry.cachedAt < oldestEntry) {
        oldestEntry = entry.cachedAt
      }

      if (newestEntry === undefined || entry.cachedAt > newestEntry) {
        newestEntry = entry.cachedAt
      }
    }

    return {
      entryCount: entries.length,
      totalSize,
      oldestEntry,
      newestEntry,
    }
  }

  /**
   * Evict old entries to make room for new data
   *
   * @param bytesNeeded - Bytes to free up
   */
  private async evictToFit(bytesNeeded: number): Promise<void> {
    const entries = await this.list()
    
    // Sort by cachedAt (oldest first)
    entries.sort((a, b) => a.cachedAt - b.cachedAt)

    let freedBytes = 0
    const toDelete: string[] = []

    for (const entry of entries) {
      toDelete.push(entry.regionId)
      freedBytes += entry.size

      if (freedBytes >= bytesNeeded) {
        break
      }
    }

    // Delete entries
    for (const regionId of toDelete) {
      await this.delete(regionId)
    }
  }

  /**
   * Remove expired entries
   *
   * @returns Number of entries removed
   */
  async cleanup(): Promise<number> {
    const entries = await this.list()
    const now = Date.now()
    let removed = 0

    for (const entry of entries) {
      if (entry.expiresAt > 0 && entry.expiresAt < now) {
        await this.delete(entry.regionId)
        removed++
      }
    }

    return removed
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
    this.dbPromise = null
  }
}

/**
 * Create a new TileCache instance
 *
 * @param options - Cache options
 * @returns New TileCache instance
 */
export function createTileCache(options?: CacheOptions): TileCache {
  return new TileCache(options)
}

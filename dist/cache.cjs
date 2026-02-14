'use strict';

// src/cache.ts
var DEFAULT_OPTIONS = {
  dbName: "valhalla-tiles",
  storeName: "tiles",
  defaultTtl: 0,
  maxSize: 0
};
var TileCache = class {
  constructor(options = {}) {
    this.db = null;
    this.dbPromise = null;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  /**
   * Initialize the cache database
   */
  async init() {
    if (this.db)
      return;
    if (this.dbPromise) {
      await this.dbPromise;
      return;
    }
    this.dbPromise = this.openDatabase();
    this.db = await this.dbPromise;
  }
  /**
   * Open or create the IndexedDB database
   */
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.options.dbName, 1);
      request.onerror = () => {
        reject(new Error(`Failed to open cache database: ${request.error?.message}`));
      };
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.options.storeName)) {
          const store = db.createObjectStore(this.options.storeName, {
            keyPath: "regionId"
          });
          store.createIndex("cachedAt", "cachedAt", { unique: false });
          store.createIndex("expiresAt", "expiresAt", { unique: false });
        }
        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata", { keyPath: "regionId" });
        }
      };
    });
  }
  /**
   * Ensure database is initialized
   */
  async ensureDb() {
    if (!this.db) {
      await this.init();
    }
    return this.db;
  }
  /**
   * Store tiles in the cache
   *
   * @param regionId - Unique identifier for the region
   * @param tiles - Tile data as ArrayBuffer
   * @param options - Storage options
   */
  async put(regionId, tiles, options = {}) {
    const db = await this.ensureDb();
    const { version, ttl = this.options.defaultTtl, sourceId = "default" } = options;
    const now = Date.now();
    const entry = {
      sourceId,
      regionId,
      cachedAt: now,
      expiresAt: ttl > 0 ? now + ttl : 0,
      size: tiles.byteLength,
      version
    };
    if (this.options.maxSize > 0) {
      const stats = await this.getStats();
      const newTotal = stats.totalSize + tiles.byteLength;
      if (newTotal > this.options.maxSize) {
        await this.evictToFit(tiles.byteLength);
      }
    }
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [this.options.storeName, "metadata"],
        "readwrite"
      );
      transaction.onerror = () => {
        reject(new Error(`Failed to store tiles: ${transaction.error?.message}`));
      };
      transaction.oncomplete = () => {
        resolve();
      };
      const tileStore = transaction.objectStore(this.options.storeName);
      tileStore.put({ regionId, data: tiles });
      const metaStore = transaction.objectStore("metadata");
      metaStore.put(entry);
    });
  }
  /**
   * Retrieve tiles from the cache
   *
   * @param regionId - Region identifier
   * @returns Tile data or null if not found/expired
   */
  async get(regionId) {
    const db = await this.ensureDb();
    const entry = await this.getEntry(regionId);
    if (!entry)
      return null;
    if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
      await this.delete(regionId);
      return null;
    }
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.options.storeName, "readonly");
      const store = transaction.objectStore(this.options.storeName);
      const request = store.get(regionId);
      request.onerror = () => {
        reject(new Error(`Failed to retrieve tiles: ${request.error?.message}`));
      };
      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.data || null);
      };
    });
  }
  /**
   * Get cache entry metadata
   *
   * @param regionId - Region identifier
   * @returns Cache entry or null
   */
  async getEntry(regionId) {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("metadata", "readonly");
      const store = transaction.objectStore("metadata");
      const request = store.get(regionId);
      request.onerror = () => {
        reject(new Error(`Failed to get entry: ${request.error?.message}`));
      };
      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }
  /**
   * Check if a region is cached (and not expired)
   *
   * @param regionId - Region identifier
   * @returns True if cached and valid
   */
  async has(regionId) {
    const entry = await this.getEntry(regionId);
    if (!entry)
      return false;
    if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
      return false;
    }
    return true;
  }
  /**
   * Delete a cached region
   *
   * @param regionId - Region identifier
   */
  async delete(regionId) {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [this.options.storeName, "metadata"],
        "readwrite"
      );
      transaction.onerror = () => {
        reject(new Error(`Failed to delete: ${transaction.error?.message}`));
      };
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.objectStore(this.options.storeName).delete(regionId);
      transaction.objectStore("metadata").delete(regionId);
    });
  }
  /**
   * Clear all cached tiles
   */
  async clear() {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [this.options.storeName, "metadata"],
        "readwrite"
      );
      transaction.onerror = () => {
        reject(new Error(`Failed to clear cache: ${transaction.error?.message}`));
      };
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.objectStore(this.options.storeName).clear();
      transaction.objectStore("metadata").clear();
    });
  }
  /**
   * List all cached regions
   *
   * @returns Array of cache entries
   */
  async list() {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("metadata", "readonly");
      const store = transaction.objectStore("metadata");
      const request = store.getAll();
      request.onerror = () => {
        reject(new Error(`Failed to list entries: ${request.error?.message}`));
      };
      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }
  /**
   * Get cache statistics
   *
   * @returns Cache statistics
   */
  async getStats() {
    const entries = await this.list();
    let totalSize = 0;
    let oldestEntry;
    let newestEntry;
    for (const entry of entries) {
      totalSize += entry.size;
      if (oldestEntry === void 0 || entry.cachedAt < oldestEntry) {
        oldestEntry = entry.cachedAt;
      }
      if (newestEntry === void 0 || entry.cachedAt > newestEntry) {
        newestEntry = entry.cachedAt;
      }
    }
    return {
      entryCount: entries.length,
      totalSize,
      oldestEntry,
      newestEntry
    };
  }
  /**
   * Evict old entries to make room for new data
   *
   * @param bytesNeeded - Bytes to free up
   */
  async evictToFit(bytesNeeded) {
    const entries = await this.list();
    entries.sort((a, b) => a.cachedAt - b.cachedAt);
    let freedBytes = 0;
    const toDelete = [];
    for (const entry of entries) {
      toDelete.push(entry.regionId);
      freedBytes += entry.size;
      if (freedBytes >= bytesNeeded) {
        break;
      }
    }
    for (const regionId of toDelete) {
      await this.delete(regionId);
    }
  }
  /**
   * Remove expired entries
   *
   * @returns Number of entries removed
   */
  async cleanup() {
    const entries = await this.list();
    const now = Date.now();
    let removed = 0;
    for (const entry of entries) {
      if (entry.expiresAt > 0 && entry.expiresAt < now) {
        await this.delete(entry.regionId);
        removed++;
      }
    }
    return removed;
  }
  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.dbPromise = null;
  }
};
function createTileCache(options) {
  return new TileCache(options);
}

exports.TileCache = TileCache;
exports.createTileCache = createTileCache;
//# sourceMappingURL=out.js.map
//# sourceMappingURL=cache.cjs.map
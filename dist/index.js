var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/types/errors.ts
var ValhallaError = class _ValhallaError extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "ValhallaError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _ValhallaError);
    }
  }
};
var ValhallaErrorCode = /* @__PURE__ */ ((ValhallaErrorCode2) => {
  ValhallaErrorCode2[ValhallaErrorCode2["WASM_LOAD_FAILED"] = 100] = "WASM_LOAD_FAILED";
  ValhallaErrorCode2[ValhallaErrorCode2["WASM_INIT_FAILED"] = 101] = "WASM_INIT_FAILED";
  ValhallaErrorCode2[ValhallaErrorCode2["WASM_NOT_SUPPORTED"] = 102] = "WASM_NOT_SUPPORTED";
  ValhallaErrorCode2[ValhallaErrorCode2["TILES_NOT_LOADED"] = 200] = "TILES_NOT_LOADED";
  ValhallaErrorCode2[ValhallaErrorCode2["TILES_LOAD_FAILED"] = 201] = "TILES_LOAD_FAILED";
  ValhallaErrorCode2[ValhallaErrorCode2["TILES_INVALID_FORMAT"] = 202] = "TILES_INVALID_FORMAT";
  ValhallaErrorCode2[ValhallaErrorCode2["TILES_REGION_NOT_FOUND"] = 203] = "TILES_REGION_NOT_FOUND";
  ValhallaErrorCode2[ValhallaErrorCode2["ROUTE_NOT_FOUND"] = 300] = "ROUTE_NOT_FOUND";
  ValhallaErrorCode2[ValhallaErrorCode2["ROUTE_INVALID_REQUEST"] = 301] = "ROUTE_INVALID_REQUEST";
  ValhallaErrorCode2[ValhallaErrorCode2["ROUTE_LOCATION_NOT_FOUND"] = 302] = "ROUTE_LOCATION_NOT_FOUND";
  ValhallaErrorCode2[ValhallaErrorCode2["ROUTE_NO_PATH"] = 303] = "ROUTE_NO_PATH";
  ValhallaErrorCode2[ValhallaErrorCode2["ROUTE_LOCATIONS_TOO_CLOSE"] = 304] = "ROUTE_LOCATIONS_TOO_CLOSE";
  ValhallaErrorCode2[ValhallaErrorCode2["ROUTE_LOCATIONS_TOO_FAR"] = 305] = "ROUTE_LOCATIONS_TOO_FAR";
  ValhallaErrorCode2[ValhallaErrorCode2["NOT_INITIALIZED"] = 900] = "NOT_INITIALIZED";
  ValhallaErrorCode2[ValhallaErrorCode2["INVALID_ARGUMENT"] = 901] = "INVALID_ARGUMENT";
  ValhallaErrorCode2[ValhallaErrorCode2["INTERNAL_ERROR"] = 999] = "INTERNAL_ERROR";
  return ValhallaErrorCode2;
})(ValhallaErrorCode || {});
var ERROR_MESSAGES = {
  [100 /* WASM_LOAD_FAILED */]: "Failed to load WASM module",
  [101 /* WASM_INIT_FAILED */]: "Failed to initialize WASM module",
  [102 /* WASM_NOT_SUPPORTED */]: "WebAssembly is not supported in this environment",
  [200 /* TILES_NOT_LOADED */]: "No routing tiles loaded. Call loadTiles() first.",
  [201 /* TILES_LOAD_FAILED */]: "Failed to load routing tiles",
  [202 /* TILES_INVALID_FORMAT */]: "Invalid tile format",
  [203 /* TILES_REGION_NOT_FOUND */]: "Requested region not found in tiles",
  [300 /* ROUTE_NOT_FOUND */]: "No route found between locations",
  [301 /* ROUTE_INVALID_REQUEST */]: "Invalid route request",
  [302 /* ROUTE_LOCATION_NOT_FOUND */]: "One or more locations could not be found on the road network",
  [303 /* ROUTE_NO_PATH */]: "No path could be found for input",
  [304 /* ROUTE_LOCATIONS_TOO_CLOSE */]: "Locations are too close together",
  [305 /* ROUTE_LOCATIONS_TOO_FAR */]: "Locations are too far apart for the routing tiles loaded",
  [900 /* NOT_INITIALIZED */]: "Router not initialized. Call init() first.",
  [901 /* INVALID_ARGUMENT */]: "Invalid argument provided",
  [999 /* INTERNAL_ERROR */]: "An internal error occurred"
};
function createError(code, customMessage, details) {
  const message = customMessage || ERROR_MESSAGES[code];
  return new ValhallaError(message, code, details);
}
function isValhallaError(error) {
  return error instanceof ValhallaError;
}
function mapApiErrorCode(apiCode) {
  switch (apiCode) {
    case 106:
    case 107:
      return 302 /* ROUTE_LOCATION_NOT_FOUND */;
    case 170:
    case 171:
    case 172:
      return 303 /* ROUTE_NO_PATH */;
    case 154:
      return 304 /* ROUTE_LOCATIONS_TOO_CLOSE */;
    default:
      if (apiCode >= 100 && apiCode < 200) {
        return 301 /* ROUTE_INVALID_REQUEST */;
      }
      return 999 /* INTERNAL_ERROR */;
  }
}

// src/internal/wasm-paths.ts
function isBundlerEnvironment() {
  if (typeof process === "undefined") {
    return false;
  }
  return !!(process.env.VITE || process.env.WEBPACK || process.env.ROLLUP || process.env.NEXT_PUBLIC || // Check for common bundler variables
  typeof process.env !== "undefined" && Object.keys(process.env).some(
    (key) => key.includes("VITE") || key.includes("WEBPACK") || key.includes("ROLLUP")
  ));
}
function isWorkerEnvironment() {
  if (typeof self !== "undefined" && typeof window === "undefined") {
    return typeof importScripts !== "undefined" || typeof WorkerGlobalScope !== "undefined" || self.WorkerGlobalScope !== void 0;
  }
  return false;
}
function getBaseUrl() {
  try {
    if (typeof import.meta !== "undefined" && import.meta.url) {
      if (isWorkerEnvironment()) {
        try {
          if (typeof self !== "undefined" && self.location) {
            const workerLocation = self.location;
            if (workerLocation) {
              return new URL(".", workerLocation.href).href;
            }
          }
        } catch {
        }
      }
      return new URL(".", import.meta.url).href;
    }
  } catch {
  }
  if (typeof __dirname !== "undefined") {
    const { fileURLToPath } = __require("url");
    const { dirname } = __require("path");
    try {
      return new URL(".", `file://${__dirname}/`).href;
    } catch {
      return `file://${__dirname}/`;
    }
  }
  if (typeof document !== "undefined" && document.currentScript) {
    const script = document.currentScript;
    if (script.src) {
      return new URL(".", script.src).href;
    }
  }
  if (isWorkerEnvironment() && typeof self !== "undefined") {
    try {
      const workerSelf = self;
      if (workerSelf.location) {
        return new URL(".", workerSelf.location.href).href;
      }
    } catch {
    }
  }
  return "./";
}
function getWasmPaths(customBase) {
  if (customBase) {
    const base = customBase.endsWith("/") ? customBase : `${customBase}/`;
    return {
      wasm: `${base}valhalla.wasm`,
      js: `${base}valhalla.js`
    };
  }
  const baseUrl = getBaseUrl();
  if (typeof process !== "undefined" && process.versions?.node && baseUrl.startsWith("file://")) {
    try {
      let fileURLToPath;
      let join;
      let dirname;
      if (typeof __require !== "undefined") {
        const nodeUrl = __require("url");
        const nodePath = __require("path");
        fileURLToPath = nodeUrl.fileURLToPath;
        join = nodePath.join;
        dirname = nodePath.dirname;
        const basePath = dirname(fileURLToPath(baseUrl));
        const distPath = join(basePath, "..", "dist");
        return {
          wasm: join(distPath, "valhalla.wasm"),
          js: join(distPath, "valhalla.js")
        };
      }
    } catch {
    }
  }
  try {
    return {
      wasm: new URL("valhalla.wasm", baseUrl).href,
      js: new URL("valhalla.js", baseUrl).href
    };
  } catch {
    return {
      wasm: "./valhalla.wasm",
      js: "./valhalla.js"
    };
  }
}
var DEFAULT_WASM_PATHS = getWasmPaths();
async function validateWasmPaths(paths) {
  try {
    if (typeof fetch !== "undefined") {
      const response = await fetch(paths.wasm, { method: "HEAD" });
      return response.ok;
    }
    if (typeof process !== "undefined" && process.versions?.node) {
      const { existsSync } = __require("fs");
      return existsSync(paths.wasm);
    }
    return true;
  } catch {
    return false;
  }
}

// src/internal/wasm-loader.ts
var wasmModule = null;
var wasmInitPromise = null;
function isWasmSupported() {
  try {
    if (typeof WebAssembly === "object") {
      if (typeof WebAssembly.instantiateStreaming === "function") {
        return true;
      }
      if (typeof WebAssembly.instantiate === "function") {
        return true;
      }
    }
  } catch {
  }
  return false;
}
function reportProgress(onProgress, phase, percent, message, bytesLoaded, bytesTotal) {
  if (onProgress) {
    onProgress({
      phase,
      percent,
      message,
      bytesLoaded,
      bytesTotal
    });
  }
}
async function loadWasmWithProgress(wasmPath, fetchFn, onProgress) {
  reportProgress(onProgress, "wasm", 0, "Starting WASM download...");
  let response;
  try {
    response = await fetchFn(wasmPath);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    let helpfulMessage = `Failed to load WASM from: ${wasmPath}
`;
    if (errorMessage.includes("CORS") || errorMessage.includes("cross-origin")) {
      helpfulMessage += "\nCORS Error: The WASM file cannot be loaded due to CORS restrictions.\n";
      helpfulMessage += "Solutions:\n";
      helpfulMessage += "  1. Ensure your server sends proper CORS headers\n";
      helpfulMessage += "  2. Use a bundler (Vite, Webpack) that handles WASM files automatically\n";
      helpfulMessage += "  3. Copy WASM files to your public folder and reference them there\n";
    } else if (errorMessage.includes("Failed to fetch") || errorMessage.includes("network")) {
      helpfulMessage += "\nNetwork Error: Could not fetch the WASM file.\n";
      helpfulMessage += "Solutions:\n";
      helpfulMessage += "  1. Check that the WASM file exists at the specified path\n";
      helpfulMessage += "  2. Verify the path is correct (use getWasmPaths() to see auto-detected paths)\n";
      helpfulMessage += "  3. For Node.js, ensure fetch is available (Node 18+ or provide fetch polyfill)\n";
    } else {
      helpfulMessage += `
Error: ${errorMessage}
`;
    }
    throw createError(100 /* WASM_LOAD_FAILED */, helpfulMessage);
  }
  if (!response.ok) {
    let errorMessage = `Failed to fetch WASM: ${response.status} ${response.statusText}
`;
    errorMessage += `Path: ${wasmPath}
`;
    if (response.status === 404) {
      errorMessage += "\nFile not found. Possible solutions:\n";
      errorMessage += '  1. Run "npm run build:wasm" to build WASM files\n';
      errorMessage += "  2. Ensure WASM files are copied to dist/ during build\n";
      errorMessage += "  3. Check that the path is correct\n";
    } else if (response.status === 403) {
      errorMessage += "\nAccess forbidden. Check file permissions and CORS settings.\n";
    }
    throw createError(100 /* WASM_LOAD_FAILED */, errorMessage);
  }
  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : void 0;
  if (!response.body) {
    const buffer2 = await response.arrayBuffer();
    reportProgress(onProgress, "wasm", 100, "WASM downloaded", buffer2.byteLength, buffer2.byteLength);
    return buffer2;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done)
      break;
    chunks.push(value);
    loaded += value.length;
    const percent = total ? Math.round(loaded / total * 100) : 0;
    reportProgress(onProgress, "wasm", percent, "Downloading WASM...", loaded, total);
  }
  const buffer = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  reportProgress(onProgress, "wasm", 100, "WASM downloaded", loaded, total);
  return buffer.buffer;
}
async function loadWasmModule(options = {}) {
  if (wasmModule) {
    return wasmModule;
  }
  if (wasmInitPromise) {
    return wasmInitPromise;
  }
  wasmInitPromise = doLoadWasmModule(options);
  try {
    wasmModule = await wasmInitPromise;
    return wasmModule;
  } catch (error) {
    wasmInitPromise = null;
    throw error;
  }
}
async function doLoadWasmModule(options) {
  const defaultPaths = getWasmPaths();
  const {
    wasmPath = defaultPaths.wasm,
    jsGluePath,
    // Only use default if not explicitly provided
    fetchFn = fetch,
    onProgress,
    onError,
    onReady
  } = options;
  const resolvedJsGluePath = jsGluePath ?? defaultPaths.js;
  if (!isWasmSupported()) {
    const error = createError(102 /* WASM_NOT_SUPPORTED */);
    onError?.(error);
    throw error;
  }
  try {
    reportProgress(onProgress, "init", 0, "Initializing WASM...");
    if (resolvedJsGluePath) {
      reportProgress(onProgress, "init", 10, "Loading WASM glue code...");
      const glueModule = await import(
        /* @vite-ignore */
        /* webpackIgnore: true */
        resolvedJsGluePath
      );
      const factory = glueModule.default || glueModule;
      reportProgress(onProgress, "init", 30, "Instantiating WASM module...");
      const module = await factory({
        locateFile: (path) => {
          if (path.endsWith(".wasm")) {
            return wasmPath;
          }
          return path;
        },
        print: (text) => {
          if (options.memory?.initial) {
            console.log("[Valhalla]", text);
          }
        },
        printErr: (text) => {
          console.error("[Valhalla]", text);
        }
      });
      if (module.ready) {
        await module.ready;
      }
      reportProgress(onProgress, "init", 100, "WASM ready");
      onReady?.();
      return module;
    }
    reportProgress(onProgress, "wasm", 0, "Loading WASM module...");
    const wasmBuffer = await loadWasmWithProgress(wasmPath, fetchFn, onProgress);
    reportProgress(onProgress, "init", 50, "Compiling WASM...");
    const { instance } = await WebAssembly.instantiate(wasmBuffer, {
      env: {
        // Minimal environment - real implementation needs proper Emscripten env
        memory: new WebAssembly.Memory({
          initial: options.memory?.initial || 256,
          maximum: options.memory?.maximum || 4096
        }),
        __memory_base: 0,
        __table_base: 0,
        abort: () => {
          throw new Error("WASM abort");
        }
      }
    });
    reportProgress(onProgress, "init", 100, "WASM ready");
    onReady?.();
    return instance.exports;
  } catch (error) {
    const valhallaError = error instanceof ValhallaError ? error : createError(
      101 /* WASM_INIT_FAILED */,
      error instanceof Error ? error.message : "Unknown error during WASM initialization"
    );
    onError?.(valhallaError);
    throw valhallaError;
  }
}
function resetWasmModule() {
  wasmModule = null;
  wasmInitPromise = null;
}
function copyToWasmMemory(module, data) {
  const ptr = module._malloc(data.length);
  module.HEAPU8.set(data, ptr);
  return ptr;
}
function freeWasmMemory(module, ptr) {
  module._free(ptr);
}

// src/internal/logger.ts
var LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4
};
var config = {
  level: "none",
  prefix: "[valhalla-wasm]"
};
function isEnabled(level) {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.level];
}
function createLogFn(level, consoleFn) {
  return (...args) => {
    if (isEnabled(level)) {
      consoleFn(config.prefix, ...args);
    }
  };
}
var logger = {
  debug: createLogFn("debug", console.debug),
  info: createLogFn("info", console.info),
  warn: createLogFn("warn", console.warn),
  error: createLogFn("error", console.error),
  /** Set log level */
  setLevel(level) {
    config.level = level;
  },
  /** Get current log level */
  getLevel() {
    return config.level;
  }
};

// src/valhalla-router.ts
var DEFAULT_CONFIG = {
  defaultCosting: "auto",
  defaultUnits: "kilometers",
  defaultLanguage: "en-US",
  defaultShapeFormat: "polyline6",
  verbose: false
};
var ValhallaRouter = class {
  constructor(config2 = {}) {
    this.module = null;
    this.tilesLoaded = false;
    this.loadedRegions = [];
    this.initialized = false;
    this.config = { ...DEFAULT_CONFIG, ...config2 };
    if (this.config.verbose) {
      logger.setLevel("debug");
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
  async init(options = {}) {
    if (this.initialized) {
      logger.warn("Router already initialized");
      return;
    }
    logger.info("Initializing Valhalla router...");
    try {
      this.module = await loadWasmModule(options);
      this.initialized = true;
      logger.info("Router initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize router:", error);
      throw error;
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
  async loadTiles(tiles, options = {}) {
    this.ensureInitialized();
    const { onProgress, validate = true, regionId } = options;
    logger.info("Loading tiles...", { size: tiles.byteLength, regionId });
    onProgress?.({
      phase: "tiles",
      percent: 0,
      message: "Preparing tiles...",
      bytesTotal: tiles.byteLength
    });
    try {
      const tilesArray = new Uint8Array(tiles);
      const ptr = copyToWasmMemory(this.module, tilesArray);
      onProgress?.({
        phase: "tiles",
        percent: 50,
        message: "Loading tiles into router...",
        bytesLoaded: tiles.byteLength,
        bytesTotal: tiles.byteLength
      });
      const success = this.module.loadTiles(tiles, tiles.byteLength);
      freeWasmMemory(this.module, ptr);
      if (!success) {
        throw createError(201 /* TILES_LOAD_FAILED */);
      }
      if (validate && !this.module.hasTiles()) {
        throw createError(
          202 /* TILES_INVALID_FORMAT */,
          "Tiles loaded but router reports no tiles available"
        );
      }
      this.tilesLoaded = true;
      if (regionId) {
        this.loadedRegions.push(regionId);
      }
      onProgress?.({
        phase: "tiles",
        percent: 100,
        message: "Tiles loaded successfully",
        bytesLoaded: tiles.byteLength,
        bytesTotal: tiles.byteLength
      });
      logger.info("Tiles loaded successfully", { regionId });
    } catch (error) {
      logger.error("Failed to load tiles:", error);
      if (error instanceof ValhallaError) {
        throw error;
      }
      throw createError(
        201 /* TILES_LOAD_FAILED */,
        error instanceof Error ? error.message : "Unknown error loading tiles"
      );
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
  async loadTilesFromUrl(url, options = {}) {
    const { fetchFn = fetch, onProgress, ...loadOptions } = options;
    logger.info("Fetching tiles from URL...", { url });
    onProgress?.({
      phase: "tiles",
      percent: 0,
      message: "Downloading tiles..."
    });
    const response = await fetchFn(url);
    if (!response.ok) {
      throw createError(
        201 /* TILES_LOAD_FAILED */,
        `Failed to fetch tiles: ${response.status} ${response.statusText}`
      );
    }
    const contentLength = response.headers.get("content-length");
    const total = contentLength ? parseInt(contentLength, 10) : void 0;
    let tiles;
    if (response.body && total) {
      const reader = response.body.getReader();
      const chunks = [];
      let loaded = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done)
          break;
        chunks.push(value);
        loaded += value.length;
        onProgress?.({
          phase: "tiles",
          percent: Math.round(loaded / total * 50),
          // 0-50% for download
          message: "Downloading tiles...",
          bytesLoaded: loaded,
          bytesTotal: total
        });
      }
      const combined = new Uint8Array(loaded);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      tiles = combined.buffer;
    } else {
      tiles = await response.arrayBuffer();
    }
    await this.loadTiles(tiles, {
      ...loadOptions,
      onProgress: (p) => {
        onProgress?.({
          ...p,
          percent: 50 + Math.round(p.percent / 2)
        });
      }
    });
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
  async route(request) {
    this.ensureInitialized();
    this.ensureTilesLoaded();
    this.validateRouteRequest(request);
    const fullRequest = this.applyDefaults(request);
    logger.debug("Calculating route...", {
      from: fullRequest.locations[0],
      to: fullRequest.locations[fullRequest.locations.length - 1],
      costing: fullRequest.costing
    });
    try {
      const requestJson = JSON.stringify(fullRequest);
      const responseJson = this.module.route(requestJson);
      const response = JSON.parse(responseJson);
      if (response.error_code !== void 0) {
        const errorResponse = response;
        throw createError(
          mapApiErrorCode(errorResponse.error_code),
          errorResponse.error,
          { error_code: errorResponse.error_code }
        );
      }
      logger.debug("Route calculated", {
        distance: response.trip?.summary?.length,
        time: response.trip?.summary?.time
      });
      return response;
    } catch (error) {
      if (error instanceof ValhallaError) {
        throw error;
      }
      logger.error("Route calculation failed:", error);
      throw createError(
        999 /* INTERNAL_ERROR */,
        error instanceof Error ? error.message : "Unknown error during routing"
      );
    }
  }
  /**
   * Get the current router status
   *
   * @returns Router status information
   */
  getStatus() {
    return {
      wasmLoaded: this.initialized && this.module !== null,
      tilesLoaded: this.tilesLoaded,
      ready: this.initialized && this.tilesLoaded,
      loadedRegions: [...this.loadedRegions],
      memoryUsage: this.module?.getMemoryUsage?.(),
      version: this.module?.getVersion?.()
    };
  }
  /**
   * Check if the router is ready for routing
   *
   * @returns True if router is initialized and has tiles loaded
   */
  isReady() {
    return this.initialized && this.tilesLoaded;
  }
  /**
   * Clear loaded tiles from memory
   */
  clearTiles() {
    if (this.module?.clearTiles) {
      this.module.clearTiles();
    }
    this.tilesLoaded = false;
    this.loadedRegions = [];
    logger.info("Tiles cleared");
  }
  /**
   * Dispose of the router and release resources
   */
  dispose() {
    this.clearTiles();
    resetWasmModule();
    this.module = null;
    this.initialized = false;
    logger.info("Router disposed");
  }
  /**
   * Ensure router is initialized
   */
  ensureInitialized() {
    if (!this.initialized || !this.module) {
      throw createError(900 /* NOT_INITIALIZED */);
    }
  }
  /**
   * Ensure tiles are loaded
   */
  ensureTilesLoaded() {
    if (!this.tilesLoaded) {
      throw createError(200 /* TILES_NOT_LOADED */);
    }
  }
  /**
   * Validate route request
   */
  validateRouteRequest(request) {
    if (!request.locations || request.locations.length < 2) {
      throw createError(
        301 /* ROUTE_INVALID_REQUEST */,
        "At least 2 locations are required"
      );
    }
    for (let i = 0; i < request.locations.length; i++) {
      const loc = request.locations[i];
      if (typeof loc.lat !== "number" || typeof loc.lon !== "number") {
        throw createError(
          301 /* ROUTE_INVALID_REQUEST */,
          `Invalid location at index ${i}: lat and lon must be numbers`
        );
      }
      if (loc.lat < -90 || loc.lat > 90) {
        throw createError(
          301 /* ROUTE_INVALID_REQUEST */,
          `Invalid latitude at index ${i}: must be between -90 and 90`
        );
      }
      if (loc.lon < -180 || loc.lon > 180) {
        throw createError(
          301 /* ROUTE_INVALID_REQUEST */,
          `Invalid longitude at index ${i}: must be between -180 and 180`
        );
      }
    }
  }
  /**
   * Apply default values to route request
   */
  applyDefaults(request) {
    return {
      ...request,
      costing: request.costing || this.config.defaultCosting,
      units: request.units || this.config.defaultUnits,
      language: request.language || this.config.defaultLanguage,
      shape_format: request.shape_format || this.config.defaultShapeFormat,
      directions_type: request.directions_type || "maneuvers"
    };
  }
};
function createRouter(config2) {
  return new ValhallaRouter(config2);
}

// src/utils/polyline.ts
function getPrecision(format) {
  return format === "polyline6" ? 1e6 : 1e5;
}
function decodePolyline(encoded, format = "polyline6") {
  const precision = getPrecision(format);
  const coordinates = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 31) << shift;
      shift += 5;
    } while (byte >= 32);
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 31) << shift;
      shift += 5;
    } while (byte >= 32);
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;
    coordinates.push([lng / precision, lat / precision]);
  }
  return coordinates;
}
function encodePolyline(coordinates, format = "polyline6") {
  const precision = getPrecision(format);
  let encoded = "";
  let prevLat = 0;
  let prevLng = 0;
  for (const [lng, lat] of coordinates) {
    const scaledLat = Math.round(lat * precision);
    const scaledLng = Math.round(lng * precision);
    encoded += encodeNumber(scaledLat - prevLat);
    encoded += encodeNumber(scaledLng - prevLng);
    prevLat = scaledLat;
    prevLng = scaledLng;
  }
  return encoded;
}
function encodeNumber(num) {
  let value = num < 0 ? ~(num << 1) : num << 1;
  let encoded = "";
  while (value >= 32) {
    encoded += String.fromCharCode((32 | value & 31) + 63);
    value >>= 5;
  }
  encoded += String.fromCharCode(value + 63);
  return encoded;
}
function polylineToGeoJSON(encoded, format = "polyline6") {
  const coordinates = decodePolyline(encoded, format);
  return {
    type: "LineString",
    coordinates
  };
}
function geoJSONToPolyline(geojson, format = "polyline6") {
  return encodePolyline(geojson.coordinates, format);
}
function polylineBounds(encoded, format = "polyline6") {
  const coordinates = decodePolyline(encoded, format);
  if (coordinates.length === 0) {
    return [0, 0, 0, 0];
  }
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of coordinates) {
    if (lng < minLng)
      minLng = lng;
    if (lng > maxLng)
      maxLng = lng;
    if (lat < minLat)
      minLat = lat;
    if (lat > maxLat)
      maxLat = lat;
  }
  return [minLng, minLat, maxLng, maxLat];
}
function simplifyPolyline(encoded, tolerance = 1e-5, format = "polyline6") {
  const coordinates = decodePolyline(encoded, format);
  if (coordinates.length <= 2) {
    return encoded;
  }
  const simplified = douglasPeucker(coordinates, tolerance);
  return encodePolyline(simplified, format);
}
function douglasPeucker(points, tolerance) {
  if (points.length <= 2) {
    return points;
  }
  let maxDistance = 0;
  let maxIndex = 0;
  const start = points[0];
  const end = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  if (maxDistance > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIndex), tolerance);
    return left.slice(0, -1).concat(right);
  }
  return [start, end];
}
function perpendicularDistance(point, lineStart, lineEnd) {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) {
    param = dot / lenSq;
  }
  let xx;
  let yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  const dx = x - xx;
  const dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

// src/utils/geometry.ts
var EARTH_RADIUS = 6371e3;
function toRadians(degrees) {
  return degrees * Math.PI / 180;
}
function toDegrees(radians) {
  return radians * 180 / Math.PI;
}
function haversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS * c;
}
function distanceBetweenLocations(loc1, loc2) {
  return haversineDistance(loc1.lat, loc1.lon, loc2.lat, loc2.lon);
}
function midpoint(lat1, lon1, lat2, lon2) {
  const radLat1 = toRadians(lat1);
  const radLon1 = toRadians(lon1);
  const radLat2 = toRadians(lat2);
  const dLon = toRadians(lon2 - lon1);
  const bx = Math.cos(radLat2) * Math.cos(dLon);
  const by = Math.cos(radLat2) * Math.sin(dLon);
  const midLat = Math.atan2(
    Math.sin(radLat1) + Math.sin(radLat2),
    Math.sqrt((Math.cos(radLat1) + bx) ** 2 + by ** 2)
  );
  const midLon = radLon1 + Math.atan2(by, Math.cos(radLat1) + bx);
  return [toDegrees(midLat), toDegrees(midLon)];
}
function bearing(lat1, lon1, lat2, lon2) {
  const dLon = toRadians(lon2 - lon1);
  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);
  const y = Math.sin(dLon) * Math.cos(radLat2);
  const x = Math.cos(radLat1) * Math.sin(radLat2) - Math.sin(radLat1) * Math.cos(radLat2) * Math.cos(dLon);
  let brng = toDegrees(Math.atan2(y, x));
  return (brng + 360) % 360;
}
function destinationPoint(lat, lon, bearingDeg, distanceMeters) {
  const angularDistance = distanceMeters / EARTH_RADIUS;
  const bearingRad = toRadians(bearingDeg);
  const latRad = toRadians(lat);
  const lonRad = toRadians(lon);
  const destLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) + Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );
  const destLonRad = lonRad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(latRad),
    Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(destLatRad)
  );
  return [toDegrees(destLatRad), toDegrees(destLonRad)];
}
function boundingBox(locations, padding = 0) {
  if (locations.length === 0) {
    return [0, 0, 0, 0];
  }
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const loc of locations) {
    if (loc.lat < minLat)
      minLat = loc.lat;
    if (loc.lat > maxLat)
      maxLat = loc.lat;
    if (loc.lon < minLon)
      minLon = loc.lon;
    if (loc.lon > maxLon)
      maxLon = loc.lon;
  }
  if (padding > 0) {
    const centerLat = (minLat + maxLat) / 2;
    const latDegPerMeter = 1 / 111320;
    const lonDegPerMeter = 1 / (111320 * Math.cos(toRadians(centerLat)));
    const latPadding = padding * latDegPerMeter;
    const lonPadding = padding * lonDegPerMeter;
    minLat -= latPadding;
    maxLat += latPadding;
    minLon -= lonPadding;
    maxLon += lonPadding;
  }
  return [minLon, minLat, maxLon, maxLat];
}
function isWithinBounds(lat, lon, bbox) {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
}
function bboxCenter(bbox) {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return [(minLat + maxLat) / 2, (minLon + maxLon) / 2];
}
function formatDistance(meters, units = "kilometers") {
  if (units === "miles") {
    const miles = meters / 1609.344;
    if (miles < 0.1) {
      const feet = meters * 3.28084;
      return `${Math.round(feet)} ft`;
    }
    return `${miles.toFixed(1)} mi`;
  }
  if (meters < 1e3) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1e3).toFixed(1)} km`;
}
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${minutes} min`;
}

// src/index.ts
var VERSION = "0.1.0";

export { DEFAULT_WASM_PATHS, VERSION, ValhallaError, ValhallaErrorCode, ValhallaRouter, bboxCenter, bearing, boundingBox, createError, createRouter, decodePolyline, destinationPoint, distanceBetweenLocations, encodePolyline, formatDistance, formatDuration, geoJSONToPolyline, getWasmPaths, haversineDistance, isBundlerEnvironment, isValhallaError, isWithinBounds, isWorkerEnvironment, midpoint, polylineBounds, polylineToGeoJSON, simplifyPolyline, validateWasmPaths };
//# sourceMappingURL=out.js.map
//# sourceMappingURL=index.js.map
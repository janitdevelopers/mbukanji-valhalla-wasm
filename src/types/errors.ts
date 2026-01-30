/**
 * Valhalla Error Types
 */

/** Base error class for Valhalla errors */
export class ValhallaError extends Error {
  constructor(
    message: string,
    public readonly code: ValhallaErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ValhallaError'
    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValhallaError)
    }
  }
}

/** Error codes for Valhalla operations */
export enum ValhallaErrorCode {
  // Initialization errors (1xx)
  WASM_LOAD_FAILED = 100,
  WASM_INIT_FAILED = 101,
  WASM_NOT_SUPPORTED = 102,
  
  // Tile errors (2xx)
  TILES_NOT_LOADED = 200,
  TILES_LOAD_FAILED = 201,
  TILES_INVALID_FORMAT = 202,
  TILES_REGION_NOT_FOUND = 203,
  
  // Route errors (3xx)
  ROUTE_NOT_FOUND = 300,
  ROUTE_INVALID_REQUEST = 301,
  ROUTE_LOCATION_NOT_FOUND = 302,
  ROUTE_NO_PATH = 303,
  ROUTE_LOCATIONS_TOO_CLOSE = 304,
  ROUTE_LOCATIONS_TOO_FAR = 305,
  
  // General errors (9xx)
  NOT_INITIALIZED = 900,
  INVALID_ARGUMENT = 901,
  INTERNAL_ERROR = 999,
}

/** Human-readable error messages */
export const ERROR_MESSAGES: Record<ValhallaErrorCode, string> = {
  [ValhallaErrorCode.WASM_LOAD_FAILED]: 'Failed to load WASM module',
  [ValhallaErrorCode.WASM_INIT_FAILED]: 'Failed to initialize WASM module',
  [ValhallaErrorCode.WASM_NOT_SUPPORTED]: 'WebAssembly is not supported in this environment',
  
  [ValhallaErrorCode.TILES_NOT_LOADED]: 'No routing tiles loaded. Call loadTiles() first.',
  [ValhallaErrorCode.TILES_LOAD_FAILED]: 'Failed to load routing tiles',
  [ValhallaErrorCode.TILES_INVALID_FORMAT]: 'Invalid tile format',
  [ValhallaErrorCode.TILES_REGION_NOT_FOUND]: 'Requested region not found in tiles',
  
  [ValhallaErrorCode.ROUTE_NOT_FOUND]: 'No route found between locations',
  [ValhallaErrorCode.ROUTE_INVALID_REQUEST]: 'Invalid route request',
  [ValhallaErrorCode.ROUTE_LOCATION_NOT_FOUND]: 'One or more locations could not be found on the road network',
  [ValhallaErrorCode.ROUTE_NO_PATH]: 'No path could be found for input',
  [ValhallaErrorCode.ROUTE_LOCATIONS_TOO_CLOSE]: 'Locations are too close together',
  [ValhallaErrorCode.ROUTE_LOCATIONS_TOO_FAR]: 'Locations are too far apart for the routing tiles loaded',
  
  [ValhallaErrorCode.NOT_INITIALIZED]: 'Router not initialized. Call init() first.',
  [ValhallaErrorCode.INVALID_ARGUMENT]: 'Invalid argument provided',
  [ValhallaErrorCode.INTERNAL_ERROR]: 'An internal error occurred',
}

/** Create a ValhallaError with proper message */
export function createError(
  code: ValhallaErrorCode,
  customMessage?: string,
  details?: Record<string, unknown>
): ValhallaError {
  const message = customMessage || ERROR_MESSAGES[code]
  return new ValhallaError(message, code, details)
}

/** Check if an error is a ValhallaError */
export function isValhallaError(error: unknown): error is ValhallaError {
  return error instanceof ValhallaError
}

/** Map Valhalla API error codes to our error codes */
export function mapApiErrorCode(apiCode: number): ValhallaErrorCode {
  switch (apiCode) {
    case 106:
    case 107:
      return ValhallaErrorCode.ROUTE_LOCATION_NOT_FOUND
    case 170:
    case 171:
    case 172:
      return ValhallaErrorCode.ROUTE_NO_PATH
    case 154:
      return ValhallaErrorCode.ROUTE_LOCATIONS_TOO_CLOSE
    default:
      if (apiCode >= 100 && apiCode < 200) {
        return ValhallaErrorCode.ROUTE_INVALID_REQUEST
      }
      return ValhallaErrorCode.INTERNAL_ERROR
  }
}

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
 * // Create and initialize router
 * const router = createRouter()
 * await router.init({ wasmPath: '/valhalla.wasm' })
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
 * @packageDocumentation
 */

// Main router class and factory
export { ValhallaRouter, createRouter } from './valhalla-router'

// All types
export type {
  // Route types
  RouteRequest,
  RouteResponse,
  RouteError,
  RouteLeg,
  Maneuver,
  ManeuverType,
  Location,
  CostingModel,
  CostingOptions,
  AutoCostingOptions,
  BicycleCostingOptions,
  PedestrianCostingOptions,
  TruckCostingOptions,
  DirectionsType,
  // Config types
  ValhallaInitOptions,
  TileLoadOptions,
  TileSource,
  RouterConfig,
  RouterStatus,
  LoadProgress,
} from './types'

// Error handling
export {
  ValhallaError,
  ValhallaErrorCode,
  createError,
  isValhallaError,
} from './types/errors'

// Utilities
export {
  // Polyline
  decodePolyline,
  encodePolyline,
  polylineToGeoJSON,
  geoJSONToPolyline,
  polylineBounds,
  simplifyPolyline,
  type PolylineFormat,
  type Coordinate,
  type LineStringGeometry,
  // Geometry
  haversineDistance,
  distanceBetweenLocations,
  midpoint,
  bearing,
  destinationPoint,
  boundingBox,
  isWithinBounds,
  bboxCenter,
  formatDistance,
  formatDuration,
} from './utils'

// Version
export const VERSION = '0.1.0'

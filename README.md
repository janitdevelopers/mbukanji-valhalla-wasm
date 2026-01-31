# @jansoft/mbujkanji-valhalla-wasm

A standalone, framework-agnostic NPM package that brings [Valhalla](https://github.com/valhalla/valhalla) routing engine to the browser via WebAssembly.

## Features

- **Offline-first routing** - Calculate routes entirely client-side without network requests
- **Framework agnostic** - Works with React, Vue, Svelte, vanilla JS, or any JavaScript environment
- **BYOT (Bring Your Own Tiles)** - No pre-built tiles included; load your own region tiles
- **TypeScript support** - Full type definitions included
- **Tree-shakeable** - Import only what you need

## Installation

\`\`\`bash
npm install @jansoft/mbujkanji-valhalla-wasm
# or
yarn add @jansoft/mbujkanji-valhalla-wasm
# or
pnpm add @jansoft/mbujkanji-valhalla-wasm
\`\`\`

## Quick Start

\`\`\`typescript
import { createRouter } from '@jansoft/mbujkanji-valhalla-wasm';

// Create and initialize the router
const router = createRouter();
await router.init();

// Load tiles (you provide these)
const tilesResponse = await fetch('/path/to/your/tiles.tar');
const tilesBuffer = await tilesResponse.arrayBuffer();
await router.loadTiles(tilesBuffer);

// Calculate a route
const result = await router.route({
  locations: [
    { lat: 4.0511, lon: 9.7679 },   // Origin (Douala)
    { lat: 3.8480, lon: 11.5021 }   // Destination (Yaounde)
  ],
  costing: 'auto',
  directions_type: 'maneuvers'
});

console.log(result.trip);

// Clean up when done
router.dispose();
\`\`\`

## API Reference

### `createRouter(options?: RouterOptions): ValhallaRouter`

Factory function to create a new router instance.

\`\`\`typescript
interface RouterOptions {
  wasmUrl?: string;           // Custom URL for valhalla.wasm
  workerUrl?: string;         // Custom URL for worker script
  debug?: boolean;            // Enable debug logging
}
\`\`\`

### `ValhallaRouter`

#### `init(): Promise<void>`

Initialize the WASM module. Must be called before any other methods.

#### `loadTiles(tiles: ArrayBuffer): Promise<void>`

Load routing tiles from an ArrayBuffer (typically a .tar file).

#### `loadTilesFromUrl(url: string): Promise<void>`

Convenience method to fetch and load tiles from a URL.

#### `route(request: RouteRequest): Promise<RouteResponse>`

Calculate a route between locations.

\`\`\`typescript
interface RouteRequest {
  locations: Array<{
    lat: number;
    lon: number;
    type?: 'break' | 'through' | 'via';
    heading?: number;
    street?: string;
  }>;
  costing: 'auto' | 'bicycle' | 'pedestrian' | 'truck';
  costing_options?: CostingOptions;
  directions_type?: 'none' | 'maneuvers' | 'instructions';
  units?: 'kilometers' | 'miles';
  language?: string;
  alternates?: number;
}
\`\`\`

#### `isReady(): boolean`

Check if the router is initialized and has tiles loaded.

#### `getLoadedRegions(): string[]`

Get list of loaded tile regions.

#### `dispose(): void`

Clean up resources. Call when done with the router.

### Utilities

\`\`\`typescript
import { 
  decodePolyline, 
  encodePolyline,
  polylineToGeoJSON,
  haversineDistance,
  bearing 
} from '@jansoft/mbujkanji-valhalla-wasm';

// Decode Valhalla's encoded polyline
const coordinates = decodePolyline(encodedString, 6);

// Convert to GeoJSON
const lineString = polylineToGeoJSON(encodedString, 6);

// Calculate distance between two points (meters)
const distance = haversineDistance(
  { lat: 4.0511, lon: 9.7679 },
  { lat: 3.8480, lon: 11.5021 }
);
\`\`\`

### Optional: Tile Caching

For offline-first applications, use the optional cache module:

\`\`\`typescript
import { TileCache } from '@jansoft/mbujkanji-valhalla-wasm/cache';

const cache = new TileCache({ dbName: 'my-app-tiles' });
await cache.init();

// Store tiles
await cache.storeTiles('cameroon', tilesBuffer, {
  version: '2024-01',
  bounds: { north: 13.1, south: 1.6, east: 16.2, west: 8.5 }
});

// Retrieve tiles
const tiles = await cache.getTiles('cameroon');

// List cached regions
const regions = await cache.listRegions();
\`\`\`

## Building WASM from Source

The package requires a compiled `valhalla.wasm` file. See [native/README.md](./native/README.md) for build instructions.

### Quick Build (Docker)

\`\`\`bash
cd native
docker build -t valhalla-wasm-builder .
docker run --rm -v $(pwd)/../wasm:/output valhalla-wasm-builder
\`\`\`

## Creating Routing Tiles

Valhalla requires routing tiles built from OpenStreetMap data. Here's how to create tiles for your region:

### Option 1: Use Valhalla Docker Image

\`\`\`bash
# Download OSM extract (example: Cameroon)
wget https://download.geofabrik.de/africa/cameroon-latest.osm.pbf

# Build tiles using official Valhalla Docker image
docker run -it --rm \
  -v $(pwd):/data \
  ghcr.io/valhalla/valhalla:latest \
  valhalla_build_tiles -c /data/valhalla.json /data/cameroon-latest.osm.pbf

# Package tiles for web delivery
tar -cvf cameroon-tiles.tar valhalla_tiles/
\`\`\`

### Option 2: Build Locally

See [Valhalla documentation](https://github.com/valhalla/valhalla#building-tiles) for local build instructions.

## Examples

See the [examples/](./examples/) directory for complete examples:

- **[vanilla-js](./examples/vanilla-js/)** - Plain JavaScript with MapLibre GL JS
- **[react-maplibre](./examples/react-maplibre/)** - React with MapLibre GL JS and offline support

## Browser Support

- Chrome 89+
- Firefox 89+
- Safari 15+
- Edge 89+

Requires WebAssembly and SharedArrayBuffer support. For SharedArrayBuffer, ensure proper COOP/COEP headers:

\`\`\`
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
\`\`\`

## Bundle Size

| Component | Size (gzipped) |
|-----------|----------------|
| Core library | ~15 KB |
| WASM module | ~8 MB |
| Worker | ~5 KB |

## License

MIT License - see [LICENSE](./LICENSE) for details.

Valhalla is licensed under the MIT License.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Acknowledgments

- [Valhalla](https://github.com/valhalla/valhalla) - The routing engine
- [Emscripten](https://emscripten.org/) - C++ to WebAssembly compiler
- [MapLibre GL JS](https://maplibre.org/) - Map rendering library

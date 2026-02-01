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

// Create and initialize the router (WASM paths auto-detected!)
const router = createRouter();
await router.init();  // No paths needed - it just works!

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

## Installation & Setup

### Automatic Path Resolution (Default)

The package automatically detects WASM file paths based on your environment. **No configuration needed!**

\`\`\`typescript
// This just works in most environments
const router = createRouter();
await router.init();
\`\`\`

Works automatically in:
- ✅ Vite
- ✅ Webpack
- ✅ Next.js
- ✅ Node.js (ESM and CJS)
- ✅ Browser (with bundlers)
- ✅ Most modern build tools

### Custom Paths (Advanced)

For CDN usage or custom locations, you can provide explicit paths:

\`\`\`typescript
// Custom paths from CDN
await router.init({
  wasmPath: 'https://cdn.example.com/valhalla.wasm',
  jsGluePath: 'https://cdn.example.com/valhalla.js'
});

// Or inspect auto-detected paths
import { getWasmPaths } from '@jansoft/mbujkanji-valhalla-wasm';
const paths = getWasmPaths();
console.log('WASM:', paths.wasm);
console.log('JS:', paths.js);
\`\`\`

### Framework-Specific Setup

#### Vite

No special configuration needed! The package works out of the box.

\`\`\`typescript
// vite.config.ts - No changes needed
import { defineConfig } from 'vite'

export default defineConfig({
  // Package handles WASM automatically
})
\`\`\`

#### Next.js

Works automatically with both App Router and Pages Router.

\`\`\`typescript
// app/page.tsx or pages/index.tsx
'use client'  // If using App Router

import { createRouter } from '@jansoft/mbujkanji-valhalla-wasm'

export default async function Page() {
  const router = createRouter()
  await router.init()  // Auto-detects paths
  // ...
}
\`\`\`

#### Webpack

No special configuration needed. Webpack handles WASM files automatically.

#### Node.js

For server-side usage, ensure Node.js 18+ (has native fetch) or provide a fetch polyfill:

\`\`\`typescript
// Node.js 18+
import { createRouter } from '@jansoft/mbujkanji-valhalla-wasm'
const router = createRouter()
await router.init()  // Works with native fetch

// Node.js < 18 (with polyfill)
import fetch from 'node-fetch'
const router = createRouter()
await router.init({ fetchFn: fetch })
\`\`\`

## API Reference

### `createRouter(options?: RouterConfig): ValhallaRouter`

Factory function to create a new router instance.

\`\`\`typescript
interface RouterConfig {
  defaultCosting?: 'auto' | 'bicycle' | 'pedestrian' | 'truck';
  defaultUnits?: 'kilometers' | 'miles';
  defaultLanguage?: string;
  verbose?: boolean;  // Enable debug logging
}
\`\`\`

### `ValhallaRouter`

#### `init(options?: ValhallaInitOptions): Promise<void>`

Initialize the WASM module. Must be called before any other methods.

**Options** (all optional - paths are auto-detected by default):

\`\`\`typescript
interface ValhallaInitOptions {
  wasmPath?: string;      // Custom WASM file path (auto-detected if not provided)
  jsGluePath?: string;    // Custom JS glue path (auto-detected if not provided)
  fetchFn?: typeof fetch; // Custom fetch function (for Node.js < 18 or custom auth)
  onProgress?: (progress: LoadProgress) => void;  // Progress callback
  onError?: (error: Error) => void;               // Error callback
  onReady?: () => void;                           // Ready callback
}
\`\`\`

**Example**:
\`\`\`typescript
// Auto-detection (recommended)
await router.init();

// With progress tracking
await router.init({
  onProgress: (p) => console.log(`${p.phase}: ${p.percent}%`)
});

// Custom paths
await router.init({
  wasmPath: 'https://cdn.example.com/valhalla.wasm',
  jsGluePath: 'https://cdn.example.com/valhalla.js'
});
\`\`\`

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

### Optimization Tips

- **Lazy Loading**: Load WASM only when needed
- **CDN**: Serve WASM files from a CDN for better caching
- **Compression**: Ensure your server serves WASM with gzip/brotli compression
- **Code Splitting**: Use dynamic imports to split WASM loading from main bundle

\`\`\`typescript
// Lazy load WASM
const loadRouter = async () => {
  const { createRouter } = await import('@jansoft/mbujkanji-valhalla-wasm')
  const router = createRouter()
  await router.init()
  return router
}
\`\`\`

## Troubleshooting

### WASM File Not Found

**Error**: `Failed to fetch WASM: 404 Not Found`

**Solutions**:
1. Ensure WASM files are built: `npm run build:wasm`
2. Check that WASM files are in `dist/` after running `npm run build`
3. Verify the package was installed correctly
4. For custom paths, ensure the URL is accessible

### CORS Errors

**Error**: `CORS policy` or `cross-origin` errors

**Solutions**:
1. Use a bundler (Vite, Webpack) - they handle WASM files automatically
2. Copy WASM files to your `public/` folder and reference them there
3. Configure your server to send proper CORS headers
4. Use a CDN that supports CORS

### Monorepo Issues

**Problem**: Path resolution fails in pnpm/yarn workspaces

**Solutions**:
1. Ensure the package is properly hoisted
2. Use explicit paths if auto-detection fails:
   \`\`\`typescript
   await router.init({
     wasmPath: new URL('valhalla.wasm', import.meta.url).href
   })
   \`\`\`
3. Check that `node_modules` structure is correct

### Worker Thread Usage

**Note**: Web Workers have different path resolution behavior. The package handles this automatically, but if you encounter issues:

\`\`\`typescript
// In a Web Worker
import { createRouter, getWasmPaths } from '@jansoft/mbujkanji-valhalla-wasm'

// Get paths explicitly for workers
const paths = getWasmPaths()
const router = createRouter()
await router.init({
  wasmPath: paths.wasm,
  jsGluePath: paths.js
})
\`\`\`

### SSR/SSG Initialization

For Next.js Server Components or SSR:

\`\`\`typescript
// Only initialize on client side
'use client'

import { useEffect, useState } from 'react'
import { createRouter } from '@jansoft/mbujkanji-valhalla-wasm'

export function MyComponent() {
  const [router, setRouter] = useState(null)
  
  useEffect(() => {
    // Initialize only in browser
    const initRouter = async () => {
      const r = createRouter()
      await r.init()
      setRouter(r)
    }
    initRouter()
  }, [])
  
  // ...
}
\`\`\`

### Path Resolution Errors

**Error**: `import.meta.url is not defined` (in CJS)

**Solution**: The package handles this automatically. If you see this error:
1. Ensure you're using the latest version
2. Check that your bundler is configured correctly
3. Use ESM instead of CJS if possible

### Common Path Resolution Errors

- **Wrong path format**: Use URLs or absolute paths, not relative paths from root
- **Bundler not copying WASM**: Ensure your bundler is configured to handle `.wasm` files
- **Node.js path issues**: Use `file://` URLs or absolute paths in Node.js

## License

MIT License - see [LICENSE](./LICENSE) for details.

Valhalla is licensed under the MIT License.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Acknowledgments

- [Valhalla](https://github.com/valhalla/valhalla) - The routing engine
- [Emscripten](https://emscripten.org/) - C++ to WebAssembly compiler
- [MapLibre GL JS](https://maplibre.org/) - Map rendering library

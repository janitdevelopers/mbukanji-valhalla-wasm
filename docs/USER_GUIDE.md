# Package User Guide: @jansoft/mbujkanji-valhalla-wasm

This guide explains how to integrate and use the Valhalla WASM routing package in your project for **offline-first** routing.

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Offline-First Setup](#offline-first-setup)
5. [Framework Integration](#framework-integration)
6. [API Summary](#api-summary)
7. [Troubleshooting](#troubleshooting)

---

## Overview

- **What it does**: Runs the Valhalla routing engine in the browser (or Node.js) via WebAssembly. Routes are computed **client-side**; no server required after the engine and tiles are loaded.
- **What you provide**: Routing **tiles** for your region (built from OpenStreetMap). The package does not include map data.
- **Environments**: Vite, Webpack, Next.js, Node.js 18+, and vanilla JS. TypeScript types included.

---

## Installation

```bash
npm install @jansoft/mbujkanji-valhalla-wasm
# or
yarn add @jansoft/mbujkanji-valhalla-wasm
# or
pnpm add @jansoft/mbujkanji-valhalla-wasm
```

Optional: for **offline tile caching** (e.g. IndexedDB), the package can use the optional `idb` dependency:

```bash
npm install idb
```

---

## Quick Start

1. **Create and initialize the router** (WASM paths are auto-detected in most setups):

```typescript
import { createRouter } from '@jansoft/mbujkanji-valhalla-wasm';

const router = createRouter();
await router.init();
```

2. **Load tiles** (you must provide a `.tar` of Valhalla tiles for your region):

```typescript
// From URL
await router.loadTilesFromUrl('/tiles/cameroon-tiles.tar');

// Or from ArrayBuffer (e.g. fetch, file input, or cache)
const tilesResponse = await fetch('/tiles/region.tar');
const tilesBuffer = await tilesResponse.arrayBuffer();
await router.loadTiles(tilesBuffer);
```

3. **Compute a route**:

```typescript
const result = await router.route({
  locations: [
    { lat: 4.0511, lon: 9.7679 },
    { lat: 3.8480, lon: 11.5021 },
  ],
  costing: 'auto',
  directions_type: 'maneuvers',
});

console.log(result.trip);
```

4. **Clean up** when done:

```typescript
router.dispose();
```

---

## Offline-First Setup

### 1. Ensure the engine starts (no config in most cases)

- In **Vite**, **Webpack**, **Next.js**, etc., you usually do **not** need to pass `wasmPath` or `jsGluePath`; the package resolves them from the installed package.
- If you see **“Routing engine could not start”** or **“factory is not a function”**, ensure you use a **recent package version** (the glue is built as an ES module). Try a **production build** (`pnpm run build && pnpm run preview`) in case dev serves assets differently.

### 2. Get or build routing tiles

Valhalla needs **routing tiles** (not map tiles). Build them from OSM data, e.g. with the official Valhalla Docker image:

```bash
# Example: download OSM extract and build tiles
wget https://download.geofabrik.de/africa/cameroon-latest.osm.pbf

docker run -it --rm -v $(pwd):/data ghcr.io/valhalla/valhalla:latest \
  valhalla_build_tiles -c /data/valhalla.json /data/cameroon-latest.osm.pbf

# Package for web
tar -cvf cameroon-tiles.tar valhalla_tiles/
```

Serve the resulting `.tar` from your app (e.g. `public/tiles/` or a CDN).

### 3. Cache tiles for offline use

Use the optional **cache** subpath to store and retrieve tiles (e.g. in IndexedDB):

```typescript
import { createRouter } from '@jansoft/mbujkanji-valhalla-wasm';
import { TileCache } from '@jansoft/mbujkanji-valhalla-wasm/cache';

const cache = new TileCache({ dbName: 'my-app-tiles' });
await cache.init();

// After first fetch, store tiles
const tilesBuffer = await fetch('/tiles/region.tar').then((r) => r.arrayBuffer());
await cache.storeTiles('region', tilesBuffer, {
  version: '2024-01',
  bounds: { north: 13.1, south: 1.6, east: 16.2, west: 8.5 },
});

// Later: load from cache (works offline)
let tiles = await cache.getTiles('region');
if (!tiles) {
  tiles = await fetch('/tiles/region.tar').then((r) => r.arrayBuffer());
  await cache.storeTiles('region', tiles, { version: '2024-01', bounds: {} });
}

const router = createRouter();
await router.init();
await router.loadTiles(tiles);
// ... route ...
```

### 4. Lazy-load the router (optional)

To keep the main bundle small and load WASM only when needed:

```typescript
async function getRouter() {
  const { createRouter } = await import('@jansoft/mbujkanji-valhalla-wasm');
  const router = createRouter();
  await router.init();
  return router;
}
```

---

## Framework Integration

### Vite

No extra config. Use the package as in Quick Start. If the engine fails to start in **dev**, try a **production build** and `preview` to confirm behavior.

### Next.js

- Use a **client component** (e.g. `'use client'`) or run `init()` inside `useEffect` so WASM loads in the browser only.
- Path resolution works with both App Router and Pages Router.

```typescript
'use client';

import { useEffect, useState } from 'react';
import { createRouter } from '@jansoft/mbujkanji-valhalla-wasm';

export default function RoutingPage() {
  const [router, setRouter] = useState(null);

  useEffect(() => {
    let r = null;
    (async () => {
      r = createRouter();
      await r.init();
      setRouter(r);
    })();
    return () => r?.dispose();
  }, []);

  // Use router when non-null...
}
```

### Webpack

No special config; Webpack handles WASM. Use the same pattern as Quick Start.

### Node.js

- Use **Node 18+** (native `fetch`) or provide a `fetch` polyfill.
- Pass a custom `fetchFn` if needed:

```typescript
import { createRouter } from '@jansoft/mbujkanji-valhalla-wasm';
import fetch from 'node-fetch';

const router = createRouter();
await router.init({ fetchFn: fetch });
```

### Custom paths (CDN or public folder)

If you serve WASM/glue from a CDN or `public/`:

```typescript
await router.init({
  wasmPath: 'https://cdn.example.com/valhalla.wasm',
  jsGluePath: 'https://cdn.example.com/valhalla.js',
});
```

To inspect auto-detected paths:

```typescript
import { getWasmPaths } from '@jansoft/mbujkanji-valhalla-wasm';
const paths = getWasmPaths();
console.log(paths.wasm, paths.js);
```

---

## API Summary

| API | Description |
|-----|-------------|
| `createRouter(options?)` | Create a router instance. |
| `router.init(options?)` | Load and initialize WASM. Call once before other methods. |
| `router.loadTiles(buffer)` | Load tiles from an `ArrayBuffer` (e.g. `.tar`). |
| `router.loadTilesFromUrl(url)` | Fetch and load tiles from a URL. |
| `router.route(request)` | Compute a route; returns a trip and directions. |
| `router.isReady()` | `true` if initialized and tiles are loaded. |
| `router.getLoadedRegions()` | List of loaded tile region names. |
| `router.dispose()` | Release resources. |
| `getWasmPaths(customBase?)` | Get WASM and JS glue paths (for debugging or custom init). |
| `decodePolyline`, `polylineToGeoJSON`, `haversineDistance`, `bearing` | Utility helpers. |
| `TileCache` (from `@jansoft/mbujkanji-valhalla-wasm/cache`) | Optional tile caching for offline. |

**Route request** (minimal):

```typescript
{
  locations: [ { lat: number, lon: number }, ... ],
  costing: 'auto' | 'bicycle' | 'pedestrian' | 'truck',
  directions_type?: 'none' | 'maneuvers' | 'instructions',
  units?: 'kilometers' | 'miles',
  language?: string,
}
```

---

## Troubleshooting

### “Routing engine could not start” / “factory is not a function”

- **Cause**: The WASM glue was not loaded as an ES module (older package versions or wrong build). Newer versions ship glue built with `EXPORT_ES6=1`.
- **What to do**:
  1. Update to the latest `@jansoft/mbujkanji-valhalla-wasm`.
  2. Try a **production build** and run with `preview` (e.g. `pnpm run build && pnpm run preview`); sometimes the engine works in prod when it fails in dev.
  3. Try another browser to rule out extensions or caching.
  4. If it persists, open an issue with the package maintainers and mention “factory is not a function” and that it happens in the WASM loader when initializing the engine.

### “No routing data” / tiles not loaded

- **Cause**: Tiles were not loaded or the route is outside the loaded region.
- **What to do**: Call `router.loadTiles(buffer)` or `router.loadTilesFromUrl(url)` before `router.route()`. Ensure the tile region covers the route locations.

### WASM 404 / CORS

- Use a **bundler** (Vite, Webpack, Next.js) so WASM is served from the same origin, or copy `valhalla.wasm` and `valhalla.js` to your `public/` and pass explicit paths in `init({ wasmPath, jsGluePath })`.
- Ensure the server (or CDN) allows requests to those assets (CORS if cross-origin).

### Path resolution in workers or monorepos

- If auto-detection fails in a Web Worker or monorepo, pass paths explicitly:

```typescript
import { getWasmPaths, createRouter } from '@jansoft/mbujkanji-valhalla-wasm';

const paths = getWasmPaths();
const router = createRouter();
await router.init({
  wasmPath: paths.wasm,
  jsGluePath: paths.js,
});
```

### SharedArrayBuffer (if you need it later)

Some advanced features may require `SharedArrayBuffer`. Then your server must send:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Basic routing does not require this.

---

## More Information

- **Full API and options**: See the main [README](../README.md) in the package repo.
- **Building WASM from source**: See [native/README.md](../native/README.md).
- **Creating routing tiles**: See “Creating Routing Tiles” in the main README or [Valhalla documentation](https://github.com/valhalla/valhalla#building-tiles).

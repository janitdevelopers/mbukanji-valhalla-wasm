# Vite and Monorepo Setup

This document helps when using `@jansoft/mbujkanji-valhalla-wasm` inside a **Vite** app that lives in a **monorepo** (e.g. the package is a workspace package at `packages/mbukanji-valhalla-wasm`).

---

## Understanding the "Glue version check" debug output

If your app shows a **Navigation Debug Bundle** with a **Glue version check** section like:

```text
--- Glue version check ---
match: no — 0.01 KB / 0.59 KB
served: WASM 8 bytes, JS 603 bytes | expected: WASM 5860930, JS 143143
```

### What it means

- **expected**: The real Valhalla build is ~5.6 MB (WASM) and ~143 KB (JS). Those are the sizes of `dist/valhalla.wasm` and `dist/valhalla.js` in the package.
- **served**: What the app actually received when it requested those files (e.g. from `/@fs/.../dist/valhalla.wasm` and `.../valhalla.js`).
- **match: no**: The served sizes are not the expected ones. Often in Vite dev you see **WASM 8 bytes, JS 603 bytes** — i.e. the server did not return the real files (e.g. a stub, 404 body, or redirect).

So the check is telling you: **the URLs used for WASM/JS are not serving the full package assets in this environment.**

### Init can still report success

If you also see `success: true` and `loadedRegionCount: 1`, the router may have loaded the real WASM/JS through a different path (e.g. a different request or bundler pipeline). The glue version check is a **separate** request to the same paths to verify they serve the full files. So:

- **Init success** = router started and loaded tiles.
- **Glue version match: no** = the diagnostic fetch to the same paths did not get the full WASM/JS; fix this so dev and production behave consistently.

---

## Why Vite dev serves 8 / 603 bytes

In development, Vite often serves files under `node_modules` (or workspace packages) via **virtual** or **transformed** responses. For:

- `/@fs/D:/Projects/.../packages/mbukanji-valhalla-wasm/dist/valhalla.wasm`
- `/@fs/D:/Projects/.../packages/mbukanji-valhalla-wasm/dist/valhalla.js`

the dev server may:

- Not serve raw binary `.wasm` as-is, or
- Return a small placeholder/error body instead of the real file,

so the "glue version check" sees 8 bytes (WASM) and 603 bytes (JS) instead of the full sizes.

---

## What to do in the consuming app (e.g. janpams)

### 1. Allow filesystem access to the package (Vite)

In your **Vite** config, ensure the package path is allowed so `/@fs/` can serve the real files:

```ts
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    fs: {
      // Allow serving from monorepo package (adjust path to your repo)
      allow: [
        '..',
        '../..',
        // Or the absolute path to the package, e.g.:
        // 'D:/Projects/janpams/packages/mbukanji-valhalla-wasm',
      ],
    },
  },
})
```

Adjust `allow` so it includes the directory that contains `packages/mbukanji-valhalla-wasm` (or the package root). This helps Vite serve real files from the package `dist/` when requested via `/@fs/...`.

### 2. Optional: Set expected sizes for the glue version check

If your app has a **glue version check** that compares served size to expected size (and you know the package build is correct), you can set the expected sizes so the check passes even when the diagnostic request gets a different response in dev:

- **WASM**: 5 860 930 bytes (~5.6 MB)
- **JS**: 143 143 bytes (~143 KB)

For example, in the app’s `.env` or Vite env:

```bash
VITE_VALHALLA_WASM_SIZE=5860930
VITE_VALHALLA_JS_SIZE=143143
```

(Exact names depend on your app; e.g. your app may document these in `docs/VALHALLA_LOCAL_BUILD.md`.)

### 3. Production build

Run a **production** build and preview:

```bash
pnpm run build
pnpm run preview
```

Often the real WASM/JS are correctly included in the build output, so the glue version check passes in production even if it fails in dev.

### 4. Copy WASM to `public/` (alternative)

If `/@fs/` continues to serve the wrong content in dev, you can copy the package assets into your app’s `public/` and point the router at them:

```bash
# From your app root (e.g. janpams)
cp node_modules/@jansoft/mbujkanji-valhalla-wasm/dist/valhalla.wasm public/
cp node_modules/@jansoft/mbujkanji-valhalla-wasm/dist/valhalla.js public/
```

Then initialize with explicit paths:

```ts
await router.init({
  wasmPath: '/valhalla.wasm',
  jsGluePath: '/valhalla.js',
})
```

This avoids relying on `/@fs/` for the package `dist/` in dev.

---

## Summary

| Symptom | Meaning | Action |
|--------|--------|--------|
| `match: no`, served 8 / 603 bytes | Requests to WASM/JS URLs did not return the full package files | Fix Vite `server.fs.allow`, or use `public/` + explicit paths, or set expected sizes for the check |
| `success: true`, `loadedRegionCount: 1` | Router started and loaded tiles | Routing should work; still fix serving so the glue check passes and dev matches production |
| Expected sizes | WASM ~5.6 MB, JS ~143 KB | Use these for `VITE_VALHALLA_WASM_SIZE` / `VITE_VALHALLA_JS_SIZE` if your app supports them |

The package itself does not implement the "Glue version check" — that lives in the consuming app (e.g. janpams). This doc is for integrating the package correctly in a Vite monorepo so that the real `dist/valhalla.wasm` and `dist/valhalla.js` are served and the check can pass.

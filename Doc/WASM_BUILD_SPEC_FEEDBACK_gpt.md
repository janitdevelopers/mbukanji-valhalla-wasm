Your plan is **solid and very close to “ship-ready”**, but there are a few places where it will **bite you later** (especially around **publishing strategy, runtime tile loading, and memory assumptions**). Below is my take, with concrete fixes you can apply immediately.

---

## What’s strong in your plan

### ✅ 1) Docker + pinned Emscripten = correct

Using a pinned `emscripten/emsdk:3.1.51` base image is the right way to make builds reproducible.

### ✅ 2) Explicit outputs and build metadata

Having:

* `valhalla.wasm`
* `valhalla.js`
* `metadata.json`

…is exactly what you want for a package that will be used across multiple apps/environments.

### ✅ 3) A “thin bindings” API surface

Your `ValhallaRouter` with:

* `loadTiles()`
* `route()`
* `clearTiles()`

…is the right abstraction for offline web.

---

## The parts I would change (important)

## 1) Don’t commit `wasm/` outputs to git (most of the time)

Your plan says:

> “Committed to repo: git add wasm/ …”

This works for a quick internal project, but for a long-lived npm SDK it causes problems:

* huge git history bloat (WASM changes every build)
* PR diffs become noisy
* contributors rebuild with different toolchains → artifacts differ
* you’ll eventually need multiple targets (debug, release, SIMD, etc.)

**Better:** publish built artifacts via CI to npm, not to git.

* keep `wasm/` (or `artifacts/`) **gitignored**
* CI generates `dist/` and publishes

If you *must* keep them in repo for now, do it only temporarily, but plan to move away.

---

## 2) Your tile loading method (tar archive) is the main risk

You’re exposing:

* `loadTiles()` – *Load routing tiles from tar archive*

This is simple, but can become a serious bottleneck because Valhalla tiles are **many small files** and unpacking thousands of entries in the browser can be slow.

**Recommendation (two-stage approach):**

* **Stage 1 (ship now):** tar/zip pack, unpack into MEMFS (fast to route, slow startup)
* **Stage 2 (upgrade):** use a **single-file container** or chunked store:

  * SQLite container (if feasible in your Emscripten build)
  * custom chunked format + random access loader

Your spec can keep tar now, but add a section titled:

> “Tile Container Strategy: V1 TAR, V2 Random-Access Container”

This will prevent a future rewrite.

---

## 3) “~10–20MB wasm” expectation may be optimistic

Valhalla is large. “10–20MB” might happen only if:

* you trim features
* you strip symbols
* you avoid extra deps
* you compress and ship `.wasm` with gzip/brotli on CDN

So your plan is good, but set expectations like:

* **Uncompressed wasm:** could be 20–60MB depending on features
* **Compressed (br/gz):** usually much smaller on the wire

Also: your “optimize WASM output” prompt is good—keep it.

---

## 4) Memory settings: 4GB is not universally safe

You wrote:

```
-s MAXIMUM_MEMORY=4GB
-s INITIAL_MEMORY=256MB
```

This is valid in some modern browsers, but **not uniformly reliable across all environments**. Emscripten documents how `MAXIMUM_MEMORY` works, and 2GB is the default ceiling when growth is enabled. ([emscripten.org][1])
Chrome/V8 has supported up to 4GB in Wasm in some configurations, but it’s still something you should treat as “advanced mode.” ([v8.dev][2])

**Practical recommendation:**

* Default:

  * `ALLOW_MEMORY_GROWTH=1`
  * `MAXIMUM_MEMORY=2147483648` (2GB)
* Provide an “enterprise/high-end” build variant with 4GB.

Add this to your spec so you don’t lock yourselves into an assumption.

---

## 5) Dependency/version notes need tightening (protobuf especially)

Your spec says:

> “For Valhalla 3.4.0, use protobuf 3.x or 25.x”

That’s too loose. Valhalla’s build docs emphasize knowing/controlling dependencies when bringing your own (protobuf, curl, etc.). ([valhalla.github.io][3])
Instead, make it deterministic:

**Better spec wording:**

* “Pin protobuf to **exact version X** that we confirm builds with Valhalla 3.4.0 under Emscripten”
* Store it in `metadata.json`

Otherwise you’ll get “works on my machine” in Docker rebuilds.

---

## 6) Small naming consistency issues (easy win)

You mention both:

* `mbujkanji-valhalla-wasm`
* `mbukanji-valhalla-wasm`

Pick one spelling everywhere (repo, npm scope, README, import).

---

## 7) Add one missing “browser reality” section

You should explicitly document:

* **Worker usage** recommended
* whether you rely on:

  * SharedArrayBuffer (COOP/COEP) or not
* expected cold start time
* tile pack size guidance per region

This will prevent misunderstanding later.

---

## What I would add to make it “complete”

### Add: Build variants (recommended)

Define 2 builds:

1. **standard**: widest compatibility
2. **max-memory**: high-end devices

### Add: A minimal supported API surface

Lock v1 API to something like:

* `createRouter(opts)`
* `router.loadTiles(source)`
* `router.route(request)`
* `router.destroy()`

### Add: Explicit routing request format reference

Even if you won’t run HTTP in browser, align request JSON with Valhalla’s routing API reference. ([valhalla.github.io][4])

---

## Bottom line

Your plan is **good enough to execute immediately**, with 3 key upgrades:

1. **Don’t commit wasm artifacts long-term** (publish via CI)
2. **Tile loading strategy must be staged** (TAR now, random-access later)
3. **Memory policy should default to 2GB + optional 4GB build**, not assume 4GB

If you want, paste your current `native/Dockerfile` + `wasm_bindings.cpp` and I’ll mark the exact lines that usually cause the first Emscripten build failures for Valhalla 3.4.0 (actor_t usage, filesystem paths, curl/sqlite assumptions).

[1]: https://emscripten.org/docs/tools_reference/settings_reference.html?utm_source=chatgpt.com "Emscripten Compiler Settings"
[2]: https://v8.dev/blog/4gb-wasm-memory?utm_source=chatgpt.com "Up to 4GB of memory in WebAssembly"
[3]: https://valhalla.github.io/valhalla/building/?utm_source=chatgpt.com "Build from Source - Valhalla Docs"
[4]: https://valhalla.github.io/valhalla/api/turn-by-turn/api-reference/?utm_source=chatgpt.com "Valhalla routing service API reference"

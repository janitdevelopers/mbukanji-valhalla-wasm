# Valhalla WASM Build Specification

## Overview

This document provides specifications and prompts to build the Valhalla routing engine as a WebAssembly module for the `@jansoft/mbujkanji-valhalla-wasm` npm package.

---

## Project Context

| Item | Value |
|------|-------|
| Package | `@jansoft/mbujkanji-valhalla-wasm` |
| Repository | `github.com/janitdevelopers/mbukanji-valhalla-wasm` |
| Valhalla Version | 3.4.0 |
| Target | WebAssembly (browser) |
| Build Tool | Docker + Emscripten |

---

## Goal

Compile the Valhalla C++ routing engine to WebAssembly so it can run entirely in the browser for offline-first routing.

**Output files needed:**
- `wasm/valhalla.wasm` - The compiled WebAssembly binary (~10-20MB)
- `wasm/valhalla.js` - Emscripten JavaScript glue code
- `wasm/metadata.json` - Build metadata

---

## Prerequisites

- Docker Desktop installed and running
- ~20GB free disk space
- ~16GB RAM recommended
- 30-60 minutes for first build

---

## Existing Build Infrastructure

The following files already exist in the `native/` folder:

### 1. `native/Dockerfile`
Emscripten-based build environment that:
- Uses `emscripten/emsdk:3.1.51` base image
- Builds dependencies: zlib, protobuf, boost, lz4
- Clones Valhalla from GitHub
- Compiles with `emcmake cmake` and `em++`

### 2. `native/build-wasm.sh`
Shell script that:
- Builds the Docker image
- Extracts WASM artifacts to `wasm/` folder
- Verifies output files

### 3. `native/wasm_bindings.cpp`
C++ bindings that expose:
- `ValhallaRouter` class
- `loadTiles()` - Load routing tiles from tar archive
- `route()` - Calculate routes
- `hasTiles()` - Check if tiles are loaded
- `clearTiles()` - Free memory
- `getVersion()` - Get Valhalla version

### 4. `native/CMakeLists.wasm.patch`
Patches for Emscripten compatibility (may need updates)

---

## Build Steps

### Step 1: Navigate to native folder
```bash
cd /path/to/mbukanji-valhalla-wasm/native
```

### Step 2: Make script executable
```bash
chmod +x build-wasm.sh
```

### Step 3: Run the build
```bash
./build-wasm.sh
```

### Step 4: Verify output
```bash
ls -la ../wasm/
# Should show: valhalla.wasm, valhalla.js, metadata.json
```

---

## Known Issues and Fixes

### Issue 1: Valhalla 3.4.0 API Changes

The Dockerfile may need updates for newer Valhalla versions. Check:
- Header file locations changed
- `actor_t` constructor signature
- Property tree configuration format

**Fix:** Update include paths and API calls in `wasm_bindings.cpp`

### Issue 2: Protobuf Version Mismatch

Valhalla requires specific protobuf version.

**Fix:** Match protobuf version to Valhalla requirements:
```dockerfile
# For Valhalla 3.4.0, use protobuf 3.x or 25.x
curl -L https://github.com/protocolbuffers/protobuf/releases/download/v25.1/protobuf-25.1.tar.gz
```

### Issue 3: Boost Headers

Valhalla needs Boost headers (not compiled libraries).

**Fix:** Ensure boost headers are copied correctly:
```dockerfile
cp -r boost /emsdk/upstream/emscripten/cache/sysroot/include/
```

### Issue 4: Memory Limits

WASM may run out of memory during routing.

**Fix:** Increase memory limits in `em++` flags:
```
-s ALLOW_MEMORY_GROWTH=1
-s MAXIMUM_MEMORY=4GB
-s INITIAL_MEMORY=256MB
```

### Issue 5: Missing Dependencies

Build may fail if dependencies are missing.

**Fix:** Add missing dependencies to Dockerfile apt-get:
```dockerfile
apt-get install -y libsqlite3-dev libcurl4-openssl-dev ...
```

---

## Cursor AI Prompts

Use these prompts with Cursor to help debug and fix build issues:

### Prompt 1: Analyze Build Failure
```
I'm trying to build Valhalla routing engine to WebAssembly. The build is failing with this error:

[PASTE ERROR HERE]

The Dockerfile is in native/Dockerfile and uses emscripten/emsdk:3.1.51.
Please analyze the error and suggest fixes.
```

### Prompt 2: Fix Valhalla API Compatibility
```
I need to update wasm_bindings.cpp to work with Valhalla 3.4.0.
The current bindings use valhalla::tyr::actor_t but the build fails.

Please check the Valhalla 3.4.0 source code and update the bindings
to use the correct API. The file is at native/wasm_bindings.cpp.
```

### Prompt 3: Update Dockerfile Dependencies
```
The Valhalla WASM build is failing because of missing or incompatible dependencies.
Please review native/Dockerfile and:
1. Check if all required dependencies are installed
2. Verify version compatibility between zlib, protobuf, boost, lz4
3. Update the build commands if needed for Emscripten 3.1.51

The target is Valhalla version 3.4.0 compiled to WebAssembly.
```

### Prompt 4: Optimize WASM Output
```
The Valhalla WASM build succeeds but the output is too large (>50MB).
Please optimize the build to reduce file size:
1. Review em++ flags in Dockerfile
2. Disable unused Valhalla features
3. Add code stripping and compression
4. Consider using -Oz instead of -O3

Target size should be under 20MB for valhalla.wasm.
```

### Prompt 5: Debug Runtime Errors
```
The Valhalla WASM module loads but crashes when calling route().
Error: [PASTE ERROR]

Please help debug:
1. Check if tiles are being loaded correctly to Emscripten filesystem
2. Verify the route request JSON format
3. Check memory allocation in wasm_bindings.cpp
```

### Prompt 6: Complete Build from Scratch
```
I need to build Valhalla routing engine to WebAssembly from scratch.

Requirements:
- Valhalla version: 3.4.0
- Output: valhalla.wasm and valhalla.js
- Must work in browsers (no Node.js specific features)
- Expose route() function to calculate driving/walking directions

Please create or update these files:
1. native/Dockerfile - Emscripten build environment
2. native/wasm_bindings.cpp - C++ to JS bindings
3. native/build-wasm.sh - Build script

Use the existing files as a starting point but fix any issues.
```

---

## Expected Output

After successful build:

```
wasm/
├── valhalla.wasm      # ~10-20MB WebAssembly binary
├── valhalla.js        # Emscripten glue code (~100KB)
└── metadata.json      # {"version":"3.4.0","buildDate":"..."}
```

---

## Integration with npm Package

After building, the WASM files need to be:

1. **Committed to repo:**
   ```bash
   git add wasm/
   git commit -m "feat: add compiled WASM module"
   git push origin main
   ```

2. **Published to npm:**
   - Create new GitHub release (v0.2.0)
   - Workflow automatically publishes to npm

3. **Used in browser:**
   ```typescript
   import { createRouter } from '@jansoft/mbujkanji-valhalla-wasm';
   
   const router = await createRouter({
     wasmPath: '/valhalla.wasm',
     tilesPath: '/tiles.tar'
   });
   
   const route = await router.route({
     locations: [
       { lat: -1.286389, lon: 36.817223 },
       { lat: -1.292066, lon: 36.821945 }
     ],
     costing: 'auto'
   });
   ```

---

## Alternative: GitHub Actions Build

If local Docker build is problematic, a GitHub Actions workflow can build WASM in the cloud. This would require:
- Self-hosted runner (GitHub's runners may timeout on long builds)
- Caching of intermediate build artifacts
- Scheduled builds to keep WASM up to date

---

## References

- [Valhalla GitHub](https://github.com/valhalla/valhalla)
- [Emscripten Documentation](https://emscripten.org/docs/)
- [Emscripten SDK Docker](https://hub.docker.com/r/emscripten/emsdk)
- [WebAssembly MDN](https://developer.mozilla.org/en-US/docs/WebAssembly)

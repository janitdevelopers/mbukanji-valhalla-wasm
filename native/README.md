# Valhalla WASM Build Infrastructure

This directory contains everything needed to compile Valhalla routing engine to WebAssembly.

## Prerequisites

- **Docker** - Version 20.10 or later
- **Disk Space** - ~20GB free space
- **RAM** - 16GB recommended (8GB minimum)
- **Time** - First build takes 30-60 minutes

## Quick Start

\`\`\`bash
# Make build script executable
chmod +x build-wasm.sh

# Run the build
./build-wasm.sh
\`\`\`

Output files will be in `../wasm/`:
- `valhalla.wasm` - The WebAssembly module (~15MB)
- `valhalla.js` - Emscripten glue code
- `metadata.json` - Build information

## Build Options

\`\`\`bash
# Specify Valhalla version
./build-wasm.sh --version 3.4.0

# Clean build (no Docker cache)
./build-wasm.sh --clean

# Show help
./build-wasm.sh --help
\`\`\`

## Files

| File | Description |
|------|-------------|
| `Dockerfile` | Docker build environment with Emscripten SDK |
| `build-wasm.sh` | Main build script |
| `wasm_bindings.cpp` | C++ to JavaScript bindings |
| `CMakeLists.wasm.patch` | Patches for Emscripten compatibility |

## How It Works

1. **Docker Environment** - Uses the official Emscripten SDK image
2. **Dependencies** - Builds zlib, protobuf, boost, and lz4 for WASM
3. **Valhalla** - Clones and patches Valhalla for WASM compilation
4. **Bindings** - Compiles C++ bindings that expose routing API to JavaScript
5. **Output** - Produces `.wasm` and `.js` files for browser use

## Customization

### Changing Valhalla Version

Edit the `VALHALLA_VERSION` in `Dockerfile` or use the `--version` flag:

\`\`\`bash
./build-wasm.sh --version 3.5.0
\`\`\`

### Modifying Build Flags

Edit the `emcmake cmake` and `em++` commands in `Dockerfile`:

\`\`\`dockerfile
# Memory settings
-s ALLOW_MEMORY_GROWTH=1
-s MAXIMUM_MEMORY=4GB

# Optimization
-O3 -flto

# Module format
-s MODULARIZE=1
-s EXPORT_NAME="ValhallaModule"
\`\`\`

### Adding Features

To expose additional Valhalla features, edit `wasm_bindings.cpp`:

\`\`\`cpp
EMSCRIPTEN_BINDINGS(valhalla_wasm) {
    class_<ValhallaRouter>("ValhallaRouter")
        .function("route", &ValhallaRouter::route)
        .function("isochrone", &ValhallaRouter::isochrone)  // Add new method
        // ...
}
\`\`\`

## Troubleshooting

### Build Fails with Memory Error

Increase Docker memory limit:
\`\`\`bash
docker system prune -a
# Then in Docker Desktop, increase memory to 16GB
\`\`\`

### "File not found" Errors

Ensure you're running from the `native/` directory:
\`\`\`bash
cd native
./build-wasm.sh
\`\`\`

### Slow Build

First build downloads ~5GB of dependencies. Subsequent builds use Docker cache.

For faster iteration during development:
\`\`\`bash
# Enter the container interactively
docker run -it --rm -v $(pwd):/workspace valhalla-wasm-builder bash
\`\`\`

## Architecture Notes

### Memory Management

The WASM module uses Emscripten's memory growth feature:
- Initial memory: ~256MB
- Maximum memory: 4GB
- Tiles are loaded into a virtual filesystem

### Threading

Threading is disabled for maximum browser compatibility. All routing is single-threaded.

### Tile Format

Tiles are loaded from tar archives. The tar is extracted to Emscripten's virtual filesystem at `/tiles/`.

## License

Valhalla is licensed under the MIT License. See the [Valhalla repository](https://github.com/valhalla/valhalla) for details.

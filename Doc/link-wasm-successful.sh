#!/bin/sh
# REFERENCE: Successful link script used in the Valhalla WASM Docker build (saved in Doc/).
# This is the version that completed successfully. The live copy used in the build is native/link-wasm.sh.
#
# Link WASM bindings with Valhalla + protobuf + abseil + utf8_range.
# Protobuf deps (abseil + utf8_range): pass each .a via a response file so em++
# forwards them to wasm-ld; merged archive alone often left absl/utf8 undefined.

set -e
PROTO_BUILD=/build/deps/protobuf-25.1/build
PROTOBUF_A=$(find "$PROTO_BUILD" -name 'libprotobuf.a' ! -path '*lite*' 2>/dev/null | head -1)
DEPS_RSP=/tmp/protobuf_deps.rsp

if [ -z "$PROTOBUF_A" ] || [ ! -f "$PROTOBUF_A" ]; then
  echo "[link-wasm] ERROR: libprotobuf.a not found under $PROTO_BUILD" >&2
  exit 1
fi

VALHALLA_A=/build/valhalla-src/build-wasm/src/libvalhalla.a
if [ ! -f "$VALHALLA_A" ]; then
  echo "[link-wasm] ERROR: $VALHALLA_A not found" >&2
  exit 1
fi

# Response file: one -Wl,arg per line so em++ gets each and passes to wasm-ld
echo "[link-wasm] Building dependency response file..."
printf '%s\n' '-Wl,--whole-archive' > "$DEPS_RSP"
find "$PROTO_BUILD" -name '*.a' ! -name 'libprotobuf.a' ! -name 'libprotobuf-lite.a' -print0 | \
  xargs -0 -I {} printf '-Wl,%s\n' {} >> "$DEPS_RSP"
printf '%s\n' '-Wl,--no-whole-archive' >> "$DEPS_RSP"
DEPS_COUNT=$(find "$PROTO_BUILD" -name '*.a' ! -name 'libprotobuf.a' ! -name 'libprotobuf-lite.a' | wc -l)
echo "[link-wasm] Link order: bindings, libvalhalla, libprotobuf, @deps ($DEPS_COUNT .a), -lutf8 -lz"
echo "[link-wasm] Starting full WASM link..."

em++ -O3 \
  -s WASM=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s MAXIMUM_MEMORY=4GB \
  -s MODULARIZE=1 \
  -s EXPORT_NAME="ValhallaModule" \
  -s EXPORTED_FUNCTIONS='["_malloc","_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","stringToUTF8","lengthBytesUTF8"]' \
  -s FILESYSTEM=1 \
  -s FORCE_FILESYSTEM=1 \
  -s SINGLE_FILE=0 \
  --bind \
  -I/build/valhalla-src \
  -I/build/valhalla-src/valhalla \
  -I/build/valhalla-src/build-wasm/src \
  -I/build/valhalla-src/third_party/date/include \
  -I/build/valhalla-src/third_party/rapidjson/include \
  -I/emsdk/upstream/emscripten/cache/sysroot/include \
  /build/wasm_bindings.cpp \
  "$VALHALLA_A" \
  "$PROTOBUF_A" \
  @"$DEPS_RSP" \
  -L/emsdk/upstream/emscripten/cache/sysroot/lib \
  -L/emsdk/upstream/emscripten/cache/sysroot/lib/wasm32-emscripten \
  -lutf8_validity \
  -lutf8_range \
  -lz \
  -o /output/valhalla.js

echo "[link-wasm] Link successful! Output: /output/valhalla.js"

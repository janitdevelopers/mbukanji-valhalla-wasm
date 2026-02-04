#!/bin/sh
# Link WASM bindings with Valhalla + protobuf + abseil + utf8_range.
#
# Use the merged protobuf_deps.a created by merge-protobuf-deps.sh.
# This avoids passing 87 individual -Wl,/path arguments which don't survive
# em++'s response file generation for wasm-ld.

set -e
PROTO_BUILD=/build/deps/protobuf-25.1/build
PROTOBUF_A=$(find "$PROTO_BUILD" -name 'libprotobuf.a' ! -path '*lite*' 2>/dev/null | head -1)
PROTOBUF_DEPS_A=/build/deps/protobuf_deps.a

if [ -z "$PROTOBUF_A" ] || [ ! -f "$PROTOBUF_A" ]; then
  echo "[link-wasm] ERROR: libprotobuf.a not found under $PROTO_BUILD" >&2
  exit 1
fi

if [ ! -f "$PROTOBUF_DEPS_A" ]; then
  echo "[link-wasm] ERROR: $PROTOBUF_DEPS_A not found (should be created by merge-protobuf-deps.sh)" >&2
  exit 1
fi

echo "[link-wasm] Using merged archive: $PROTOBUF_DEPS_A"
echo "[link-wasm] Starting full WASM link..."

# Full link: libprotobuf.a + protobuf_deps.a (abseil + utf8_range merged)
# Use --whole-archive for protobuf_deps.a to resolve circular dependencies between abseil libs
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
  -L/build/valhalla-src/build-wasm/src \
  -lvalhalla \
  "$PROTOBUF_A" \
  -Wl,--whole-archive "$PROTOBUF_DEPS_A" -Wl,--no-whole-archive \
  -o /output/valhalla.js

echo "[link-wasm] Link successful! Output: /output/valhalla.js"

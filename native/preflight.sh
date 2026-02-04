#!/bin/sh
# Pre-flight: check protobuf build artifacts and run a minimal link test (no Valhalla).
# Validates that protobuf_deps.a (merged archive) links correctly.
# Run inside container after protobuf is built (docker build --target validate).

set -e
PROTO_BUILD=/build/deps/protobuf-25.1/build
PROTOBUF_DEPS_A=/build/deps/protobuf_deps.a
MINIMAL_CC=/tmp/preflight_minimal.cc

echo "[preflight] Checking protobuf build..."

if [ ! -d "$PROTO_BUILD" ]; then
  echo "[preflight] FAIL: $PROTO_BUILD not found" >&2
  exit 1
fi

PROTOBUF_A=$(find "$PROTO_BUILD" -name 'libprotobuf.a' ! -path '*lite*' 2>/dev/null | head -1)
if [ -z "$PROTOBUF_A" ] || [ ! -f "$PROTOBUF_A" ]; then
  echo "[preflight] FAIL: libprotobuf.a not found under $PROTO_BUILD" >&2
  exit 1
fi

if [ ! -f "$PROTOBUF_DEPS_A" ]; then
  echo "[preflight] FAIL: $PROTOBUF_DEPS_A not found (should be created by merge-protobuf-deps.sh)" >&2
  exit 1
fi

echo "[preflight] Found libprotobuf.a: $PROTOBUF_A"
echo "[preflight] Found merged deps: $PROTOBUF_DEPS_A"

# Check merged archive has content
OBJ_COUNT=$(emar t "$PROTOBUF_DEPS_A" | wc -l)
if [ "$OBJ_COUNT" -lt 100 ]; then
  echo "[preflight] FAIL: $PROTOBUF_DEPS_A has only $OBJ_COUNT objects, expected >= 100" >&2
  exit 1
fi
echo "[preflight] protobuf_deps.a contains $OBJ_COUNT object files"

echo "[preflight] Minimal link test (use protobuf so libprotobuf.a pulls in .o; deps before protobuf)..."
# Reference protobuf so the linker pulls in libprotobuf.a .o files (which need absl from protobuf_deps.a).
printf '%s\n' '#include <google/protobuf/arena.h>
int main() { google::protobuf::Arena a; (void)a; return 0; }' > "$MINIMAL_CC"
if ! em++ -O0 -s WASM=1 -s STANDALONE_WASM \
  -I/emsdk/upstream/emscripten/cache/sysroot/include \
  "$MINIMAL_CC" \
  -Wl,--whole-archive "$PROTOBUF_DEPS_A" -Wl,--no-whole-archive \
  "$PROTOBUF_A" \
  -o /tmp/preflight_test.js 2>&1; then
  echo "[preflight] FAIL: minimal link with merged archive failed" >&2
  exit 1
fi

echo "[preflight] OK: protobuf + protobuf_deps.a link succeeds; full build should pass link step."

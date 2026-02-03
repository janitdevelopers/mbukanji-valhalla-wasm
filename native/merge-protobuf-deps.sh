#!/bin/sh
# Merge all protobuf dependency .a files (abseil, utf8_range) into a single
# archive so the full WASM link can use one path instead of 88.
# Use emar so the archive has the index wasm-ld expects (system ar/ranlib lack it).
set -e
PROTO_BUILD=/build/deps/protobuf-25.1/build
OUT_A=/build/deps/protobuf_deps.a

rm -f "$OUT_A"
emar cr "$OUT_A"
n=0
for f in $(find "$PROTO_BUILD" -name '*.a' ! -name 'libprotobuf.a' ! -name 'libprotobuf-lite.a'); do
  d=$(mktemp -d)
  (cd "$d" && emar x "$f")
  for o in "$d"/*.o; do
    [ -f "$o" ] || continue
    n=$((n + 1))
    t="/tmp/pd_$$_${n}.o"
    cp "$o" "$t"
    emar r "$OUT_A" "$t"
  done
  rm -rf "$d"
done
rm -f /tmp/pd_$$_*.o
emar s "$OUT_A"
echo "[merge-protobuf-deps] Created $OUT_A with $n object files"

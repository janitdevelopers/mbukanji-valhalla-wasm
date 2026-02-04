# Valhalla WASM Link Fix - Summary

## Problem Diagnosis

Your build was failing because of a **disconnect between what `merge-protobuf-deps.sh` created and what `link-wasm.sh` used**.

### What Was Happening:

1. **`merge-protobuf-deps.sh`** successfully created `/build/deps/protobuf_deps.a` - a merged archive containing all abseil and utf8_range object files (87 libraries merged into one).

2. **BUT `link-wasm.sh`** completely ignored this merged archive and instead:
   - Found all 87 individual `.a` files again
   - Passed them as 87 separate `-Wl,/path/to/lib.a` arguments to em++

3. **The minimal preflight test passed** because:
   - It used a simple response file approach (`-Wl,@response_file`)
   - With minimal code, em++ handled this fine

4. **The full link failed** because:
   - With many arguments (wasm_bindings.cpp + libvalhalla.a + libprotobuf.a + 87 `-Wl,/path` args), em++ generates its own response file for wasm-ld
   - The 87 `-Wl,/path` arguments don't survive this response file generation properly
   - Result: wasm-ld never sees those archives → undefined symbol errors

### Why You Saw Different Errors:

- **First error (document #1):** `undefined symbol: absl::lts_20230802::log_internal::LogMessageFatal` and `utf8_range::IsStructurallyValid` - these came from the fact that the 87 dependency archives weren't being linked at all.

- **Second error (document #2):** `undefined symbol: google::protobuf::Arena::Allocate` and `google::protobuf::internal::kGlobalEmptyTable` - when you tried using EMCC_LDFLAGS, those flags weren't passed through to wasm-ld, so even libprotobuf.a was missing.

## The Solution

**Use the merged `protobuf_deps.a` that was already created!**

The fixed `link-wasm.sh`:
- Uses `/build/deps/protobuf_deps.a` (the merged archive)
- Passes it with `--whole-archive` to handle circular dependencies between abseil libraries
- Results in a clean link line: libvalhalla.a + libprotobuf.a + protobuf_deps.a

The fixed `preflight.sh`:
- Tests the exact same approach (merged archive with --whole-archive)
- Validates that the merge worked correctly before the expensive Valhalla build

## Key Changes

### link-wasm.sh (lines 42-70 → lines 27-49):

**BEFORE:**
```bash
# Find 87 individual .a files and pass as -Wl,/path
set --
for p in $(find "$PROTO_BUILD" -name '*.a' ! -name 'libprotobuf.a' ! -name 'libprotobuf-lite.a' 2>/dev/null); do
  set -- "$@" "-Wl,$p"
done
em++ ... "$PROTOBUF_A" -Wl,--whole-archive "$@" -Wl,--no-whole-archive ...
```

**AFTER:**
```bash
# Use the pre-merged archive
PROTOBUF_DEPS_A=/build/deps/protobuf_deps.a
em++ ... "$PROTOBUF_A" -Wl,--whole-archive "$PROTOBUF_DEPS_A" -Wl,--no-whole-archive ...
```

### preflight.sh (lines 40-58 → lines 31-45):

**BEFORE:**
```bash
# Build response file with 87 paths
{
  echo '--whole-archive'
  find "$PROTO_BUILD" -name '*.a' ! -name 'libprotobuf.a' ! -name 'libprotobuf-lite.a'
  echo '--no-whole-archive'
} > "$OTHER_RSP"
em++ ... "$PROTOBUF_A" "-Wl,@$OTHER_RSP" ...
```

**AFTER:**
```bash
# Test with merged archive
PROTOBUF_DEPS_A=/build/deps/protobuf_deps.a
em++ ... "$PROTOBUF_A" -Wl,--whole-archive "$PROTOBUF_DEPS_A" -Wl,--no-whole-archive ...
```

## Why This Works

1. **Single merged archive** → em++ doesn't have to deal with 87 separate arguments
2. **--whole-archive flag** → Forces inclusion of all object files, resolving circular dependencies between abseil libraries
3. **Consistent approach** → Preflight and full link use the exact same method

## Installation

1. Extract `fixed-scripts.zip` to your `native/` directory
2. Overwrite the existing `link-wasm.sh` and `preflight.sh`
3. Run the build:
   ```bash
   docker build -t valhalla-wasm-builder .
   ```

The build should now complete successfully without undefined symbol errors.

## Expected Build Output

You should see:
```
[link-wasm] Using merged archive: /build/deps/protobuf_deps.a
[link-wasm] Starting full WASM link...
cache:INFO: generating system asset...
cache:INFO:  - ok
[link-wasm] Link successful! Output: /output/valhalla.js
```

No more `wasm-ld: error: undefined symbol` messages!

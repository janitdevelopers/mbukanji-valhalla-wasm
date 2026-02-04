# Valhalla WASM Docker Build: Lessons Learned

This document records issues encountered while building Valhalla to WebAssembly in Docker and the fixes that worked. Use it when rebuilding after updates or when porting to a different package with similar dependencies (protobuf, abseil, utf8_range).

---

## 1. Protobuf → Abseil / utf8_range: Undefined Symbols

### Problem

Linking failed with undefined symbols from `libprotobuf.a`:

- `absl::lts_20230802::log_internal::LogMessageFatal::LogMessageFatal(...)`
- `void absl::lts_20230802::log_internal::LogMessage::CopyToEncodedBuffer<...>(absl::string_view)`
- `absl::lts_20230802::Cord::AppendPrecise(...)`, `Cord::operator=(absl::string_view)`
- `utf8_range::IsStructurallyValid(absl::string_view)`

Protobuf v25 depends on Abseil and utf8_range; those libraries must be on the link line and seen by the linker.

### What we tried (and why it wasn’t enough)

- **Merged archive (`protobuf_deps.a`)**: Merged all dependency `.a` files (abseil + utf8_range) into one archive with `emar` and linked with `--whole-archive protobuf_deps.a`. A **minimal** link (one .cc + libprotobuf + protobuf_deps) succeeded, but the **full** link (wasm_bindings + libvalhalla + libprotobuf + protobuf_deps) still had undefined absl/utf8 symbols.
- **Link order**: Putting protobuf_deps before libprotobuf, or libprotobuf before protobuf_deps, or using `--whole-archive` for both libprotobuf and protobuf_deps did not fix the full link.
- **`--start-group` / `--end-group`**: Wrapping libprotobuf and deps in a group did not help; in practice em++ did not pass these through to wasm-ld as expected.
- **87 separate `-Wl,/path` args**: Passing each dependency `.a` explicitly on the command line was tried; with em++'s internal response file for wasm-ld, those args did not reliably reach the linker.

### Fix that worked

- **Response file for dependency archives**: Build a response file (e.g. `/tmp/protobuf_deps.rsp`) with one line per argument:
  - `-Wl,--whole-archive`
  - One line per dependency: `-Wl,/path/to/libabsl_foo.a` (from `find ... -name '*.a'` under the protobuf build tree, excluding libprotobuf.a / libprotobuf-lite.a)
  - `-Wl,--no-whole-archive`
- Invoke em++ with **`@"$DEPS_RSP"`** so em++ gets each `-Wl,/path` as a separate argument and forwards them to wasm-ld. That way wasm-ld sees each archive and can resolve absl/utf8 symbols.
- **Explicit utf8 libs**: Also link **`-lutf8_validity`** and **`-lutf8_range`** (with `-L` to sysroot) so `utf8_range::IsStructurallyValid` is provided. `IsStructurallyValid` lives in the **utf8_validity** C++ library, not the C library utf8_range.

**Takeaway:** For complex WASM links with many static libs, passing dependency archives via an **em++ response file** (one `-Wl,/path` per line) is more reliable than a single merged archive or a long command line, because em++ then forwards each path to wasm-ld.

---

## 2. Valhalla → Protobuf: std::string_view ABI Mismatch

### Problem

Undefined symbols from `libvalhalla.a`:

- `google::protobuf::MessageLite::ParseFromString(std::__2::basic_string_view<char, std::__2::char_traits<char>>)`
- `google::protobuf::internal::ArenaStringPtr::Set(std::__2::basic_string_view<...>, google::protobuf::Arena*)`

Valhalla was compiled with libc++ and uses `std::string_view` in the API to protobuf. Protobuf/Abseil were built with a different C++ standard, so the exported symbols used a different `string_view` (e.g. `absl::string_view`) and the mangled names did not match.

### Fix

Build protobuf (and thus Abseil) with **C++17** so that `absl::string_view` is the same type as `std::string_view`:

- In the **Emscripten** protobuf build, add: **`-DCMAKE_CXX_STANDARD=17`**.
- Ensure Valhalla is also built with at least C++17 (Emscripten default is usually sufficient).

**Takeaway:** When the application (Valhalla) calls protobuf with `std::string_view`, protobuf and Abseil must be built with C++17 so that `absl::string_view` and `std::string_view` are the same type and symbol names match.

---

## 3. Zlib: Undefined inflate* Symbols

### Problem

`libvalhalla.a(compression_utils.cc.o)` had undefined:

- `inflateInit2_`, `inflate`, `inflateEnd`

Valhalla uses zlib; the custom link command did not link the zlib built for Emscripten.

### Fix

- Link **`-lz`** after the Valhalla/protobuf/deps section.
- Ensure the linker can find libz: add **`-L/emsdk/upstream/emscripten/cache/sysroot/lib`** and **`-L/emsdk/upstream/emscripten/cache/sysroot/lib/wasm32-emscripten`** before `-lz`.
- In the Dockerfile, after building/installing zlib, copy **`libz.a`** into **`sysroot/lib/wasm32-emscripten/`** so that `-lz` resolves even if the default install puts it only under `sysroot/lib/`.

**Takeaway:** Any system/third-party lib the main library uses (here zlib) must be explicitly linked and the search path must include the Emscripten sysroot (and wasm32-emscripten if needed).

---

## 4. LTO and Link Order

### Problem

With **LTO** enabled for Valhalla (`-flto`), `libvalhalla.a` contained LLVM bitcode. In the full link, wasm-ld could reorder or process LTO units in a way that prevented absl/utf8 symbols from protobuf_deps from resolving for libprotobuf.

### Fix

Build Valhalla **without LTO** for the WASM target:

- **`-DCMAKE_CXX_FLAGS="-O3 -DNDEBUG -fno-lto"`**
- **`-DCMAKE_EXE_LINKER_FLAGS="-O3"`** (no `-flto`)

So `libvalhalla.a` contains normal WebAssembly object files and link order is preserved.

**Takeaway:** Mixing LTO bitcode (Valhalla) with non-LTO archives (protobuf deps) can lead to unresolved symbols; for this stack, building Valhalla with `-fno-lto` avoided that.

---

## 5. Docker / Script Environment

### CRLF line endings

Scripts (`link-wasm.sh`, `merge-protobuf-deps.sh`, `preflight.sh`) checked out with CRLF caused shell errors when run inside the container.

**Fix:**

- In the Dockerfile, before running a script, strip CR:  
  **`awk 'gsub(/\r/, "") { } 1' /build/script.sh > /tmp/script.sh && mv /tmp/script.sh /build/script.sh`**
- Prefer **`.gitattributes`** with **`*.sh text eol=lf`** so scripts are committed with LF.

### Build context and path

- **`docker build`** must be run from the directory that contains the **Dockerfile** (e.g. `native/`).
- The last argument must be the build context, usually **`.`** (current directory).
- Example:  
  **`cd C:\Users\...\mbukanji-valhalla-wasm\native`**  
  **`docker build -t valhalla-wasm-builder .`**

---

## 6. utf8_range vs utf8_validity

- **utf8_range**: C library (e.g. `naive.c`, `range2-sse.c`).
- **utf8_validity**: C++ library (`utf8_validity.cc`), uses Abseil, and provides **`utf8_range::IsStructurallyValid(absl::string_view)`**.

Protobuf's generated code calls `IsStructurallyValid`; that symbol is in **libutf8_validity**, not the C lib. So the link line must include **`-lutf8_validity`** (and **`-lutf8_range`** if needed). The Dockerfile copies all `.a` from the protobuf build to the sysroot, so `-lutf8_validity` and `-lutf8_range` resolve when `-L` points at the sysroot.

**Takeaway:** For protobuf v25+, link both **utf8_validity** (C++) and **utf8_range** (C) from the same build tree as protobuf.

---

## 7. Preflight / Validate Target

- A **minimal** link (one .cc that uses protobuf + libprotobuf + deps) is used in **preflight.sh** to validate the protobuf build and merge **before** building Valhalla.
- Preflight should **use protobuf** (e.g. `#include <google/protobuf/arena.h>`, use `Arena`) so that libprotobuf object files are actually pulled in and absl/utf8 resolution is exercised.
- Link order in preflight: **deps (e.g. whole-archive protobuf_deps) then libprotobuf** so that abseil/utf8 are in the link before protobuf objects that reference them.

---

## 8. Summary of Fixes in This Repo

| Issue | Fix |
|-------|-----|
| Abseil/utf8 undefined for libprotobuf | Dependency `.a` list in an **em++ response file** (`@file` with `-Wl,--whole-archive` and one `-Wl,/path` per .a); plus **-lutf8_validity -lutf8_range** |
| Valhalla protobuf symbols (ParseFromString, ArenaStringPtr::Set) undefined | Build protobuf with **-DCMAKE_CXX_STANDARD=17** |
| Zlib (inflate*) undefined | **-lz** and **-L** to sysroot; copy libz.a to sysroot/lib/wasm32-emscripten in Dockerfile |
| Abseil/utf8 still undefined with merged archive in full link | Prefer **response file with per-archive paths** over a single merged archive for the final link |
| LTO / link order issues | Build Valhalla with **-fno-lto** |
| Scripts fail in Docker (CRLF) | **awk** strip of `\r` before running scripts; **.gitattributes eol=lf** for *.sh |
| Wrong directory for docker build | Run **docker build** from **native/** with **`.`** as context |
| CI: WASM files not in wasm/ after download | Download artifact with **path: wasm/** (not `path: .`); remove find/copy workaround; add **if-no-files-found: error** on upload |

---

## 9. CI: WASM Artifact Path (Deploy to npm)

### Problem

Deploy workflow could fail with "No WASM files found to copy" because the artifact was downloaded with `path: .`, so `valhalla.wasm` and `valhalla.js` landed at repo root. A workaround step used `find` to copy them into `wasm/`.

### Fix applied

- **Download** the WASM artifact with **`path: wasm/`** so the two files land directly in `wasm/` where tsup and `scripts/verify-wasm.js` expect them.
- **Removed** the "Ensure WASM files in wasm/" step (find + cp).
- **Added** `if-no-files-found: error` to the upload-artifact step so the job fails early if the prepare step produced no files.

**Takeaway:** When uploading a flat directory (e.g. `wasm/` with two files), download with `path: wasm/` so the consumer gets `wasm/valhalla.wasm` and `wasm/valhalla.js` without extra steps.

---

## Rebuild checklist (after dependency or Valhalla update)

1. **Protobuf / Abseil / utf8_range**
   - Keep **C++17** for the Emscripten protobuf build.
   - Keep copying all `.a` from the protobuf build to the sysroot and merging (for preflight); for the final link, keep using the **response file** of per-archive paths.

2. **Valhalla**
   - Keep **-fno-lto** for the WASM build so link order is stable.
   - Ensure Valhalla's C++ standard is at least 17 if it uses `std::string_view` with protobuf.

3. **Link command**
   - Order: bindings → libvalhalla → libprotobuf → **@deps.rsp** (whole-archive list of dependency .a) → -lutf8_validity -lutf8_range → -lz.
   - Build deps.rsp with `find` over the protobuf build tree (all `.a` except libprotobuf.a / libprotobuf-lite.a).

4. **Emscripten / Docker**
   - Use the same emsdk image (e.g. 3.1.51) or test newer ones; C++17 and response-file behavior should remain valid.
   - If you add new scripts, keep CRLF handling (awk strip or eol=lf) and run docker build from `native/`.

This file can be updated as new issues and fixes are discovered.

**Reference:** The link script that completed successfully is saved in this folder as **`link-wasm-successful.sh`**. The live copy used by the Docker build is `native/link-wasm.sh`.

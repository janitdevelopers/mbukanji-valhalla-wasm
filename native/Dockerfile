# Valhalla WASM Build Environment
# Based on Emscripten SDK for WebAssembly compilation
#
# Usage:
#   docker build -t valhalla-wasm-builder .
#   docker run -v $(pwd)/artifacts:/output valhalla-wasm-builder
#
# Pre-flight (catch link issues before Valhalla build, ~10 min):
#   docker build --target validate -t valhalla-wasm-validate .
#
# Output files will be in ./artifacts/:
#   - valhalla.wasm
#   - valhalla.js (Emscripten glue code)
#
# Dependency sources (reviewed for stability):
#   zlib: zlib.net (stable)
#   protobuf: git clone with --recurse-submodules (tarball omits abseil)
#   protobuf: -Dprotobuf_BUILD_PROTOC_BINARIES=OFF (skip protoc; Valhalla needs lib only)
#   Boost: archives.boost.io (official; JFrog URL can return non-gzip)
#   LZ4: GitHub releases
#   Valhalla: GitHub clone by tag with --recurse-submodules (third_party: robin-hood-hashing, cpp-statsd-client)
# All curl downloads use -fSL so HTTP errors fail the build instead of breaking tar.

FROM emscripten/emsdk:3.1.51 AS base

LABEL maintainer="Mbujkanji"
LABEL description="Build environment for Valhalla WASM compilation"

# Build arguments
ARG VALHALLA_VERSION=3.4.0
ARG PRIME_SERVER_VERSION=0.7.0
ARG BUILD_TYPE=Release

ENV DEBIAN_FRONTEND=noninteractive
ENV VALHALLA_VERSION=${VALHALLA_VERSION}

# Install build dependencies
RUN apt-get update && apt-get install -y \
    git \
    cmake \
    ninja-build \
    pkg-config \
    autoconf \
    automake \
    libtool \
    curl \
    unzip \
    python3 \
    python3-pip \
    jq \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Create working directories
WORKDIR /build
RUN mkdir -p /build/deps /build/valhalla /output

# =============================================================================
# Build dependencies for Emscripten
# =============================================================================

# Build zlib for Emscripten
RUN cd /build/deps && \
    curl -fSL https://zlib.net/zlib-1.3.1.tar.gz | tar xz && \
    cd zlib-1.3.1 && \
    emcmake cmake -B build \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_INSTALL_PREFIX=/emsdk/upstream/emscripten/cache/sysroot \
        && \
    cmake --build build && \
    cmake --install build && \
    mkdir -p /emsdk/upstream/emscripten/cache/sysroot/lib/wasm32-emscripten && \
    cp -n /emsdk/upstream/emscripten/cache/sysroot/lib/libz.a /emsdk/upstream/emscripten/cache/sysroot/lib/wasm32-emscripten/ 2>/dev/null || \
    cp build/libz.a /emsdk/upstream/emscripten/cache/sysroot/lib/wasm32-emscripten/

# Build protobuf for Emscripten (required by Valhalla)
# Use git clone with submodules: release tarball omits abseil-cpp/utf8_range (see protobuf#12448)
# 1) Native build (with protoc) for Valhalla code generation at build time; install to /usr/local
# 2) Emscripten build (lib only) for linking into WASM; install to sysroot
RUN cd /build/deps && \
    git clone --depth 1 --branch v25.1 --recurse-submodules \
        https://github.com/protocolbuffers/protobuf.git protobuf-25.1 && \
    cd protobuf-25.1 && \
    cmake -B build-native \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_INSTALL_PREFIX=/usr/local \
        -Dprotobuf_BUILD_TESTS=OFF \
        -Dprotobuf_BUILD_CONFORMANCE=OFF \
        -Dprotobuf_BUILD_EXAMPLES=OFF \
        -Dprotobuf_WITH_ZLIB=ON \
        && \
    cmake --build build-native -j$(nproc) && \
    cmake --install build-native && \
    emcmake cmake -B build \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_INSTALL_PREFIX=/emsdk/upstream/emscripten/cache/sysroot \
        -DCMAKE_CXX_STANDARD=17 \
        -DCMAKE_CXX_FLAGS="-O3 -DNDEBUG -fno-lto" \
        -Dprotobuf_BUILD_TESTS=OFF \
        -Dprotobuf_BUILD_CONFORMANCE=OFF \
        -Dprotobuf_BUILD_EXAMPLES=OFF \
        -Dprotobuf_BUILD_PROTOC_BINARIES=OFF \
        -Dprotobuf_WITH_ZLIB=ON \
        -Dprotobuf_INSTALL=ON \
        && \
    cmake --build build -j$(nproc) && \
    cmake --install build && \
    find /build/deps/protobuf-25.1/build -name '*.a' -exec cp {} /emsdk/upstream/emscripten/cache/sysroot/lib/ \;

# Merge abseil/utf8_range .a into one archive (avoids 88 args + Docker RUN escaping)
COPY merge-protobuf-deps.sh /build/merge-protobuf-deps.sh
RUN awk 'gsub(/\r/, "") { } 1' /build/merge-protobuf-deps.sh > /tmp/merge-protobuf-deps.sh && mv /tmp/merge-protobuf-deps.sh /build/merge-protobuf-deps.sh && \
    chmod +x /build/merge-protobuf-deps.sh && sh /build/merge-protobuf-deps.sh

# =============================================================================
# Pre-flight: validate protobuf+abseil+utf8_range link before building Valhalla.
# Run: docker build --target validate -t valhalla-wasm-validate .
# Catches protobuf/abseil/utf8_range link issues before the long Valhalla build.
# =============================================================================
FROM base AS validate
COPY preflight.sh /build/preflight.sh
RUN awk 'gsub(/\r/, "") { } 1' /build/preflight.sh > /tmp/preflight.sh && mv /tmp/preflight.sh /build/preflight.sh && \
    chmod +x /build/preflight.sh && sh /build/preflight.sh

# =============================================================================
# Full build (Boost, LZ4, Valhalla, link)
# =============================================================================
FROM base AS builder

# Build Boost headers (header-only libraries needed by Valhalla)
# Use official archive; JFrog URL can return HTML/redirects and break tar
RUN cd /build/deps && \
    curl -fSL https://archives.boost.io/release/1.84.0/source/boost_1_84_0.tar.gz | tar xz && \
    cd boost_1_84_0 && \
    ./bootstrap.sh && \
    ./b2 headers && \
    cp -r boost /emsdk/upstream/emscripten/cache/sysroot/include/

# Build LZ4 for Emscripten
RUN cd /build/deps && \
    curl -fSL https://github.com/lz4/lz4/archive/refs/tags/v1.9.4.tar.gz | tar xz && \
    cd lz4-1.9.4 && \
    emcmake cmake -B build/cmake build/cmake \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_INSTALL_PREFIX=/emsdk/upstream/emscripten/cache/sysroot \
        -DLZ4_BUILD_CLI=OFF \
        -DLZ4_BUILD_LEGACY_LZ4C=OFF \
        && \
    cmake --build build/cmake && \
    cmake --install build/cmake

# =============================================================================
# Clone and patch Valhalla
# =============================================================================

RUN cd /build && \
    git clone --depth 1 --branch ${VALHALLA_VERSION} --recurse-submodules \
        https://github.com/valhalla/valhalla.git valhalla-src

# Copy our WASM-specific patches and build configuration
COPY CMakeLists.wasm.patch /build/
COPY wasm_bindings.cpp /build/
COPY link-wasm.sh /build/link-wasm.sh

# Apply patches for Emscripten compatibility
RUN cd /build/valhalla-src && \
    if [ -f /build/CMakeLists.wasm.patch ]; then \
        git apply /build/CMakeLists.wasm.patch || true; \
    fi

# =============================================================================
# Build Valhalla for WebAssembly
# =============================================================================

RUN cd /build/valhalla-src && \
    emcmake cmake -B build-wasm \
        -G Ninja \
        -DCMAKE_BUILD_TYPE=${BUILD_TYPE} \
        -DProtobuf_PROTOC_EXECUTABLE=/usr/local/bin/protoc \
        -DENABLE_TOOLS=OFF \
        -DENABLE_DATA_TOOLS=OFF \
        -DENABLE_PYTHON_BINDINGS=OFF \
        -DENABLE_SERVICES=OFF \
        -DENABLE_HTTP=OFF \
        -DENABLE_TESTS=OFF \
        -DENABLE_BENCHMARKS=OFF \
        -DENABLE_CCACHE=OFF \
        -DENABLE_COVERAGE=OFF \
        -DENABLE_SANITIZERS=OFF \
        -DENABLE_ADDRESS_SANITIZER=OFF \
        -DENABLE_UNDEFINED_SANITIZER=OFF \
        -DPREFER_EXTERNAL_DEPS=ON \
        # -Wno-deprecated-builtins: third_party robin-hood-hashing uses __has_trivial_copy (deprecated in Clang)
# -Wno-unused-but-set-variable: Valhalla meili/state.h has variable set but not used
# -Wno-error=unused-but-set-variable: ensure -Werror does not turn that warning into error
# -fno-lto: build native .o so wasm-ld preserves link order; LTO in libvalhalla.a caused
# absl symbols from libprotobuf.a to stay undefined despite --whole-archive protobuf_deps.a
# -fexceptions: preserve C++ throw/catch semantics in WASM build (avoids opaque numeric aborts)
        -DCMAKE_CXX_FLAGS="-O3 -DNDEBUG -fno-lto -fexceptions -Wno-deprecated-builtins -Wno-unused-but-set-variable -Wno-error=unused-but-set-variable" \
        -DCMAKE_EXE_LINKER_FLAGS="-O3"

RUN cd /build/valhalla-src && \
    cmake --build build-wasm -j$(nproc) --target valhalla

# =============================================================================
# Create WASM module with Emscripten bindings
# =============================================================================

# Compile WASM bindings (link protobuf + abseil + utf8_range from build tree; order: valhalla, protobuf, then deps)
# Strip CR so script works when checked out with CRLF (awk avoids shell command-substitution parsing)
RUN awk 'gsub(/\r/, "") { } 1' /build/link-wasm.sh > /tmp/link-wasm.sh && mv /tmp/link-wasm.sh /build/link-wasm.sh && \
    chmod +x /build/link-wasm.sh && cd /build/valhalla-src && sh /build/link-wasm.sh

# Copy output files
RUN cp /build/valhalla-src/build-wasm/src/*.wasm /output/ 2>/dev/null || true && \
    ls -la /output/

# Create metadata file
RUN echo '{"version":"'${VALHALLA_VERSION}'","buildDate":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' > /output/metadata.json

# Default command
CMD ["sh", "-c", "cp -r /output/* /artifacts/ 2>/dev/null && echo 'Build artifacts copied to /artifacts/'"]

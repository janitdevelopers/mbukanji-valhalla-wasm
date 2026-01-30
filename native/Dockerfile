# Valhalla WASM Build Environment
# Based on Emscripten SDK for WebAssembly compilation
#
# Usage:
#   docker build -t valhalla-wasm-builder .
#   docker run -v $(pwd)/artifacts:/output valhalla-wasm-builder
#
# Output files will be in ./artifacts/:
#   - valhalla.wasm
#   - valhalla.js (Emscripten glue code)

FROM emscripten/emsdk:3.1.51

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
    && rm -rf /var/lib/apt/lists/*

# Create working directories
WORKDIR /build
RUN mkdir -p /build/deps /build/valhalla /output

# =============================================================================
# Build dependencies for Emscripten
# =============================================================================

# Build zlib for Emscripten
RUN cd /build/deps && \
    curl -L https://zlib.net/zlib-1.3.1.tar.gz | tar xz && \
    cd zlib-1.3.1 && \
    emcmake cmake -B build \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_INSTALL_PREFIX=/emsdk/upstream/emscripten/cache/sysroot \
        && \
    cmake --build build && \
    cmake --install build

# Build protobuf for Emscripten (required by Valhalla)
RUN cd /build/deps && \
    curl -L https://github.com/protocolbuffers/protobuf/releases/download/v25.1/protobuf-25.1.tar.gz | tar xz && \
    cd protobuf-25.1 && \
    emcmake cmake -B build \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_INSTALL_PREFIX=/emsdk/upstream/emscripten/cache/sysroot \
        -Dprotobuf_BUILD_TESTS=OFF \
        -Dprotobuf_BUILD_CONFORMANCE=OFF \
        -Dprotobuf_BUILD_EXAMPLES=OFF \
        -Dprotobuf_WITH_ZLIB=ON \
        && \
    cmake --build build -j$(nproc) && \
    cmake --install build

# Build Boost headers (header-only libraries needed by Valhalla)
RUN cd /build/deps && \
    curl -L https://boostorg.jfrog.io/artifactory/main/release/1.84.0/source/boost_1_84_0.tar.gz | tar xz && \
    cd boost_1_84_0 && \
    ./bootstrap.sh && \
    ./b2 headers && \
    cp -r boost /emsdk/upstream/emscripten/cache/sysroot/include/

# Build LZ4 for Emscripten
RUN cd /build/deps && \
    curl -L https://github.com/lz4/lz4/archive/refs/tags/v1.9.4.tar.gz | tar xz && \
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
    git clone --depth 1 --branch ${VALHALLA_VERSION} \
        https://github.com/valhalla/valhalla.git valhalla-src

# Copy our WASM-specific patches and build configuration
COPY CMakeLists.wasm.patch /build/
COPY wasm_bindings.cpp /build/

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
        -DCMAKE_CXX_FLAGS="-O3 -DNDEBUG -flto" \
        -DCMAKE_EXE_LINKER_FLAGS="-O3 -flto"

RUN cd /build/valhalla-src && \
    cmake --build build-wasm -j$(nproc) --target valhalla

# =============================================================================
# Create WASM module with Emscripten bindings
# =============================================================================

# Compile WASM bindings
RUN cd /build/valhalla-src && \
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
        -I/emsdk/upstream/emscripten/cache/sysroot/include \
        /build/wasm_bindings.cpp \
        -L/build/valhalla-src/build-wasm/src \
        -lvalhalla \
        -o /output/valhalla.js

# Copy output files
RUN cp /build/valhalla-src/build-wasm/src/*.wasm /output/ 2>/dev/null || true && \
    ls -la /output/

# Create metadata file
RUN echo '{"version":"'${VALHALLA_VERSION}'","buildDate":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' > /output/metadata.json

# Default command
CMD ["sh", "-c", "cp -r /output/* /artifacts/ 2>/dev/null && echo 'Build artifacts copied to /artifacts/'"]

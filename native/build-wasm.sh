#!/bin/bash
# =============================================================================
# Valhalla WASM Build Script
# =============================================================================
#
# This script builds Valhalla for WebAssembly using Docker.
# 
# Prerequisites:
#   - Docker installed and running
#   - ~20GB free disk space
#   - ~16GB RAM recommended
#
# Usage:
#   ./build-wasm.sh                    # Build with defaults
#   ./build-wasm.sh --version 3.4.0    # Specify Valhalla version
#   ./build-wasm.sh --clean            # Clean build (no cache)
#
# Pre-flight (validate protobuf+abseil link before full build, ~10 min):
#   docker build --target validate -t valhalla-wasm-validate -f Dockerfile .
#
# Output:
#   ../wasm/valhalla.wasm
#   ../wasm/valhalla.js
#   ../wasm/metadata.json
#
# =============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_ROOT/wasm"
DOCKER_IMAGE="native-01"
VALHALLA_VERSION="3.4.0"
CLEAN_BUILD=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --version)
            VALHALLA_VERSION="$2"
            shift 2
            ;;
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --version VERSION  Valhalla version to build (default: 3.4.0)"
            echo "  --clean           Clean build without Docker cache"
            echo "  --help, -h        Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}  Valhalla WASM Builder${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo -e "  Version:     ${YELLOW}${VALHALLA_VERSION}${NC}"
echo -e "  Output:      ${YELLOW}${OUTPUT_DIR}${NC}"
echo -e "  Clean build: ${YELLOW}${CLEAN_BUILD}${NC}"
echo ""

# Check Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed or not in PATH${NC}"
    exit 1
fi

# Check Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker daemon is not running${NC}"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Build Docker image
echo -e "${GREEN}[1/3] Building Docker image...${NC}"
cd "$SCRIPT_DIR"

BUILD_ARGS="--build-arg VALHALLA_VERSION=$VALHALLA_VERSION"
if [ "$CLEAN_BUILD" = true ]; then
    BUILD_ARGS="$BUILD_ARGS --no-cache"
fi

docker build $BUILD_ARGS -t "$DOCKER_IMAGE" .

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Docker build failed${NC}"
    exit 1
fi

# Run container to extract artifacts
echo -e "${GREEN}[2/3] Extracting WASM artifacts...${NC}"

# Create temporary container and copy files
CONTAINER_ID=$(docker create "$DOCKER_IMAGE")
docker cp "$CONTAINER_ID:/output/." "$OUTPUT_DIR/"
docker rm "$CONTAINER_ID"

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to extract artifacts${NC}"
    exit 1
fi

# Verify output
echo -e "${GREEN}[3/3] Verifying output...${NC}"

if [ ! -f "$OUTPUT_DIR/valhalla.wasm" ]; then
    echo -e "${RED}Error: valhalla.wasm not found in output${NC}"
    exit 1
fi

if [ ! -f "$OUTPUT_DIR/valhalla.js" ]; then
    echo -e "${RED}Error: valhalla.js not found in output${NC}"
    exit 1
fi

# Show file sizes
echo ""
echo -e "${GREEN}Build complete!${NC}"
echo ""
echo "Output files:"
ls -lh "$OUTPUT_DIR"/*.wasm "$OUTPUT_DIR"/*.js 2>/dev/null | while read line; do
    echo "  $line"
done

# Show metadata
if [ -f "$OUTPUT_DIR/metadata.json" ]; then
    echo ""
    echo "Metadata:"
    cat "$OUTPUT_DIR/metadata.json" | jq . 2>/dev/null || cat "$OUTPUT_DIR/metadata.json"
fi

echo ""
echo -e "${GREEN}WASM module ready at: $OUTPUT_DIR${NC}"
echo ""
echo "To use in your project:"
echo "  1. Copy wasm/valhalla.wasm and wasm/valhalla.js to your public folder"
echo "  2. Import the router: import { createRouter } from '@mbujkanji/valhalla-wasm'"
echo "  3. Initialize: await router.init({ wasmPath: '/valhalla.wasm', jsGluePath: '/valhalla.js' })"

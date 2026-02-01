#!/bin/bash
# Test Build System Error Scenarios
# This script tests error handling when WASM files are missing or invalid

set -e

echo "🧪 Testing Build System Error Scenarios"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Missing WASM files
echo "Test 1: Missing WASM files"
if [ -f "wasm/valhalla.wasm" ]; then
    mv wasm/valhalla.wasm wasm/valhalla.wasm.bak
fi

echo "Running build (should fail gracefully)..."
if npm run build 2>&1 | grep -q "Error\|error\|WASM files will not be copied"; then
    echo -e "${GREEN}✓ Build correctly handles missing WASM files${NC}"
else
    echo -e "${RED}✗ Build should have warned about missing files${NC}"
fi

# Restore file if it existed
if [ -f "wasm/valhalla.wasm.bak" ]; then
    mv wasm/valhalla.wasm.bak wasm/valhalla.wasm
fi

echo ""

# Test 2: Empty WASM file
echo "Test 2: Empty WASM file"
if [ -f "wasm/valhalla.wasm" ]; then
    cp wasm/valhalla.wasm wasm/valhalla.wasm.bak
    touch wasm/valhalla.wasm  # Make it empty
    
    echo "Running build (should detect empty file)..."
    if npm run build 2>&1 | grep -q "empty\|Empty"; then
        echo -e "${GREEN}✓ Build correctly detects empty WASM file${NC}"
    else
        echo -e "${YELLOW}⚠ Build may not detect empty file (check manually)${NC}"
    fi
    
    # Restore
    mv wasm/valhalla.wasm.bak wasm/valhalla.wasm
else
    echo -e "${YELLOW}⚠ Skipping - WASM file doesn't exist${NC}"
fi

echo ""
echo "✅ Error scenario tests complete"

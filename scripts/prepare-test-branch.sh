#!/usr/bin/env sh
# Prepare the test branch for deploy: build WASM + package, then stage dist/ and wasm/
# so consumers can install from GitHub (e.g. pnpm add github:janitdevelopers/mbukanji-valhalla-wasm#test).
# Run from repo root. After this script, commit and push the test branch.

set -e
cd "$(dirname "$0")/.."

echo "=== Preparing test branch for deploy ==="

# 1. Build WASM (Docker)
echo ""
echo "[1/3] Building WASM (Docker)..."
pnpm run build:wasm || {
  echo "WARNING: build:wasm failed. Ensure Docker is running and build valhalla.wasm + valhalla.js in wasm/."
  echo "  cd native && docker build -t native-01 . && docker run --rm -v \$(pwd)/../wasm:/artifacts native-01"
  exit 1
}

# 2. Build package (tsup copies wasm -> dist)
echo ""
echo "[2/3] Building package (tsup)..."
pnpm run build

# 3. Stage dist/ and wasm/ for commit (force to override .gitignore)
echo ""
echo "[3/3] Staging dist/ and wasm/ for commit..."
git add -f dist
[ -f wasm/valhalla.wasm ] && git add -f wasm/valhalla.wasm
[ -f wasm/valhalla.js ]   && git add -f wasm/valhalla.js
git status --short dist wasm/valhalla.wasm wasm/valhalla.js 2>/dev/null || true

echo ""
echo "Done. Next steps:"
echo "  git commit -m 'chore(test): add built dist and wasm for install-from-GitHub'"
echo "  git push -u origin test"
echo ""
echo "Then in JanPAMS: pnpm add github:janitdevelopers/mbukanji-valhalla-wasm#test"

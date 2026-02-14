# Prepare the test branch for deploy: build WASM + package, then stage dist/ and wasm/ so
# consumers can install from GitHub (e.g. pnpm add github:janitdevelopers/mbukanji-valhalla-wasm#test).
# Run from repo root. After this script, commit and push the test branch.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== Preparing test branch for deploy ===" -ForegroundColor Cyan

# 1. Build WASM (Docker)
Write-Host "`n[1/3] Building WASM (Docker)..." -ForegroundColor Yellow
try {
    pnpm run build:wasm
} catch {
    Write-Host "WARNING: build:wasm failed. Ensure Docker is running and you have built valhalla.wasm + valhalla.js in wasm/." -ForegroundColor Red
    Write-Host "  You can run: cd native; docker build -t native-01 .; docker run --rm -v `$(pwd)/../wasm:/artifacts native-01" -ForegroundColor Gray
    exit 1
}

# 2. Build package (tsup copies wasm -> dist)
Write-Host "`n[2/3] Building package (tsup)..." -ForegroundColor Yellow
pnpm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 3. Stage dist/ and wasm/ for commit (force to override .gitignore)
Write-Host "`n[3/3] Staging dist/ and wasm/ for commit..." -ForegroundColor Yellow
git add -f dist
if (Test-Path wasm/valhalla.wasm) { git add -f wasm/valhalla.wasm }
if (Test-Path wasm/valhalla.js)   { git add -f wasm/valhalla.js }
git status --short dist wasm/valhalla.wasm wasm/valhalla.js 2>$null

Write-Host "`nDone. Next steps:" -ForegroundColor Green
Write-Host "  git commit -m 'chore(test): add built dist and wasm for install-from-GitHub'"
Write-Host "  git push -u origin test"
Write-Host "`nThen in JanPAMS: pnpm add github:janitdevelopers/mbukanji-valhalla-wasm#test" -ForegroundColor Cyan

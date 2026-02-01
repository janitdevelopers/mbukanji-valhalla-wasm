# Test Package in janpams Project
# Run this script from the mbukanji-valhalla-wasm workspace

Write-Host "🧪 Testing Package in janpams Project" -ForegroundColor Cyan
Write-Host ""

$janpamsPath = "C:\Projects\janpams"
$currentPath = Get-Location

# Check if janpams project exists
if (-not (Test-Path $janpamsPath)) {
    Write-Host "❌ Error: janpams project not found at $janpamsPath" -ForegroundColor Red
    Write-Host "Please update the path in this script or create the project first." -ForegroundColor Yellow
    exit 1
}

Write-Host "Step 1: Building package..." -ForegroundColor Yellow
Write-Host ""

# Build the package
try {
    Write-Host "Running: npm run build" -ForegroundColor Gray
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }
    Write-Host "✅ Package built successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed. Please fix errors first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Verifying WASM files..." -ForegroundColor Yellow
Write-Host ""

# Check WASM files
$wasmFile = Join-Path $currentPath "dist\valhalla.wasm"
$jsFile = Join-Path $currentPath "dist\valhalla.js"

if (-not (Test-Path $wasmFile)) {
    Write-Host "⚠️  Warning: valhalla.wasm not found in dist/" -ForegroundColor Yellow
    Write-Host "   Run 'npm run build:wasm' first to build WASM files" -ForegroundColor Yellow
} else {
    $size = (Get-Item $wasmFile).Length / 1MB
    Write-Host "✅ valhalla.wasm found ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
}

if (-not (Test-Path $jsFile)) {
    Write-Host "⚠️  Warning: valhalla.js not found in dist/" -ForegroundColor Yellow
} else {
    $size = (Get-Item $jsFile).Length / 1KB
    Write-Host "✅ valhalla.js found ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 3: Linking package..." -ForegroundColor Yellow
Write-Host ""

# Link the package
try {
    Write-Host "Running: npm link" -ForegroundColor Gray
    npm link
    Write-Host "✅ Package linked successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to link package" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 4: Linking in janpams project..." -ForegroundColor Yellow
Write-Host ""

# Link in janpams project
Push-Location $janpamsPath
try {
    Write-Host "Running in janpams: npm link @jansoft/mbujkanji-valhalla-wasm" -ForegroundColor Gray
    
    # Check if package.json exists
    if (-not (Test-Path "package.json")) {
        throw "package.json not found in janpams project"
    }
    
    npm link @jansoft/mbujkanji-valhalla-wasm
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Package linked in janpams project" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Link command had issues. Check manually." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to link in janpams project: $_" -ForegroundColor Red
    Write-Host "   You may need to run this manually:" -ForegroundColor Yellow
    Write-Host "   cd $janpamsPath" -ForegroundColor Gray
    Write-Host "   npm link @jansoft/mbujkanji-valhalla-wasm" -ForegroundColor Gray
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Step 5: Verifying installation..." -ForegroundColor Yellow
Write-Host ""

# Verify installation
Push-Location $janpamsPath
try {
    $packagePath = "node_modules\@jansoft\mbujkanji-valhalla-wasm\dist\valhalla.wasm"
    if (Test-Path $packagePath) {
        Write-Host "✅ Package installed correctly" -ForegroundColor Green
        Write-Host "   WASM file found at: $packagePath" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Package may not be linked correctly" -ForegroundColor Yellow
        Write-Host "   Expected: $packagePath" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Could not verify installation" -ForegroundColor Yellow
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Open janpams project in your IDE" -ForegroundColor White
Write-Host "2. Update code to use auto-detection:" -ForegroundColor White
Write-Host "   await router.init()  // No paths needed!" -ForegroundColor Gray
Write-Host "3. Run your app and test" -ForegroundColor White
Write-Host "4. Check browser console for any errors" -ForegroundColor White
Write-Host ""
Write-Host "See TEST_IN_JANPAMS_PROJECT.md for detailed instructions." -ForegroundColor Gray

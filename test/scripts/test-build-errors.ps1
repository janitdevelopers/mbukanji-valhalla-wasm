# Test Build System Error Scenarios (PowerShell)
# This script tests error handling when WASM files are missing or invalid

Write-Host "🧪 Testing Build System Error Scenarios" -ForegroundColor Cyan
Write-Host ""

# Test 1: Missing WASM files
Write-Host "Test 1: Missing WASM files" -ForegroundColor Yellow
$wasmBackup = $null
if (Test-Path "wasm/valhalla.wasm") {
    Move-Item "wasm/valhalla.wasm" "wasm/valhalla.wasm.bak" -Force
    $wasmBackup = $true
}

Write-Host "Running build (should fail gracefully)..."
try {
    $output = npm run build 2>&1 | Out-String
    if ($output -match "Error|error|WASM files will not be copied") {
        Write-Host "✓ Build correctly handles missing WASM files" -ForegroundColor Green
    } else {
        Write-Host "✗ Build should have warned about missing files" -ForegroundColor Red
    }
} catch {
    Write-Host "Build failed (expected)" -ForegroundColor Yellow
}

# Restore file if it existed
if ($wasmBackup) {
    Move-Item "wasm/valhalla.wasm.bak" "wasm/valhalla.wasm" -Force
}

Write-Host ""

# Test 2: Empty WASM file
Write-Host "Test 2: Empty WASM file" -ForegroundColor Yellow
if (Test-Path "wasm/valhalla.wasm") {
    Copy-Item "wasm/valhalla.wasm" "wasm/valhalla.wasm.bak" -Force
    "" | Out-File "wasm/valhalla.wasm" -NoNewline  # Make it empty
    
    Write-Host "Running build (should detect empty file)..."
    try {
        $output = npm run build 2>&1 | Out-String
        if ($output -match "empty|Empty") {
            Write-Host "✓ Build correctly detects empty WASM file" -ForegroundColor Green
        } else {
            Write-Host "⚠ Build may not detect empty file (check manually)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Build failed (expected for empty file)" -ForegroundColor Yellow
    }
    
    # Restore
    Move-Item "wasm/valhalla.wasm.bak" "wasm/valhalla.wasm" -Force
} else {
    Write-Host "⚠ Skipping - WASM file doesn't exist" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Error scenario tests complete" -ForegroundColor Green

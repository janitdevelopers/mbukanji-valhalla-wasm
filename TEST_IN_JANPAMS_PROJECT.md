# Testing Package in janpams Project

**Target Project**: `C:\Projects\janpams`  
**Package Location**: `C:\Users\sonan\Projects\mbukanji-valhalla-wasm`

This guide helps you test the `@jansoft/mbujkanji-valhalla-wasm` package in your real application.

---

## Quick Start (5 minutes)

### Step 1: Link the Package

In the **mbukanji-valhalla-wasm** project (current workspace):
```bash
# Build the package first
npm run build

# Create a link
npm link
```

In the **janpams** project (`C:\Projects\janpams`):
```bash
# Link to the local package
npm link @jansoft/mbujkanji-valhalla-wasm
```

### Step 2: Test Auto-Detection

In your janpams app, update your code to use auto-detection:

**Before** (with hardcoded paths):
```typescript
const router = createRouter()
await router.init({
  wasmPath: '/valhalla.wasm',
  jsGluePath: '/valhalla.js'
})
```

**After** (auto-detection - no paths needed!):
```typescript
const router = createRouter()
await router.init()  // It just works!
```

### Step 3: Verify It Works

Run your janpams app and check:
- ✅ No errors in console
- ✅ Router initializes successfully
- ✅ WASM files load automatically
- ✅ Routing works as expected

---

## Detailed Testing Steps

### Phase 1: Setup (5 minutes)

#### 1.1 Build the Package

In **mbukanji-valhalla-wasm** workspace:
```bash
# Ensure WASM files are built
npm run build:wasm  # If not already done

# Build the package
npm run build

# Verify WASM files are in dist/
ls dist/valhalla.wasm
ls dist/valhalla.js
```

#### 1.2 Link the Package

**Option A: npm link (Recommended for development)**

In **mbukanji-valhalla-wasm**:
```bash
npm link
```

In **janpams** project:
```bash
cd C:\Projects\janpams
npm link @jansoft/mbujkanji-valhalla-wasm
```

**Option B: Install from local path**

In **janpams** project:
```bash
cd C:\Projects\janpams
npm install C:\Users\sonan\Projects\mbukanji-valhalla-wasm
```

#### 1.3 Verify Installation

In **janpams** project:
```bash
# Check package is linked/installed
npm list @jansoft/mbujkanji-valhalla-wasm

# Check WASM files are present
ls node_modules/@jansoft/mbujkanji-valhalla-wasm/dist/valhalla.wasm
ls node_modules/@jansoft/mbujkanji-valhalla-wasm/dist/valhalla.js
```

---

### Phase 2: Update Your Code (10 minutes)

#### 2.1 Remove Hardcoded Paths

Find where you initialize the router in janpams:

**Search for**:
- `wasmPath:`
- `jsGluePath:`
- `'/valhalla.wasm'`
- `'/valhalla.js'`

**Replace with auto-detection**:

```typescript
// OLD WAY
import { createRouter } from '@jansoft/mbujkanji-valhalla-wasm'

const router = createRouter()
await router.init({
  wasmPath: '/valhalla.wasm',
  jsGluePath: '/valhalla.js'
})

// NEW WAY (auto-detection)
import { createRouter } from '@jansoft/mbujkanji-valhalla-wasm'

const router = createRouter()
await router.init()  // No paths needed!
```

#### 2.2 Test Path Resolution (Optional)

If you want to see what paths are being used:

```typescript
import { createRouter, getWasmPaths } from '@jansoft/mbujkanji-valhalla-wasm'

// Check auto-detected paths
const paths = getWasmPaths()
console.log('Auto-detected WASM path:', paths.wasm)
console.log('Auto-detected JS path:', paths.js)

// Use auto-detection
const router = createRouter()
await router.init()
```

---

### Phase 3: Test Scenarios (15 minutes)

#### 3.1 Test Auto-Detection

**Test**: Router initializes without paths

```typescript
const router = createRouter()
await router.init()  // Should work!
```

**Expected**: 
- ✅ No errors
- ✅ Router initializes
- ✅ Console shows successful initialization

#### 3.2 Test Custom Paths (Backward Compatibility)

**Test**: Custom paths still work

```typescript
const router = createRouter()
await router.init({
  wasmPath: 'https://cdn.example.com/valhalla.wasm',
  jsGluePath: 'https://cdn.example.com/valhalla.js'
})
```

**Expected**: 
- ✅ Custom paths are used
- ✅ Router initializes with custom paths

#### 3.3 Test Error Handling

**Test**: Missing WASM files (if applicable)

```typescript
const router = createRouter()
try {
  await router.init({
    wasmPath: '/nonexistent.wasm'
  })
} catch (error) {
  console.log('Error message:', error.message)
  // Should be helpful and actionable
}
```

**Expected**: 
- ✅ Error message is clear
- ✅ Error suggests solutions
- ✅ Error includes debugging info

#### 3.4 Test Full Routing Flow

**Test**: Complete routing workflow

```typescript
const router = createRouter()
await router.init()  // Auto-detection
await router.loadTiles(tilesBuffer)
const route = await router.route({
  locations: [
    { lat: 4.0511, lon: 9.7679 },
    { lat: 3.8480, lon: 11.5021 }
  ],
  costing: 'auto'
})
```

**Expected**: 
- ✅ Everything works end-to-end
- ✅ Routes calculate correctly
- ✅ No path-related errors

---

### Phase 4: Verify in Different Environments

#### 4.1 Development Mode

```bash
# In janpams project
npm run dev
# or
npm start
```

**Check**:
- ✅ App starts without errors
- ✅ Router initializes
- ✅ WASM files load

#### 4.2 Production Build

```bash
# In janpams project
npm run build
npm run start  # or however you run production
```

**Check**:
- ✅ Build completes successfully
- ✅ WASM files are included in build
- ✅ Production app works

#### 4.3 Check Browser Console

Open browser DevTools and check:
- ✅ No 404 errors for WASM files
- ✅ No CORS errors
- ✅ Router initializes successfully
- ✅ Console shows successful WASM loading

---

## Troubleshooting

### Issue: "WASM file not found"

**Symptoms**: 404 error for `valhalla.wasm`

**Solutions**:
1. Verify package is linked correctly:
   ```bash
   npm list @jansoft/mbujkanji-valhalla-wasm
   ```

2. Check WASM files exist in package:
   ```bash
   ls node_modules/@jansoft/mbujkanji-valhalla-wasm/dist/valhalla.wasm
   ```

3. Rebuild package:
   ```bash
   # In mbukanji-valhalla-wasm
   npm run build
   
   # In janpams
   npm link @jansoft/mbujkanji-valhalla-wasm --force
   ```

### Issue: "CORS policy" error

**Symptoms**: CORS error when loading WASM

**Solutions**:
1. Ensure bundler is handling WASM files (Vite/Webpack should do this automatically)
2. Check that WASM files are being served correctly
3. If using custom paths, ensure CORS headers are set

### Issue: Path resolution fails

**Symptoms**: Error about path resolution

**Solutions**:
1. Check bundler configuration
2. Try using custom paths as fallback:
   ```typescript
   import { getWasmPaths } from '@jansoft/mbujkanji-valhalla-wasm'
   const paths = getWasmPaths()
   console.log('Paths:', paths)
   await router.init(paths)
   ```

### Issue: Package not found

**Symptoms**: `Cannot find module '@jansoft/mbujkanji-valhalla-wasm'`

**Solutions**:
1. Re-link the package:
   ```bash
   # In mbukanji-valhalla-wasm
   npm link
   
   # In janpams
   npm link @jansoft/mbujkanji-valhalla-wasm
   ```

2. Or install from path:
   ```bash
   npm install C:\Users\sonan\Projects\mbukanji-valhalla-wasm
   ```

---

## Test Checklist

Use this checklist when testing:

### Setup
- [ ] Package built in mbukanji-valhalla-wasm
- [ ] Package linked/installed in janpams
- [ ] WASM files present in `node_modules/.../dist/`

### Code Updates
- [ ] Removed hardcoded `wasmPath` and `jsGluePath`
- [ ] Using `router.init()` without paths
- [ ] Code compiles without errors

### Functionality
- [ ] Router initializes successfully
- [ ] No console errors
- [ ] WASM files load automatically
- [ ] Routing works as before
- [ ] Custom paths still work (if tested)

### Different Environments
- [ ] Development mode works
- [ ] Production build works
- [ ] Browser console shows no errors

---

## Quick Reference

### Link Package
```bash
# In mbukanji-valhalla-wasm
npm link

# In janpams
npm link @jansoft/mbujkanji-valhalla-wasm
```

### Update Code
```typescript
// Change from:
await router.init({ wasmPath: '/valhalla.wasm' })

// To:
await router.init()  // Auto-detection!
```

### Check Paths
```typescript
import { getWasmPaths } from '@jansoft/mbujkanji-valhalla-wasm'
console.log(getWasmPaths())
```

### Unlink Package
```bash
# In janpams
npm unlink @jansoft/mbujkanji-valhalla-wasm
npm install @jansoft/mbujkanji-valhalla-wasm  # Reinstall from npm
```

---

## Success Criteria

✅ **Package works in janpams project when**:
- Router initializes without paths
- No console errors
- Routing functionality works
- WASM files load automatically
- Production build includes WASM files

---

## Next Steps After Testing

Once testing in janpams is successful:

1. ✅ Document any issues found
2. ✅ Fix any bugs discovered
3. ✅ Update package if needed
4. ✅ Re-test in janpams
5. ✅ Publish package to npm
6. ✅ Update janpams to use published version

---

## Need Help?

If you encounter issues:
1. Check browser console for errors
2. Verify package is linked correctly
3. Check that WASM files exist in dist/
4. Review error messages (they should be helpful)
5. Try using custom paths as temporary workaround

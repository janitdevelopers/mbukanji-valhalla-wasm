# Quick Test Guide - janpams Project

**Fastest way to test the package in your janpams app**

---

## 🚀 3-Step Quick Test

### Step 1: Link the Package (2 minutes)

**In mbukanji-valhalla-wasm workspace**:
```bash
npm run build
npm link
```

**In janpams project** (`C:\Projects\janpams`):
```bash
cd C:\Projects\janpams
npm link @jansoft/mbujkanji-valhalla-wasm
```

**Or use the automated script**:
```powershell
# From mbukanji-valhalla-wasm workspace
.\test-janpams.ps1
```

### Step 2: Update Your Code (1 minute)

Find where you initialize the router and change:

```typescript
// OLD
await router.init({
  wasmPath: '/valhalla.wasm',
  jsGluePath: '/valhalla.js'
})

// NEW (auto-detection)
await router.init()  // That's it!
```

### Step 3: Test (1 minute)

```bash
# In janpams project
npm run dev
# or
npm start
```

**Check**:
- ✅ No errors in console
- ✅ Router initializes
- ✅ App works normally

---

## ✅ Success Indicators

- No 404 errors for WASM files
- No CORS errors
- Router initializes successfully
- Routing works as before

---

## ❌ If It Doesn't Work

1. **Check package is linked**:
   ```bash
   npm list @jansoft/mbujkanji-valhalla-wasm
   ```

2. **Check WASM files exist**:
   ```bash
   ls node_modules/@jansoft/mbujkanji-valhalla-wasm/dist/valhalla.wasm
   ```

3. **Rebuild and re-link**:
   ```bash
   # In mbukanji-valhalla-wasm
   npm run build
   npm link
   
   # In janpams
   npm link @jansoft/mbujkanji-valhalla-wasm --force
   ```

4. **Check browser console** for specific error messages

---

## 📋 Full Testing Guide

For detailed instructions, see: `TEST_IN_JANPAMS_PROJECT.md`

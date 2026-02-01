# Publishing Updated Package to npm

**Goal**: Publish the updated package (with WASM auto-detection) to npm, then use it in janpams project.

**Current Version**: `0.1.0`  
**Package Name**: `@jansoft/mbujkanji-valhalla-wasm`

---

## Prerequisites

### 1. npm Account Setup
- ✅ You have an npm account
- ✅ You're logged in: `npm whoami`
- ✅ You have publish access to `@jansoft` scope

### 2. Package Ready
- ✅ WASM files built (`npm run build:wasm`)
- ✅ Package built (`npm run build`)
- ✅ Tests pass (`npm test`)
- ✅ Verification passes (`node scripts/verify-wasm.js`)

---

## Step-by-Step Publishing Guide

### Step 1: Update Version (if needed)

**Current version**: `0.1.0`

**Options**:
- **Patch** (0.1.0 → 0.1.1): Bug fixes, small changes
- **Minor** (0.1.0 → 0.2.0): New features (WASM auto-detection)
- **Major** (0.1.0 → 1.0.0): Breaking changes

**For this update** (WASM auto-detection is a new feature):
```bash
# Update to 0.2.0 (minor version bump)
npm version minor
# or manually edit package.json: "version": "0.2.0"
```

**Or use patch if you prefer**:
```bash
npm version patch  # 0.1.0 → 0.1.1
```

### Step 2: Build & Verify

```bash
# Build WASM files (if not done)
npm run build:wasm

# Build package (copies WASM to dist/)
npm run build

# Verify WASM files
node scripts/verify-wasm.js

# Run tests
npm test
```

**Expected**:
- ✅ Build completes
- ✅ WASM files in `dist/`
- ✅ Verification passes
- ✅ Tests pass

### Step 3: Test Prepublish Hook

```bash
# This runs: npm run build && node scripts/verify-wasm.js
npm run prepublishOnly
```

**Expected**: 
- ✅ Builds package
- ✅ Verifies WASM files
- ✅ No errors

### Step 4: Dry Run (Recommended)

```bash
# See what would be published (doesn't actually publish)
npm publish --dry-run
```

**Check**:
- ✅ `dist/` folder included
- ✅ `valhalla.wasm` and `valhalla.js` in dist/
- ✅ `README.md` included
- ✅ `LICENSE` included
- ✅ No unnecessary files

### Step 5: Publish to npm

```bash
# Publish to npm
npm publish

# Or with explicit access (for scoped packages)
npm publish --access public
```

**Expected**:
- ✅ Package published successfully
- ✅ Version available on npm
- ✅ Can install with `npm install @jansoft/mbujkanji-valhalla-wasm@0.2.0`

### Step 6: Verify on npm

Visit: https://www.npmjs.com/package/@jansoft/mbujkanji-valhalla-wasm

**Check**:
- ✅ New version listed
- ✅ Files include `dist/valhalla.wasm`
- ✅ Package description updated

---

## Using Published Version in janpams

### Step 1: Install/Update in janpams

```bash
cd C:\Projects\janpams

# Install new version
npm install @jansoft/mbujkanji-valhalla-wasm@latest

# Or specific version
npm install @jansoft/mbujkanji-valhalla-wasm@0.2.0

# Or update existing
npm update @jansoft/mbujkanji-valhalla-wasm
```

### Step 2: Verify Installation

```bash
# Check version
npm list @jansoft/mbujkanji-valhalla-wasm

# Check WASM files exist
ls node_modules/@jansoft/mbujkanji-valhalla-wasm/dist/valhalla.wasm
ls node_modules/@jansoft/mbujkanji-valhalla-wasm/dist/valhalla.js
```

### Step 3: Update Code

**In janpams project**, update your router initialization:

```typescript
// OLD (with hardcoded paths)
import { createRouter } from '@jansoft/mbujkanji-valhalla-wasm'

const router = createRouter()
await router.init({
  wasmPath: '/valhalla.wasm',
  jsGluePath: '/valhalla.js'
})

// NEW (auto-detection - no paths needed!)
import { createRouter } from '@jansoft/mbujkanji-valhalla-wasm'

const router = createRouter()
await router.init()  // It just works!
```

### Step 4: Test

```bash
# Run your app
npm run dev
# or
npm start
```

**Check**:
- ✅ No errors in console
- ✅ Router initializes
- ✅ WASM files load automatically
- ✅ Routing works

---

## Version Bump Options

### Automatic (Recommended)

```bash
# Patch: 0.1.0 → 0.1.1 (bug fixes)
npm version patch

# Minor: 0.1.0 → 0.2.0 (new features)
npm version minor

# Major: 0.1.0 → 1.0.0 (breaking changes)
npm version major
```

**What it does**:
- Updates `package.json` version
- Creates git commit
- Creates git tag

### Manual

Edit `package.json`:
```json
{
  "version": "0.2.0"
}
```

Then commit:
```bash
git add package.json
git commit -m "Bump version to 0.2.0"
git tag v0.2.0
```

---

## Publishing Checklist

Before publishing, verify:

- [ ] Version updated in `package.json`
- [ ] WASM files built (`wasm/valhalla.wasm` exists)
- [ ] Package built (`npm run build` successful)
- [ ] WASM files copied to `dist/`
- [ ] Verification script passes (`node scripts/verify-wasm.js`)
- [ ] Tests pass (`npm test`)
- [ ] `prepublishOnly` hook works (`npm run prepublishOnly`)
- [ ] Dry run looks good (`npm publish --dry-run`)
- [ ] npm account logged in (`npm whoami`)
- [ ] Have publish access to `@jansoft` scope
- [ ] README.md is up to date
- [ ] CHANGELOG.md updated (if you maintain one)

---

## Troubleshooting

### "You do not have permission to publish"

**Solution**:
1. Check you're logged in: `npm whoami`
2. Login if needed: `npm login`
3. Verify scope access: Check npm organization settings
4. Use `--access public` for scoped packages:
   ```bash
   npm publish --access public
   ```

### "Package already exists"

**Solution**:
- Version already published - bump version:
  ```bash
  npm version patch  # or minor/major
  npm publish
  ```

### "WASM files not found"

**Solution**:
1. Build WASM files: `npm run build:wasm`
2. Build package: `npm run build`
3. Verify: `node scripts/verify-wasm.js`

### "prepublishOnly hook failed"

**Solution**:
- Check build errors: `npm run build`
- Check verification errors: `node scripts/verify-wasm.js`
- Fix issues before publishing

---

## Quick Publish Commands

```bash
# 1. Update version
npm version minor  # or patch/major

# 2. Build & verify
npm run build:wasm  # If not done
npm run build
npm run prepublishOnly

# 3. Dry run
npm publish --dry-run

# 4. Publish
npm publish --access public

# 5. In janpams, update
cd C:\Projects\janpams
npm install @jansoft/mbujkanji-valhalla-wasm@latest
```

---

## After Publishing

### 1. Update janpams Project

```bash
cd C:\Projects\janpams
npm install @jansoft/mbujkanji-valhalla-wasm@latest
```

### 2. Update Code

Remove hardcoded paths, use auto-detection:
```typescript
await router.init()  // No paths needed!
```

### 3. Test

Run your app and verify everything works.

### 4. Commit Changes

```bash
# In janpams
git add package.json package-lock.json
git commit -m "Update @jansoft/mbujkanji-valhalla-wasm to v0.2.0"
```

---

## Summary

**Publishing Flow**:
1. ✅ Update version (`npm version minor`)
2. ✅ Build WASM (`npm run build:wasm`)
3. ✅ Build package (`npm run build`)
4. ✅ Verify (`npm run prepublishOnly`)
5. ✅ Dry run (`npm publish --dry-run`)
6. ✅ Publish (`npm publish --access public`)

**Using in janpams**:
1. ✅ Install: `npm install @jansoft/mbujkanji-valhalla-wasm@latest`
2. ✅ Update code: `await router.init()` (no paths)
3. ✅ Test: Run app and verify

---

## Next Steps

1. **Before Publishing**:
   - Build WASM files
   - Run all tests
   - Verify everything works

2. **Publish**:
   - Follow steps above
   - Use `npm publish --dry-run` first

3. **After Publishing**:
   - Update janpams project
   - Test in real app
   - Monitor for any issues

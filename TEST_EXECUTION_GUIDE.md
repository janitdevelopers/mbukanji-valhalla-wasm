# Test Execution Guide

This document provides step-by-step instructions for executing the testing plan.

## Prerequisites

1. **Install dependencies**:
   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Build WASM files** (if not already built):
   ```bash
   npm run build:wasm
   # This takes 30-60 minutes
   ```

---

## Phase 1: Build & Script Verification

### 1.1 Check WASM Files Exist

```bash
# Windows PowerShell
Test-Path wasm/valhalla.wasm
Test-Path wasm/valhalla.js

# Linux/Mac
ls -lh wasm/valhalla.wasm
ls -lh wasm/valhalla.js
```

**Expected**: Files exist (~8-15MB for .wasm, ~50-200KB for .js)

### 1.2 Test Build System

```bash
npm run build
```

**Check output**:
- Should see: `✓ Copied valhalla.wasm to dist/`
- Should see: `✓ Copied valhalla.js to dist/`

**Verify files**:
```bash
# Windows
Test-Path dist/valhalla.wasm
Test-Path dist/valhalla.js

# Linux/Mac
ls -lh dist/valhalla.wasm
ls -lh dist/valhalla.js
```

### 1.3 Test Verification Script

```bash
node scripts/verify-wasm.js
```

**Expected output**:
```
🔍 Verifying WASM files...

Checking source files in wasm/ directory:
  ✓ valhalla.wasm (XXXX KB)
  ✓ valhalla.js (XXXX KB)

Checking built files in dist/ directory:
  ✓ valhalla.wasm (XXXX KB)
  ✓ valhalla.js (XXXX KB)

✅ All WASM files verified successfully!
```

### 1.4 Test Prepublish Hook

```bash
npm run prepublishOnly
```

**Expected**: 
- Build completes
- Verification script runs
- No errors

### 1.5 Test Error Scenarios

**Test missing WASM files**:
```bash
# Backup files
mv wasm/valhalla.wasm wasm/valhalla.wasm.bak

# Try to build (should fail)
npm run build

# Restore files
mv wasm/valhalla.wasm.bak wasm/valhalla.wasm
```

**Expected**: Build fails with helpful error message suggesting `npm run build:wasm`

---

## Phase 2: Unit Tests

### 2.1 Run Path Resolution Tests

```bash
npm test -- test/unit/wasm-paths.test.ts
```

**Expected**: All tests pass

### 2.2 Run WASM Loader Tests

```bash
npm test -- test/unit/wasm-loader.test.ts
```

**Expected**: All tests pass

### 2.3 Run All Unit Tests

```bash
npm test
# or
npm run test:run
```

**Expected**: All tests pass, including new path resolution tests

---

## Phase 3: Integration Tests

### 3.1 Node.js ESM Test

```bash
# First, build the package
npm run build

# Then run ESM test
node test/integration/node-esm.test.mjs
```

**Expected output**:
```
🧪 Testing Node.js ESM environment...

1. Testing path resolution...
   ✅ Path resolution works
   WASM: [path]
   JS: [path]

2. Testing router creation...
   ✅ Router created successfully

3. Testing initialization (path resolution)...
   ✅ Initialization succeeded (WASM files present)
   OR
   ⚠️  Initialization failed (expected - WASM files not built)
   ✅ Path resolution worked

✅ All Node.js ESM tests passed!
```

### 3.2 Node.js CJS Test

```bash
node test/integration/node-cjs.test.js
```

**Expected**: Similar output to ESM test

### 3.3 Browser Test

```bash
npm test -- test/integration/browser.test.ts
```

**Note**: Requires Vitest browser mode or Playwright setup

---

## Phase 4: Manual Bundler Testing

### 4.1 Vite Project Test

**Step 1**: Create test project
```bash
npm create vite@latest test-vite-project -- --template react-ts
cd test-vite-project
npm install
```

**Step 2**: Link or install package
```bash
# Option A: npm link (for development)
cd ../mbukanji-valhalla-wasm
npm link
cd ../test-vite-project
npm link @jansoft/mbujkanji-valhalla-wasm

# Option B: Install from local path
npm install ../mbukanji-valhalla-wasm
```

**Step 3**: Create test component
Create `src/TestValhalla.tsx`:
```typescript
import { useEffect } from 'react'
import { createRouter } from '@jansoft/mbujkanji-valhalla-wasm'

export function TestValhalla() {
  useEffect(() => {
    const test = async () => {
      try {
        const router = createRouter()
        await router.init()  // Should work without paths!
        console.log('✅ Vite test passed - Router initialized')
      } catch (error) {
        console.error('❌ Vite test failed:', error)
      }
    }
    test()
  }, [])

  return <div>Check console for test results</div>
}
```

**Step 4**: Run dev server
```bash
npm run dev
```

**Expected**: 
- No errors in console
- Router initializes successfully
- WASM files load correctly

### 4.2 Next.js App Router Test

**Step 1**: Create Next.js project
```bash
npx create-next-app@latest test-nextjs-app --typescript --app
cd test-nextjs-app
```

**Step 2**: Install package (same as Vite)

**Step 3**: Create test page
Create `app/test/page.tsx`:
```typescript
'use client'

import { useEffect, useState } from 'react'
import { createRouter } from '@jansoft/mbujkanji-valhalla-wasm'

export default function TestPage() {
  const [status, setStatus] = useState('Testing...')

  useEffect(() => {
    const test = async () => {
      try {
        const router = createRouter()
        await router.init()
        setStatus('✅ Next.js test passed!')
      } catch (error: any) {
        setStatus(`❌ Failed: ${error.message}`)
      }
    }
    test()
  }, [])

  return <div>{status}</div>
}
```

**Step 4**: Run dev server
```bash
npm run dev
```

**Expected**: Page loads, router initializes

---

## Phase 5: Error Scenario Testing

### 5.1 Missing WASM Files Test

**Test**: Install package in a project, but WASM files are missing from `node_modules/@jansoft/mbujkanji-valhalla-wasm/dist/`

**Expected**: Clear error message suggesting fixes

### 5.2 CORS Test

**Test**: Serve WASM files from different origin

**Expected**: Error message explains CORS and provides solutions

### 5.3 Invalid Paths Test

```typescript
const router = createRouter()
await router.init({
  wasmPath: 'invalid://path/to/file.wasm'
})
```

**Expected**: Helpful error with debugging information

---

## Quick Test Checklist

### ✅ Can Test Now (Without WASM Files):
- [x] Unit tests for path resolution (`test/unit/wasm-paths.test.ts`)
- [x] Unit tests for WASM loader (`test/unit/wasm-loader.test.ts`)
- [x] Integration test structure created
- [x] Verification script error handling

### ⚠️ Requires WASM Files:
- [ ] Build system copying (Phase 1.2)
- [ ] Verification script validation (Phase 1.3)
- [ ] Prepublish hook (Phase 1.4)
- [ ] Integration tests with actual initialization (Phase 3)
- [ ] Manual bundler testing (Phase 4)

---

## Test Results Template

After running tests, document results:

```markdown
## Test Results - [Date]

### Phase 1: Build & Script Verification
- [ ] 1.1 WASM files exist
- [ ] 1.2 Build system copies files
- [ ] 1.3 Verification script works
- [ ] 1.4 Prepublish hook works
- [ ] 1.5 Error scenarios handled

### Phase 2: Unit Tests
- [ ] wasm-paths.test.ts - All pass
- [ ] wasm-loader.test.ts - All pass

### Phase 3: Integration Tests
- [ ] Node.js ESM - Pass
- [ ] Node.js CJS - Pass
- [ ] Browser - Pass

### Phase 4: Manual Bundler Testing
- [ ] Vite - Pass
- [ ] Next.js App Router - Pass
- [ ] Next.js Pages Router - Pass
- [ ] Webpack - Pass (if tested)

### Phase 5: Error Scenarios
- [ ] Missing WASM files - Error message helpful
- [ ] CORS errors - Error message helpful
- [ ] Invalid paths - Error message helpful
```

---

## Troubleshooting

### Tests Fail to Run

**Issue**: `vitest` not found
**Solution**: 
```bash
npm install
# or
pnpm install
```

### Build Fails

**Issue**: WASM files not found
**Solution**: 
```bash
npm run build:wasm
```

### Integration Tests Fail

**Issue**: Module not found
**Solution**: 
```bash
npm run build  # Build package first
```

### Browser Tests Don't Run

**Issue**: Browser environment not configured
**Solution**: Configure Vitest browser mode or use Playwright

---

## Next Steps After Testing

1. **If all tests pass**: Ready to publish
2. **If tests fail**: 
   - Document failures
   - Fix issues
   - Re-test
3. **If WASM files missing**: 
   - Build WASM files first
   - Then run full test suite

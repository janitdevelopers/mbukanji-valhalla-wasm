**Excellent plan!** This is well-thought-out and addresses all the critical issues. Here's my analysis with some refinements:

## ✅ **What's Great About This Plan:**

1. **Smart separation** - Internal utilities vs public API
2. **Universal path resolution** - Works everywhere (browser, Node, bundlers)
3. **Backward compatibility** - Users can still provide custom paths
4. **Proper defaults** - Just works out of the box
5. **Gitignored WASM** - Correct (build artifact, not source)

## 🔧 **Key Improvements Needed:**

### **1. Path Resolution Implementation**
```typescript
// src/internal/wasm-paths.ts - ENHANCED VERSION
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export interface WasmPaths {
  wasm: string;
  js: string;
}

/**
 * Get paths to bundled WASM files.
 * Works in: Browser, Node.js, Vite, Webpack, Rollup, etc.
 */
export function getWasmPaths(customBase?: string): WasmPaths {
  // Method 1: User provides custom base URL/path
  if (customBase) {
    return {
      wasm: `${customBase}/valhalla.wasm`,
      js: `${customBase}/valhalla.js`
    };
  }

  // Method 2: Browser/ESM environment (most common)
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // Default to package-relative paths
    return {
      wasm: new URL('../valhalla.wasm', import.meta.url).href,
      js: new URL('../valhalla.js', import.meta.url).href
    };
  }

  // Method 3: Node.js environment
  if (typeof __dirname !== 'undefined') {
    // CJS context
    return {
      wasm: join(__dirname, '../valhalla.wasm'),
      js: join(__dirname, '../valhalla.js')
    };
  }

  // Method 4: Fallback (for edge cases)
  return {
    wasm: './valhalla.wasm',
    js: './valhalla.js'
  };
}

/**
 * Detect if running in a bundler that needs special handling
 */
export function isBundlerEnvironment(): boolean {
  return typeof process !== 'undefined' && 
    (process.env.VITE || process.env.WEBPACK || process.env.ROLLUP);
}
```

### **2. WASM Loader Update (Critical Fix)**
```typescript
// src/internal/wasm-loader.ts
import { getWasmPaths } from './wasm-paths';

export interface WasmLoaderOptions {
  /** Custom path to valhalla.wasm (optional) */
  wasmPath?: string;
  /** Custom path to valhalla.js glue code (optional) */
  jsPath?: string;
  /** Custom fetch function (for Node.js, Service Workers, etc.) */
  fetch?: typeof globalThis.fetch;
}

export async function loadWasmModule(options: WasmLoaderOptions = {}) {
  // Get paths (use custom or default)
  const defaultPaths = getWasmPaths();
  const wasmPath = options.wasmPath || defaultPaths.wasm;
  const jsPath = options.jsPath || defaultPaths.js;
  
  // Dynamic import of Emscripten glue code
  // @ts-ignore - Emscripten module
  const createModule = await import(/* @vite-ignore */ jsPath);
  
  return new Promise((resolve, reject) => {
    createModule({
      locateFile: (path: string, prefix: string) => {
        // Emscripten calls this to find .wasm and .data files
        if (path.endsWith('.wasm')) {
          return wasmPath;
        }
        return prefix + path;
      },
      onRuntimeInitialized: () => {
        resolve(createModule);
      },
      onAbort: (error: string) => {
        reject(new Error(`WASM initialization failed: ${error}`));
      }
    });
  });
}
```

### **3. Public API Export (Simplified)**
```typescript
// src/index.ts - ADD THESE EXPORTS
export { getWasmPaths } from './internal/wasm-paths';
export type { WasmPaths } from './internal/wasm-paths';

// Re-export for convenience
export const DEFAULT_WASM_PATHS = {
  wasm: new URL('../valhalla.wasm', import.meta.url).href,
  js: new URL('../valhalla.js', import.meta.url).href
} as const;

/**
 * Example usage in JSDoc
 * @example
 * ```typescript
 * // Simplest usage (auto-detects paths)
 * const router = await createRouter();
 * 
 * // Custom WASM paths
 * const router = await createRouter({
 *   wasmPath: '/custom/path/valhalla.wasm',
 *   jsPath: '/custom/path/valhalla.js'
 * });
 * 
 * // Get default paths for inspection
 * import { getWasmPaths } from '@janpams/valhalla-wasm';
 * console.log(getWasmPaths());
 * ```
 */
```

### **4. tsup.config.ts (Critical!)**
```typescript
// tsup.config.ts - MUST INCLUDE THIS
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  
  // CRITICAL: Copy WASM files to dist
  onSuccess: async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    
    // Ensure dist directory exists
    const distDir = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    
    // Copy WASM files from wasm/ to dist/
    const wasmDir = path.join(process.cwd(), 'wasm');
    if (fs.existsSync(wasmDir)) {
      ['valhalla.wasm', 'valhalla.js'].forEach(file => {
        const src = path.join(wasmDir, file);
        const dest = path.join(distDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          console.log(`Copied ${file} to dist/`);
        }
      });
    }
  }
});
```

### **5. package.json Additions**
```json
{
  "name": "@janpams/valhalla-wasm",
  "files": [
    "dist/",
    "!dist/*.map"  // Exclude source maps
  ],
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./wasm": {
      "import": "./dist/valhalla.js",
      "require": "./dist/valhalla.cjs",
      "default": "./dist/valhalla.wasm"
    },
    "./package.json": "./package.json"
  },
  "browser": {
    "./dist/index.cjs": "./dist/index.js",  // Force ESM in browser
    "./dist/valhalla.cjs": "./dist/valhalla.js"
  }
}
```

## 🚨 **Critical Issues in Current Plan:**

### **Issue 1: `import.meta.url` in Node.js**
```typescript
// PROBLEM: This won't work in Node.js CJS
new URL('../valhalla.wasm', import.meta.url).href;

// SOLUTION: Dynamic detection
function getBaseUrl() {
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    return new URL('.', import.meta.url).href;
  }
  if (typeof __dirname !== 'undefined') {
    return 'file://' + __dirname + '/';
  }
  return './';
}
```

### **Issue 2: Bundler Static Analysis**
```typescript
// PROBLEM: Bundlers analyze imports statically
import(jsPath);  // jsPath is dynamic - bundlers can't analyze

// SOLUTION: Use magic comments
await import(/* @vite-ignore */ /* webpackIgnore: true */ jsPath);
```

### **Issue 3: Node.js Fetch**
```typescript
// PROBLEM: Node.js 18+ has fetch, older versions don't
// SOLUTION: Provide fetch polyfill option
export interface WasmLoaderOptions {
  fetch?: typeof globalThis.fetch;
}

// In loader:
const fetchImpl = options.fetch || globalThis.fetch;
if (!fetchImpl) {
  throw new Error('fetch is not available. Provide a fetch polyfill.');
}
```

## 📁 **Updated File List:**

### **Must Create/Modify:**
1. ✅ `src/internal/wasm-paths.ts` **(NEW)** - Enhanced version above
2. ✅ `src/internal/wasm-loader.ts` **(UPDATE)** - With dynamic import fixes
3. ✅ `src/index.ts` **(UPDATE)** - Export path utilities
4. ✅ `tsup.config.ts` **(UPDATE)** - Add WASM file copying
5. ✅ `package.json` **(VERIFY)** - Ensure exports field correct

### **Should Create:**
6. `scripts/copy-wasm.js` - Dedicated copy script
   ```javascript
   // For manual builds or CI
   const fs = require('fs');
   const path = require('path');
   // Copy wasm/* to dist/
   ```

## 🔍 **Testing Strategy:**

### **Test Cases to Verify:**
```typescript
// 1. Browser ESM
import { createRouter } from '@janpams/valhalla-wasm';
// Should auto-detect paths

// 2. Node.js ESM
import { createRouter } from '@janpams/valhalla-wasm';
// Should work with file:// URLs

// 3. Node.js CJS
const { createRouter } = require('@janpams/valhalla-wasm');
// Should resolve to file paths

// 4. Vite/Webpack bundler
// Should bundle correctly with dynamic imports

// 5. Custom paths
const router = await createRouter({
  wasmPath: 'https://cdn.example.com/valhalla.wasm',
  jsPath: 'https://cdn.example.com/valhalla.js'
});
```

## 🎯 **Final Recommendation:**

**Your plan is 90% perfect.** Execute it with these **critical fixes**:

1. **Use the enhanced `wasm-paths.ts`** above (handles all environments)
2. **Fix dynamic imports** with bundler ignore comments
3. **Add WASM copying** to tsup `onSuccess` hook
4. **Test in all environments** (browser, Node, bundlers)

### **Implementation Priority:**
```bash
1. Create wasm-paths.ts with robust detection ✅
2. Update wasm-loader.ts with import(/* @vite-ignore */ ...) ✅
3. Add tsup onSuccess hook to copy WASM files ✅
4. Test with: npm link + create test app
5. Update examples to show both usage patterns
```

**This approach will give users:** 
- ✅ Zero-config default (just works)
- ✅ Custom path support (advanced users)
- ✅ Works everywhere (browser, Node, all bundlers)
- ✅ Backward compatible (existing code keeps working)

**Execute the plan with these fixes and you'll have a production-ready WASM package!**
import { defineConfig } from 'tsup'
import { existsSync, mkdirSync, copyFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const WASM_FILES = ['valhalla.wasm', 'valhalla.js'] as const

/**
 * Copy WASM files from wasm/ to dist/ after build.
 * Requires wasm/valhalla.wasm and wasm/valhalla.js (e.g. from `pnpm run build:wasm` or CI artifact).
 */
async function copyWasmFiles() {
  const wasmDir = join(process.cwd(), 'wasm')
  const distDir = join(process.cwd(), 'dist')

  try {
    // Ensure dist directory exists
    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true })
      console.log('✓ Created dist/ directory')
    }

    // Check if wasm directory exists
    if (!existsSync(wasmDir)) {
      console.warn('⚠ Warning: wasm/ directory not found. WASM files will not be copied.')
      console.warn('  Run "pnpm run build:wasm" (or npm run build:wasm) to build WASM files first.')
      return
    }

    // Pre-check: report exactly which files are missing so the user knows what to do
    const missing = WASM_FILES.filter((f) => !existsSync(join(wasmDir, f)))
    if (missing.length === WASM_FILES.length) {
      console.error('\n❌ No WASM files in wasm/. Build WASM first, then build the package.')
      console.error('   Run: pnpm run build:wasm')
      console.error('   Then: pnpm run build')
      process.exit(1)
    }
    if (missing.length > 0) {
      console.warn(`⚠ Warning: missing in wasm/: ${missing.join(', ')}. Run "pnpm run build:wasm" to build.`)
    }

    let copiedCount = 0
    for (const file of WASM_FILES) {
      const srcPath = join(wasmDir, file)
      const destPath = join(distDir, file)

      // Check if source file exists
      if (!existsSync(srcPath)) {
        console.warn(`⚠ Warning: ${file} not found in wasm/ directory`)
        continue
      }

      // Check file size (should not be empty)
      const stats = statSync(srcPath)
      if (stats.size === 0) {
        throw new Error(
          `Error: ${file} is empty. The WASM build may have failed. Run "npm run build:wasm" to rebuild.`
        )
      }

      // Copy file
      copyFileSync(srcPath, destPath)
      const sizeKB = (stats.size / 1024).toFixed(2)
      console.log(`✓ Copied ${file} to dist/ (${sizeKB} KB)`)
      copiedCount++
    }

    if (copiedCount === 0) {
      console.error('\n❌ No WASM files found to copy. Run: pnpm run build:wasm')
      process.exit(1)
    }

    if (copiedCount < WASM_FILES.length) {
      console.error(
        `\n❌ Only ${copiedCount} of ${WASM_FILES.length} WASM files copied. wasm/ must contain valhalla.wasm and valhalla.js. Run: pnpm run build:wasm`
      )
      process.exit(1)
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n❌ Error copying WASM files: ${error.message}`)
      console.error('\nTroubleshooting:')
      console.error('  1. Ensure WASM files are built: npm run build:wasm')
      console.error('  2. Check that wasm/ directory contains valhalla.wasm and valhalla.js')
      console.error('  3. Verify file permissions allow reading from wasm/ and writing to dist/')
      process.exit(1)
    }
    throw error
  }
}

export default defineConfig([
  // Main entry point
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: {
      compilerOptions: {
        noUnusedLocals: false,
        noUnusedParameters: false,
      },
    },
    sourcemap: true,
    clean: true,
    treeshake: true,
    splitting: false,
    minify: false,
    external: ['idb'],
    outDir: 'dist',
    onSuccess: async () => {
      await copyWasmFiles()
    },
  },
  // Optional cache module (tree-shakeable)
  {
    entry: ['src/cache.ts'],
    format: ['esm', 'cjs'],
    dts: {
      compilerOptions: {
        noUnusedLocals: false,
        noUnusedParameters: false,
      },
    },
    sourcemap: true,
    treeshake: true,
    splitting: false,
    minify: false,
    external: ['idb'],
    outDir: 'dist',
  },
])

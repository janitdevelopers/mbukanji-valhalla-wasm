import { defineConfig } from 'tsup'
import { existsSync, mkdirSync, copyFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Copy WASM files from wasm/ to dist/ after build
 */
async function copyWasmFiles() {
  const wasmDir = join(process.cwd(), 'wasm')
  const distDir = join(process.cwd(), 'dist')
  const wasmFiles = ['valhalla.wasm', 'valhalla.js']

  try {
    // Ensure dist directory exists
    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true })
      console.log('✓ Created dist/ directory')
    }

    // Check if wasm directory exists
    if (!existsSync(wasmDir)) {
      console.warn('⚠ Warning: wasm/ directory not found. WASM files will not be copied.')
      console.warn('  Run "npm run build:wasm" to build WASM files first.')
      return
    }

    let copiedCount = 0
    for (const file of wasmFiles) {
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
      throw new Error(
        'Error: No WASM files found to copy. Run "npm run build:wasm" to build WASM files first.'
      )
    }

    if (copiedCount < wasmFiles.length) {
      console.warn(
        `⚠ Warning: Only ${copiedCount} of ${wasmFiles.length} WASM files were copied.`
      )
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

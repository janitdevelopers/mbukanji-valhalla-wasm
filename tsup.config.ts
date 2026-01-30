import { defineConfig } from 'tsup'

export default defineConfig([
  // Main entry point
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    splitting: false,
    minify: false,
    external: ['idb'],
    outDir: 'dist',
  },
  // Optional cache module (tree-shakeable)
  {
    entry: ['src/cache.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    treeshake: true,
    splitting: false,
    minify: false,
    external: ['idb'],
    outDir: 'dist',
  },
])

import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    headers: {
      // Required for SharedArrayBuffer if using threading
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['@jansoft/mbujkanji-valhalla-wasm'],
  },
})

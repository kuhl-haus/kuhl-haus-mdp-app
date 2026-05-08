import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so Vite generates asset URLs as './[name]-[hash].ext' rather
  // than the default absolute '/assets/[name]-[hash].ext'. The app.Dockerfile
  // copies dist/assets/* into static/dist/ (flattening the assets/ subdir), so
  // an absolute /assets/ URL would 404 behind py4web's /static/ prefix.
  // With base: './', import.meta.url resolution works correctly from static/dist/index.js.
  base: './',
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'forks',  // avoids coverage temp-file race condition with thread pool
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{js,vue}'],
      exclude: ['src/main.js', 'src/**/__tests__/**'],
      // Branch coverage threshold. 93% reflects the state after issue #151
      // ($.setupState refactor removed some direct-access test shortcuts).
      // Statement coverage is ~95% but v8 doesn't expose a statement threshold.
      thresholds: {
        branches: 93,
      },
    },
  },
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'assets/index.css';
          }
          return 'assets/[name]-[hash][extname]';
        },
        manualChunks: undefined
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
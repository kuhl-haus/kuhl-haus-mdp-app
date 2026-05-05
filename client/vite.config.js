import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
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
          return '[name].[ext]';
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
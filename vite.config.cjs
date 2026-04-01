const path = require('path')
const react = require('@vitejs/plugin-react')
const { defineConfig } = require('vite')
const { inspectAttr } = require('kimi-plugin-inspect-react')

module.exports = defineConfig({
  base: '/',
  cacheDir: '/tmp/vite-cache',
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
      },
    },
  },
})


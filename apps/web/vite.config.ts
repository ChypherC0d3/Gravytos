import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Polyfill for Node.js globals used by crypto libraries
    global: 'globalThis',
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    exclude: ['tiny-secp256k1'],
    include: ['buffer'],
  },
});

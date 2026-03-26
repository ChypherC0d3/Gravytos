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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-wagmi': ['wagmi', '@rainbow-me/rainbowkit', 'viem'],
          'vendor-solana': ['@solana/web3.js'],
          'vendor-bitcoin': ['bitcoinjs-lib', 'bip39'],
          'vendor-qr': ['qrcode.react', 'jsqr'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['tiny-secp256k1'],
    include: ['buffer'],
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@gravytos/types': path.resolve(__dirname, '../../packages/types/src'),
      '@gravytos/config': path.resolve(__dirname, '../../packages/config/src'),
      '@gravytos/core': path.resolve(__dirname, '../../packages/core/src'),
      '@gravytos/state': path.resolve(__dirname, '../../packages/state/src'),
      '@gravytos/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@gravytos/api-client': path.resolve(__dirname, '../../packages/api-client/src'),
    },
  },
  // Tauri-specific settings
  clearScreen: false,
  server: {
    port: 5174,
    strictPort: true,
    host: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: 'es2020',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});

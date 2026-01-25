import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@wago/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  // Tauri settings
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  define: {
    // By default, Vite doesn't define this, but we can set it to false for browser dev
    // 'window.__TAURI_INTERNALS__': JSON.stringify(false), 
    // Actually, Tauri injects this at runtime. We don't want to overwrite it if it exists.
    // So let's leave it alone.
  },
  build: {
    sourcemap: true,
  },
});
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const isCapacitor = process.env.CAPACITOR === 'true';

// Project Pages deploy under /kings-road/ (github.io/<org>/<repo>/).
// Root-relative URLs like /assets/... 404 there. We set base='/kings-road/' in
// that environment, './' for Capacitor (bundles want relative), '/' for dev.
const resolveBase = () => {
  if (isCapacitor) return './';
  if (process.env.GITHUB_PAGES === 'true') return '/kings-road/';
  return '/';
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './app'),
    },
  },
  base: resolveBase(),
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          rapier: ['@react-three/rapier'],
          postprocessing: ['@react-three/postprocessing', 'postprocessing'],
          vendor: ['react', 'react-dom', 'zustand', 'koota', 'zod'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@capacitor-community/sqlite', 'jeep-sqlite'],
  },
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.wasm'],
});

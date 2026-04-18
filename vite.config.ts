import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const isCapacitor = process.env.CAPACITOR === 'true';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './app'),
    },
  },
  base: isCapacitor ? './' : '/',
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
    chunkSizeWarningLimit: 2000,
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

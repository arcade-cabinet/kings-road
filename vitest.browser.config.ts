/// <reference types="@vitest/browser/matchers" />
/// <reference types="@vitest/browser/providers/playwright" />

import path from 'node:path';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './app'),
    },
  },
  optimizeDeps: {
    force: true,
    include: [
      'react',
      'react-dom',
      'three',
      'three-stdlib',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/postprocessing',
      '@capacitor/app',
      '@capacitor/core',
      '@capacitor/haptics',
    ],
    exclude: ['koota', 'koota/react'],
  },
  test: {
    globals: true,
    include: ['app/**/__tests__/**/*.browser.test.{ts,tsx}'],
    fileParallelism: false,
    testTimeout: 30000,
    browser: {
      enabled: true,
      provider: playwright({
        launchOptions: {
          args: [
            '--enable-webgl',
            '--enable-unsafe-swiftshader',
            '--ignore-gpu-blocklist',
            '--use-gl=angle',
            '--use-angle=swiftshader-webgl',
          ],
        },
      }),
      instances: [
        {
          browser: 'chromium',
          headless: true,
          viewport: { width: 1440, height: 1024 },
        },
      ],
      screenshotFailures: true,
    },
  },
});

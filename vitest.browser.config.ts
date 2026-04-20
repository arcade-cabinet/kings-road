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
    // force: false — the previous `force: true` re-bundled on every run
    // and produced 10+ minute cold-start hangs in Vitest browser mode,
    // especially under CI parallel port contention. Hash-based cache
    // eviction is sufficient.
    force: false,
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
    include: [
      'app/**/__tests__/**/*.browser.test.{ts,tsx}',
      'app/**/__tests__/**/*.fixture.test.{ts,tsx}',
    ],
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

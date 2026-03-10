import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  define: {
    __DEV__: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/game/stores/**/*.{ts,tsx}',
        'src/game/utils/**/*.{ts,tsx}',
        'src/game/hooks/**/*.{ts,tsx}',
        'src/game/types.ts',
        'src/lib/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/__tests__/**',
        'src/types/**',
        'src/vite-env.d.ts',
        // Exclude React Three Fiber components (complex WebGL testing)
        'src/game/components/**',
        'src/game/systems/**',
        'src/game/Game.tsx',
      ],
      thresholds: {
        global: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
  },
});

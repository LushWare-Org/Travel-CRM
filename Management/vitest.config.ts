import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // e2e/ holds Playwright specs (@playwright/test's `test`, not vitest's) —
    // without this, vitest's default glob picks up e2e/**/*.spec.js and
    // fails trying to run them under the wrong test runner. Re-list vitest's
    // own defaults too since setting `exclude` replaces them, not merges.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.{idea,git,cache,output,temp}/**', '**/e2e/**'],
  },
});

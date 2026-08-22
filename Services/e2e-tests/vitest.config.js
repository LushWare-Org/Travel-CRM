import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // All specs hit the same shared live Postgres instance through the
    // Gateway — running files in parallel would race on the same lead's
    // lifecycle transitions, so force one file (and one test within it) at a time.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 30_000,
    hookTimeout: 30_000,
    globalSetup: ['./global-setup.js'],
  },
});

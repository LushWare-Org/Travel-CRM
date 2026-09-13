import { defineConfig } from 'vitest/config';

// Pure scoring tests for the synthetic harness. No globalSetup, because these
// tests must not require a live stack:
//
//   * `globalSetup.js` waits for every service and refuses to run without the
//     shared-DB opt-in, which is right for the HTTP specs and wrong here;
//   * it also consumes real /auth/login calls against the Gateway's
//     10-per-15-minutes limiter, and a pure function test has no business
//     spending that budget.
//
// Run: npm run test:unit
export default defineConfig({
  test: {
    globals: true,
    include: ['synthetic/**/*.test.js'],
    exclude: ['node_modules/**', '**/*.spec.js'],
    testTimeout: 10_000,
  },
});

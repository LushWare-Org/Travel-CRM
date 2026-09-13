import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // All specs hit the same shared live Postgres instance through the
    // Gateway — running files in parallel would race on the same lead's
    // lifecycle transitions, so force one file (and one test within it) at a time.
    fileParallelism: false,
    sequence: { concurrent: false },
    // Test files do NOT share module state by default even with
    // fileParallelism disabled — each file gets a fresh module registry,
    // so helpers/auth-helper.js's per-run token cache (Map) was silently
    // re-populated per file, multiplying real /auth/login calls against
    // the Gateway's 10-req/15min authLimiter well past its budget once
    // enough spec files exist. Disabling isolation keeps every spec file
    // in the same worker/module registry, so the cache is genuinely
    // shared for the whole run, matching its own stated intent.
    isolate: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    globalSetup: ['./global-setup.js'],
  },
});

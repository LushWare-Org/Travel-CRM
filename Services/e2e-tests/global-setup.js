// Loaded here (before anything else) so GATEWAY_URL / E2E_I_UNDERSTAND_SHARED_DB
// from .env are in process.env before the safety guard below reads them, and
// before any worker process is spawned to run the actual spec files (which
// inherit this process's env at spawn time).
import 'dotenv/config';
import { waitForAllServices } from './helpers/wait-for-services.js';

// This suite writes real rows into the one shared live Supabase Postgres
// instance every service points at (see CLAUDE.md — there is no disposable
// test database). These two guards exist so nobody runs it against a
// production URL by accident, or without realizing what it does to the DB.
function assertSafeToRun() {
  const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000/api/v1';
  const isLocal = /localhost|127\.0\.0\.1/.test(gatewayUrl);
  const looksProd = /api\.lushtravelcloud\.com|\bprod(uction)?\b/i.test(gatewayUrl);

  if (!isLocal || looksProd) {
    throw new Error(
      `Refusing to run backend E2E tests against GATEWAY_URL="${gatewayUrl}".\n` +
      `This suite only ever runs against a local Gateway (http://localhost:3000/api/v1 by default).`
    );
  }

  if (process.env.E2E_I_UNDERSTAND_SHARED_DB !== 'true') {
    throw new Error(
      'Refusing to run: E2E_I_UNDERSTAND_SHARED_DB is not set to "true".\n' +
      'This suite creates real rows in the shared live Postgres database used by every ' +
      'service (there is no disposable test DB in this repo). Records are tagged with a ' +
      'per-run marker and cleaned up automatically, but you must opt in explicitly first.\n' +
      'Copy .env.example to .env, review it, and set E2E_I_UNDERSTAND_SHARED_DB=true.'
    );
  }
}

export default async function globalSetup() {
  assertSafeToRun();
  await waitForAllServices();

  // Shared across every spec file via process.env — vitest's globalSetup
  // runs in a separate process from the test files themselves, but env vars
  // set here ARE inherited by the worker processes that run the specs.
  process.env.E2E_RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  console.log(`[e2e] RUN_ID = ${process.env.E2E_RUN_ID}`);
}

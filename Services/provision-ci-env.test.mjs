// Tests for the CI env provisioner, run with the built-in runner:
//
//   node --test Services/provision-ci-env.test.mjs
//
// No framework on purpose: `Services/` has no test runner and no devDependency to
// add one, and the functions under test are pure except for the write path this
// file exists to exercise.
//
// WHY THE WRITE PATH IS TESTED HERE. The first CI run of the Management E2E job
// died in this script with
//   TypeError: The "path" argument must be of type string ... Received type boolean (true)
// because `plan()` returned a boolean named `example` and the writer passed it to
// readFileSync. `--dry-run` — the only mode anyone had run — returns before that
// line, so the bug was invisible to every check that existed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ciDatabaseUrl, forceEnvValue, plan, applyPlan, PLACEHOLDER_DSN } from './provision-ci-env.mjs';

const DSN = 'postgresql://ci:ci@127.0.0.1:5432/ci';

// CI sets CI_DATABASE_URL for the whole job, and a developer may have DATABASE_URL
// exported. The refusal branch is about having NEITHER, so the test states that
// rather than inheriting whatever the environment happens to hold — the first
// version inherited it, passed locally, and failed in CI with 'Missing expected
// exception'.
function withNoAmbientDsn(fn) {
  const savedCi = process.env.CI_DATABASE_URL;
  const savedDirect = process.env.DATABASE_URL;
  delete process.env.CI_DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    return fn();
  } finally {
    if (savedCi !== undefined) process.env.CI_DATABASE_URL = savedCi;
    if (savedDirect !== undefined) process.env.DATABASE_URL = savedDirect;
  }
}

/** A throwaway repo root with one service .env.example and one app .env.example. */
function fakeRepo() {
  const root = mkdtempSync(path.join(tmpdir(), 'provision-'));
  for (const dir of ['Services/lead-service', 'Management']) {
    mkdirSync(path.join(root, dir), { recursive: true });
  }
  writeFileSync(
    path.join(root, 'Services/lead-service/.env.example'),
    'PORT=3004\nDATABASE_URL="postgresql://postgres.example:pooler.supabase.com:6543/postgres?pgbouncer=true"\n# DIRECT_URL=old\n',
  );
  writeFileSync(path.join(root, 'Management/.env.example'), 'VITE_API_URL=http://localhost:3000/api/v1\n');
  return root;
}

test('forceEnvValue replaces an active line, a commented line, or appends', () => {
  assert.equal(forceEnvValue('PORT=1\n', 'PORT', '2'), 'PORT=2\n');
  assert.equal(forceEnvValue('# PORT=1\n', 'PORT', '2'), 'PORT=2\n');
  assert.equal(forceEnvValue('OTHER=1\n', 'PORT', '2'), 'OTHER=1\nPORT=2\n');
});

test('ciDatabaseUrl refuses to invent a database when nothing supplies one', () => {
  withNoAmbientDsn(() => {
    assert.throws(() => ciDatabaseUrl({ databaseUrl: undefined }), /No database URL/);
    // A dry run must print a plan on a machine with no database at all.
    assert.equal(ciDatabaseUrl({ allowPlaceholder: true }), PLACEHOLDER_DSN);
  });

  // An explicit value always wins, whatever the environment holds.
  assert.equal(ciDatabaseUrl({ databaseUrl: DSN }), DSN);
  assert.equal(ciDatabaseUrl({ databaseUrl: DSN, allowPlaceholder: true }), DSN);
});

test('the plan carries a path to read, not a boolean', () => {
  const root = fakeRepo();
  const [service] = plan({ repoRoot: root, databaseUrl: DSN, allowPlaceholder: false }).filter(
    (entry) => entry.dir === 'Services/lead-service',
  );

  assert.equal(typeof service.examplePath, 'string');
  assert.equal(service.examplePath, path.join(root, 'Services/lead-service/.env.example'));
  assert.equal(service.hasExample, true);
});

test('the write path materialises a .env with the forced values and drops the example DSN', () => {
  // The regression: this call is what threw `Received type boolean (true)` in CI.
  const root = fakeRepo();

  applyPlan(plan({ repoRoot: root, databaseUrl: DSN }), { log: () => {} });

  const written = readFileSync(path.join(root, 'Services/lead-service/.env'), 'utf8');
  assert.match(written, /^DATABASE_URL=postgresql:\/\/ci:ci@127\.0\.0\.1:5432\/ci$/m);
  assert.match(written, /^DIRECT_URL=postgresql:\/\/ci:ci@127\.0\.0\.1:5432\/ci$/m);
  // The example's Supabase DSN must not survive anywhere in the file.
  assert.doesNotMatch(written, /pooler\.supabase\.com/);
  assert.match(written, /^PORT=3004$/m);

  // A non-service keeps only its own forced values, and still gets a .env.
  const app = readFileSync(path.join(root, 'Management/.env'), 'utf8');
  assert.match(app, /^VITE_MANAGEMENT_COPILOT_ENABLED=true$/m);
  assert.doesNotMatch(app, /^DATABASE_URL=/m);
});

test('a dry run writes nothing', () => {
  const root = fakeRepo();

  applyPlan(plan({ repoRoot: root, databaseUrl: DSN, allowPlaceholder: true }), { dryRun: true, log: () => {} });

  assert.equal(existsSync(path.join(root, 'Services/lead-service/.env')), false);
  assert.equal(existsSync(path.join(root, 'Management/.env')), false);
});

test('the copilot gates are forced, because a missing one fails silently', () => {
  const root = fakeRepo();

  applyPlan(plan({ repoRoot: root, databaseUrl: DSN }), { log: () => {} });

  // assistant-service is not in the fake repo, so assert the mapping instead of a
  // file: without MANAGEMENT_COPILOT_ENABLED the copilot routes answer 404, and
  // without the VITE_ flag the panel is not in the bundle at all.
  const entries = plan({ repoRoot: root, databaseUrl: DSN });
  assert.equal(entries.every((entry) => typeof entry.examplePath === 'string'), true);
  const management = entries.find((entry) => entry.dir === 'Management');
  assert.deepEqual(management.values, { VITE_MANAGEMENT_COPILOT_ENABLED: 'true' });
});

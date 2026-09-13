// ═══════════════════════════════════════════════════════════════════════════════
// Suppression-state fixture — backdated ManagementLastSeen rows
// ═══════════════════════════════════════════════════════════════════════════════
//
// WHY THIS EXISTS
//   Suppression is a time-window behaviour, and the only HTTP writer of this
//   state is `POST /api/v1/assistant/management/seen`, which stamps SERVER time
//   and accepts no client timestamp (deliberately — see the design). So through
//   the API alone the state is always "a moment ago" and no suppression window
//   has ever elapsed. Testing "come back tomorrow and it stays quiet" therefore
//   needs a backdated row, and a backdated row can only be written directly.
//
// WHAT IT WRITES
//   ManagementLastSeen rows only: the table that exists today. When the ranking
//   work adds `InsightState`, this script grows a section for it; see the TODO at
//   the bottom. Nothing here touches any other table.
//
// WHERE IT WRITES
//   The same shared dev Postgres every service points at. There is no disposable
//   test database in this repo. Rows are scoped to one actor and removable in one
//   command. Writes refuse without an explicit opt-in and refuse if the DSN looks
//   like production.
//
// USAGE
//   Backdate one operator's acknowledgement for a page (30 hours ago):
//     SYNTH_I_UNDERSTAND_SHARED_DB=true \
//       node scripts/suppression-state.mjs --actor <userId> --page leads --scope '{}' --age-hours 30
//
//   Read it back:
//     node scripts/suppression-state.mjs --actor <userId> --page leads --scope '{}' --show
//
//   Remove everything this script ever wrote for one actor:
//     SYNTH_I_UNDERSTAND_SHARED_DB=true \
//       node scripts/suppression-state.mjs --actor <userId> --cleanup
//
//   Inspect the intended write without worrying about any of the above:
//     node scripts/suppression-state.mjs --actor <userId> --page leads --age-hours 30 --dry-run
//
// ORDER OF OPERATIONS (deliberate)
//   --help and --dry-run open no database connection at all.
//   Any write or delete passes the guard BEFORE a database client is constructed,
//   so a refused run never even reaches the point of being able to write.
//
// SAFETY
//   Writes only ManagementLastSeen, only for the actor you name, only with the
//   opt-in set. `--cleanup` deletes by actorId, so on a shared dev database it
//   removes that operator's copilot acknowledgement history, which is the point of
//   the fixture and is why it is scoped and explicit rather than automatic.

import 'dotenv/config';
import { pathToFileURL } from 'node:url';

const JSON_INDENT = 2;

/** Mirrors `scopeFingerprint` in managementCopilot.controller.js exactly. */
export function scopeFingerprint(scope) {
  return JSON.stringify(scope ?? {});
}

/**
 * Backdate helper. Kept pure and exported so the arithmetic is unit-tested
 * rather than trusted. `ageHours` of 0 means "now", which is what the API already
 * gives you and is therefore useless for window tests.
 */
export function backdatedInstant(ageHours, now = new Date()) {
  const age = Number(ageHours);
  if (ageHours === undefined || ageHours === null || !Number.isFinite(age) || age < 0) {
    throw new Error(`--age-hours must be a non-negative number, got ${ageHours}`);
  }
  return new Date(now.getTime() - age * 3_600_000);
}

/**
 * The write guard. Returns reasons rather than throwing, so the caller can print
 * all of them at once instead of making the operator fix one, re-run, and find
 * the next.
 */
export function assertSafeToWrite({ databaseUrl } = {}) {
  const reasons = [];
  const optInValues = ['SYNTH_I_UNDERSTAND_SHARED_DB', 'E2E_I_UNDERSTAND_SHARED_DB']
    .map((name) => process.env[name])
    .filter(Boolean);

  if (!optInValues.some((value) => value === 'true')) {
    reasons.push(
      'Refusing to write: set SYNTH_I_UNDERSTAND_SHARED_DB=true (or E2E_I_UNDERSTAND_SHARED_DB=true).\n' +
        'This script writes real rows into the shared dev database that every service uses.',
    );
  }

  const url = databaseUrl ?? process.env.DATABASE_URL ?? '';
  if (!url) {
    reasons.push('Refusing to write: DATABASE_URL is not set (check Services/assistant-service/.env).');
  } else if (/prod(uction)?/i.test(url)) {
    reasons.push('Refusing to write: DATABASE_URL looks like a production database.');
  }

  return { ok: reasons.length === 0, reasons };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--actor') args.actor = argv[++i];
    else if (arg === '--page') args.page = argv[++i];
    else if (arg === '--scope') args.scope = argv[++i];
    else if (arg === '--age-hours') args.ageHours = argv[++i];
    else if (arg === '--cleanup') args.cleanup = true;
    else if (arg === '--show') args.show = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--json') args.asJson = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `
Suppression-state fixture — backdated ManagementLastSeen rows.

  node scripts/suppression-state.mjs --actor <userId> [--page <key>] [--scope '<json>'] --age-hours <n>
  node scripts/suppression-state.mjs --actor <userId> [--page <key>] [--scope '<json>'] --show
  node scripts/suppression-state.mjs --actor <userId> --cleanup
  node scripts/suppression-state.mjs --actor <userId> --page <key> --age-hours <n> --dry-run

Options:
  --actor <id>       the seeded user id whose acknowledgement you are backdating
  --page <key>       a Management page key (leads, billing, ...); omit for every page
  --scope '<json>'   the page scope; defaults to {} (the collection scope)
  --age-hours <n>    how long ago the acknowledgement happened (0 = just now)
  --show             print the rows that match, write nothing, no opt-in needed
  --cleanup          delete the rows that match, then report how many
  --dry-run          print the intended write, touch no database at all
  --json             machine-readable output
  --help             this text

Writes and deletes require SYNTH_I_UNDERSTAND_SHARED_DB=true (or E2E_I_UNDERSTAND_SHARED_DB=true).
`;
}

function fail(reasons) {
  throw new Error(`\n${reasons.map((reason) => `✗ ${reason}`).join('\n\n')}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || process.argv.length <= 2) {
    console.log(usage());
    return;
  }
  if (!args.actor) throw new Error('--actor is required');

  const scope = args.scope === undefined ? {} : JSON.parse(args.scope);
  const fingerprint = scopeFingerprint(scope);
  const where = {
    actorId: args.actor,
    scopeFingerprint: fingerprint,
    ...(args.page ? { pageKey: args.page } : {}),
  };

  // ── Dry run: no guard, no database, no client construction. ────────────────
  if (args.dryRun && !args.show && !args.cleanup) {
    const lastSeenAt = backdatedInstant(args.ageHours);
    console.log('DRY RUN — would upsert into ManagementLastSeen:');
    console.log(
      JSON.stringify(
        {
          actorId: args.actor,
          pageKey: args.page ?? '<page>',
          scopeFingerprint: fingerprint,
          lastSeenAt: lastSeenAt.toISOString(),
          ageHours: Number(args.ageHours),
        },
        null,
        JSON_INDENT,
      ),
    );
    console.log('Nothing was written and no database connection was opened.');
    return;
  }

  // ── Guard before any client exists, for every path that can change data. ───
  const mutating = args.cleanup || (!args.show && !args.dryRun);
  if (mutating) {
    const guard = assertSafeToWrite({});
    if (!guard.ok) fail(guard.reasons);
  }

  const { default: prisma } = await import('../src/db/client.js');

  // ── Read-only inspection. ──────────────────────────────────────────────────
  if (args.show) {
    const rows = await prisma.managementLastSeen.findMany({ where, orderBy: { lastSeenAt: 'desc' } });
    if (args.asJson) console.log(JSON.stringify({ rows }, null, JSON_INDENT));
    else if (rows.length === 0) console.log('no rows match');
    else for (const row of rows) console.log(`${row.pageKey}\t${row.scopeFingerprint}\t${row.lastSeenAt.toISOString()}`);
    return;
  }

  // ── Delete. ────────────────────────────────────────────────────────────────
  if (args.cleanup) {
    const deleted = await prisma.managementLastSeen.deleteMany({ where });
    console.log(`deleted ${deleted.count} ManagementLastSeen row(s) for actor ${args.actor}`);
    console.log('InsightState rows: none to delete until that table exists (see the TODO in this file).');
    return;
  }

  // ── Write. ─────────────────────────────────────────────────────────────────
  const lastSeenAt = backdatedInstant(args.ageHours);
  const row = await prisma.managementLastSeen.upsert({
    where: {
      actorId_pageKey_scopeFingerprint: {
        actorId: args.actor,
        pageKey: args.page ?? '',
        scopeFingerprint: fingerprint,
      },
    },
    update: { lastSeenAt },
    create: {
      actorId: args.actor,
      pageKey: args.page ?? '',
      scopeFingerprint: fingerprint,
      lastSeenAt,
    },
  });

  const output = {
    actorId: row.actorId,
    pageKey: row.pageKey,
    scopeFingerprint: row.scopeFingerprint,
    lastSeenAt: row.lastSeenAt.toISOString(),
  };
  if (args.asJson) console.log(JSON.stringify(output, null, JSON_INDENT));
  else console.log(`acknowledged ${output.pageKey} at ${output.lastSeenAt} (${args.ageHours}h ago) for actor ${output.actorId}`);
}

// TODO(InsightState): when the ranking work adds per-insight state, add
// `--insight-key <key>` and an `--age-hours` write against
// InsightState.lastSurfacedAt, and make `--cleanup` delete those rows too. The
// suppression scenarios in the synthetic suite are the consumer.

// `pathToFileURL`, not `fileURLToPath`: argv[1] is a filesystem path and
// fileURLToPath expects a file:// URL, which threw ERR_INVALID_URL on every
// invocation until this was corrected.
const isDirectRun = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  main().catch((err) => {
    console.error(`\n✗ suppression-state failed: ${err.message}`);
    process.exitCode = 1;
  });
}

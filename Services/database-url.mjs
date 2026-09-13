// The one place that decides which database a maintenance script may touch.
//
// WHY THIS EXISTS
//   Every one of these scripts used to carry the shared Supabase DSN as a literal
//   fallback. That turned an unset DATABASE_URL into a write against the LIVE dev
//   database — which is exactly what a CI job seeding a DISPOSABLE Postgres would
//   have done the moment it got that far, and what `update-passwords.mjs` would
//   have done to the shared seed accounts. A missing variable must be a refusal,
//   never a guess.

/**
 * The database URL this script must use, or a refusal.
 *
 * There is deliberately no fallback: a maintenance script run against the wrong
 * database cannot be undone, and the one it used to fall back to is the shared one.
 */
export function requireDatabaseUrl(scriptName) {
  const url = process.env.DATABASE_URL;
  if (url) return url;

  console.error(
    `\n✗ ${scriptName} needs DATABASE_URL and will not guess one.\n\n` +
      '  These scripts once carried a shared-database fallback, so an unset variable wrote\n' +
      '  to the live dev database instead of failing. Point it at the database you mean:\n\n' +
      "    cd Services && DATABASE_URL=\"$(grep -m1 '^DATABASE_URL=' lead-service/.env | cut -d= -f2- | tr -d '\"')\" \\\n" +
      `      node ${scriptName}\n\n` +
      '  In CI, the disposable Postgres comes from CI_DATABASE_URL.\n',
  );
  process.exit(1);
}

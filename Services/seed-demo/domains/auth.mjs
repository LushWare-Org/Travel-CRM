/**
 * crm_auth — the one-time codes behind the two-factor and email-verification
 * screens.
 *
 * An OTP is throwaway: the auth service mints a fresh code on every attempt
 * and a cleanup job sweeps rows whose `expiresAt` has passed. It has no unique
 * key, so there is nothing to upsert against — this module instead deletes the
 * rows it owns (the deterministic `57…` id prefix) and writes a fresh set.
 * That keeps a re-run a no-op rather than a second stack of codes, and it
 * never touches a code a live login or the e2e suite is holding, because those
 * carry random v4 ids.
 *
 * The rows are shaped so every state the UI can show has an example:
 *   · login             — a rep partway through two-factor, live for 10–30 min
 *   · emailVerification — a new customer confirming an address; the older two
 *                         were spent days ago, the newest pair are live
 *   · passwordReset     — one already expired (the cleanup job's next victim)
 *                         and one the user could still paste right now
 */
import { CATEGORIES } from '../lib/ids.mjs';
import { addDays, addMinutes } from '../lib/rng.mjs';

/** Our ids all start here; the reset helper and this module delete on it. */
const ID_PREFIX = `${CATEGORIES.otp}000000-`;

/** Reserved documentation ranges (RFC 5737) — honest, unroutable test addresses. */
const IP_RANGES = ['203.0.113.', '198.51.100.', '192.0.2.'];

/** Real browser strings so the login-history fields render plausibly. */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
];

function otpRow({ ids, rng, user, type, createdAt, expiresAt, isUsed = false, attempts = 0 }) {
  return {
    id: ids.next('otp'),
    userId: user.id,
    email: user.email,
    code: String(rng.int(100000, 999999)),
    type,
    isUsed,
    attempts,
    ipAddress: `${rng.pick(IP_RANGES)}${rng.int(2, 254)}`,
    userAgent: rng.pick(USER_AGENTS),
    expiresAt,
    createdAt,
  };
}

export async function seed(ctx) {
  const { db, ids, now, log } = ctx;
  // Its own PRNG stream, so this step's output cannot be reshuffled by a
  // conditional draw added in an earlier domain (see lib/rng.mjs).
  const rng = ctx.rngFor('auth');

  // Only ever remove rows we minted. A live login's code has a random id, and
  // deleting it would break the very flow this seed exists to demonstrate.
  await db.sql.query(`DELETE FROM crm_auth."Otp" WHERE id LIKE $1`, [`${ID_PREFIX}%`]);

  const { reps, customers, all } = ctx.data.users;

  // ── login: reps who are mid-two-factor right now ──────────────────────────
  const logins = [];
  for (let i = 0; i < 8 && reps.length; i += 1) {
    const rep = rng.pick(reps);
    // A code was just requested; it stays valid for the next 10–30 minutes.
    logins.push(otpRow({
      ids, rng, user: rep, type: 'login',
      createdAt: addMinutes(now, -rng.int(0, 4)),
      expiresAt: addMinutes(now, rng.int(10, 30)),
      attempts: rng.int(0, 2),
    }));
  }

  // ── emailVerification: the newest customers, spent history + fresh codes ──
  const verifications = [];
  const recent = customers.slice(-Math.min(3, customers.length));
  if (recent[0]) {
    // Verified days ago; the code is spent and long expired.
    verifications.push(otpRow({ ids, rng, user: recent[0], type: 'emailVerification', isUsed: true, attempts: rng.int(1, 2), createdAt: addDays(now, -6), expiresAt: addMinutes(addDays(now, -6), 15) }));
    verifications.push(otpRow({ ids, rng, user: recent[0], type: 'emailVerification', isUsed: true, attempts: 1, createdAt: addDays(now, -2), expiresAt: addMinutes(addDays(now, -2), 15) }));
  }
  if (recent[1]) {
    verifications.push(otpRow({ ids, rng, user: recent[1], type: 'emailVerification', createdAt: addMinutes(now, -3), expiresAt: addMinutes(now, 25), attempts: 0 }));
  }
  if (recent[2]) {
    // A resend: an earlier attempt on the same account.
    verifications.push(otpRow({ ids, rng, user: recent[2], type: 'emailVerification', createdAt: addMinutes(now, -1), expiresAt: addMinutes(now, 20), attempts: 1 }));
  }

  // ── passwordReset: one expired, one the user can still use ────────────────
  const resets = [];
  const resetUsers = rng.sample(all, Math.min(2, all.length));
  if (resetUsers[0]) {
    resets.push(otpRow({ ids, rng, user: resetUsers[0], type: 'passwordReset', attempts: 1, createdAt: addMinutes(now, -45), expiresAt: addMinutes(now, -30) }));
  }
  if (resetUsers[1]) {
    resets.push(otpRow({ ids, rng, user: resetUsers[1], type: 'passwordReset', createdAt: addMinutes(now, -2), expiresAt: addMinutes(now, 18) }));
  }

  const rows = [...logins, ...verifications, ...resets];
  await db.auth.otp.createMany({ data: rows, skipDuplicates: true });

  const counts = rows.reduce((acc, r) => ({ ...acc, [r.type]: (acc[r.type] ?? 0) + 1 }), {});
  log(`    auth: ${rows.length} OTPs (${counts.login ?? 0} login, ${counts.emailVerification ?? 0} emailVerification, ${counts.passwordReset ?? 0} passwordReset)`);

  return {
    summary: `${rows.length} OTPs (${counts.login ?? 0} login, ${counts.emailVerification ?? 0} emailVerification, ${counts.passwordReset ?? 0} passwordReset)`,
    rows,
  };
}

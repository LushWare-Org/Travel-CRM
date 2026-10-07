/**
 * Deterministic PRNG + value helpers for the demo seed.
 *
 * The demo seed must produce the SAME database on every run: ids, amounts,
 * dates and names all derive from a fixed seed so a re-run is a no-op instead
 * of a second copy of the book of business. Math.random() would break that,
 * so every random draw goes through this mulberry32 stream.
 */

/** mulberry32 — small, fast, well-distributed 32-bit PRNG. */
export function makeRng(seed = 0x9e3779b9) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    /** float in [0,1) */
    next,
    /** integer in [min,max] inclusive */
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    /** float in [min,max) rounded to 2dp */
    money: (min, max) => Math.round((min + next() * (max - min)) * 100) / 100,
    /** pick one element */
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    /** pick n distinct elements (or fewer if arr is short) */
    sample: (arr, n) => {
      const copy = [...arr];
      const out = [];
      while (out.length < n && copy.length) out.push(copy.splice(Math.floor(next() * copy.length), 1)[0]);
      return out;
    },
    /** true with probability p */
    chance: (p) => next() < p,
    /** weighted pick: [[value, weight], ...] */
    weighted: (pairs) => {
      const total = pairs.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [v, w] of pairs) {
        r -= w;
        if (r <= 0) return v;
      }
      return pairs[pairs.length - 1][0];
    },
  };
}

/**
 * One independent PRNG per domain, derived from the base seed and the domain
 * name.
 *
 * A single shared stream makes every domain's output depend on how many values
 * the domains before it happened to draw. That is fine until an earlier step
 * gains or loses a conditional draw — adding one `rng.chance()` in packages
 * silently reshuffles every lead, quotation and invoice after it, and a re-run
 * of an *unchanged* seed can then differ from the previous one because a branch
 * downstream of it read a different row from the database. Deriving a stream
 * per domain removes that coupling: users cannot change what invoices look like.
 */
export function makeRngFor(baseSeed = 0x9e3779b9) {
  const streams = new Map();
  return (name) => {
    if (!streams.has(name)) {
      // FNV-1a over the domain name, mixed into the base seed.
      let h = 0x811c9dc5;
      for (let i = 0; i < name.length; i += 1) {
        h ^= name.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      streams.set(name, makeRng((baseSeed ^ h) >>> 0));
    }
    return streams.get(name);
  };
}

/** UTC midnight, to keep timestamps free of timezone drift between runs. */
export function utcDate(y, m, d, hh = 0, mm = 0) {
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0));
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function addHours(date, hours) {
  return new Date(date.getTime() + hours * 3600 * 1000);
}

export function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60 * 1000);
}

/** "2026-04-18" — for notes/PDF-ish text fields. */
export function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

/** "18 Apr 2026" — how a consultant writes a date in a note. */
export function humanDay(date) {
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(date.getUTCDate()).padStart(2, '0')} ${M[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Money as a plain number with 2dp — every *_price / *_amount column. */
export function money(n) {
  return Math.round(n * 100) / 100;
}

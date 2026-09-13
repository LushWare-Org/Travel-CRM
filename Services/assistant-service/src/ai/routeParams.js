// Query parameters the assistant may append when it navigates a visitor.
//
// Responsibility is split across the wire on purpose. The CLIENT owns which
// parameter names a page accepts: it sends that list per route on every turn
// (`availableRoutes[].params`, declared in Client/src/config/assistantRoutes.ts)
// because the page is the only thing that knows which query keys it reads, and
// a second copy of that list living here is exactly what would drift the day a
// key is renamed. THIS MODULE owns the other half — what a value for a given
// name is allowed to look like — because that is a boundary, not a client
// concern: the result is a URL the visitor's browser navigates to.
//
// Unknown names, wrong types and out-of-range values are DROPPED, never
// rejected. A turn must not fail because the model guessed a filter badly; the
// visitor is still taken to the page they asked for, just unfiltered.

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ROUTE_PARAM_RULES = {
  destination: { kind: 'slug', maxLength: 60 },
  category: { kind: 'slug', maxLength: 60 },
  priceMin: { kind: 'number', min: 0, max: 1_000_000 },
  priceMax: { kind: 'number', min: 0, max: 1_000_000 },
  durationMin: { kind: 'int', min: 1, max: 365 },
  durationMax: { kind: 'int', min: 1, max: 365 },
  rating: { kind: 'enum', values: [3, 4, 5] },
  sort: { kind: 'enum', values: ['popularity', 'price-low', 'price-high', 'duration'] },
};

// A reversed range is meaningless. When both ends of one of these pairs survive
// validation and the lower bound exceeds the upper, BOTH are dropped: keeping
// whichever end the model happened to order first would filter the opposite of
// what the visitor asked for, which is worse than not filtering at all.
const EXCLUSIVE_PAIRS = [
  ['priceMin', 'priceMax'],
  ['durationMin', 'durationMax'],
];

// Free-text place and category names arrive as written by a person ("Dubai",
// "New York"), while the page's filter matches slugs. Normalise, then require
// the result to be a plain slug — anything with punctuation or non-ASCII is
// dropped rather than guessed at.
const normalizeSlug = (value, rule) => {
  if (typeof value !== 'string') return null;
  const slug = value.trim().toLowerCase();
  if (!slug || slug.length > rule.maxLength) return null;
  return SLUG_PATTERN.test(slug) ? slug : null;
};

// Accepts a number, or a numeric string the model emitted where the schema
// asked for a number. Re-serialized through String(number) so the emitted URL
// always carries a canonical numeric form.
const normalizeNumber = (value, rule) => {
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(number)) return null;
  if (rule.kind === 'int' && !Number.isInteger(number)) return null;
  if (number < rule.min || number > rule.max) return null;
  return String(number);
};

// Compared as strings so `rating: 4` and `rating: "4"` both resolve to the
// declared value 4, while `rating: 2` resolves to nothing.
const normalizeEnum = (value, rule) => {
  const candidate = typeof value === 'string' ? value.trim() : String(value);
  const match = rule.values.find((allowed) => String(allowed) === candidate);
  return match === undefined ? null : String(match);
};

const normalizeValue = (value, rule) => {
  if (rule.kind === 'slug') return normalizeSlug(value, rule);
  if (rule.kind === 'enum') return normalizeEnum(value, rule);
  return normalizeNumber(value, rule);
};

// Bounds are written the same way by everyone, so they are read here rather
// than left to a sampling decision. Measured on gemini-2.5-flash against this
// service's own prompt and schema, "packages need to be below 100 dollars"
// came back as sort: "price-low" (which orders the whole list by price without
// removing anything) more often than as priceMax: 100, and the identical input
// alternated between the two across runs at both temperature 0 and 0.7. A model
// that guesses right four times in five still shows the visitor the wrong page
// every fifth turn, so the unambiguous half is not left to it.
const BOUND_WORDS_MAX = 'under|below|less than|cheaper than|no more than|up to|at most|within|max(?:imum)?|max';
const BOUND_WORDS_MIN = 'over|above|more than|at least|starting (?:at|from)|min(?:imum)?|min';

// The day/night unit is consumed rather than looked for separately, and the
// price patterns refuse a number followed by one: "under 7 days" is a duration,
// and reading it as a price would filter the catalogue to seven dollars.
const DURATION_PATTERNS = [
  [new RegExp(`(?:${BOUND_WORDS_MAX})\\s*(\\d{1,3})\\s*(?:days?|nights?)\\b`, 'i'), 'durationMax'],
  [new RegExp(`(?:${BOUND_WORDS_MIN})\\s*(\\d{1,3})\\s*(?:days?|nights?)\\b`, 'i'), 'durationMin'],
  [/(\d{1,3})\s*(?:-|–|to)\s*(\d{1,3})\s*(?:days?|nights?)\b/i, 'durationRange'],
];

const PRICE_PATTERNS = [
  [new RegExp(`(?:${BOUND_WORDS_MAX})\\s*\\$?\\s*([\\d][\\d,]*(?:\\.\\d+)?)(?!\\s*(?:days?|nights?)\\b)`, 'i'), 'priceMax'],
  [new RegExp(`(?:${BOUND_WORDS_MIN})\\s*\\$?\\s*([\\d][\\d,]*(?:\\.\\d+)?)(?!\\s*(?:days?|nights?)\\b)`, 'i'), 'priceMin'],
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Finds the declared value the visitor actually named, or null.
 *
 * Matching runs against both halves of the pair: the URL value ("uae",
 * "sri-lanka") and the human label ("Dubai", "Sri Lanka"), because a person
 * writes the label and the URL takes the value, and the two are often not the
 * same string. Interior separators are treated as flexible so "new york",
 * "new-york" and "New  York" all match one entry, and the boundaries are
 * checked so "india" cannot match inside "indiana".
 *
 * Longest value wins when several match, so a specific entry beats a broad one
 * in the same sentence.
 *
 * This exists because the package list does not reject a destination it does
 * not know — it ignores it and returns the whole catalogue — so an invented
 * slug is not an error, it is a page of everything that looks filtered.
 */
export function matchDeclaredValue(text, values = []) {
  const message = typeof text === 'string' ? text.toLowerCase() : '';
  if (!message) return null;

  let best = null;

  for (const entry of Array.isArray(values) ? values : []) {
    const value = typeof entry?.value === 'string' ? entry.value.trim() : '';
    if (!value) continue;

    const labels = [value, typeof entry?.label === 'string' ? entry.label.trim() : ''];
    const hit = labels.some((label) => {
      if (!label) return false;
      const needle = escapeRegExp(label.toLowerCase()).replace(/[-\s]+/g, '[-\\s]+');
      return new RegExp(`(^|[^a-z0-9])${needle}([^a-z0-9]|$)`).test(message);
    });

    if (hit && (!best || value.length > best.value.length)) best = entry;
  }

  return best;
}

const toNumber = (raw) => {
  const value = Number(String(raw).replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
};

// Reads price and duration bounds out of the visitor's own sentence. Returns
// plain filter arguments in the same shape the model produces, so callers can
// treat the two identically; anything it cannot read confidently is simply
// absent, and the page opens unfiltered rather than wrongly filtered.
export function extractFilterArgs(text) {
  const message = typeof text === 'string' ? text : '';
  if (!message) return {};

  const extracted = {};

  for (const [pattern, kind] of DURATION_PATTERNS) {
    const match = pattern.exec(message);
    if (!match) continue;
    if (kind === 'durationRange') {
      const low = toNumber(match[1]);
      const high = toNumber(match[2]);
      if (low !== null && high !== null && low <= high) {
        extracted.durationMin = low;
        extracted.durationMax = high;
      }
    } else if (extracted[kind] === undefined) {
      const value = toNumber(match[1]);
      if (value !== null) extracted[kind] = value;
    }
  }

  // A duration already claimed its number, so price patterns are only tried
  // against the same text when no duration bound was found at all. Without
  // this, "under 7 days and below 1000" would lose its price to the day count.
  if (extracted.durationMin === undefined && extracted.durationMax === undefined) {
    for (const [pattern, kind] of PRICE_PATTERNS) {
      if (extracted[kind] !== undefined) continue;
      const match = pattern.exec(message);
      if (!match) continue;
      const value = toNumber(match[1]);
      if (value !== null) extracted[kind] = value;
    }
  }

  return extracted;
}

// -> query string without the leading "?", or '' when nothing survived.
// Keys follow the order of `allowedParams`, so the same request always
// produces the same URL.
export function buildRouteQuery(args, allowedParams = []) {
  const source = args && typeof args === 'object' && !Array.isArray(args) ? args : {};
  const entries = [];
  const seen = new Set();

  for (const name of Array.isArray(allowedParams) ? allowedParams : []) {
    if (typeof name !== 'string' || seen.has(name)) continue;
    seen.add(name);
    const rule = ROUTE_PARAM_RULES[name];
    if (!rule) continue;
    const value = normalizeValue(source[name], rule);
    if (value !== null) entries.push([name, value]);
  }

  for (const [lower, upper] of EXCLUSIVE_PAIRS) {
    const lowerEntry = entries.find(([name]) => name === lower);
    const upperEntry = entries.find(([name]) => name === upper);
    if (lowerEntry && upperEntry && Number(lowerEntry[1]) > Number(upperEntry[1])) {
      entries.splice(entries.indexOf(upperEntry), 1);
      entries.splice(entries.indexOf(lowerEntry), 1);
    }
  }

  return new URLSearchParams(entries).toString();
}

/**
 * The filters a link actually carries, as an object.
 *
 * Derived from the query string `buildRouteQuery` produced rather than by
 * repeating its normalisation, so the two can never disagree: anything that
 * function dropped — wrong type, out of range, an unknown enum, half of a
 * reversed range — is absent here too. A caller that describes a filter in prose
 * or reads the matching records must describe what the URL carries, not what the
 * model asked for.
 */
export function resolveRouteFilters(args, allowedParams = []) {
  const filters = {};
  for (const [name, value] of new URLSearchParams(buildRouteQuery(args, allowedParams))) {
    const rule = ROUTE_PARAM_RULES[name];
    // Numbers come back as strings from a query string, and `rating` is an enum
    // whose declared values are numbers — so the test is the one the response
    // schema's own JSON-type helper uses: numeric unless the rule names strings.
    const numeric = rule && !(rule.kind === 'slug' || (rule.kind === 'enum' && typeof rule.values[0] === 'string'));
    filters[name] = numeric ? Number(value) : value;
  }
  return filters;
}

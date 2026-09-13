/** Splits a newline-separated text block into a trimmed, non-empty list of items. */
export const splitTextToList = (value: string | null | undefined): string[] => {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
};

/** Joins a list of items into a newline-separated text block ('' for non-array input). */
export const combineListToText = (list: unknown): string =>
  Array.isArray(list) ? list.filter(Boolean).join('\n') : '';

/** Parses a numeric value into a finite number, or '' for empty/invalid input. */
export const sanitizeNumber = (value: unknown): string | number => {
  if (value === '' || value === null || value === undefined) return '';
  const num = Number(value);
  return Number.isFinite(num) ? num : '';
};

/** A day override in the customization form's editable state shape. */
export interface DayOverrideState {
  id: string;
  dayNumber: number;
  title: string;
  description: string;
  activities: string[];
  locations: string[];
}

interface RawDay {
  dayNumber?: number;
  title?: string | null;
  description?: string | null;
  activities?: string[] | string;
  locations?: string[] | string;
}

/** Normalizes a raw package-itinerary day into the form's editable day state. */
export const buildDayState = (day: RawDay | null | undefined, index: number): DayOverrideState => {
  const rawActivities = day?.activities;
  const rawLocations = day?.locations;
  return {
    id: `day-${index + 1}`,
    dayNumber: day?.dayNumber || index + 1,
    title: day?.title || `Day ${index + 1}`,
    description: day?.description || '',
    activities: Array.isArray(rawActivities)
      ? rawActivities
      : typeof rawActivities === 'string'
      ? splitTextToList(rawActivities)
      : [],
    locations: Array.isArray(rawLocations)
      ? rawLocations
      : typeof rawLocations === 'string'
      ? splitTextToList(rawLocations)
      : [],
  };
};

// ── PlanYourTripContainer day shape ──────────────────────────────

export interface DayAccommodation {
  name: string;
  type: string;
  rating: number;
  address: string;
  contactNumber: string;
}

export interface DayMeals {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

export interface ItineraryDay {
  dayNumber: number;
  title: string;
  locations: string[];
  activities: string[];
  accommodation: DayAccommodation;
  meals: DayMeals;
  transport: string;
  places: string[];
  notes: string;
}

/** An AI-generated day, shaped like the shared ManualItineraryDay contract. */
interface RawAIDay {
  dayNumber?: number;
  title?: string | null;
  description?: string | null;
  locations?: string[];
  activities?: string[];
  accommodation?: {
    name?: string;
    type?: string;
    rating?: number;
    address?: string;
    contactNumber?: string;
  } | null;
  meals?: {
    breakfast?: boolean;
    lunch?: boolean;
    dinner?: boolean;
  } | null;
  transport?: string | null;
}

/** Normalizes an AI-generated day into PlanYourTripContainer's editable ItineraryDay state. */
export const buildItineraryDayFromAIDay = (aiDay: RawAIDay, index: number): ItineraryDay => ({
  dayNumber: aiDay?.dayNumber || index + 1,
  title: aiDay?.title || `Day ${index + 1}`,
  locations: aiDay?.locations || [],
  activities: aiDay?.activities || [],
  accommodation: {
    name: aiDay?.accommodation?.name || '',
    type: aiDay?.accommodation?.type || 'hotel',
    rating: aiDay?.accommodation?.rating ?? 4,
    address: aiDay?.accommodation?.address || '',
    contactNumber: aiDay?.accommodation?.contactNumber || '',
  },
  meals: {
    breakfast: aiDay?.meals?.breakfast ?? false,
    lunch: aiDay?.meals?.lunch ?? false,
    dinner: aiDay?.meals?.dinner ?? false,
  },
  transport: aiDay?.transport || '',
  places: [], // Never populated from AI (or manual entry) — locations is the only user/AI-editable place field.
  notes: aiDay?.description || '',
});

// ── Date helpers shared by the manual duration calc and the chat panel ──

/** Inclusive day count of a whole-day range — both endpoints are trip days,
 * 0 when either date is missing or the end precedes the start.
 *
 * A start/end pair one day apart is a 2-day/1-night trip and must yield 2:
 * this value is the itinerary's day count everywhere downstream (the
 * "N Days / N-1 Nights" label, the `duration` sent to the N-day AI preview,
 * the per-day/bulk-fill day-number ceiling), and ItineraryChatPanel's default
 * end date (addDaysISO(start, duration - 1)) already assumes an inclusive
 * range. */
export const computeDurationDays = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const diffDays = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
  return diffDays < 0 ? 0 : diffDays + 1;
};

/** Today as a local YYYY-MM-DD. Local, not UTC: the date fields and the
 * "cannot be in the past" rule are about the visitor's own calendar day.
 * Shared by both containers' date validation and the assistant's
 * set_trip_details action. */
export const localTodayISO = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/** Adds `days` whole days to an ISO date string, returning an ISO date string. */
export const addDaysISO = (isoDate: string, days: number): string => {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// ── Assistant day edits (add / remove entries on one day) ──
// A day's lists are plain strings the visitor can also type by hand, so a match
// has to survive how a person phrases a removal: "remove the temple visit" has
// to find an entry called "Temple of the Tooth". Equality is tried first, then a
// shared significant word.

/** Words that carry no identity in a day entry, so they never make a match. */
const DAY_ENTRY_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'for', 'from', 'with', 'plus',
  'my', 'our', 'your', 'this', 'that', 'it', 'its', 'day', 'days', 'night', 'nights',
  'add', 'remove', 'delete', 'drop', 'change', 'please', 'also', 'then', 'visit', 'trip',
]);

/** The words in a wanted phrase that could identify a day entry (4+ chars, not a stopword). */
const significantWords = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !DAY_ENTRY_STOPWORDS.has(word));

/** The first wanted phrase that identifies `entry`, or null. */
const matchingWanted = (entry: string, wanted: string[]): string | null => {
  const lowerEntry = entry.toLowerCase();
  for (const phrase of wanted) {
    const lowerPhrase = phrase.toLowerCase().trim();
    if (!lowerPhrase) continue;
    if (lowerEntry === lowerPhrase || lowerEntry.includes(lowerPhrase) || lowerPhrase.includes(lowerEntry)) {
      return phrase;
    }
    if (significantWords(phrase).some((word) => lowerEntry.includes(word))) return phrase;
  }
  return null;
};

/**
 * `entries` with every wanted phrase appended that is not already there,
 * compared without case. Returns the same array identity when nothing is added,
 * so a caller can tell "no change" from "changed".
 */
export const withAddedEntries = (entries: string[], wanted: string[]): string[] => {
  const added = wanted.filter((phrase) => phrase.trim() && !matchingWanted(phrase, entries));
  return added.length ? [...entries, ...added.map((phrase) => phrase.trim())] : entries;
};

/**
 * `entries` with every one removed that a wanted phrase identifies. Returns the
 * same array identity when nothing matched, so an unmatched removal ("day 2 has
 * no temple visit") is distinguishable from a removal that happened.
 */
export const withoutMatchingEntries = (entries: string[], wanted: string[]): string[] => {
  const kept = entries.filter((entry) => matchingWanted(entry, wanted) === null);
  return kept.length === entries.length ? entries : kept;
};

// ── Per-day AI generation helpers (regenerate one day / fill remaining) ──

/** A minimal day shape carrying only what the per-day AI endpoints need for
 * prompt context — reduces PlanYourTripContainer's ItineraryDay and
 * CustomizePackageContainer's DayOverrideState to one common wire shape. */
export interface ExistingDayContext {
  dayNumber: number;
  title?: string;
  locations?: string[];
  activities?: string[];
}

/** Projects a container's day-state shape (ItineraryDay or DayOverrideState —
 * anything with at least these fields) down to the wire shape the per-day
 * AI endpoints expect as prompt context. Shared so both containers' existingDays
 * mapping stays aligned with ExistingDayContext in one place. */
export const toExistingDayContext = (day: { dayNumber: number; title?: string | null; locations?: string[]; activities?: string[] }): ExistingDayContext => ({
  dayNumber: day.dayNumber,
  title: day.title ?? undefined,
  locations: day.locations,
  activities: day.activities,
});

/** Replaces the entry whose dayNumber matches `day`, or appends it (sorted)
 * if no existing day has that number. The shared merge used by per-day and
 * bulk AI regeneration so unrelated days are never touched, and so it works
 * correctly even when dayNumbers aren't contiguous (see
 * CustomizePackageContainer's handleRemoveDay, which doesn't renumber). */
export const mergeDayByNumber = <T extends { dayNumber: number }>(days: T[], day: T): T[] => {
  const index = days.findIndex((d) => d.dayNumber === day.dayNumber);
  if (index === -1) return [...days, day].sort((a, b) => a.dayNumber - b.dayNumber);
  const next = [...days];
  next[index] = day;
  return next;
};

/** Folds `mergeDayByNumber` over a batch of newly-generated days. */
export const mergeDaysByNumber = <T extends { dayNumber: number }>(days: T[], newDays: T[]): T[] =>
  newDays.reduce((acc, day) => mergeDayByNumber(acc, day), days);

/** The per-day/range AI endpoints reject dayNumber/totalDuration above 30
 * (Services/shared/contracts) — a trip longer than this can't use per-day
 * or bulk AI generation at all. Shared here so both containers cap what
 * they offer instead of rendering a CTA that fails validation client-side. */
export const AI_DAY_GENERATION_MAX_DAY = 30;

/** Day numbers in `1..totalDuration` not present in `existingDayNumbers` —
 * a real set difference, not a naive tail computation, because
 * CustomizePackageContainer's day list can have gaps in the middle. Capped
 * at AI_DAY_GENERATION_MAX_DAY so bulk-fill never requests a day number the
 * server would reject. */
export const computeMissingDayNumbers = (totalDuration: number, existingDayNumbers: number[]): number[] => {
  const existing = new Set(existingDayNumbers);
  const missing: number[] = [];
  for (let n = 1; n <= Math.min(totalDuration, AI_DAY_GENERATION_MAX_DAY); n += 1) {
    if (!existing.has(n)) missing.push(n);
  }
  return missing;
};

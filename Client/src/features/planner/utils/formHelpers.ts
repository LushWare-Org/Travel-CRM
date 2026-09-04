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

/** Whole-day count between two ISO date strings, 0 if either is empty. */
export const computeDurationDays = (start: string, end: string): number =>
  start && end
    ? Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

/** Adds `days` whole days to an ISO date string, returning an ISO date string. */
export const addDaysISO = (isoDate: string, days: number): string => {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

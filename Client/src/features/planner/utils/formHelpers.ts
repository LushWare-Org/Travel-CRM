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
  title?: string;
  description?: string;
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

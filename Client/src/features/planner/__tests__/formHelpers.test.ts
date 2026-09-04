import { describe, expect, it } from 'vitest';
import {
  addDaysISO,
  buildDayState,
  buildItineraryDayFromAIDay,
  combineListToText,
  computeDurationDays,
  sanitizeNumber,
  splitTextToList,
} from '../utils/formHelpers';

describe('splitTextToList', () => {
  it('returns an empty list for empty, null, or undefined input', () => {
    expect(splitTextToList('')).toEqual([]);
    expect(splitTextToList(null)).toEqual([]);
    expect(splitTextToList(undefined)).toEqual([]);
  });

  it('returns an empty list for whitespace-only input', () => {
    expect(splitTextToList('   ')).toEqual([]);
  });

  it('splits a single-line value into a one-item list', () => {
    expect(splitTextToList('Beach')).toEqual(['Beach']);
  });

  it('splits newline-separated values, trimming whitespace and dropping empty lines', () => {
    expect(splitTextToList('Beach\nSnorkeling\n  Safari  ')).toEqual([
      'Beach',
      'Snorkeling',
      'Safari',
    ]);
  });

  it('handles CRLF line endings and blank lines', () => {
    expect(splitTextToList('a\r\n\r\nb\r\nc')).toEqual(['a', 'b', 'c']);
  });
});

describe('combineListToText', () => {
  it('joins items with newlines', () => {
    expect(combineListToText(['a', 'b', 'c'])).toBe('a\nb\nc');
  });

  it('filters out falsy items', () => {
    expect(combineListToText(['a', '', null, undefined, 0, 'b'])).toBe('a\nb');
  });

  it('returns an empty string for an empty array', () => {
    expect(combineListToText([])).toBe('');
  });

  it('returns an empty string for non-array input', () => {
    expect(combineListToText('not an array')).toBe('');
    expect(combineListToText(undefined)).toBe('');
    expect(combineListToText(null)).toBe('');
  });
});

describe('sanitizeNumber', () => {
  it('returns an empty string for empty, null, or undefined input', () => {
    expect(sanitizeNumber('')).toBe('');
    expect(sanitizeNumber(null)).toBe('');
    expect(sanitizeNumber(undefined)).toBe('');
  });

  it('parses numeric strings into numbers', () => {
    expect(sanitizeNumber('42')).toBe(42);
    expect(sanitizeNumber('3.5')).toBe(3.5);
  });

  it('passes numbers through unchanged', () => {
    expect(sanitizeNumber(42)).toBe(42);
    expect(sanitizeNumber(0)).toBe(0);
  });

  it('returns an empty string for non-finite or non-numeric values', () => {
    expect(sanitizeNumber('abc')).toBe('');
    expect(sanitizeNumber('12abc')).toBe('');
    expect(sanitizeNumber(Infinity)).toBe('');
    expect(sanitizeNumber(NaN)).toBe('');
  });
});

describe('buildDayState', () => {
  it('builds a default day for missing input', () => {
    expect(buildDayState(undefined, 0)).toEqual({
      id: 'day-1',
      dayNumber: 1,
      title: 'Day 1',
      description: '',
      activities: [],
      locations: [],
    });
  });

  it('falls back to index-based values when the raw day has no data', () => {
    expect(buildDayState({}, 2)).toEqual({
      id: 'day-3',
      dayNumber: 3,
      title: 'Day 3',
      description: '',
      activities: [],
      locations: [],
    });
  });

  it('preserves raw day fields when present', () => {
    expect(
      buildDayState(
        {
          dayNumber: 5,
          title: 'Custom Day',
          description: 'A description',
          activities: ['Beach'],
          locations: ['Colombo'],
        },
        0,
      ),
    ).toEqual({
      id: 'day-1',
      dayNumber: 5,
      title: 'Custom Day',
      description: 'A description',
      activities: ['Beach'],
      locations: ['Colombo'],
    });
  });

  it('splits string activities and locations into lists', () => {
    expect(
      buildDayState(
        { activities: 'Beach\nSnorkeling', locations: 'Colombo\nGalle' },
        1,
      ),
    ).toEqual({
      id: 'day-2',
      dayNumber: 2,
      title: 'Day 2',
      description: '',
      activities: ['Beach', 'Snorkeling'],
      locations: ['Colombo', 'Galle'],
    });
  });

  it('falls back for falsy dayNumber and title', () => {
    expect(buildDayState({ dayNumber: 0, title: '' }, 1)).toMatchObject({
      dayNumber: 2,
      title: 'Day 2',
    });
  });
});

describe('buildItineraryDayFromAIDay', () => {
  it('maps a full AI day correctly', () => {
    expect(
      buildItineraryDayFromAIDay(
        {
          dayNumber: 2,
          title: 'Beach Day',
          description: 'Relax by the sea',
          locations: ['Galle'],
          activities: ['Snorkeling'],
          accommodation: {
            name: 'Galle Fort Hotel',
            type: 'resort',
            rating: 5,
            address: '1 Fort Rd',
            contactNumber: '+94123456',
          },
          meals: { breakfast: true, lunch: false, dinner: true },
          transport: 'boat',
        },
        0,
      ),
    ).toEqual({
      dayNumber: 2,
      title: 'Beach Day',
      locations: ['Galle'],
      activities: ['Snorkeling'],
      accommodation: {
        name: 'Galle Fort Hotel',
        type: 'resort',
        rating: 5,
        address: '1 Fort Rd',
        contactNumber: '+94123456',
      },
      meals: { breakfast: true, lunch: false, dinner: true },
      transport: 'boat',
      places: [],
      notes: 'Relax by the sea',
    });
  });

  it('falls back to handleAddDay defaults when accommodation/meals/transport are missing', () => {
    expect(
      buildItineraryDayFromAIDay({ dayNumber: 1, title: 'Arrival', locations: [], activities: [] }, 0),
    ).toEqual({
      dayNumber: 1,
      title: 'Arrival',
      locations: [],
      activities: [],
      accommodation: { name: '', type: 'hotel', rating: 4, address: '', contactNumber: '' },
      meals: { breakfast: false, lunch: false, dinner: false },
      transport: '',
      places: [],
      notes: '',
    });
  });

  it('falls back to index-based dayNumber/title when missing, and places is always []', () => {
    const result = buildItineraryDayFromAIDay(
      { locations: ['Kandy'], activities: ['Temple visit'], places: ['ignored'] } as never,
      2,
    );
    expect(result.dayNumber).toBe(3);
    expect(result.title).toBe('Day 3');
    expect(result.places).toEqual([]);
  });
});

describe('computeDurationDays', () => {
  it('returns 0 when start is missing', () => {
    expect(computeDurationDays('', '2026-01-05')).toBe(0);
  });

  it('returns 0 when end is missing', () => {
    expect(computeDurationDays('2026-01-01', '')).toBe(0);
  });

  it('returns the correct day count for a real range', () => {
    expect(computeDurationDays('2026-01-01', '2026-01-06')).toBe(5);
  });
});

describe('addDaysISO', () => {
  it('adds days correctly within a month', () => {
    expect(addDaysISO('2026-01-10', 3)).toBe('2026-01-13');
  });

  it('adds days correctly including a month rollover', () => {
    expect(addDaysISO('2026-01-30', 3)).toBe('2026-02-02');
  });
});

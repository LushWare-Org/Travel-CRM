import { describe, it, expect } from 'vitest';
import { resolveTimeRange, formatBucketLabel } from '../timeRange.js';

describe('resolveTimeRange', () => {
  const now = new Date('2026-08-16T12:00:00Z');

  it('uses a 14-day lookback with day-level buckets for "daily"', () => {
    const { start, end, truncUnit } = resolveTimeRange('daily', now);
    expect(truncUnit).toBe('day');
    expect(end).toEqual(now);
    expect(end.getTime() - start.getTime()).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it('uses week-level buckets for "weekly"', () => {
    expect(resolveTimeRange('weekly', now).truncUnit).toBe('week');
  });

  it('uses month-level buckets for "monthly" and "annual"', () => {
    expect(resolveTimeRange('monthly', now).truncUnit).toBe('month');
    expect(resolveTimeRange('annual', now).truncUnit).toBe('month');
  });

  it('falls back to the monthly window for an unrecognized value', () => {
    const monthly = resolveTimeRange('monthly', now);
    const unknown = resolveTimeRange('bogus', now);
    expect(unknown.truncUnit).toBe(monthly.truncUnit);
    expect(unknown.start).toEqual(monthly.start);
  });

  it('defaults to monthly when no timeRange is passed', () => {
    expect(resolveTimeRange(undefined, now).truncUnit).toBe('month');
  });
});

describe('formatBucketLabel', () => {
  it('formats a month bucket as "Mon YYYY"', () => {
    expect(formatBucketLabel('2026-03-01T00:00:00Z', 'month')).toBe('Mar 2026');
  });

  it('formats a day bucket as "Mon DD"', () => {
    expect(formatBucketLabel('2026-03-05T00:00:00Z', 'day')).toBe('Mar 05');
  });
});

import { describe, expect, it } from 'vitest';
import { composeNotifications, SUPPRESSION_WINDOW_MS } from '../compose.js';

const NOW = new Date('2026-09-14T12:00:00.000Z');
const signals = (overrides = {}) => ({
  unconvertedQuotes: { count: 0, value: 0, oldestAgeDays: 0, ids: [] },
  coldLeads: { count: 0, value: 0, oldestAgeDays: 0, ids: [] },
  departuresOutstanding: { count: 0, value: 0, ids: [] },
  conversionTrend: { curTotal: 0, curWon: 0, prevTotal: 0, prevWon: 0 },
  lostQuotes: { count: 0, value: 0, rejectedWithReason: 0, ids: [] },
  lapsedCustomers: { count: 0, ids: [] },
  lowMarginBookings: { count: 0, value: 0, avgMargin: 0, ids: [] },
  responseTimeTrend: { curHours: 0, prevHours: 0, curN: 0, prevN: 0 },
  destinationConcentration: { destination: null, share: 0, baseline: 0, value: 0 },
  agingOverdue: { count: 0, value: 0, oldestDays: 0, ids: [] },
  unassignedLeads: { count: 0, ids: [] },
  stalledDrafting: { count: 0, oldestAgeDays: 0, ids: [] },
  expiringQuotes: { count: 0, value: 0, ids: [] },
  noDeposit: { count: 0, value: 0, ids: [] },
  voucherMissing: { count: 0, ids: [] },
  cancellationSpike: { cur: 0, baseline: 0 },
  silentPackages: { count: 0 },
  quotedSilence: { count: 0, oldestAgeDays: 0, ids: [] },
  partialAging: { count: 0, value: 0, oldestDays: 0, ids: [] },
  ...overrides,
});

const compose = (source, priorState = new Map(), scope = 'org') =>
  composeNotifications({ signals: source, priorState, scope, currency: 'USD', now: NOW });

describe('composeNotifications', () => {
  it('drops a reading below its declared count or value floor', () => {
    const result = compose(signals({ unconvertedQuotes: { count: 2, value: 24_000, ids: [] } }));
    expect(result.notifications).toEqual([]);
  });

  it('orders critical before warning and counts only unread rows', () => {
    const result = compose(signals({
      unconvertedQuotes: { count: 8, value: 24_000, oldestAgeDays: 12, ids: ['q1'] },
      expiringQuotes: { count: 2, value: 5_000, ids: ['q2'] },
    }));

    expect(result.notifications.map((item) => item.id)).toEqual([
      'quotes.unconverted_value',
      'quotes.expiring_soon',
    ]);
    expect(result.unreadCounts).toEqual({ critical: 1, warning: 1, info: 0 });
  });

  it('never suppresses an unchanged critical notification after acknowledgement', () => {
    const prior = new Map([
      ['quotes.unconverted_value', {
        acknowledgedAt: new Date(NOW.getTime() - 60_000),
        lastMaterialValue: '8:24000',
        lastSeenAt: NOW,
        firstSeenAt: NOW,
      }],
    ]);
    const result = compose(signals({
      unconvertedQuotes: { count: 8, value: 24_000, oldestAgeDays: 12, ids: [] },
    }), prior);

    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].unread).toBe(false);
  });

  it('suppresses an acknowledged warning during the window and resurfaces it when the material value changes', () => {
    const prior = new Map([
      ['quotes.expiring_soon', {
        acknowledgedAt: new Date(NOW.getTime() - 60_000),
        lastMaterialValue: '2:5000',
        lastSeenAt: NOW,
        firstSeenAt: NOW,
      }],
    ]);
    const unchanged = compose(signals({ expiringQuotes: { count: 2, value: 5_000, ids: [] } }), prior);
    const changed = compose(signals({ expiringQuotes: { count: 3, value: 7_500, ids: [] } }), prior);

    expect(unchanged.notifications).toEqual([]);
    expect(changed.notifications.map((item) => item.id)).toEqual(['quotes.expiring_soon']);
  });

  it('keeps a dismissed warning suppressed after the seven-day acknowledgement window', () => {
    const prior = new Map([
      ['quotes.expiring_soon', {
        dismissedAt: new Date(NOW.getTime() - SUPPRESSION_WINDOW_MS * 2),
        lastMaterialValue: '2:5000',
        firstSeenAt: NOW,
      }],
    ]);
    const result = compose(signals({ expiringQuotes: { count: 2, value: 5_000, ids: [] } }), prior);
    expect(result.notifications).toEqual([]);
  });

  it('reads a single-item reading as prose, not as a bare count', () => {
    const singular = compose(signals({
      expiringQuotes: { count: 1, value: 2_698, ids: ['q1'] },
    }));
    const plural = compose(signals({
      expiringQuotes: { count: 3, value: 16_293, ids: ['q1', 'q2', 'q3'] },
    }));

    expect(singular.notifications[0].text).toBe(
      '1 quote worth $2,698 expires within the next 5 days. Confirm it or follow up.',
    );
    expect(plural.notifications[0].text).toBe(
      '3 quotes worth $16,293 expire within the next 5 days. Confirm them or follow up.',
    );
  });

  it('does not evaluate organization-only rules for a sales representative', () => {
    const result = compose(signals({ silentPackages: { count: 12 } }), new Map(), 'own');
    expect(result.notifications).toEqual([]);
  });
});

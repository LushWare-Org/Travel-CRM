import { describe, it, expect } from 'vitest';
import {
  DEFAULT_WEIGHTS,
  actionabilityMultiplier,
  bandOf,
  compareForRanking,
  confidenceScore,
  orderForRanking,
  percentileMateriality,
  scoreInsight,
  severityValue,
  urgencyFromDeadline,
  urgencyFromFact,
} from '../score.js';

const NOW = new Date('2026-09-12T12:00:00.000Z');

describe('bands and severity values', () => {
  it('orders critical before warning before info', () => {
    expect(bandOf('critical')).toBeLessThan(bandOf('warning'));
    expect(bandOf('warning')).toBeLessThan(bandOf('info'));
  });

  it('treats an unknown severity as the lowest band, never as critical', () => {
    expect(bandOf('catastrophic')).toBe(bandOf('info'));
    expect(severityValue('catastrophic')).toBe(0.25);
  });
});

describe('urgencyFromDeadline', () => {
  it('rates a breached deadline as maximally urgent', () => {
    expect(urgencyFromDeadline('2026-09-10T12:00:00.000Z', NOW)).toBe(1.0);
    expect(urgencyFromDeadline(NOW, NOW)).toBe(1.0);
  });

  it('descends with the horizon', () => {
    expect(urgencyFromDeadline('2026-09-13T06:00:00.000Z', NOW)).toBe(1.0); // 18h
    expect(urgencyFromDeadline('2026-09-14T12:00:00.000Z', NOW)).toBe(0.8); // 2d
    expect(urgencyFromDeadline('2026-09-17T12:00:00.000Z', NOW)).toBe(0.5); // 5d
    expect(urgencyFromDeadline('2026-10-02T12:00:00.000Z', NOW)).toBe(0.25); // 20d
    expect(urgencyFromDeadline('2026-12-01T12:00:00.000Z', NOW)).toBe(0.1); // far off
  });

  it('gives an undated or unparseable item the floor, not zero, so it still competes', () => {
    expect(urgencyFromDeadline(null, NOW)).toBe(0.1);
    expect(urgencyFromDeadline('not a date', NOW)).toBe(0.1);
    expect(urgencyFromFact({ kind: 'count', value: '3' }, NOW)).toBe(0.1);
    expect(urgencyFromFact({ kind: 'date', value: '2026-09-12T13:00:00.000Z' }, NOW)).toBe(1.0);
  });
});

describe('percentileMateriality', () => {
  it('is the fraction of peers at or below the value', () => {
    expect(percentileMateriality(50, [10, 20, 30, 40, 50])).toBe(1);
    expect(percentileMateriality(30, [10, 20, 30, 40, 50])).toBeCloseTo(0.6, 5);
    expect(percentileMateriality(5, [10, 20, 30])).toBe(0);
  });

  it('returns null when it cannot be computed, so the caller uses the default instead of guessing', () => {
    expect(percentileMateriality(50, [])).toBeNull();
    expect(percentileMateriality(Number.NaN, [10, 20])).toBeNull();
    expect(percentileMateriality(null, [10, 20])).toBeNull();
  });

  it('ignores non-numeric peers rather than counting them as zero', () => {
    expect(percentileMateriality(20, [10, 20, null, undefined, 'x'])).toBe(1);
  });
});

describe('confidenceScore', () => {
  it('is full confidence when every source was read', () => {
    expect(confidenceScore({})).toBe(1.0);
    expect(confidenceScore({ unavailableSourceCount: 0 })).toBe(1.0);
  });

  it('falls as sources go missing, with a floor so a partial read is not dismissed', () => {
    expect(confidenceScore({ unavailableSourceCount: 1 })).toBe(0.75);
    expect(confidenceScore({ unavailableSourceCount: 2 })).toBe(0.5);
    expect(confidenceScore({ unavailableSourceCount: 9 })).toBe(0.5);
  });

  it('treats a nonsense count as none', () => {
    expect(confidenceScore({ unavailableSourceCount: -3 })).toBe(1.0);
    expect(confidenceScore({ unavailableSourceCount: 'many' })).toBe(1.0);
  });
});

describe('actionabilityMultiplier', () => {
  it('favours an actionable insight over a bare observation', () => {
    expect(actionabilityMultiplier({ kind: 'navigate', verb: 'claim', target: { kind: 'record', id: 'x' } })).toBe(1.0);
    expect(actionabilityMultiplier(null)).toBe(0.4);
  });
});

describe('scoreInsight', () => {
  it('is deterministic and reports its components so the panel can explain itself', () => {
    const input = { severity: 'warning', urgency: 0.5, materiality: 0.6, novelty: 1, confidence: 1, action: { kind: 'navigate' } };
    const first = scoreInsight(input, {});
    const second = scoreInsight(input, {});

    expect(first).toEqual(second);
    expect(first.components).toEqual({
      severity: 0.6,
      urgency: 0.5,
      materiality: 0.6,
      novelty: 1,
      confidence: 1,
      actionability: 1,
      penalty: 0,
    });
    // 0.3*0.6 + 0.25*0.5 + 0.2*0.6 + 0.1*1 + 0.1*1 = 0.625, times A=1.
    expect(first.score).toBe(0.625);
  });

  it('substitutes the default materiality when none is given', () => {
    const { components } = scoreInsight({ severity: 'info', materiality: null }, {});
    expect(components.materiality).toBe(0.3);
  });

  it('applies the stale penalty and caps it so an ignored item sinks but is never hidden by score alone', () => {
    const once = scoreInsight({ severity: 'warning', staleSurfacings: 1 }, {});
    const many = scoreInsight({ severity: 'warning', staleSurfacings: 100 }, {});

    expect(once.score).toBeLessThan(scoreInsight({ severity: 'warning' }, {}).score);
    expect(many.components.penalty).toBe(0.2);
  });

  it('respects an injected weight set, so per-page overrides are possible without touching the code', () => {
    const base = scoreInsight({ severity: 'critical', urgency: 0.1 }, {});
    const urgencyHeavy = scoreInsight(
      { severity: 'critical', urgency: 0.1 },
      { weights: { ...DEFAULT_WEIGHTS, severity: 0, urgency: 1, materiality: 0, novelty: 0, confidence: 0 } },
    );

    // 1.0 * urgency(0.1) = 0.1, then the actionability multiplier still applies
    // (no action ⇒ 0.4), so 0.04. Injecting weights does not bypass it.
    expect(urgencyHeavy.score).toBe(0.04);
    expect(urgencyHeavy.components.actionability).toBe(0.4);
    expect(base.score).toBeGreaterThan(urgencyHeavy.score);
  });
});

describe('compareForRanking — the band invariant', () => {
  it('shows the arithmetic inversion that makes banding necessary', () => {
    // A critical that carries no action, versus an info that does. On score
    // alone the info wins, which would make "a critical is never out-ranked by
    // an info" impossible to satisfy.
    const criticalObservation = { severity: 'critical', action: null, ...scoreInsight({ severity: 'critical', action: null }, {}) };
    const infoWithAction = { severity: 'info', action: { kind: 'navigate' }, ...scoreInsight({ severity: 'info', action: { kind: 'navigate' } }, {}) };

    expect(criticalObservation.score).toBeLessThan(infoWithAction.score);

    // Banding corrects it without touching the score.
    expect(compareForRanking(criticalObservation, infoWithAction)).toBeLessThan(0);
    expect(orderForRanking([infoWithAction, criticalObservation])[0]).toBe(criticalObservation);
  });

  it('orders by score inside a band', () => {
    const weak = { key: 'a', severity: 'warning', score: 0.2, urgency: 0.1, materiality: 0.1 };
    const strong = { key: 'b', severity: 'warning', score: 0.7, urgency: 0.1, materiality: 0.1 };

    expect(orderForRanking([weak, strong])).toEqual([strong, weak]);
  });

  it('breaks ties on urgency, then materiality, then the stable key', () => {
    const base = { severity: 'warning', score: 0.5 };
    const urgent = { ...base, key: 'z', urgency: 0.9, materiality: 0.1 };
    const patient = { ...base, key: 'a', urgency: 0.2, materiality: 0.9 };
    expect(orderForRanking([patient, urgent])[0]).toBe(urgent);

    const heavy = { ...base, key: 'z', urgency: 0.2, materiality: 0.9 };
    const light = { ...base, key: 'a', urgency: 0.2, materiality: 0.1 };
    expect(orderForRanking([light, heavy])[0]).toBe(heavy);

    const first = { ...base, key: 'a', urgency: 0.2, materiality: 0.1 };
    const second = { ...base, key: 'b', urgency: 0.2, materiality: 0.1 };
    expect(orderForRanking([second, first])[0]).toBe(first);
  });

  it('produces the same order whatever order the input arrives in', () => {
    const items = [
      { key: 'c', severity: 'info', score: 0.4, urgency: 0.2, materiality: 0.2 },
      { key: 'a', severity: 'critical', score: 0.2, urgency: 0.2, materiality: 0.2 },
      { key: 'b', severity: 'warning', score: 0.3, urgency: 0.9, materiality: 0.9 },
    ];

    const forward = orderForRanking(items).map((i) => i.key);
    const backward = orderForRanking([...items].reverse()).map((i) => i.key);

    expect(forward).toEqual(backward);
    expect(forward).toEqual(['a', 'b', 'c']);
  });
});

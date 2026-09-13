import { describe, expect, it } from 'vitest';
import { assignStratifiedFolds, evaluateNestedFolds, routerCorpusRowSchema } from '../routerEvaluation.js';

function row(id, expectedIntent, source = 'synthetic', directResponseAllowed = true) {
  return routerCorpusRowSchema.parse({
    id,
    source,
    message: `message ${id}`,
    expectedIntent,
    expectedSocialSubtype: expectedIntent === 'social' ? 'greeting' : 'none',
    directResponseAllowed,
    allowedFinalTools: [expectedIntent === 'off_topic' ? 'redirect_off_topic' : 'respond_conversationally'],
  });
}

describe('router evaluation', () => {
  it('assigns every class across stable stratified folds', () => {
    const rows = [
      ...Array.from({ length: 10 }, (_, index) => row(`social-${index}`, 'social')),
      ...Array.from({ length: 10 }, (_, index) => row(`off-${index}`, 'off_topic')),
    ];
    const assignments = assignStratifiedFolds(rows);
    expect(new Set(rows.filter((item) => item.expectedIntent === 'social').map((item) => assignments.get(item.id)))).toEqual(
      new Set([0, 1, 2, 3, 4]),
    );
  });

  it('never marks synthetic support as enablement-eligible', () => {
    const rows = [
      ...Array.from({ length: 10 }, (_, index) => row(`social-${index}`, 'social')),
      ...Array.from({ length: 10 }, (_, index) => row(`off-${index}`, 'off_topic')),
      row('protected', 'sensitive', 'synthetic', false),
    ];
    const predictions = new Map(
      rows.map((item) => [
        item.id,
        {
          intent: item.expectedIntent,
          confidence: 0.99,
          hasActionableClause: !item.directResponseAllowed,
          socialSubtype: item.expectedSocialSubtype,
          reasonCode: item.directResponseAllowed ? (item.expectedIntent === 'social' ? 'single_social' : 'unrelated') : 'protected_topic',
        },
      ]),
    );

    const report = evaluateNestedFolds(rows, predictions);
    expect(report.pooled.social.precision).toBe(1);
    expect(report.pooled.social.realSupport).toBe(0);
    expect(report.pooled.social.enablementEligible).toBe(false);
    expect(report.pooled.off_topic.enablementEligible).toBe(false);
  });

  it('rejects unknown corpus fields', () => {
    expect(() => routerCorpusRowSchema.parse({ ...row('social-1', 'social'), transcript: 'forbidden' })).toThrow();
  });
});

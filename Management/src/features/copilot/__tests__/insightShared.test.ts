import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ProducerLine, claimsIn, sectionBuckets } from '../insightShared';
import type { InsightBucket } from '../insightShared';
import type { ClaimSection, CopilotContext } from '../types';
import LeadInsights from '../LeadInsights';
import CollectionInsights from '../CollectionInsights';
import { clearEvidenceReveal } from '../evidence';
import { claim, makeSession, setViewport } from './copilotTestUtils';

vi.mock('../Announcer', () => ({
  useAnnouncer: () => ['', vi.fn()],
  LiveStatus: () => null,
}));

const rankedAttention = () => [
  claim({ id: 'info', section: 'attention', severity: 'info', text: 'Info claim' }),
  claim({ id: 'critical', section: 'attention', severity: 'critical', text: 'Critical claim' }),
  claim({ id: 'warning', section: 'attention', severity: 'warning', text: 'Warning claim' }),
];

const textOrder = (labels: string[]) =>
  labels.map((label) => screen.getByText(label));

beforeEach(() => {
  setViewport({ desktop: false });
  clearEvidenceReveal();
});

describe('claimsIn (the one shared definition)', () => {
  it('orders the attention section critical, then warning, then info', () => {
    expect(claimsIn(rankedAttention(), 'attention').map((item) => item.id)).toEqual([
      'critical',
      'warning',
      'info',
    ]);
  });

  it('filters every other section without reordering it', () => {
    const claims = [
      claim({ id: 'b', section: 'changed', text: 'Second' }),
      claim({ id: 'a', section: 'changed', text: 'First' }),
      claim({ id: 'x', section: 'current_state', text: 'Elsewhere' }),
    ];

    expect(claimsIn(claims, 'changed').map((item) => item.id)).toEqual(['b', 'a']);
    expect(claimsIn(claims, 'experienced_view')).toEqual([]);
  });
});

describe('each panel keeps its own heading text and section order', () => {
  it('record: reads "Since you were here" first, then attention', () => {
    render(
      createElement(LeadInsights, {
        session: makeSession({
          claims: [
            claim({ id: 'changed-1', section: 'changed', text: 'Changed claim' }),
            ...rankedAttention(),
          ],
        }),
        scopeLabel: 'Alice Traveller',
        leadId: 'a',
      })
    );

    const [changed, attention] = textOrder(['Since you were here', 'Needs attention']);
    expect(changed.compareDocumentPosition(attention) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('Changed')).not.toBeInTheDocument();

    // The shared ordering lands inside the record's attention section too.
    const ranked = textOrder(['Critical claim', 'Warning claim', 'Info claim']);
    expect(ranked[0].compareDocumentPosition(ranked[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(ranked[1].compareDocumentPosition(ranked[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('collection: scans attention first, and calls the changed row "Changed"', () => {
    render(
      createElement(CollectionInsights, {
        session: makeSession({
          claims: [
            claim({ id: 'changed-1', section: 'changed', text: 'Changed claim' }),
            ...rankedAttention(),
          ],
        }),
        scopeLabel: 'Billing',
      })
    );

    const [attention, changed] = textOrder(['Needs attention', 'Changed']);
    expect(attention.compareDocumentPosition(changed) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('Since you were here')).not.toBeInTheDocument();

    const ranked = textOrder(['Critical claim', 'Warning claim', 'Info claim']);
    expect(ranked[0].compareDocumentPosition(ranked[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(ranked[1].compareDocumentPosition(ranked[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

// A panel's own order, not imported: `insightShared` deliberately does not own
// section order, so this asserts the function's contract rather than a constant.
const ORDER: ClaimSection[] = ['attention', 'changed', 'current_state', 'experienced_view'];

/** The rendered order, flattened — for the assertions that care about sequence
 *  rather than about which bucket a row landed in. */
function ids(buckets: InsightBucket[]): string[] {
  return buckets.flatMap((bucket) => bucket.claims.map((item) => item.id));
}

describe('ProducerLine (the one authorship derivation)', () => {
  const context: CopilotContext = {
    pageKey: 'leads',
    scopeLabel: 'Billing',
    asOf: '2026-09-10T10:00:00.000Z',
    generatedAt: '2026-09-10T10:05:00.000Z',
    partial: false,
    noAccess: false,
  };

  it('names the rule engine, and the check time, for rule-computed claims', () => {
    render(createElement(ProducerLine, { producer: 'rule', context }));

    expect(screen.getByText('Rule engine')).toBeInTheDocument();
    expect(screen.getByText('Checked')).toBeInTheDocument();
    expect(screen.queryByText('AI briefing')).not.toBeInTheDocument();
  });

  it('names the AI briefing, and the generation time, for model claims', () => {
    render(createElement(ProducerLine, { producer: 'model', context }));

    expect(screen.getByText('AI briefing')).toBeInTheDocument();
    expect(screen.getByText('Generated')).toBeInTheDocument();
    expect(screen.queryByText('Rule engine')).not.toBeInTheDocument();
  });

  it('renders nothing when there is no timestamp to report', () => {
    const { container } = render(createElement(ProducerLine, { producer: 'rule', context: null }));

    expect(container).toBeEmptyDOMElement();
  });
});

describe('sectionBuckets (the grouping rule)', () => {
  it('groups nothing when there is nothing to group', () => {
    expect(sectionBuckets([], ORDER)).toEqual([]);
  });

  it('hoists every critical into one leading bucket, in input order', () => {
    // Deliberately interleaved, which the ranked source never is but a model
    // list can be. Hoisting is what stops the second critical rendering below
    // a warning that the server ranked lower.
    const buckets = sectionBuckets(
      [
        claim({ id: 'c1', section: 'attention', severity: 'critical', text: 'First critical' }),
        claim({ id: 'w1', section: 'attention', severity: 'warning', text: 'A warning' }),
        claim({ id: 'c2', section: 'changed', severity: 'critical', text: 'Second critical' }),
      ],
      ORDER
    );

    expect(buckets[0].kind).toBe('critical');
    expect(buckets[0].claims.map((item) => item.id)).toEqual(['c1', 'c2']);
    expect(ids(buckets)).toEqual(['c1', 'c2', 'w1']);
  });

  it('reproduces the server ranked shape exactly', () => {
    // rank.js returns [...shownCriticals, ...withSpread.picked] over disjoint
    // sets, so the ranked list is a critical prefix followed by a severity-major
    // remainder. Hoisting must reconstruct that structure, not rearrange it.
    const input = [
      claim({ id: 'c1', section: 'attention', severity: 'critical', text: 'Critical one' }),
      claim({ id: 'c2', section: 'changed', severity: 'critical', text: 'Critical two' }),
      claim({ id: 'w1', section: 'attention', severity: 'warning', text: 'Warning' }),
      claim({ id: 'i1', section: 'attention', severity: 'info', text: 'Info' }),
      claim({ id: 'w2', section: 'changed', severity: 'warning', text: 'Later warning' }),
    ];

    const buckets = sectionBuckets(input, ORDER);

    expect(buckets.map((bucket) => bucket.kind)).toEqual(['critical', 'section', 'section']);
    expect(buckets[1]).toMatchObject({ section: 'attention' });
    expect(ids(buckets)).toEqual(['c1', 'c2', 'w1', 'i1', 'w2']);
  });

  it('leads with the head of the remaining list, whatever section that is', () => {
    // The server's top item is always the first row rendered. Here the head sits
    // in the LAST section of the panel's own order, and it must still lead.
    const buckets = sectionBuckets(
      [
        claim({ id: 'x', section: 'experienced_view', text: 'Head item' }),
        claim({ id: 'y', section: 'attention', severity: 'warning', text: 'Attention item' }),
      ],
      ORDER,
      { ordering: 'server' }
    );

    expect(buckets.map((bucket) => (bucket.kind === 'section' ? bucket.section : 'critical'))).toEqual([
      'experienced_view',
      'attention',
    ]);
  });

  it('lets the panel order govern by default', () => {
    // An unranked source has no "first" worth leading with, so the default must
    // not reorder the panel's own hierarchy. This is what keeps a collection
    // scanning attention-first when the model happens to list a changed item first.
    const buckets = sectionBuckets(
      [
        claim({ id: 'x', section: 'experienced_view', text: 'Head item' }),
        claim({ id: 'y', section: 'attention', severity: 'warning', text: 'Attention item' }),
      ],
      ORDER
    );

    expect(buckets.map((bucket) => (bucket.kind === 'section' ? bucket.section : 'critical'))).toEqual([
      'attention',
      'experienced_view',
    ]);
  });

  it('preserves input order inside a section, even when that order looks wrong', () => {
    // The client is never entitled to disagree with the source. This mirrors the
    // ranked contract in CollectionInsights.ranked.test.tsx, where an `info`
    // legitimately renders above a `warning` because the server said so.
    const input = [
      claim({ id: 'info', section: 'attention', severity: 'info', text: 'Info' }),
      claim({ id: 'warning', section: 'attention', severity: 'warning', text: 'Warning' }),
      claim({ id: 'changed-b', section: 'changed', text: 'Second' }),
      claim({ id: 'changed-a', section: 'changed', text: 'First' }),
    ];

    const buckets = sectionBuckets(input, ORDER, { ordering: 'server' });
    const attention = buckets.find((b) => b.kind === 'section' && b.section === 'attention');
    const changed = buckets.find((b) => b.kind === 'section' && b.section === 'changed');

    expect(attention?.claims.map((item) => item.id)).toEqual(['info', 'warning']);
    expect(changed?.claims.map((item) => item.id)).toEqual(['changed-b', 'changed-a']);
  });

  it('loses and duplicates nothing on a source with no criticals', () => {
    const input = [
      claim({ id: 'a', section: 'current_state', text: 'A' }),
      claim({ id: 'b', section: 'changed', text: 'B' }),
      claim({ id: 'c', section: 'current_state', text: 'C' }),
      claim({ id: 'd', section: 'experienced_view', text: 'D' }),
    ];

    const buckets = sectionBuckets(input, ORDER);
    const rendered = ids(buckets);

    expect(rendered).toHaveLength(input.length);
    expect([...rendered].sort()).toEqual(input.map((item) => item.id).sort());
  });
});

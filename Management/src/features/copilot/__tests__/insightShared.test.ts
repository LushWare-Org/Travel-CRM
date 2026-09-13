import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { claimsIn } from '../insightShared';
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

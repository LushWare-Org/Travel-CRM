import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CollectionInsights from '../CollectionInsights';
import { makeSession, rankedClaim } from './copilotTestUtils';

vi.mock('../Announcer', () => ({
  useAnnouncer: () => ['test-announcement', vi.fn()],
  LiveStatus: () => null,
}));

// ─── The ranked collection insights ──────────────────────────────────────────
// The sibling spec covers the sectioned rendering. This one covers what the
// ranking adds: server order is preserved, every row explains itself, the list
// expands without re-ranking, and a suppression is stated rather than implied.
//
// These are the unit-level twins of the hooks the e2e spec
// (`Management/e2e/copilot-ranking.spec.js`) requires, so a hook renamed here
// fails there too.

const scopeLabel = 'Leads';

const rows = () =>
  Array.from(document.querySelectorAll('[data-copilot-item]')).map((node) => ({
    id: node.getAttribute('data-copilot-item-id'),
    band: node.getAttribute('data-copilot-band'),
    score: node.getAttribute('data-copilot-score'),
    text: node.textContent ?? '',
  }));

const renderInsights = (overrides = {}) => {
  const session = makeSession({ claims: [], ranked: [], ...overrides });
  return render(<CollectionInsights session={session} scopeLabel={scopeLabel} />);
};

describe('ranked rendering', () => {
  it('renders the server order verbatim, even when a lower band comes first', () => {
    // Deliberately "wrong": an info above a critical. The client must NOT fix
    // this — re-sorting replaces the server's ranking with the client's opinion,
    // and the two would disagree in exactly the case the ranking exists for.
    renderInsights({
      ranked: [
        rankedClaim({ id: 'a', key: 'key-a', severity: 'info', score: 10 }),
        rankedClaim({ id: 'b', key: 'key-b', severity: 'critical', score: 90 }),
      ],
    });

    expect(rows().map((row) => row.id)).toEqual(['key-a', 'key-b']);
    expect(rows().map((row) => row.band)).toEqual(['info', 'critical']);
  });

  it('carries the stable key, the band and the score on every row', () => {
    renderInsights({ ranked: [rankedClaim({ id: 'positional-1', key: 'stable-key' })] });

    const [row] = rows();
    expect(row.id).toBe('stable-key');
    expect(row.band).toBe('warning');
    expect(row.score).toBe('42.5');
  });

  it('falls back to the positional id when no key arrived', () => {
    renderInsights({ ranked: [rankedClaim({ id: 'positional-1', key: null })] });

    expect(rows()[0].id).toBe('positional-1');
  });

  it('explains why the item is where it is, from the server-provided components', () => {
    renderInsights({
      ranked: [rankedClaim({ urgency: 0.9, actionability: 0.4, novelty: 0, confidence: 0 })],
    });

    // The two strongest components, strongest first.
    expect(screen.getByText(/Why now: time-sensitive, actionable/)).toBeInTheDocument();
  });

  it('omits the explanation when every component is zero rather than inventing one', () => {
    renderInsights({
      ranked: [rankedClaim({ urgency: 0, actionability: 0, novelty: 0, confidence: 0 })],
    });

    expect(screen.queryByText(/Why now:/)).not.toBeInTheDocument();
  });
});

describe('expanding without re-ranking', () => {
  const sevenRanked = () => [
    rankedClaim({ id: 'a', key: 'k1', severity: 'critical', score: 90 }),
    rankedClaim({ id: 'b', key: 'k2', severity: 'critical', score: 80 }),
    rankedClaim({ id: 'c', key: 'k3', severity: 'warning', score: 70 }),
    rankedClaim({ id: 'd', key: 'k4', severity: 'warning', score: 60 }),
    rankedClaim({ id: 'e', key: 'k5', severity: 'warning', score: 50 }),
    rankedClaim({ id: 'f', key: 'k6', severity: 'info', score: 40 }),
    rankedClaim({ id: 'g', key: 'k7', severity: 'info', score: 30 }),
  ];

  it('shows five rows and offers the rest', () => {
    renderInsights({ ranked: sevenRanked() });

    expect(rows()).toHaveLength(5);
    expect(screen.getByText('Show 2 more')).toBeInTheDocument();
  });

  it('appends the remainder in server order, without re-ranking what is already shown', async () => {
    const user = userEvent.setup();
    renderInsights({ ranked: sevenRanked() });

    await user.click(screen.getByText('Show 2 more'));

    // Order preserved end to end: the reveal is a slice, not a second sort.
    expect(rows().map((row) => row.id)).toEqual(['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7']);
    expect(screen.queryByText(/Show \d+ more/)).not.toBeInTheDocument();
  });

  it('offers no expander when everything already fits', () => {
    renderInsights({ ranked: [rankedClaim({ key: 'only' })] });

    expect(screen.queryByText(/Show \d+ more/)).not.toBeInTheDocument();
  });

  it('resets the expansion when the scope changes', async () => {
    const user = userEvent.setup();
    const { rerender } = renderInsights({ ranked: sevenRanked() });
    await user.click(screen.getByText('Show 2 more'));
    expect(rows()).toHaveLength(7);

    // A different page's ranking: the expanded state must not carry over, or the
    // next page opens showing rows the operator never asked for.
    const nextSession = makeSession({
      ranked: [rankedClaim({ id: 'z', key: 'other-scope', severity: 'info', score: 5 })],
    });
    rerender(<CollectionInsights session={nextSession} scopeLabel="Invoices" />);

    expect(rows()).toHaveLength(1);
    expect(rows()[0].id).toBe('other-scope');
  });
});

describe('the quiet state', () => {
  it('states how many previously flagged items were suppressed', () => {
    renderInsights({ ranked: [], suppressedCount: 4 });

    const line = document.querySelector('[data-copilot-suppressed]');
    expect(line?.getAttribute('data-copilot-suppressed')).toBe('4');
    expect(line?.textContent).toContain('4 previously flagged items hidden');
  });

  it('says nothing about suppression when there was none', () => {
    renderInsights({ ranked: [rankedClaim()], suppressedCount: 0 });

    expect(document.querySelector('[data-copilot-suppressed]')).toBeNull();
  });

  it('never lets the quiet count stand in for a hidden critical', () => {
    renderInsights({
      ranked: [rankedClaim({ key: 'shown' })],
      suppressedCount: 3,
      suppressedCriticals: [rankedClaim({ id: 'c1', key: 'hidden-critical', severity: 'critical' })],
    });

    // Two separate truths: three acknowledged items, and one critical that did
    // not fit. Collapsing them would hide the one that matters.
    expect(document.querySelector('[data-copilot-suppressed]')?.getAttribute('data-copilot-suppressed')).toBe('3');
    const criticals = document.querySelector('[data-copilot-suppressed-critical]');
    expect(criticals?.getAttribute('data-copilot-suppressed-critical')).toBe('1');
    expect(criticals?.textContent).toContain('1 critical item did not fit');
  });
});

describe('the fallback path', () => {
  it('keeps the sectioned rendering when the server sent no ranking', () => {
    renderInsights({
      ranked: [],
      claims: [
        rankedClaim({ id: 'legacy', key: 'legacy-key', section: 'attention', text: 'An unranked finding' }),
      ],
    });

    expect(screen.getByText('An unranked finding')).toBeInTheDocument();
    expect(document.querySelector('[data-copilot-item]')).toBeNull();
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
  });

  it('does not present model claims as ranked', () => {
    // A model claim carries no score, so rendering it as a ranked row would show
    // an explanation the server never produced.
    renderInsights({
      claims: [
        rankedClaim({ id: 'model-1', section: 'attention', text: 'A model claim', score: undefined, urgency: undefined }),
      ],
      ranked: [rankedClaim({ id: 'det-1', key: 'det-key', text: 'A deterministic finding' })],
    });

    expect(screen.getByText('A model claim')).toBeInTheDocument();
    expect(document.querySelector('[data-copilot-item]')).toBeNull();
  });
});

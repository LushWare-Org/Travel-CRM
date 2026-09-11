import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CollectionBriefing from '../CollectionBriefing';
import { makeSession } from './copilotTestUtils';
import type { CopilotSource } from '../types';

vi.mock('../Announcer', () => ({
  useAnnouncer: () => ['test-announcement', vi.fn()],
  LiveStatus: () => null,
}));

describe('CollectionBriefing', () => {
  const scopeLabel = 'Billing';

  it('renders deterministic loading state', () => {
    const session = makeSession({ hasScope: true, loading: true, claims: [], deterministic: { status: 'loading', context: null, insights: [], error: null, noAccess: false }, briefing: { status: 'idle', runId: 0, claims: [], sources: [], questions: [], error: null, generatedAt: null, receivedAt: 0, settledWhileOpen: false } } as any);
    render(<CollectionBriefing session={session} scopeLabel={scopeLabel} />);
    expect(screen.getByText('Reading the page…')).toBeInTheDocument();
  });

  it('renders model pending state', () => {
    const session = makeSession({ hasScope: true, loading: false, modelPending: true, claims: [{ id: '1', section: 'changed', severity: 'info', text: 'Some claim', facts: [], evidenceIds: [], evidenceType: '' }] });
    render(<CollectionBriefing session={session} scopeLabel={scopeLabel} />);
    expect(screen.getByText('Some claim')).toBeInTheDocument();
  });

  it('renders empty collection state', () => {
    const session = makeSession({ hasScope: true, loading: false, modelPending: false, error: null, modelPartial: false, claims: [] });
    render(<CollectionBriefing session={session} scopeLabel={scopeLabel} />);
    expect(screen.getByText('Nothing needs you on this page.')).toBeInTheDocument();
    // The count line is omitted when no baseline arrived. Asserting a zero here
    // would be asserting a number nobody measured, which is the bug this pins.
    expect(screen.queryByText(/in the current view/)).not.toBeInTheDocument();
  });

  it('reports how much was examined when a per-source baseline is present', () => {
    const sources: CopilotSource[] = [
      { id: 'billing:source:invoices:recordCount', label: 'Invoices', type: 'computed', capturedValue: 42 },
      { id: 'billing:source:quotations:recordCount', label: 'Quotations', type: 'computed', capturedValue: 7 },
    ];
    const session = makeSession({
      hasScope: true,
      loading: false,
      modelPending: false,
      error: null,
      modelPartial: false,
      claims: [],
      sources,
    });
    render(<CollectionBriefing session={session} scopeLabel={scopeLabel} />);
    expect(screen.getByText('49 items in the current view')).toBeInTheDocument();
  });

  it('never claims a zero count when a baseline reports rows', () => {
    const sources: CopilotSource[] = [
      { id: 'billing:source:invoices:recordCount', label: 'Invoices', type: 'computed', capturedValue: 50 },
    ];
    const session = makeSession({
      hasScope: true,
      loading: false,
      modelPending: false,
      error: null,
      modelPartial: false,
      claims: [],
      sources,
    });
    render(<CollectionBriefing session={session} scopeLabel={scopeLabel} />);
    expect(screen.queryByText('0 items in the current view')).not.toBeInTheDocument();
  });

  it('renders partial loaded state', () => {
    const session = makeSession({ hasScope: true, loading: false, modelPending: false, claims: [], context: { partial: true, unavailableSources: ['source1'], notAuthorizedSources: [] } as any });
    render(<CollectionBriefing session={session} scopeLabel={scopeLabel} />);
    expect(screen.getByText('Partially loaded — 1 sources unavailable')).toBeInTheDocument();
  });

  it('renders denied state', () => {
    const session = makeSession({ hasScope: true, loading: false, modelPending: false, claims: [], context: { partial: true, unavailableSources: [], notAuthorizedSources: ['source1'] } as any });
    render(<CollectionBriefing session={session} scopeLabel={scopeLabel} />);
    expect(screen.getByText('Some data is outside your role')).toBeInTheDocument();
  });

  it('renders no-access state', () => {
    const session = makeSession({ noAccess: true });
    render(<CollectionBriefing session={session} scopeLabel={scopeLabel} />);
    expect(screen.getByText("You don't have access to this page's data.")).toBeInTheDocument();
  });

  it('renders error fallback state', () => {
    const session = makeSession({ error: 'Failed' });
    render(<CollectionBriefing session={session} scopeLabel={scopeLabel} />);
    expect(screen.getByText("The summary couldn't be generated.")).toBeInTheDocument();
  });

  it('renders success state (no status row)', () => {
    const session = makeSession({ hasScope: true, loading: false, claims: [{ id: '1', section: 'changed', severity: 'info', text: 'Success claim', facts: [], evidenceIds: [], evidenceType: '' }] });
    const { container } = render(<CollectionBriefing session={session} scopeLabel={scopeLabel} />);
    expect(screen.getByText('Success claim')).toBeInTheDocument();
    expect(screen.queryByText(/Partially loaded/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Some data is outside/)).not.toBeInTheDocument();
  });
});

describe('CollectionBriefing — suggested questions', () => {
  const scopeLabel = 'Billing';

  it('omits the block when the scope has no suggested questions', () => {
    render(<CollectionBriefing session={makeSession({ suggestedQuestions: [] })} scopeLabel={scopeLabel} />);

    expect(screen.queryByRole('region', { name: 'Suggested questions' })).not.toBeInTheDocument();
  });

  it('renders and submits a single server-supplied question through the session action', async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(
      <CollectionBriefing
        session={makeSession({ suggestedQuestions: ['Who is the most overdue?'], submit })}
        scopeLabel={scopeLabel}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Who is the most overdue?' }));
    expect(submit).toHaveBeenCalledWith('Who is the most overdue?');
  });

  it('renders at most three questions', () => {
    render(
      <CollectionBriefing
        session={makeSession({
          suggestedQuestions: ['One?', 'Two?', 'Three?', 'Four?'],
        })}
        scopeLabel={scopeLabel}
      />
    );

    expect(screen.getByRole('button', { name: 'One?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Three?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Four?' })).not.toBeInTheDocument();
  });
});

describe('CollectionBriefing — heading focus target', () => {
  it('marks the real heading as the programmatic focus target', () => {
    render(<CollectionBriefing session={makeSession({})} scopeLabel="Billing" />);

    // ManagementContextCopilot moves focus to `#copilot-briefing-heading` when
    // the panel opens. That move silently no-ops if the real heading loses its
    // tabIndex; the shell test renders its own heading stub, so only an
    // assertion against the real briefing can catch the regression.
    expect(screen.getByRole('heading', { name: /page briefing/i })).toHaveAttribute('tabindex', '-1');
  });
});

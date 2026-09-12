import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCopilotSession, INSIGHTS_FRESHNESS_MS } from '../useCopilotSession';
import type { CopilotScope } from '../types';
import { deferred } from '@/test/deferred';

const api = vi.hoisted(() => ({
  copilotDeterministic: vi.fn(),
  copilotInsights: vi.fn(),
  copilotAsk: vi.fn(),
  copilotSeen: vi.fn(),
  isCopilotAbort: vi.fn((err: unknown) => {
    const candidate = err as { name?: string; aborted?: boolean } | null;
    if (candidate === null) return false;
    return candidate.name === 'AbortError' || candidate.aborted === true;
  }),
}));

vi.mock('@/services/copilotAPI', () => api);

const deterministicResult = (leadId: string, text: string) => ({
  context: { pageKey: 'leads', scopeLabel: `Lead ${leadId}`, asOf: '2026-09-10T10:00:00.000Z', noAccess: false },
  insights: [
    {
      id: `insight-${leadId}`,
      section: 'current_state',
      severity: 'info',
      text,
      evidenceIds: [`lead:${leadId}:name`],
    },
  ],
  unavailableSources: [],
  notAuthorizedSources: [],
});

const insightsResult = (leadId: string, text: string, extra: Record<string, unknown> = {}) => ({
  context: {
    pageKey: 'leads',
    scopeLabel: `Lead ${leadId}`,
    generatedAt: '2026-09-10T10:05:00.000Z',
    partial: false,
    noAccess: false,
  },
  claims: [
    {
      id: `claim-${leadId}`,
      section: 'current_state',
      text,
      facts: [],
      evidenceIds: [`lead:${leadId}:name`],
      evidenceType: 'record',
      severity: 'info',
    },
  ],
  suggestedQuestions: ['What should I do next?'],
  sources: [{ id: `lead:${leadId}:name`, label: 'Name', type: 'record' }],
  unavailableSources: [],
  notAuthorizedSources: [],
  ...extra,
});

type HarnessProps = {
  scope: CopilotScope | null;
  open?: boolean;
};

function Harness({ scope, open = true }: HarnessProps) {
  const session = useCopilotSession(scope, 'last_visit', { open });
  return (
    <div>
      <p data-testid="lead">{session.leadId ?? 'none'}</p>
      <p data-testid="claims">{session.claims.map((claim) => claim.text).join('|')}</p>
      <p data-testid="input">{session.input}</p>
      <p data-testid="error">{session.error ?? ''}</p>
      <p data-testid="turns">{session.turns.map((turn) => `${turn.question}:${turn.status}`).join('|')}</p>
      <p data-testid="model">{session.modelPending ? 'pending' : session.modelPartial ? 'partial' : 'settled'}</p>
      <button type="button" onClick={() => session.setInput('typed question')}>
        type
      </button>
      <button type="button" onClick={() => session.submit()}>
        submit
      </button>
      <button type="button" onClick={() => session.retryInsights()}>
        retry-insights
      </button>
      <button type="button" onClick={() => session.retryDeterministic()}>
        retry-deterministic
      </button>
    </div>
  );
}

let now = Date.parse('2026-09-10T10:30:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  now = Date.parse('2026-09-10T10:30:00.000Z');
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  api.copilotSeen.mockResolvedValue({ ok: true });
  api.copilotDeterministic.mockImplementation(({ scope }: { scope: { leadId: string } }) =>
    Promise.resolve(deterministicResult(scope.leadId, `Deterministic ${scope.leadId}`))
  );
  api.copilotInsights.mockImplementation(({ scope }: { scope: { leadId: string } }) =>
    Promise.resolve(insightsResult(scope.leadId, `Insights ${scope.leadId}`))
  );
  api.copilotAsk.mockResolvedValue({
    context: { pageKey: 'leads', scopeLabel: 'Lead a', generatedAt: '2026-09-10T10:06:00.000Z', partial: false, noAccess: false },
    claims: [],
    answerBlocks: [
      {
        id: 'answer-1',
        section: 'current_state',
        text: 'Answered',
        facts: [],
        evidenceIds: ['lead:a:name'],
        evidenceType: 'record',
        severity: 'info',
      },
    ],
    suggestedQuestions: [],
    sources: [{ id: 'lead:a:name', label: 'Name', type: 'record' }],
    unavailableSources: [],
    notAuthorizedSources: [],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useCopilotSession — scope lifecycle', () => {
  it('issues zero requests and clears every lead-scoped value with no scope', async () => {
    render(<Harness scope={null} />);

    expect(screen.getByTestId('lead')).toHaveTextContent('none');
    expect(screen.getByTestId('claims')).toHaveTextContent('');
    expect(screen.getByTestId('error')).toHaveTextContent('');

    await act(async () => {});
    expect(api.copilotDeterministic).not.toHaveBeenCalled();
    expect(api.copilotInsights).not.toHaveBeenCalled();
    expect(api.copilotAsk).not.toHaveBeenCalled();
    expect(api.copilotSeen).not.toHaveBeenCalled();
  });

  it('treats a blank or whitespace-only lead id as no scope and sends no request', async () => {
    const { rerender } = render(<Harness scope={{ leadId: '   ' }} />);
    await act(async () => {});
    expect(api.copilotDeterministic).not.toHaveBeenCalled();

    rerender(<Harness scope={{ leadId: '' }} />);
    await act(async () => {});
    expect(api.copilotDeterministic).not.toHaveBeenCalled();
    expect(screen.getByTestId('lead')).toHaveTextContent('none');
  });

  it('keys the session by lead id: A -> clear -> B leaks nothing', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness scope={{ leadId: 'a' }} />);
    await waitFor(() => expect(screen.getByTestId('claims')).toHaveTextContent('Insights a'));

    await user.click(screen.getByText('type'));
    expect(screen.getByTestId('input')).toHaveTextContent('typed question');

    rerender(<Harness scope={null} />);
    expect(screen.getByTestId('claims')).toHaveTextContent('');
    expect(screen.getByTestId('input')).toHaveTextContent('');
    expect(screen.getByTestId('lead')).toHaveTextContent('none');

    rerender(<Harness scope={{ leadId: 'b' }} />);
    await waitFor(() => expect(screen.getByTestId('claims')).toHaveTextContent('Insights b'));
    expect(screen.getByTestId('claims').textContent).not.toContain('a');

    expect(api.copilotDeterministic).toHaveBeenCalledTimes(2);
    expect(api.copilotDeterministic.mock.calls[0][0].scope).toEqual({ leadId: 'a' });
    expect(api.copilotDeterministic.mock.calls[1][0].scope).toEqual({ leadId: 'b' });
    expect(api.copilotInsights.mock.calls.map((call) => call[0].scope)).toEqual([
      { leadId: 'a' },
      { leadId: 'b' },
    ]);
  });

  it('aborts the previous scope and suppresses its late response', async () => {
    const pendingDeterministic = deferred<ReturnType<typeof deterministicResult>>();
    const pendingInsights = deferred<ReturnType<typeof insightsResult>>();
    api.copilotDeterministic.mockImplementationOnce(() => pendingDeterministic.promise);
    api.copilotInsights.mockImplementationOnce(() => pendingInsights.promise);

    const { rerender } = render(<Harness scope={{ leadId: 'a' }} />);
    const abandonedSignal = api.copilotDeterministic.mock.calls[0][0].signal as AbortSignal;
    const abandonedInsightsSignal = api.copilotInsights.mock.calls[0]?.[0]?.signal as AbortSignal | undefined;
    expect(abandonedSignal.aborted).toBe(false);

    rerender(<Harness scope={{ leadId: 'b' }} />);
    expect(abandonedSignal.aborted).toBe(true);
    if (abandonedInsightsSignal) expect(abandonedInsightsSignal.aborted).toBe(true);

    await waitFor(() => expect(screen.getByTestId('claims')).toHaveTextContent('Insights b'));

    // The late response from A can never repopulate B.
    await act(async () => {
      pendingDeterministic.resolve(deterministicResult('a', 'Deterministic a'));
      pendingInsights.resolve(insightsResult('a', 'Insights a'));
    });

    expect(screen.getByTestId('claims')).toHaveTextContent('Insights b');
    expect(screen.getByTestId('claims').textContent).not.toContain('Insights a');
  });

  it('surfaces an interrupted insights run instead of leaving the model phase pending forever', async () => {
    // The effect's own cleanup aborts an in-flight insights run whenever its
    // dependencies change — a benign re-render, not a scope change. The abort
    // used to return silently, leaving status "pending" permanently: the start
    // effect refuses to restart a run it already began (`insightsStartedRef`),
    // and the regenerate effect skips "pending" because that status means a
    // request is legitimately in flight. Nothing retried and nothing errored, so
    // the panel read "AI insights in progress — showing what is already verified"
    // indefinitely, with no error and no Retry.
    const interrupted = Object.assign(new Error('cancelled'), { name: 'AbortError' });
    api.copilotInsights.mockImplementationOnce(() => Promise.reject(interrupted));

    render(<Harness scope={{ leadId: 'a' }} />);
    await waitFor(() => expect(api.copilotInsights).toHaveBeenCalled());

    // Recoverable, not stuck: `modelPartial` is what renders the verified summary
    // plus the Retry control, and it is what the reopen path regenerates from.
    await waitFor(() => expect(screen.getByTestId('model')).toHaveTextContent('partial'));
  });

  it('never renders a cancelled request as an error', async () => {
    const aborted = Object.assign(new Error('cancelled'), { name: 'AbortError' });
    api.copilotDeterministic.mockImplementationOnce(() => Promise.reject(aborted));

    render(<Harness scope={{ leadId: 'a' }} />);
    await waitFor(() => expect(api.copilotInsights).toHaveBeenCalled());
    expect(screen.getByTestId('error')).toHaveTextContent('');
  });

  it('renders a genuine deterministic failure as an error', async () => {
    api.copilotDeterministic.mockImplementationOnce(() => Promise.reject(new Error('lead service down')));

    render(<Harness scope={{ leadId: 'a' }} />);
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('lead service down'));
  });
});

describe('useCopilotSession — model phase visibility', () => {
  it('runs the deterministic phase immediately but the insights only while open', async () => {
    const { rerender } = render(<Harness scope={{ leadId: 'a' }} open={false} />);
    await waitFor(() => expect(screen.getByTestId('claims')).toHaveTextContent('Deterministic a'));
    expect(api.copilotInsights).not.toHaveBeenCalled();

    rerender(<Harness scope={{ leadId: 'a' }} open />);
    await waitFor(() => expect(screen.getByTestId('claims')).toHaveTextContent('Insights a'));
    expect(api.copilotInsights).toHaveBeenCalledTimes(1);
  });

  it('reuses a kept result within the freshness bound and regenerates past it', async () => {
    const { rerender } = render(<Harness scope={{ leadId: 'a' }} open />);
    await waitFor(() => expect(screen.getByTestId('claims')).toHaveTextContent('Insights a'));

    rerender(<Harness scope={{ leadId: 'a' }} open={false} />);
    rerender(<Harness scope={{ leadId: 'a' }} open />);
    await act(async () => {});
    expect(api.copilotInsights).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('claims')).toHaveTextContent('Insights a');

    // Past the freshness bound the kept result is regenerated, not re-presented.
    now += INSIGHTS_FRESHNESS_MS + 1;
    rerender(<Harness scope={{ leadId: 'a' }} open={false} />);
    rerender(<Harness scope={{ leadId: 'a' }} open />);
    await waitFor(() => expect(api.copilotInsights).toHaveBeenCalledTimes(2));
  });

  it('keeps a result that settles while collapsed and presents it on the next open', async () => {
    const pending = deferred<ReturnType<typeof insightsResult>>();
    api.copilotInsights.mockImplementationOnce(() => pending.promise);

    const { rerender } = render(<Harness scope={{ leadId: 'a' }} open />);
    rerender(<Harness scope={{ leadId: 'a' }} open={false} />);
    await act(async () => {
      pending.resolve(insightsResult('a', 'Insights a'));
    });

    // Settled in the background: kept, not acknowledged.
    expect(api.copilotSeen).not.toHaveBeenCalled();

    rerender(<Harness scope={{ leadId: 'a' }} open />);
    await waitFor(() => expect(screen.getByTestId('claims')).toHaveTextContent('Insights a'));
    expect(api.copilotSeen).toHaveBeenCalledTimes(1);
    expect(api.copilotInsights).toHaveBeenCalledTimes(1);
  });

  it('labels the insights partial and keeps the deterministic list when the model phase fails', async () => {
    api.copilotInsights.mockImplementationOnce(() => Promise.reject(new Error('model offline')));

    render(<Harness scope={{ leadId: 'a' }} open />);
    await waitFor(() => expect(screen.getByTestId('model')).toHaveTextContent('partial'));
    expect(screen.getByTestId('claims')).toHaveTextContent('Deterministic a');
  });
});

describe('useCopilotSession — acknowledgement', () => {
  it('acknowledges exactly once, at presentation, for the active grounded insights', async () => {
    render(<Harness scope={{ leadId: 'a' }} open />);
    await waitFor(() => expect(screen.getByTestId('claims')).toHaveTextContent('Insights a'));
    await waitFor(() => expect(api.copilotSeen).toHaveBeenCalledTimes(1));

    expect(api.copilotSeen.mock.calls[0][0]).toMatchObject({ pageKey: 'leads', scope: { leadId: 'a' } });

    await act(async () => {});
    expect(api.copilotSeen).toHaveBeenCalledTimes(1);
  });

  it('never acknowledges a collapsed, no-scope, or failed insights', async () => {
    api.copilotInsights.mockImplementationOnce(() => Promise.reject(new Error('model offline')));
    render(<Harness scope={{ leadId: 'a' }} open />);
    await waitFor(() => expect(screen.getByTestId('model')).toHaveTextContent('partial'));
    await act(async () => {});
    expect(api.copilotSeen).not.toHaveBeenCalled();
  });

  it('keeps the insights usable and retries once on the next genuine open when the acknowledgement fails', async () => {
    api.copilotSeen.mockRejectedValue(new Error('write failed'));
    const { rerender } = render(<Harness scope={{ leadId: 'a' }} open />);

    await waitFor(() => expect(screen.getByTestId('claims')).toHaveTextContent('Insights a'));
    await waitFor(() => expect(api.copilotSeen).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('error')).toHaveTextContent('');

    rerender(<Harness scope={{ leadId: 'a' }} open={false} />);
    rerender(<Harness scope={{ leadId: 'a' }} open />);
    await waitFor(() => expect(api.copilotSeen).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('claims')).toHaveTextContent('Insights a');
  });
});

describe('useCopilotSession — turns', () => {
  it('creates the user turn before the answer request starts', async () => {
    const pending = deferred<{ answerBlocks: unknown[]; sources: unknown[] }>();
    api.copilotAsk.mockImplementationOnce(() => pending.promise);

    const user = userEvent.setup();
    render(<Harness scope={{ leadId: 'a' }} />);
    await waitFor(() => expect(screen.getByTestId('claims')).toHaveTextContent('Insights a'));

    await user.click(screen.getByText('type'));
    await user.click(screen.getByText('submit'));
    expect(screen.getByTestId('turns')).toHaveTextContent('typed question:pending');
    expect(api.copilotAsk).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve({
        answerBlocks: [
          {
            id: 'answer-1',
            section: 'current_state',
            text: 'Answered',
            facts: [],
            evidenceIds: ['lead:a:name'],
            evidenceType: 'record',
            severity: 'info',
          },
        ],
        sources: [{ id: 'lead:a:name', label: 'Name', type: 'record' }],
      });
    });
    expect(screen.getByTestId('turns')).toHaveTextContent('typed question:answered');
  });
});

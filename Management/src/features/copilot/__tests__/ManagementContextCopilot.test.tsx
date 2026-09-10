import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CopilotSectionApi } from '../ManagementContextCopilot';
import type { LeadCopilotScope } from '../types';
import { visibilityKey, mobileCueKey } from '../useCopilotVisibility';
import { setViewport } from './copilotTestUtils';

const api = vi.hoisted(() => ({
  copilotDeterministic: vi.fn(),
  copilotBriefing: vi.fn(),
  copilotAsk: vi.fn(),
  copilotSeen: vi.fn(),
  isCopilotAbort: vi.fn((err: unknown) => (err as { name?: string } | null)?.name === 'AbortError'),
  COPILOT_CLIENT_TIMEOUT_MS: 20_000,
}));

vi.mock('@/services/copilotAPI', () => api);

import { AuthProvider } from '@/contexts/AuthContext';
import ManagementContextCopilot from '../ManagementContextCopilot';

const ACTOR = 'actor-1';

function StubSections({ api: sectionApi }: { api: CopilotSectionApi }) {
  const { session } = sectionApi;
  return (
    <div>
      <h2 id="copilot-briefing-heading" tabIndex={-1}>
        Lead briefing
      </h2>
      <p data-testid="surface-open">{sectionApi.open ? 'open' : 'closed'}</p>
      <p data-testid="claims">{session.claims.map((claim) => claim.text).join('|')}</p>
      <p data-testid="model">{session.modelPending ? 'pending' : session.modelPartial ? 'partial' : 'settled'}</p>
      <p data-testid="turns">{session.turns.map((turn) => `${turn.question}:${turn.status}`).join('|')}</p>
      <p data-testid="turn-errors">{session.turns.map((turn) => turn.error ?? '').join('|')}</p>
      <p data-testid="answers">
        {session.turns.flatMap((turn) => (turn.answer ?? []).map((claim) => claim.text)).join('|')}
      </p>
      <button type="button" onClick={() => session.submit('Is the deposit paid?')}>
        ask-suggested
      </button>
      <button type="button" onClick={() => session.setInput('typed question')}>
        type
      </button>
      <button type="button" onClick={() => session.submit()}>
        submit
      </button>
      <button type="button" onClick={() => session.retryTurn(session.turns[0]?.id ?? '')}>
        retry-turn
      </button>
      {sectionApi.collapse && (
        <button type="button" onClick={sectionApi.collapse}>
          collapse
        </button>
      )}
    </div>
  );
}

function renderShell({ scope = { leadId: 'a' } as LeadCopilotScope, withAuth = true } = {}) {
  const tree = (
    <ManagementContextCopilot pageKey="leads" scope={scope} scopeLabel="Alice Traveller">
      {(sectionApi) => <StubSections api={sectionApi} />}
    </ManagementContextCopilot>
  );
  return render(withAuth ? <AuthProvider>{tree}</AuthProvider> : tree);
}

const answerBlock = (text: string) => ({
  id: `answer-${text}`,
  section: 'current_state',
  text,
  facts: [],
  evidenceIds: [],
  evidenceType: 'record',
  severity: 'info',
});

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  setViewport({ desktop: true });

  localStorage.setItem('token', 'test-token');
  localStorage.setItem('user', JSON.stringify({ _id: ACTOR, name: 'Ops' }));

  api.copilotSeen.mockResolvedValue({ ok: true });
  api.copilotDeterministic.mockImplementation(({ scope }: { scope: { leadId: string } }) =>
    Promise.resolve({
      context: { pageKey: 'leads', scopeLabel: `Lead ${scope.leadId}`, asOf: '2026-09-10T10:00:00.000Z', noAccess: false },
      insights: [
        {
          id: 'insight-1',
          section: 'current_state',
          severity: 'info',
          text: `Deterministic ${scope.leadId}`,
          evidenceIds: [],
        },
      ],
      unavailableSources: [],
      notAuthorizedSources: [],
    })
  );
  api.copilotBriefing.mockImplementation(({ scope }: { scope: { leadId: string } }) =>
    Promise.resolve({
      context: { pageKey: 'leads', scopeLabel: `Lead ${scope.leadId}`, generatedAt: '2026-09-10T10:05:00.000Z', partial: false, noAccess: false },
      claims: [
        {
          id: 'claim-1',
          section: 'current_state',
          text: `Briefing ${scope.leadId}`,
          facts: [],
          evidenceIds: [],
          evidenceType: 'record',
          severity: 'info',
        },
      ],
      suggestedQuestions: ['Is the deposit paid?'],
      sources: [],
      unavailableSources: [],
      notAuthorizedSources: [],
    })
  );
  api.copilotAsk.mockResolvedValue({
    claims: [],
    answerBlocks: [answerBlock('The deposit is paid.')],
    suggestedQuestions: [],
    sources: [],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('ManagementContextCopilot — desktop visibility', () => {
  it('auto-opens once for the first valid lead and persists open under the operator id', async () => {
    renderShell();

    await waitFor(() => expect(screen.getByTestId('surface-open')).toHaveTextContent('open'));
    expect(screen.getByTestId('claims')).toHaveTextContent('Briefing a');
    expect(localStorage.getItem(visibilityKey(ACTOR))).toBe('open');
  });

  it('does not count a no-lead visit as discovery', async () => {
    renderShell({ scope: null });

    await act(async () => {});
    expect(screen.getByRole('button', { name: 'Open copilot' })).toBeInTheDocument();
    expect(localStorage.getItem(visibilityKey(ACTOR))).toBeNull();
    expect(api.copilotDeterministic).not.toHaveBeenCalled();
  });

  it('persists a collapse and never reopens on later leads or reloads', async () => {
    const user = userEvent.setup();
    const { rerender } = renderShell();
    await waitFor(() => expect(screen.getByTestId('surface-open')).toHaveTextContent('open'));

    await user.click(screen.getByRole('button', { name: 'collapse' }));

    expect(localStorage.getItem(visibilityKey(ACTOR))).toBe('collapsed');
    expect(screen.queryByTestId('surface-open')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open copilot' })).toBeInTheDocument();

    // A later lead does not force the dock back open.
    const tree = (
      <ManagementContextCopilot pageKey="leads" scope={{ leadId: 'b' }} scopeLabel="Bob Explorer">
        {(sectionApi) => <StubSections api={sectionApi} />}
      </ManagementContextCopilot>
    );
    rerender(<AuthProvider>{tree}</AuthProvider>);

    await act(async () => {});
    expect(screen.queryByTestId('surface-open')).not.toBeInTheDocument();
    expect(localStorage.getItem(visibilityKey(ACTOR))).toBe('collapsed');
  });

  it('persists a manual reopen and keeps another operator preference untouched', async () => {
    localStorage.setItem(visibilityKey('actor-2'), 'collapsed');
    localStorage.setItem(visibilityKey(ACTOR), 'collapsed');
    const user = userEvent.setup();

    renderShell();
    await user.click(screen.getByRole('button', { name: 'Open copilot' }));

    await waitFor(() => expect(screen.getByTestId('surface-open')).toHaveTextContent('open'));
    expect(localStorage.getItem(visibilityKey(ACTOR))).toBe('open');
    expect(localStorage.getItem(visibilityKey('actor-2'))).toBe('collapsed');
  });

  it('waits for the authenticated identity and persists nothing until it resolves', async () => {
    renderShell({ withAuth: false });

    await act(async () => {});
    expect(screen.getByRole('button', { name: 'Open copilot' })).toBeInTheDocument();
    expect(localStorage.getItem(visibilityKey(ACTOR))).toBeNull();
    expect(localStorage.getItem(visibilityKey('undefined'))).toBeNull();
  });

  it('renders the persistent dock at xl and a labeled rail once collapsed', async () => {
    const user = userEvent.setup();
    renderShell();
    await waitFor(() => expect(document.querySelector('[data-copilot-surface="dock"]')).not.toBeNull());

    await user.click(screen.getByRole('button', { name: 'collapse' }));
    expect(document.querySelector('[data-copilot-surface="dock"]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open copilot' })).toBeInTheDocument();
  });

  it('shows the attention marker on the rail only for a real warning claim', async () => {
    const user = userEvent.setup();
    api.copilotBriefing.mockImplementationOnce(() =>
      Promise.resolve({
        context: { pageKey: 'leads', scopeLabel: 'Lead a', generatedAt: '2026-09-10T10:05:00.000Z', partial: false, noAccess: false },
        claims: [
          {
            id: 'claim-warning',
            section: 'attention',
            text: 'The deposit is overdue.',
            facts: [],
            evidenceIds: [],
            evidenceType: 'record',
            severity: 'warning',
          },
        ],
        suggestedQuestions: [],
        sources: [],
        unavailableSources: [],
        notAuthorizedSources: [],
      })
    );

    renderShell();
    await waitFor(() => expect(screen.getByTestId('claims')).toHaveTextContent('The deposit is overdue.'));

    await user.click(screen.getByRole('button', { name: 'collapse' }));
    expect(screen.getByLabelText('This lead has items needing attention.')).toBeInTheDocument();
    expect(screen.queryByText(/unread/i)).not.toBeInTheDocument();
  });
});

describe('ManagementContextCopilot — below xl', () => {
  beforeEach(() => {
    setViewport({ desktop: false });
  });

  it('never auto-opens, shows the one-time cue once grounded content exists, and persists dismissal on open', async () => {
    const user = userEvent.setup();
    renderShell();

    expect(await screen.findByText('Lead briefing ready')).toBeInTheDocument();
    expect(localStorage.getItem(visibilityKey(ACTOR))).toBeNull();
    expect(document.querySelector('[data-copilot-surface="dock"]')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Open copilot' }));

    await waitFor(() => expect(api.copilotDeterministic).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('claims').textContent).toMatch(/Deterministic a|Briefing a/);
    expect(localStorage.getItem(mobileCueKey(ACTOR))).toBe('true');
    expect(localStorage.getItem(visibilityKey(ACTOR))).toBe('open');
    await waitFor(() => expect(screen.queryByText('Lead briefing ready')).not.toBeInTheDocument());
  });

  it('moves focus into the drawer heading on open and restores it to the trigger on close', async () => {
    const user = userEvent.setup();
    renderShell();

    const trigger = screen.getByRole('button', { name: 'Open copilot' });
    await user.click(trigger);

    const heading = await screen.findByRole('heading', { name: 'Lead briefing' });
    await waitFor(() => expect(document.activeElement).toBe(heading));

    await user.click(screen.getByRole('button', { name: 'Close copilot' }));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('persists an explicit cue dismissal without opening the drawer', async () => {
    const user = userEvent.setup();
    renderShell();

    await screen.findByText('Lead briefing ready');
    await user.click(screen.getByRole('button', { name: 'Dismiss briefing ready cue' }));

    expect(localStorage.getItem(mobileCueKey(ACTOR))).toBe('true');
    expect(localStorage.getItem(visibilityKey(ACTOR))).toBeNull();
    expect(screen.queryByText('Lead briefing ready')).not.toBeInTheDocument();
  });
});

describe('ManagementContextCopilot — conversation', () => {
  it('keeps a suggested question paired with its successful answer', async () => {
    const user = userEvent.setup();
    renderShell();
    await waitFor(() => expect(screen.getByTestId('claims')).toHaveTextContent('Briefing a'));

    await user.click(screen.getByRole('button', { name: 'ask-suggested' }));

    await waitFor(() => expect(screen.getByTestId('turns')).toHaveTextContent('Is the deposit paid?:answered'));
    expect(screen.getByTestId('answers')).toHaveTextContent('The deposit is paid.');
    expect(api.copilotAsk).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [{ role: 'user', content: 'Is the deposit paid?' }] })
    );
  });

  it('keeps a typed question paired with a failed answer and retries that turn', async () => {
    const user = userEvent.setup();
    api.copilotAsk.mockRejectedValueOnce(new Error('assistant offline'));
    renderShell();
    await waitFor(() => expect(screen.getByTestId('claims')).toHaveTextContent('Briefing a'));

    await user.click(screen.getByRole('button', { name: 'type' }));
    await user.click(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => expect(screen.getByTestId('turns')).toHaveTextContent('typed question:error'));
    expect(screen.getByTestId('turn-errors')).toHaveTextContent('assistant offline');

    await user.click(screen.getByRole('button', { name: 'retry-turn' }));

    await waitFor(() => expect(screen.getByTestId('turns')).toHaveTextContent('typed question:answered'));
    expect(screen.getByTestId('answers')).toHaveTextContent('The deposit is paid.');
    expect(screen.getByTestId('turn-errors')).not.toHaveTextContent('assistant offline');
  });

  it('answers a question with verified blocks while the briefing itself is partial', async () => {
    const user = userEvent.setup();
    api.copilotBriefing.mockRejectedValueOnce(new Error('model offline'));
    renderShell();

    await waitFor(() => expect(screen.getByTestId('model')).toHaveTextContent('partial'));
    expect(screen.getByTestId('claims')).toHaveTextContent('Deterministic a');

    await user.click(screen.getByRole('button', { name: 'type' }));
    await user.click(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => expect(screen.getByTestId('turns')).toHaveTextContent('typed question:answered'));
    expect(screen.getByTestId('answers')).toHaveTextContent('The deposit is paid.');
  });
});

describe('ManagementContextCopilot — scope lifecycle', () => {
  it('drops the previous lead briefing when the selection is cleared', async () => {
    const { rerender } = renderShell();

    await waitFor(() => expect(screen.getByTestId('claims')).toHaveTextContent('Briefing a'));

    rerender(
      <AuthProvider>
        <ManagementContextCopilot pageKey="leads" scope={null} scopeLabel="Leads">
          {(sectionApi) => <StubSections api={sectionApi} />}
        </ManagementContextCopilot>
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('claims')).not.toHaveTextContent('Briefing a'));
    expect(screen.getByTestId('claims')).not.toHaveTextContent('Deterministic a');
  });
});

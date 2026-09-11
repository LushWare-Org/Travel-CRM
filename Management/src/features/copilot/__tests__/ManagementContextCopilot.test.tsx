import { createRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CopilotSectionApi } from '../ManagementContextCopilot';
import type { CopilotScope } from '../types';
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
import CopilotTrigger from '../CopilotTrigger';

const ACTOR = 'actor-1';
/** The page key the shell is rendered with below; the stored preference is
 *  keyed by actor AND page, so the assertions must name both. */
const PAGE = 'leads';

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

function renderShell({ scope = { leadId: 'a' } as CopilotScope | null, withAuth = true } = {}) {
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
    expect(localStorage.getItem(visibilityKey(ACTOR, PAGE))).toBe('open');
  });

  it('does not count a no-lead visit as discovery', async () => {
    renderShell({ scope: null });

    await act(async () => {});
    expect(screen.getByRole('button', { name: 'Open copilot' })).toBeInTheDocument();
    expect(localStorage.getItem(visibilityKey(ACTOR, PAGE))).toBeNull();
    expect(api.copilotDeterministic).not.toHaveBeenCalled();
  });

  it('persists a collapse and never reopens on later leads or reloads', async () => {
    const user = userEvent.setup();
    const { rerender } = renderShell();
    await waitFor(() => expect(screen.getByTestId('surface-open')).toHaveTextContent('open'));

    await user.click(screen.getByRole('button', { name: 'collapse' }));

    expect(localStorage.getItem(visibilityKey(ACTOR, PAGE))).toBe('collapsed');
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
    expect(localStorage.getItem(visibilityKey(ACTOR, PAGE))).toBe('collapsed');
  });

  it('persists a manual reopen and keeps another operator preference untouched', async () => {
    localStorage.setItem(visibilityKey('actor-2', PAGE), 'collapsed');
    localStorage.setItem(visibilityKey(ACTOR, PAGE), 'collapsed');
    const user = userEvent.setup();

    renderShell();
    await user.click(screen.getByRole('button', { name: 'Open copilot' }));

    await waitFor(() => expect(screen.getByTestId('surface-open')).toHaveTextContent('open'));
    expect(localStorage.getItem(visibilityKey(ACTOR, PAGE))).toBe('open');
    expect(localStorage.getItem(visibilityKey('actor-2', PAGE))).toBe('collapsed');
  });

  it('keys the preference per page, so collapsing one page does not silence the others', async () => {
    // The operator collapsed the copilot on `leads` and has never opened
    // `overview`. Under the previous actor-global key, `overview` would have
    // inherited that collapse and never announced that a briefing exists there;
    // the decided behaviour is one discovery moment per page key.
    localStorage.setItem(visibilityKey(ACTOR, 'leads'), 'collapsed');

    render(
      <AuthProvider>
        <ManagementContextCopilot pageKey="overview" scope={{}} scopeLabel="Overview">
          {(sectionApi) => <StubSections api={sectionApi} />}
        </ManagementContextCopilot>
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('surface-open')).toHaveTextContent('open'));
    expect(localStorage.getItem(visibilityKey(ACTOR, 'overview'))).toBe('open');
    // And it did not overwrite the choice made on the other page.
    expect(localStorage.getItem(visibilityKey(ACTOR, 'leads'))).toBe('collapsed');
  });

  it('waits for the authenticated identity and persists nothing until it resolves', async () => {
    renderShell({ withAuth: false });

    await act(async () => {});
    expect(screen.getByRole('button', { name: 'Open copilot' })).toBeInTheDocument();
    expect(localStorage.getItem(visibilityKey(ACTOR, PAGE))).toBeNull();
    expect(localStorage.getItem(visibilityKey('undefined', PAGE))).toBeNull();
  });

  it('collapses to the labeled floating trigger beside the rail, never an icon-only control', async () => {
    const user = userEvent.setup();
    renderShell();
    await waitFor(() => expect(document.querySelector('[data-copilot-surface="dock"]')).not.toBeNull());

    await user.click(screen.getByRole('button', { name: 'collapse' }));
    expect(document.querySelector('[data-copilot-surface="dock"]')).toBeNull();

    // The discoverable desktop affordance is labeled, not an icon-only rail.
    const trigger = screen.getByRole('button', { name: 'Open copilot' });
    expect(trigger).toHaveTextContent('Copilot');

    // The rail is kept as the page's layout edge, with its own distinct name.
    expect(screen.getByRole('button', { name: 'Expand copilot panel' })).toBeInTheDocument();

    // The two controls never share a name on one viewport.
    expect(screen.getAllByRole('button', { name: 'Open copilot' })).toHaveLength(1);
  });

  it('activates the desktop trigger into the panel and moves focus to the briefing heading', async () => {
    const user = userEvent.setup();
    renderShell();
    await waitFor(() => expect(screen.getByTestId('surface-open')).toHaveTextContent('open'));

    await user.click(screen.getByRole('button', { name: 'collapse' }));
    await user.click(screen.getByRole('button', { name: 'Open copilot' }));

    await waitFor(() => expect(screen.getByTestId('surface-open')).toHaveTextContent('open'));
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Lead briefing' }));
  });

  it('exposes the attention state as a sibling marker plus a visible glyph, never a button child', async () => {
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

    // Both collapsed desktop controls carry the state: the rail's icon marker
    // and the floating trigger's dot.
    const markers = screen.getAllByLabelText('This lead has items needing attention.');
    expect(markers).toHaveLength(2);
    for (const marker of markers) {
      expect(marker).toHaveAttribute('role', 'img');
      expect(marker).toHaveAttribute('data-copilot-attention-marker', 'true');
    }

    // The accessible name is a sibling of the trigger, never its child — a
    // button's contents are presentational in the accessibility tree.
    const trigger = screen.getByRole('button', { name: 'Open copilot' });
    expect(trigger.querySelector('[data-copilot-attention-marker]')).toBeNull();

    // And the state is never colour-only: a visible, aria-hidden glyph sits
    // beside the label.
    const glyph = trigger.querySelector('svg.text-warning');
    expect(glyph).not.toBeNull();
    expect(glyph).toHaveAttribute('aria-hidden', 'true');

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
    expect(localStorage.getItem(visibilityKey(ACTOR, PAGE))).toBeNull();
    expect(document.querySelector('[data-copilot-surface="dock"]')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Open copilot' }));

    await waitFor(() => expect(api.copilotDeterministic).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('claims').textContent).toMatch(/Deterministic a|Briefing a/);
    expect(localStorage.getItem(mobileCueKey(ACTOR, PAGE))).toBe('true');
    expect(localStorage.getItem(visibilityKey(ACTOR, PAGE))).toBe('open');
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

    expect(localStorage.getItem(mobileCueKey(ACTOR, PAGE))).toBe('true');
    expect(localStorage.getItem(visibilityKey(ACTOR, PAGE))).toBeNull();
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

describe('ManagementContextCopilot — conversation on every scope', () => {
  it('renders the shell conversation for a collection scope and drops it without a scope', async () => {
    const { rerender } = renderShell({ scope: {} });

    // The shell owns the conversation, so a collection page (no leadId) has the
    // composer the record briefing used to own — and it lives in the panel's
    // single scroll container, after the briefing.
    const composer = await screen.findByLabelText('Ask about Alice Traveller');
    const surface = document.querySelector('[data-copilot-surface="surface"]');
    expect(surface).not.toBeNull();
    expect(surface?.contains(composer)).toBe(true);

    // No transcript region before the first question; the composer is enough.
    expect(screen.queryByRole('region', { name: 'Conversation' })).not.toBeInTheDocument();

    rerender(
      <AuthProvider>
        <ManagementContextCopilot pageKey="leads" scope={null} scopeLabel="Leads">
          {(sectionApi) => <StubSections api={sectionApi} />}
        </ManagementContextCopilot>
      </AuthProvider>
    );

    await waitFor(() => expect(screen.queryByLabelText('Ask about Leads')).not.toBeInTheDocument());
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

describe('CopilotTrigger — the one labeled trigger', () => {
  it('forwards its ref to the button so drawer focus restoration keeps working', () => {
    const ref = createRef<HTMLElement>();
    render(<CopilotTrigger ref={ref} hasAttention={false} />);

    const button = screen.getByRole('button', { name: 'Open copilot' });
    expect(button).toHaveTextContent('Copilot');
    expect(ref.current).toBe(button);
  });
});

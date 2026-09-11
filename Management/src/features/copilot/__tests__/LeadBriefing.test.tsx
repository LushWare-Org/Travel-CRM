import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeadBriefing from '../LeadBriefing';
import { clearEvidenceReveal } from '../evidence';
import { claim, evidenceTarget, makeSession, setViewport, source } from './copilotTestUtils';

const citedClaim = (overrides = {}) =>
  claim({
    id: 'claim-destination',
    text: 'The lead is drafting a Lisbon trip.',
    evidenceIds: ['lead:a:destination'],
    ...overrides,
  });

beforeEach(() => {
  setViewport({ desktop: false });
  clearEvidenceReveal();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  clearEvidenceReveal();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('LeadBriefing — hierarchy', () => {
  it('renders the changed row, current state, attention before the experienced view, and the suggested questions', () => {
    const session = makeSession({
      claims: [
        claim({ id: 'changed-1', section: 'changed', text: 'Budget was updated yesterday.' }),
        claim({ id: 'current-1', section: 'current_state', text: 'The lead is in drafting.' }),
        claim({ id: 'attention-1', section: 'attention', severity: 'warning', text: 'Deposit is outstanding.' }),
        claim({ id: 'experienced-1', section: 'experienced_view', text: 'Trips to Lisbon usually book early.' }),
      ],
      suggestedQuestions: ['What is the deposit status?', 'When is the travel date?', 'Who is assigned?', 'A fourth question?'],
    });

    render(<LeadBriefing session={session} scopeLabel="Alice Traveller" leadId="a" />);

    expect(screen.getByRole('heading', { name: /lead briefing/i })).toBeInTheDocument();
    expect(screen.getByText('Since you were here')).toBeInTheDocument();
    expect(screen.getByText('Budget was updated yesterday.')).toBeInTheDocument();
    expect(screen.getByText('Current state')).toBeInTheDocument();
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(screen.getByText('Experienced view')).toBeInTheDocument();

    // Needs attention is rendered before the informational interpretation.
    const attention = screen.getByText('Needs attention');
    const experienced = screen.getByText('Experienced view');
    expect(attention.compareDocumentPosition(experienced) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // At most three suggested questions.
    expect(screen.getByRole('button', { name: 'What is the deposit status?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'A fourth question?' })).not.toBeInTheDocument();
  });

  it('omits the changed row when nothing changed', () => {
    render(
      <LeadBriefing
        session={makeSession({ claims: [claim({ section: 'current_state' })] })}
        scopeLabel="Alice Traveller"
        leadId="a"
      />
    );
    expect(screen.queryByText('Since you were here')).not.toBeInTheDocument();
  });

  it('omits the changed row and shows the access explanation for a no-access session', () => {
    render(
      <LeadBriefing
        session={makeSession({ noAccess: true, canAsk: false, claims: [] })}
        scopeLabel="Alice Traveller"
        leadId="a"
      />
    );
    expect(screen.getByText('You do not have access to this record.')).toBeInTheDocument();
  });
});

describe('LeadBriefing — heading focus target', () => {
  it('marks the real heading as the programmatic focus target', () => {
    render(<LeadBriefing session={makeSession({})} scopeLabel="Alice Traveller" leadId="a" />);

    // ManagementContextCopilot moves focus to `#copilot-briefing-heading` when
    // the panel opens. That move silently no-ops if the real heading loses its
    // tabIndex; the shell test renders its own heading stub, so only an
    // assertion against the real briefing can catch the regression.
    expect(screen.getByRole('heading', { name: /lead briefing/i })).toHaveAttribute('tabindex', '-1');
  });
});

describe('LeadBriefing — briefing states', () => {
  it('keeps the provisional list, labels it partial, and offers Retry when the model phase fails', async () => {
    const user = userEvent.setup();
    const session = makeSession({
      provisional: true,
      modelPartial: true,
      claims: [claim({ text: 'Verified deterministic insight.' })],
    });

    render(<LeadBriefing session={session} scopeLabel="Alice Traveller" leadId="a" />);

    expect(screen.getByText('Partial briefing')).toBeInTheDocument();
    expect(screen.getByText('Verified deterministic insight.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(session.retryBriefing).toHaveBeenCalledTimes(1);
  });

  it('renders a full briefing error with Retry and no claims when the deterministic phase fails', async () => {
    const user = userEvent.setup();
    const session = makeSession({ error: 'Failed to load this lead', claims: [], ready: false, canAsk: false });

    render(<LeadBriefing session={session} scopeLabel="Alice Traveller" leadId="a" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load this lead');
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeNull();
    expect(screen.queryByText('Since you were here')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(session.retryDeterministic).toHaveBeenCalledTimes(1);
  });

  it('queues the model replacement while focus is inside the provisional claims and announces it', () => {
    const provisional = makeSession({
      provisional: true,
      modelPending: true,
      claims: [claim({ id: 'det-1', text: 'Deterministic insight.', evidenceIds: ['lead:a:destination'] })],
      sources: [source()],
    });

    const { rerender } = render(<LeadBriefing session={provisional} scopeLabel="Alice Traveller" leadId="a" />);

    const region = screen.getByText('Deterministic insight.').closest('div') as HTMLElement;
    const button = screen.getByRole('button', { name: /evidence: destination/i });
    act(() => button.focus());
    expect(region.contains(document.activeElement)).toBe(true);

    const replaced = makeSession({
      claims: [claim({ id: 'model-1', text: 'Model insight.', evidenceIds: ['lead:a:destination'] })],
      sources: [source()],
    });
    rerender(<LeadBriefing session={replaced} scopeLabel="Alice Traveller" leadId="a" />);

    // The focused provisional control is never unmounted mid-interaction.
    expect(screen.getByText('Deterministic insight.')).toBeInTheDocument();
    expect(screen.queryByText('Model insight.')).not.toBeInTheDocument();
    expect(screen.getByText('Updated briefing ready')).toBeInTheDocument();

    // Once focus leaves the region, the replacement lands atomically.
    const outside = document.createElement('button');
    outside.textContent = 'outside';
    document.body.appendChild(outside);
    act(() => outside.focus());
    expect(screen.getByText('Model insight.')).toBeInTheDocument();
    expect(screen.queryByText('Deterministic insight.')).not.toBeInTheDocument();
  });
});

describe('LeadBriefing — evidence lens', () => {
  it('reveals, pins, focuses, and scrolls to a mapped field at xl and announces it', async () => {
    setViewport({ desktop: true });
    const target = evidenceTarget('lead:a:destination');
    const user = userEvent.setup();

    render(
      <LeadBriefing
        session={makeSession({ claims: [citedClaim()], sources: [source()] })}
        scopeLabel="Alice Traveller"
        leadId="a"
      />
    );

    await user.click(screen.getByRole('button', { name: /evidence: destination/i }));

    expect(target.classList.contains('copilot-evidence-pinned')).toBe(true);
    expect(document.activeElement).toBe(target);
    expect(target.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
    expect(screen.getByText('Revealed Destination in the lead record')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Evidence detail' })).not.toBeInTheDocument();
  });

  it('reveals an off-screen mapped field at xl', async () => {
    setViewport({ desktop: true });
    const spacer = document.createElement('div');
    spacer.style.height = '4000px';
    document.body.appendChild(spacer);
    const target = evidenceTarget('lead:a:destination');
    const user = userEvent.setup();

    render(
      <LeadBriefing
        session={makeSession({ claims: [citedClaim()], sources: [source()] })}
        scopeLabel="Alice Traveller"
        leadId="a"
      />
    );

    await user.click(screen.getByRole('button', { name: /evidence: destination/i }));
    expect(target.classList.contains('copilot-evidence-pinned')).toBe(true);
  });

  it('previews on hover and replaces the preview with the pinned highlight on activation', async () => {
    setViewport({ desktop: true });
    const target = evidenceTarget('lead:a:destination');
    const user = userEvent.setup();

    render(
      <LeadBriefing
        session={makeSession({ claims: [citedClaim()], sources: [source()] })}
        scopeLabel="Alice Traveller"
        leadId="a"
      />
    );

    await user.hover(screen.getByRole('button', { name: /evidence: destination/i }));
    expect(target.classList.contains('copilot-evidence-preview')).toBe(true);
    expect(target.classList.contains('copilot-evidence-pinned')).toBe(false);

    await user.click(screen.getByRole('button', { name: /evidence: destination/i }));
    expect(target.classList.contains('copilot-evidence-pinned')).toBe(true);
    expect(target.classList.contains('copilot-evidence-preview')).toBe(false);
  });

  it('clears the pinned highlight when focus leaves the target', async () => {
    setViewport({ desktop: true });
    const target = evidenceTarget('lead:a:destination');
    const elsewhere = document.createElement('button');
    elsewhere.textContent = 'elsewhere';
    document.body.appendChild(elsewhere);
    const user = userEvent.setup();

    render(
      <LeadBriefing
        session={makeSession({ claims: [citedClaim()], sources: [source()] })}
        scopeLabel="Alice Traveller"
        leadId="a"
      />
    );

    await user.click(screen.getByRole('button', { name: /evidence: destination/i }));
    expect(target.classList.contains('copilot-evidence-pinned')).toBe(true);

    act(() => elsewhere.focus());
    expect(target.classList.contains('copilot-evidence-pinned')).toBe(false);
  });

  it('uses an immediate scroll under prefers-reduced-motion', async () => {
    setViewport({ desktop: true, reducedMotion: true });
    const target = evidenceTarget('lead:a:destination');
    const user = userEvent.setup();

    render(
      <LeadBriefing
        session={makeSession({ claims: [citedClaim()], sources: [source()] })}
        scopeLabel="Alice Traveller"
        leadId="a"
      />
    );

    await user.click(screen.getByRole('button', { name: /evidence: destination/i }));
    expect(target.scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
  });

  it('falls back to the inline evidence detail when the target is hidden', async () => {
    setViewport({ desktop: true });
    const target = evidenceTarget('lead:a:destination', { display: false });
    const user = userEvent.setup();

    render(
      <LeadBriefing
        session={makeSession({ claims: [citedClaim()], sources: [source()] })}
        scopeLabel="Alice Traveller"
        leadId="a"
      />
    );

    await user.click(screen.getByRole('button', { name: /evidence: destination/i }));

    expect(target.classList.contains('copilot-evidence-pinned')).toBe(false);
    const detail = screen.getByRole('region', { name: 'Evidence detail' });
    expect(detail).toHaveTextContent('Destination');
    expect(detail).toHaveTextContent('destination');
    expect(detail).toHaveTextContent('Lisbon');
  });

  it('falls back to the inline evidence detail when no target is rendered', async () => {
    setViewport({ desktop: true });
    const user = userEvent.setup();

    render(
      <LeadBriefing
        session={makeSession({ claims: [citedClaim()], sources: [source()] })}
        scopeLabel="Alice Traveller"
        leadId="a"
      />
    );

    await user.click(screen.getByRole('button', { name: /evidence: destination/i }));
    expect(screen.getByRole('region', { name: 'Evidence detail' })).toHaveTextContent('Lisbon');
  });

  it('never reveals into the record below xl, where the drawer is modal', async () => {
    setViewport({ desktop: false });
    const target = evidenceTarget('lead:a:destination');
    const user = userEvent.setup();

    render(
      <LeadBriefing
        session={makeSession({ claims: [citedClaim()], sources: [source()] })}
        scopeLabel="Alice Traveller"
        leadId="a"
      />
    );

    await user.click(screen.getByRole('button', { name: /evidence: destination/i }));

    expect(target.classList.contains('copilot-evidence-pinned')).toBe(false);
    expect(document.activeElement).not.toBe(target);
    expect(screen.getByRole('region', { name: 'Evidence detail' })).toBeInTheDocument();
  });

  it('keeps a working evidence action when the deterministic phase ships no sources', async () => {
    setViewport({ desktop: true });
    const user = userEvent.setup();

    render(
      <LeadBriefing
        session={makeSession({ claims: [citedClaim()], sources: [] })}
        scopeLabel="Alice Traveller"
        leadId="a"
      />
    );

    // No `sources` entry (the deterministic phase ships none), but the cited
    // id still names an allowlisted field, so the action falls back to the
    // inline detail instead of degrading to dead text.
    await user.click(screen.getByRole('button', { name: /evidence: lead destination/i }));

    const detail = screen.getByRole('region', { name: 'Evidence detail' });
    expect(detail).toHaveTextContent('destination');
    expect(detail).toHaveTextContent('not captured');
  });

  it('shows source-unavailable text for a citation that names no resolvable source', () => {
    render(
      <LeadBriefing
        session={makeSession({ claims: [claim({ id: 'claim-opaque', text: 'Something changed.', evidenceIds: ['bundle:1'] })], sources: [] })}
        scopeLabel="Alice Traveller"
        leadId="a"
      />
    );

    expect(screen.getByText('Source unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /evidence:/i })).not.toBeInTheDocument();
  });

  it('renders no action for an uncited claim', () => {
    render(
      <LeadBriefing
        session={makeSession({ claims: [claim({ text: 'Uncited claim.', evidenceIds: [] })], sources: [source()] })}
        scopeLabel="Alice Traveller"
        leadId="a"
      />
    );

    expect(screen.queryByRole('button', { name: /evidence:/i })).not.toBeInTheDocument();
  });
});

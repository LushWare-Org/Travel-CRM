import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CopilotConversation from '../CopilotConversation';
import { claim, makeSession, setViewport, source } from './copilotTestUtils';
import type { CopilotSession, CopilotTurn } from '../types';

const turn = (overrides: Partial<CopilotTurn> = {}): CopilotTurn => ({
  id: 'turn-1',
  question: 'Is the deposit paid?',
  status: 'pending',
  ...overrides,
});

beforeEach(() => {
  setViewport({ desktop: false });
  vi.clearAllMocks();
});

describe('CopilotConversation — scope-neutral copy', () => {
  it('derives the pending copy from the scope and never says "this lead"', () => {
    render(<CopilotConversation session={makeSession({ turns: [turn()] })} scopeLabel="Billing" />);

    expect(screen.getByText('Checking Billing…')).toBeInTheDocument();
    expect(screen.queryByText('Checking this lead…')).not.toBeInTheDocument();
  });

  it('renders a collection-scope question with the same paired turn shape', () => {
    render(
      <CopilotConversation
        session={makeSession({
          turns: [turn({ status: 'answered', answer: [claim({ text: 'The deposit is paid.' })] })],
        })}
        scopeLabel="Billing"
      />
    );

    expect(screen.getByText('Is the deposit paid?')).toBeInTheDocument();
    expect(screen.getByText('The deposit is paid.')).toBeInTheDocument();
  });
});

describe('CopilotConversation — an empty answer is recoverable', () => {
  it('keeps the question and re-submits it through the per-turn retry path', async () => {
    const user = userEvent.setup();
    const retryTurn = vi.fn();
    render(
      <CopilotConversation
        session={makeSession({ turns: [turn({ status: 'answered', answer: [] })], retryTurn })}
        scopeLabel="Billing"
      />
    );

    expect(screen.getByText('Is the deposit paid?')).toBeInTheDocument();
    expect(screen.getByText('No grounded answer for that question.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retryTurn).toHaveBeenCalledWith('turn-1');
  });

  it('keeps no retry for a scope the operator cannot read', () => {
    render(
      <CopilotConversation
        session={makeSession({
          noAccess: true,
          canAsk: false,
          turns: [turn({ status: 'answered', answer: [] })],
        })}
        scopeLabel="Billing"
      />
    );

    expect(screen.getByText('No grounded answer for that question.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('keeps the error retry for a failed turn', async () => {
    const user = userEvent.setup();
    const retryTurn = vi.fn();
    render(
      <CopilotConversation
        session={makeSession({ turns: [turn({ status: 'error', error: 'assistant offline' })], retryTurn })}
        scopeLabel="Billing"
      />
    );

    expect(screen.getByText('assistant offline')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retryTurn).toHaveBeenCalledWith('turn-1');
  });

  it('keeps every verified answer block’s evidence action inline', () => {
    render(
      <CopilotConversation
        session={makeSession({
          turns: [turn({
            status: 'answered',
            answer: [claim({ id: 'answer-1', text: 'Destination is Lisbon.', evidenceIds: ['lead:a:destination'] })],
          })],
          sources: [source()],
        })}
        scopeLabel="Billing"
      />
    );

    expect(screen.getByRole('button', { name: /evidence: destination/i })).toBeInTheDocument();
  });
});

describe('CopilotConversation — composer', () => {
  it('sticks to the surface scrollport and spans its full width', () => {
    render(<CopilotConversation session={makeSession({})} scopeLabel="Billing" />);

    const form = screen.getByLabelText('Ask about Billing').closest('form');
    expect(form).not.toBeNull();
    expect(form?.className).toContain('sticky');
    expect(form?.className).toContain('bottom-0');
    expect(form?.className).toContain('-mx-4');
    expect(form?.className).toContain('px-4');

    // With no turns the root must fill the scrollport and `mt-auto` must push
    // the composer to its end, or the bar renders directly under the briefing
    // with dead space below it instead of on the panel's bottom edge.
    const root = form?.parentElement;
    expect(root?.className).toContain('flex');
    expect(root?.className).toContain('min-h-full');
    expect(root?.className).toContain('flex-col');
    expect(form?.className).toContain('mt-auto');
  });

  it('is present but disabled until the deterministic phase is ready', () => {
    render(<CopilotConversation session={makeSession({ canAsk: false, loading: true })} scopeLabel="Billing" />);

    expect(screen.getByLabelText('Ask about Billing')).toBeDisabled();
  });

  const blockingStates: [string, Partial<CopilotSession>][] = [
    ['is asking', { asking: true }],
    ['has a session error', { error: 'The copilot could not answer that' }],
  ];

  it.each(blockingStates)('disables the textarea and the Ask button while the session %s', (_label, state) => {
    render(
      <CopilotConversation
        // Non-empty input so the Ask button's own `!input.trim()` operand is
        // satisfied: what disables it here must be the session state alone.
        session={makeSession({ ...state, input: 'Is the deposit paid?' })}
        scopeLabel="Billing"
      />
    );

    expect(screen.getByLabelText('Ask about Billing')).toBeDisabled();
    expect(screen.getByRole('button', { name: /ask/i })).toBeDisabled();
  });

  it('renders nothing at all without a scope', () => {
    const { container } = render(
      <CopilotConversation session={makeSession({ hasScope: false, canAsk: false })} scopeLabel="Leads" />
    );

    expect(container).toBeEmptyDOMElement();
  });
});

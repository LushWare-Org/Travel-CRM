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

describe('CopilotConversation — scope-free copy', () => {
  it('names no scope while working', () => {
    render(<CopilotConversation session={makeSession({ turns: [turn()] })} />);

    expect(screen.getByText('Looking that up…')).toBeInTheDocument();
    // The shell must not name a scope at all. Naming one states a limit that does
    // not exist — the tools belong to the actor, not to the page — and that is
    // what stopped an operator asking a question the copilot could have answered.
    expect(screen.queryByText(/Checking|this lead|Billing|Leads/)).not.toBeInTheDocument();
  });

  it('renders a collection-scope question with the same paired turn shape', () => {
    render(
      <CopilotConversation
        session={makeSession({
          turns: [turn({ status: 'answered', answer: [claim({ text: 'The deposit is paid.' })] })],
        })}
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
      />
    );

    expect(screen.getByRole('button', { name: /evidence: destination/i })).toBeInTheDocument();
  });
});

describe('CopilotConversation — who said what', () => {
  const paired = () =>
    turn({ status: 'answered', answer: [claim({ text: 'The deposit is paid.' })] });

  const context = {
    text: 'Invoice f0000000 is overdue.',
    facts: [{ kind: 'currency', value: '1200' }],
  };

  it('makes the operator turn a bubble and leaves the answer unboxed', () => {
    render(<CopilotConversation session={makeSession({ turns: [paired()] })} />);

    const user = document.querySelector('[data-copilot-turn="user"]');
    const assistant = document.querySelector('[data-copilot-turn="assistant"]');

    expect(user).not.toBeNull();
    expect(assistant).not.toBeNull();
    expect(user?.className).toContain('justify-end');

    // The operator's own turn is the one that gets a surface: the accent wash,
    // with the bottom-right corner tailed.
    const bubble = user?.querySelector('.bg-accent');
    expect(bubble).not.toBeNull();
    expect(bubble?.className).toContain('rounded-br-sm');

    // The answer is NOT boxed: `claim-row` is documented with no container, and
    // its evidence actions sit inside the claim text.
    expect(assistant?.querySelector('.bg-accent')).toBeNull();
    expect(screen.getByText('The deposit is paid.')).toBeInTheDocument();
  });

  it('nests the referenced finding in its own inset box inside the bubble', () => {
    render(<CopilotConversation session={makeSession({ turns: [turn({ context })] })} />);

    const bubble = document.querySelector<HTMLElement>('[data-copilot-turn="user"] .bg-accent');
    const box = document.querySelector<HTMLElement>('[data-copilot-quote="in-bubble"]');

    expect(bubble).not.toBeNull();
    expect(box).not.toBeNull();
    // The box lives inside the bubble rather than beside it.
    expect(bubble?.contains(box)).toBe(true);

    expect(box?.className).toContain('bg-accent-foreground/20');
    expect(box).toHaveTextContent('Finding referenced');
    expect(box).toHaveTextContent(context.text);
    // A fill, never an outline - the boundary rule permits the former only.
    expect(box?.className).not.toMatch(/\bborder(-[a-z]+)?\b/);

    // The operator's own words stay outside the box: the box is the reference.
    expect(bubble).toHaveTextContent('Is the deposit paid?');
    expect(box).not.toHaveTextContent('Is the deposit paid?');
  });

  it('insets the pending attachment against the composer surface instead', () => {
    render(<CopilotConversation session={makeSession({ pendingContext: context })} />);

    const box = document.querySelector<HTMLElement>('[data-copilot-quote="above-composer"]');

    expect(box).not.toBeNull();
    // Its own surface is `bg-card`, so it needs a fill that reads against THAT -
    // a different one from the in-bubble tone.
    expect(box?.className).toContain('bg-foreground/15');
    // The invisible token must not come back: `bg-muted` sits 1.087:1 from the
    // composer's card in dark, which is the "no box" state this test exists for.
    expect(box?.className).not.toContain('bg-muted');
    expect(box).toHaveTextContent('Finding referenced');
    expect(box).toHaveTextContent(context.text);
  });

  it('gives the answer more room than the gap between turns', () => {
    render(<CopilotConversation session={makeSession({ turns: [paired()] })} />);

    const section = document.querySelector('[aria-label="Conversation"]');
    const turnWrapper = document.querySelector('[data-copilot-turn="user"]')?.parentElement;

    // 12px inside a turn against 24px between turns - the ratio is what keeps a
    // turn reading as one exchange.
    expect(turnWrapper?.className).toContain('space-y-3');
    expect(section?.className).toContain('space-y-6');
  });

  it('keeps both speakers attributable to a screen reader', () => {
    render(<CopilotConversation session={makeSession({ turns: [turn()] })} />);

    expect(screen.getByText('You said:')).toBeInTheDocument();
    expect(screen.getByText('Copilot said:')).toBeInTheDocument();
  });

  it('drops the visible speaker labels', () => {
    render(<CopilotConversation session={makeSession({ turns: [paired()] })} />);

    expect(screen.queryByText('You')).not.toBeInTheDocument();
    expect(screen.queryByText('Copilot')).not.toBeInTheDocument();
  });
});

describe('CopilotConversation — composer', () => {
  it('sticks to the surface scrollport and spans its full width', () => {
    render(<CopilotConversation session={makeSession({})} />);

    const form = screen.getByLabelText('Ask the copilot').closest('form');
    expect(form).not.toBeNull();
    expect(form?.className).toContain('sticky');
    expect(form?.className).toContain('bottom-0');
    expect(form?.className).toContain('-mx-4');
    expect(form?.className).toContain('px-4');

    // The root must NOT force a full panel height. `min-h-full` with an
    // `mt-auto` composer pins the bar to the panel's bottom edge, which the
    // operator experiences as dead space between the insights and the bar:
    // reported at 661px of a 768px panel, so almost a full screen scrolled
    // through for nothing. The composer follows the transcript instead.
    const root = form?.parentElement;
    expect(root?.className).toContain('flex');
    expect(root?.className).toContain('flex-col');
    expect(root?.className).not.toContain('min-h-full');
    expect(form?.className).not.toContain('mt-auto');
  });

  it('is present but disabled until the deterministic phase is ready', () => {
    render(<CopilotConversation session={makeSession({ canAsk: false, loading: true })} />);

    expect(screen.getByLabelText('Ask the copilot')).toBeDisabled();
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
      />
    );

    expect(screen.getByLabelText('Ask the copilot')).toBeDisabled();
    expect(screen.getByRole('button', { name: /ask/i })).toBeDisabled();
  });

  it('renders nothing at all without a scope', () => {
    const { container } = render(
      <CopilotConversation session={makeSession({ hasScope: false, canAsk: false })} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe('CopilotConversation — detaching the attachment', () => {
  const context = { text: 'Invoice f0000000 is overdue.', facts: [{ kind: 'currency', value: '1200' }] };

  it('removes the attachment on a single click, with no confirmation', async () => {
    const user = userEvent.setup();
    const detachFinding = vi.fn();
    render(
      <CopilotConversation session={makeSession({ pendingContext: context, detachFinding })} />
    );

    await user.click(screen.getByRole('button', { name: 'Remove attached finding' }));

    expect(detachFinding).toHaveBeenCalledTimes(1);
    // Reversible, so unlike clearing the transcript it must not ask first.
    expect(screen.queryByText('Clear this conversation? The findings stay.')).not.toBeInTheDocument();
  });

  it('offers no detach when nothing is attached', () => {
    render(<CopilotConversation session={makeSession({ turns: [turn({ context })] })} />);

    expect(screen.queryByRole('button', { name: 'Remove attached finding' })).not.toBeInTheDocument();
  });

  it('puts the detach on the composer, never inside a submitted turn', () => {
    render(
      <CopilotConversation
        session={makeSession({
          pendingContext: context,
          turns: [turn({ context, status: 'answered', answer: [claim({ text: 'The deposit is paid.' })] })],
        })}
      />
    );

    const buttons = screen.getAllByRole('button', { name: 'Remove attached finding' });
    expect(buttons).toHaveLength(1);
    expect(buttons[0].closest('[data-copilot-quote="above-composer"]')).not.toBeNull();
  });
});

describe('CopilotConversation — suggested questions', () => {
  it('sends the question as if the operator had typed it', async () => {
    const user = userEvent.setup();
    const setInput = vi.fn();
    const submit = vi.fn();
    render(
      <CopilotConversation
        session={makeSession({ suggestedQuestions: ['Who is the most overdue?'], setInput, submit })}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Who is the most overdue?' }));

    expect(submit).toHaveBeenCalledWith('Who is the most overdue?');
    // Sent directly, not parked in the input first: the turn is the point, and
    // routing it through the box would flash text the operator never typed.
    // No focus assertion: the browser blurs a disabled element, and `submit`
    // disables the composer for the turn, so typing and pressing Enter leaves
    // focus in the same place this click does.
    expect(setInput).not.toHaveBeenCalled();
  });

  it('shows at most three, and nothing when the scope has none', () => {
    const { rerender } = render(
      <CopilotConversation
        session={makeSession({ suggestedQuestions: ['One?', 'Two?', 'Three?', 'Four?'] })}
      />
    );

    expect(screen.getByRole('button', { name: 'One?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Four?' })).not.toBeInTheDocument();

    rerender(<CopilotConversation session={makeSession({ suggestedQuestions: [] })} />);
    expect(screen.queryByRole('region', { name: 'Suggested questions' })).not.toBeInTheDocument();
  });

  it('offers them only while the transcript is empty, and brings them back when it is cleared', () => {
    const prompts = { suggestedQuestions: ['One?'] };
    const { rerender } = render(
      <CopilotConversation session={makeSession({ turns: [], ...prompts })} />
    );
    expect(screen.getByRole('region', { name: 'Suggested questions' })).toBeInTheDocument();

    // Asked: the prompts have done their job and the transcript is the reading.
    rerender(
      <CopilotConversation
        session={makeSession({ turns: [turn({ status: 'answered', answer: [] })], ...prompts })}
      />
    );
    expect(screen.queryByRole('region', { name: 'Suggested questions' })).not.toBeInTheDocument();

    // Cleared: empty again, so they are the way back in.
    rerender(<CopilotConversation session={makeSession({ turns: [], ...prompts })} />);
    expect(screen.getByRole('region', { name: 'Suggested questions' })).toBeInTheDocument();
  });
});

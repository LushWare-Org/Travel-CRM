import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CollectionInsights from '../CollectionInsights';
import CopilotConversation from '../CopilotConversation';
import InsightRow from '../InsightRow';
import LeadInsights from '../LeadInsights';
import { claim, makeSession } from './copilotTestUtils';

vi.mock('../Announcer', () => ({
  useAnnouncer: () => ['', vi.fn()],
  LiveStatus: () => null,
}));

const anchor = {
  text: 'Invoice INV-4471 is 62 days overdue',
  facts: [{ kind: 'count', value: '62' }],
};

describe('chat about this', () => {
  it('offers the affordance only when the row was given one', async () => {
    // The session decides whether asking is possible at all; the row just obeys.
    // Absent means hidden, never a control that fails when pressed.
    const onChatAbout = vi.fn();
    const { rerender } = render(
      <InsightRow claim={claim({ id: 'c1' })} sources={[]} announce={vi.fn()} onChatAbout={onChatAbout} />
    );

    await userEvent.click(screen.getByRole('button', { name: /chat about this/i }));
    expect(onChatAbout).toHaveBeenCalledTimes(1);

    rerender(<InsightRow claim={claim({ id: 'c1' })} sources={[]} announce={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /chat about this/i })).not.toBeInTheDocument();
  });

  it('quotes the anchored finding above the question it belongs to', () => {
    render(
      <CopilotConversation
        session={makeSession({
          turns: [
            { id: 't1', question: 'who owns it?', status: 'answered', answer: [], context: anchor },
          ],
        })}
      />
    );

    expect(screen.getByText('Finding referenced')).toBeInTheDocument();
    expect(screen.getByText(anchor.text)).toBeInTheDocument();
    // The binding is only worth anything if the question is still readable.
    expect(screen.getByText('who owns it?')).toBeInTheDocument();
  });

  it('shows the attachment above the composer before the question is sent', () => {
    render(<CopilotConversation session={makeSession({ pendingContext: anchor })} />);

    expect(screen.getByText('Finding referenced')).toBeInTheDocument();
    expect(screen.getByText(anchor.text)).toBeInTheDocument();
  });

  it('brings the conversation forward when a finding is attached', async () => {
    // The attachment lives on the Copilot tab. Without the switch the quoted
    // block renders into a hidden panel — present in the DOM, invisible — and the
    // composer's focus call is a no-op. Caught by running the real surface.
    const chatAbout = vi.fn();
    const onShowConversation = vi.fn();
    render(
      <CollectionInsights
        session={makeSession({
          chatAbout,
          claims: [claim({ id: 'c1', section: 'changed', text: 'Budget was updated yesterday.' })],
        })}
        scopeLabel="Billing"
        onShowConversation={onShowConversation}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /chat about this/i }));

    expect(chatAbout).toHaveBeenCalledTimes(1);
    expect(onShowConversation).toHaveBeenCalledTimes(1);
  });

  it('offers the same affordance on the record panel', async () => {
    // The original ask was about a lead's insight, so the record panel has to
    // carry the affordance too, not just the collection panel.
    const chatAbout = vi.fn();
    render(
      <LeadInsights
        session={makeSession({
          chatAbout,
          claims: [claim({ id: 'c1', section: 'changed', text: 'Budget was updated yesterday.' })],
        })}
        scopeLabel="Alice Traveller"
        leadId="a"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /chat about this/i }));
    expect(chatAbout).toHaveBeenCalledTimes(1);
  });

  it('hoists a critical above the record panel sections', () => {
    // The record panel reads changed-first by design, but a critical in a later
    // section must not render below an informational row from an earlier one.
    render(
      <LeadInsights
        session={makeSession({
          claims: [
            claim({ id: 'info', section: 'changed', text: 'A changed info item' }),
            claim({ id: 'crit', section: 'current_state', severity: 'critical', text: 'A critical item' }),
          ],
        })}
        scopeLabel="Alice Traveller"
        leadId="a"
      />
    );

    const critical = screen.getByText('Critical');
    const changed = screen.getByText('Since you were here');
    expect(critical.compareDocumentPosition(changed) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('requires an explicit confirmation, and states what it destroys', async () => {
    // Clearing drops the whole transcript: a one-way door for the conversation,
    // so it never fires on a single click.
    const clearConversation = vi.fn();
    render(
      <CopilotConversation
        session={makeSession({
          clearConversation,
          turns: [{ id: 't1', question: 'what changed?', status: 'answered', answer: [] }],
        })}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /clear conversation/i }));
    expect(clearConversation).not.toHaveBeenCalled();
    expect(screen.getByText('Clear this conversation? The findings stay.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^clear$/i }));
    expect(clearConversation).toHaveBeenCalledTimes(1);
  });

  it('dismisses the confirmation on Escape without clearing', async () => {
    const clearConversation = vi.fn();
    render(
      <CopilotConversation
        session={makeSession({
          clearConversation,
          turns: [{ id: 't1', question: 'what changed?', status: 'answered', answer: [] }],
        })}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /clear conversation/i }));
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByText('Clear this conversation? The findings stay.')).not.toBeInTheDocument();
    expect(clearConversation).not.toHaveBeenCalled();
  });

  it('offers no clear control when there is nothing to clear', () => {
    render(<CopilotConversation session={makeSession()} />);

    expect(screen.queryByRole('button', { name: /clear conversation/i })).not.toBeInTheDocument();
  });

  it('quotes nothing when the turn was not anchored', () => {
    render(
      <CopilotConversation
        session={makeSession({
          turns: [{ id: 't1', question: 'what changed?', status: 'answered', answer: [] }],
        })}
      />
    );

    expect(screen.getByText('what changed?')).toBeInTheDocument();
    // No finding was attached to this turn, so there is no reference box either.
    expect(screen.queryByText('Finding referenced')).not.toBeInTheDocument();
  });
});

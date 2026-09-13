import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CopilotTabs, { COPILOT_TAB_IDS } from '../CopilotTabs';

const renderTabs = (overrides: Partial<Parameters<typeof CopilotTabs>[0]> = {}) =>
  render(
    <CopilotTabs
      insights={<p>findings</p>}
      conversation={<p>conversation</p>}
      active="insights"
      onActiveChange={vi.fn()}
      {...overrides}
    />
  );

describe('CopilotTabs', () => {
  it('marks the active tab and reports a switch rather than moving itself', async () => {
    // The active tab is caller state: the shell owns it so a scope change can
    // reset it, and so an anchored finding can bring the conversation forward.
    const onActiveChange = vi.fn();
    renderTabs({ onActiveChange });

    expect(screen.getByRole('tab', { name: /insights/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /copilot/i })).toHaveAttribute('aria-selected', 'false');

    await userEvent.click(screen.getByRole('tab', { name: /copilot/i }));
    expect(onActiveChange).toHaveBeenCalledWith('conversation');
  });

  it('makes the tab the panel title, spanning the track', () => {
    renderTabs();

    // `default` is the variant whose active state is the primary fill; `line`
    // would render an underline instead.
    const list = document.querySelector('[data-slot="tabs-list"]');
    expect(list).toHaveAttribute('data-variant', 'default');
    expect(list?.className).toContain('w-full');

    // The shell focuses this id when the panel opens, so it must be the tab that
    // names the visible panel rather than a heading inside it.
    expect(screen.getByRole('tab', { name: /insights/i })).toHaveAttribute('id', COPILOT_TAB_IDS.insights);
    expect(screen.getByRole('tab', { name: /copilot/i })).toHaveAttribute('id', COPILOT_TAB_IDS.conversation);
  });

  it('keeps both panels mounted, so each tab keeps its own scroll position', () => {
    renderTabs();

    expect(screen.getByText('findings')).toBeInTheDocument();
    // Mounted but hidden: the point is that a switch does not remount anything.
    expect(screen.getByText('conversation')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-copilot-surface="surface"]')).toHaveLength(2);
  });

  it('marks a pending turn without inventing a count of anything', () => {
    // The operator's own in-flight question, not an unread badge: the panel must
    // never claim a number it does not own.
    renderTabs({ pending: true });

    expect(screen.getByRole('tab', { name: /copilot/i })).toHaveTextContent('answering now');
  });

  it('says nothing extra when nothing is pending', () => {
    renderTabs();

    expect(screen.getByRole('tab', { name: /copilot/i })).not.toHaveTextContent('answering now');
  });
});

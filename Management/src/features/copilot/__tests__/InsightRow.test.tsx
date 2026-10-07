import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import InsightRow from '../InsightRow';
import { claim, rankedClaim, setViewport } from './copilotTestUtils';

beforeEach(() => {
  setViewport({ desktop: false });
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('InsightRow — the card', () => {
  it('boxes the finding, so the unit has a boundary', () => {
    render(<InsightRow claim={claim()} sources={[]} announce={vi.fn()} />);

    const row = document.querySelector<HTMLElement>('[data-copilot-item]');
    expect(row?.className).toContain('rounded-lg');
    expect(row?.className).toContain('bg-foreground/10');
    // The touch target survives the card; the card only adds to it.
    expect(row?.className).toContain('min-h-[44px]');
  });

  it('draws severity as a spine and never as an outline', () => {
    for (const [severity, spine] of [
      ['critical', 'border-l-destructive'],
      ['warning', 'border-l-warning'],
      ['info', 'border-l-border'],
    ] as const) {
      const { unmount } = render(
        <InsightRow claim={claim({ severity })} sources={[]} announce={vi.fn()} />
      );

      const row = document.querySelector<HTMLElement>('[data-copilot-item]');
      expect(row?.className).toContain('border-l-4');
      expect(row?.className).toContain(spine);

      // The card draws ONE edge, never an outline, so every border utility on the
      // row is the left spine. A bare `border`, or a top/right/bottom edge, is the
      // box-drawn-around-a-box this panel's boundary rule forbids.
      const borders = (row?.className ?? '').split(/\s+/).filter((name) => name.startsWith('border'));
      expect(borders.length).toBeGreaterThan(0);
      expect(borders.every((name) => name.startsWith('border-l-'))).toBe(true);

      unmount();
    }
  });

  it('gathers its affordances into one footer inside the card', () => {
    render(
      <InsightRow claim={rankedClaim()} sources={[]} announce={vi.fn()} ranked onChatAbout={vi.fn()} />
    );

    const why = screen.getByText(/why now: /i);
    const footer = why.parentElement as HTMLElement;

    expect(footer.className).toContain('mt-2');
    expect(footer.className).toContain('flex-wrap');
    // Same footer, so both affordances read as this one finding's actions.
    expect(footer.contains(screen.getByRole('button', { name: /chat about this/i }))).toBe(true);
  });

  it('renders no footer when it has nothing to put in one', () => {
    render(<InsightRow claim={claim()} sources={[]} announce={vi.fn()} />);

    expect(screen.queryByText(/why now: /i)).toBeNull();
    expect(screen.queryByRole('button', { name: /chat about this/i })).toBeNull();
  });
});

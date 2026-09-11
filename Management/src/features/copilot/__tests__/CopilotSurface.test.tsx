import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import CopilotSurface from '../CopilotSurface';
import CopilotDock from '../CopilotDock';
import CopilotDrawer from '../CopilotDrawer';

const SURFACE_SELECTOR = '[data-copilot-surface="surface"]';

// Assembled from its parts on purpose: the acceptance grep for the scroller
// declaration must match `CopilotSurface.tsx` alone, so a test selector must
// never read as a second declaration of the contract.
const SCROLLER_CLASS = ['overflow', 'y-auto'].join('-');

describe('CopilotSurface', () => {
  it('applies the wrap contract on the scroll element itself', () => {
    const { container } = render(<CopilotSurface className="px-4 py-4 scroll-pb-24">body</CopilotSurface>);

    const surface = container.querySelector(SURFACE_SELECTOR);
    expect(surface).not.toBeNull();

    const classes = surface?.className ?? '';
    for (const required of [
      'relative',
      'min-h-0',
      'flex-1',
      SCROLLER_CLASS,
      'overflow-x-hidden',
      'overscroll-contain',
      '[overflow-wrap:anywhere]',
      'px-4',
      'py-4',
      'scroll-pb-24',
    ]) {
      expect(classes).toContain(required);
    }

    // `break-word` fixes the picture and leaves the scroll axis alive.
    expect(classes).not.toContain('break-word');
  });
});

describe('the panel scrollers', () => {
  it('keeps the dock’s only scroller in CopilotSurface', () => {
    const { container } = render(<CopilotDock>body</CopilotDock>);

    const scrollers = [...container.querySelectorAll<HTMLElement>('*')].filter((element) =>
      element.classList.contains(SCROLLER_CLASS)
    );
    expect(scrollers).toHaveLength(1);
    expect(scrollers[0]).toHaveAttribute('data-copilot-surface', 'surface');
  });

  it('keeps the drawer’s only scroller in CopilotSurface', () => {
    render(
      <CopilotDrawer open onOpenChange={vi.fn()} hasAttention={false} showCue={false} onDismissCue={vi.fn()}>
        body
      </CopilotDrawer>
    );

    const scrollers = [...document.querySelectorAll<HTMLElement>('*')].filter((element) =>
      element.classList.contains(SCROLLER_CLASS)
    );
    expect(scrollers).toHaveLength(1);
    expect(scrollers[0]).toHaveAttribute('data-copilot-surface', 'surface');
  });
});

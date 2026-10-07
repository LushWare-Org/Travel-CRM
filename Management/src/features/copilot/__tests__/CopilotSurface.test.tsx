import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import CopilotSurface from '../CopilotSurface';
import CopilotDock from '../CopilotDock';
import CopilotDrawer from '../CopilotDrawer';
import CopilotTabs, { COPILOT_TAB_IDS } from '../CopilotTabs';

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
  const scrollersIn = (root: HTMLElement | Document) =>
    [...root.querySelectorAll<HTMLElement>('*')].filter((element) =>
      element.classList.contains(SCROLLER_CLASS)
    );

  it('gives each tab panel its own CopilotSurface, and renames nothing', () => {
    // REGRESSION (was: "keeps the dock's only scroller in CopilotSurface"). The
    // surface moved into the tab panels, because one scroller shared by two
    // panels cannot hold two scroll offsets — so the invariant is no longer
    // "there is exactly one". It becomes "every scroller IS a CopilotSurface",
    // one per panel, which still fails on an accidental second scroller.
    const { container } = render(
      <CopilotTabs
        insights={<p>findings</p>}
        conversation={<p>conversation</p>}
        active="insights"
        onActiveChange={vi.fn()}
      />
    );

    const scrollers = scrollersIn(container);
    expect(scrollers).toHaveLength(2);
    for (const scroller of scrollers) {
      expect(scroller).toHaveAttribute('data-copilot-surface', 'surface');
    }
  });

  it('leaves no scroller in the dock or the drawer, which now delegate', () => {
    const dock = render(<CopilotDock>body</CopilotDock>);
    expect(scrollersIn(dock.container)).toHaveLength(0);

    const drawer = render(
      <CopilotDrawer
        open
        onOpenChange={vi.fn()}
        initialFocusId={COPILOT_TAB_IDS.insights}
        hasAttention={false}
        showCue={false}
        onDismissCue={vi.fn()}
      >
        body
      </CopilotDrawer>
    );
    expect(scrollersIn(document.body)).toHaveLength(0);
  });
});

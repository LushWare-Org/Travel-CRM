import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TestimonialsSection from '../components/TestimonialsSection';

vi.mock('../../../config/branding', () => ({
  default: {
    company: { name: 'TestCo' },
    integrations: { elfsightAppId: 'app-test-123' },
  },
}));

/**
 * The shared useElfsightWidget hook only schedules the script once its
 * observed element intersects. jsdom's setup polyfill never fires the
 * callback, so this test installs an observer that reports the element as
 * immediately intersecting — exercising the real hook end to end.
 */
class FiringIntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: number[] = [];

  constructor(private readonly callback: IntersectionObserverCallback) {}

  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

describe('TestimonialsSection', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', FiringIntersectionObserver);
    // The hook falls back to setTimeout(2000) when requestIdleCallback is
    // unavailable (jsdom), so fake timers let the test advance to the load.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.querySelector('script[src="https://elfsightcdn.com/platform.js"]')?.remove();
  });

  it('renders the section header and the elfsight widget container', () => {
    render(<TestimonialsSection />);

    expect(screen.getByText('Loved by Travelers Across the Globe')).toBeInTheDocument();
    expect(screen.getByText(/Honest reviews from clients/)).toBeInTheDocument();
  });

  it('attaches the widget container div and lazily loads the elfsight platform script', () => {
    render(<TestimonialsSection />);

    const widget = document.querySelector('.elfsight-app-app-test-123');
    expect(widget).not.toBeNull();
    expect(widget).toHaveAttribute('data-elfsight-app-lazy');

    expect(document.querySelector('script[src="https://elfsightcdn.com/platform.js"]')).toBeNull();
    vi.advanceTimersByTime(2000);
    expect(document.querySelector('script[src="https://elfsightcdn.com/platform.js"]')).not.toBeNull();
  });
});

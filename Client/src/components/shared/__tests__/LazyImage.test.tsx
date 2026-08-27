import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import LazyImage from '../LazyImage';

// The component only reads `entry.isIntersecting`, so a structural stand-in
// for IntersectionObserverEntry is enough to drive it.
type IntersectionCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

describe('LazyImage', () => {
  const observers: IntersectionCallback[] = [];

  class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);

    constructor(callback: IntersectionCallback) {
      observers.push(callback);
    }
  }

  afterEach(() => {
    observers.length = 0;
    vi.unstubAllGlobals();
  });

  it('renders only the loading skeleton until the intersection fires', () => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    const { container } = render(<LazyImage src="https://example.com/beach.jpg" alt="Beach" />);

    expect(screen.getByLabelText('Loading image')).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(observers).toHaveLength(1);
  });

  it('sets the real src once the placeholder intersects', () => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    const { container } = render(<LazyImage src="https://example.com/beach.jpg" alt="Beach" />);

    act(() => {
      observers[0]([{ isIntersecting: true }]);
    });

    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/beach.jpg');
    expect(img).toHaveAttribute('alt', 'Beach');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('renders no image when src is missing', () => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    const { container } = render(<LazyImage alt="Beach" />);

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Loading image')).not.toBeInTheDocument();
  });
});

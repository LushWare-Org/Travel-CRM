import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScrollTopButton from '../ScrollTopButton';

describe('ScrollTopButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls window.scrollTo with smooth behavior when clicked', () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    render(<ScrollTopButton />);

    screen.getByLabelText('Scroll to top').click();

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' });
  });

  it('is hidden (opacity-0, pointer-events-none) before scrolling past the threshold', () => {
    render(<ScrollTopButton />);
    const button = screen.getByLabelText('Scroll to top');
    expect(button.className).toMatch(/opacity-0/);
    expect(button.className).toMatch(/pointer-events-none/);
  });
});

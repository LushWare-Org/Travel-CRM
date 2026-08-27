import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import KeyPartnersSection from '../components/KeyPartners';

describe('KeyPartnersSection', () => {
  // The marquee advances via a 20ms interval; fake timers keep the render
  // static and free of act noise.
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the section title and partner names', () => {
    render(<KeyPartnersSection />);

    expect(
      screen.getByRole('heading', { name: /Our Trusted Travel Partners/ })
    ).toBeInTheDocument();
    // Partners are duplicated 4x for the seamless marquee loop.
    expect(screen.getAllByText('Booking.com').length).toBe(4);
  });
});

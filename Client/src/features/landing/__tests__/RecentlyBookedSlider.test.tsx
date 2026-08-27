import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RecentlyBookedSlider, { type RecentBookingItem } from '../components/RecentlyBookedSlider';

const items: RecentBookingItem[] = Array.from({ length: 4 }, (_, i) => ({
  id: `pkg-${i}`,
  packageName: `Package ${i + 1}`,
  image: '/img.jpg',
  duration: '5D/4N',
  price: 50000 + i,
  bookedAgo: '2 hours',
  traveler: { name: `Traveler ${i + 1}` },
}));

afterEach(() => {
  // Restore jsdom's default viewport so later tests are unaffected.
  Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true, writable: true });
});

describe('RecentlyBookedSlider', () => {
  it('moves the slide track when the Next/Previous buttons are clicked', async () => {
    // Desktop width: cardsPerView = 3, so 4 items overflow and controls show.
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true, writable: true });
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <RecentlyBookedSlider items={items} />
      </MemoryRouter>
    );

    const track = container.querySelector('[style*="translateX"]') as HTMLElement;
    expect(track).not.toBeNull();
    expect(track.style.transform).toBe('translateX(0%)');

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(track.style.transform).toBe('translateX(-33.333333333333336%)');

    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(track.style.transform).toBe('translateX(0%)');
  });

  it('renders the booking card details for each item', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true, writable: true });
    render(
      <MemoryRouter>
        <RecentlyBookedSlider items={items} />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Recently Booked Packages' })).toBeInTheDocument();
        // Items are duplicated for the seamless loop, so each card appears twice.
    expect(screen.getAllByText('Package 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Traveler 1').length).toBeGreaterThan(0);
        // formatDurationString's "XD/YN" pattern doesn't match a slashed
    // duration, so the raw "5D/4N" string is rendered as-is (original behavior).
    expect(screen.getAllByText('5D/4N').length).toBeGreaterThan(0);
  });

  it('shows the empty state when no items are provided', () => {
    render(
      <MemoryRouter>
        <RecentlyBookedSlider items={[]} />
      </MemoryRouter>
    );

    expect(screen.getByText('No recent bookings available yet.')).toBeInTheDocument();
  });
});

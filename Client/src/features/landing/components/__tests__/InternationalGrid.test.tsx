import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import InternationalGrid from '../InternationalGrid';
import type { AggregatedDestination } from '../../../../services/api/packages.transform';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const buildDestination = (overrides: Partial<AggregatedDestination>): AggregatedDestination => ({
  id: 'dest-id',
  name: 'Dubai',
  country: 'UAE',
  type: 'international',
  region: 'Middle East',
  slug: 'dubai',
  nameSlug: 'dubai',
  countrySlug: 'uae',
  raw: 'Dubai, UAE',
  description: '',
  image_url: 'https://example.com/dubai.jpg',
  packages: [],
  price: 899,
  minDuration: 4,
  maxDuration: 6,
  rating: 4.8,
  reviews: 10,
  packagesCount: 1,
  durationLabel: '4D/3N',
  activities: [],
  ...overrides,
});

const renderGrid = (destinations: AggregatedDestination[], loading = false) =>
  render(
    <MemoryRouter>
      <InternationalGrid destinations={destinations} loading={loading} />
    </MemoryRouter>,
  );

describe('InternationalGrid', () => {
  it('shows a loading spinner while packages are still being fetched', () => {
    render(
      <MemoryRouter>
        <InternationalGrid destinations={[]} loading />
      </MemoryRouter>,
    );

    expect(screen.getByText((_, el) => el?.className?.includes?.('animate-spin') ?? false)).toBeInTheDocument();
  });

  it('shows an empty state when no international destinations are available', () => {
    renderGrid([buildDestination({ type: 'domestic' })]);

    expect(screen.getByText('No international destinations available')).toBeInTheDocument();
  });

  // Regression test: the previous hero-tile layout only tiled cleanly at 5
  // destinations (a 2x2 hero + 4 singles = all 8 grid cells). With exactly 4
  // destinations it left one of those 8 cells empty, stranding the layout.
  // The bento layout instead gives every tile of a 4-destination set an
  // explicit column/row span that sums to the full 8-cell grid.
  it('renders every destination without an empty cell when there are exactly 4', () => {
    const destinations = ['Dubai', 'Bali', 'Turkey', 'Thailand'].map((name, i) =>
      buildDestination({ id: `dest-${i}`, name, slug: name.toLowerCase() }),
    );

    renderGrid(destinations);

    const tiles = screen.getAllByRole('button');
    expect(tiles).toHaveLength(4);
    destinations.forEach((dest) => {
      expect(screen.getByText(dest.name)).toBeInTheDocument();
    });
  });

  it('caps the hero layout at 5 tiles when more destinations are available', () => {
    const destinations = Array.from({ length: 7 }, (_, i) =>
      buildDestination({ id: `dest-${i}`, name: `Destination ${i}`, slug: `destination-${i}` }),
    );

    renderGrid(destinations);

    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('navigates to the filtered packages list when a tile is clicked', async () => {
    const user = userEvent.setup();
    renderGrid([buildDestination({ slug: 'dubai', name: 'Dubai' })]);

    await user.click(screen.getByRole('button', { name: /Dubai/ }));

    expect(mockNavigate).toHaveBeenCalledWith('/packages?destination=dubai');
  });
});

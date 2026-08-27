import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DestinationsContainer from '../DestinationsContainer';
import { fetchPackages } from '../../../services/api/packages';
import type { AggregatedDestination } from '../../../services/api/packages.transform';

vi.mock('../../../services/api/packages', () => ({
  fetchPackages: vi.fn(),
}));

const fetchPackagesMock = vi.mocked(fetchPackages);

const mockDestinations: AggregatedDestination[] = [
  {
    id: 'bali',
    name: 'Bali',
    country: 'Indonesia',
    type: 'international',
    region: 'Asia',
    slug: 'bali',
    nameSlug: 'bali',
    countrySlug: 'indonesia',
    raw: 'Bali, Indonesia',
    description: 'Tropical paradise with beaches and temples',
    image_url: 'https://example.com/bali.jpg',
    price: 45000,
    minDuration: 5,
    maxDuration: 5,
    rating: 4.8,
    reviews: 120,
    packagesCount: 8,
    durationLabel: '5D/4N',
    activities: ['Beach', 'Culture'],
    packages: [],
  },
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    type: 'international',
    region: 'Europe',
    slug: 'paris',
    nameSlug: 'paris',
    countrySlug: 'france',
    raw: 'Paris, France',
    description: 'City of lights and romance',
    image_url: 'https://example.com/paris.jpg',
    price: 120000,
    minDuration: 7,
    maxDuration: 7,
    rating: 4.9,
    reviews: 200,
    packagesCount: 5,
    durationLabel: '7D/6N',
    activities: ['Culture'],
    packages: [],
  },
];

const renderContainer = () =>
  render(
    <MemoryRouter>
      <DestinationsContainer />
    </MemoryRouter>
  );

beforeEach(() => {
  fetchPackagesMock.mockReset();
  fetchPackagesMock.mockResolvedValue({
    packages: [],
    destinations: mockDestinations,
    pagination: null,
  });
});

describe('DestinationsContainer', () => {
  it('loads and renders the destinations with the expected count', async () => {
    renderContainer();

    expect(fetchPackagesMock).toHaveBeenCalledWith({ limit: 100 });
    expect(await screen.findByRole('heading', { name: /Discover Your Next/ })).toBeInTheDocument();
    expect(screen.getByText('Bali, Indonesia')).toBeInTheDocument();
    expect(screen.getByText('Paris, France')).toBeInTheDocument();
    expect(screen.getByText('2 destinations')).toBeInTheDocument();
  });

  it('filters destinations by region and updates the result count', async () => {
    const user = userEvent.setup();
    renderContainer();
    await screen.findByText('Bali, Indonesia');

    await user.click(screen.getByRole('button', { name: /Show Filters/ }));
    await user.click(screen.getByRole('button', { name: 'Asia' }));

    expect(await screen.findByText('1 destinations')).toBeInTheDocument();
    expect(screen.getByText('Bali, Indonesia')).toBeInTheDocument();
    expect(screen.queryByText('Paris, France')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear/ })).toBeInTheDocument();
  });

  it('shows the error state with the API message when loading fails', async () => {
    fetchPackagesMock.mockRejectedValue(new Error('Server unreachable'));
    renderContainer();

    expect(await screen.findByText('Unable to load destinations')).toBeInTheDocument();
    expect(screen.getByText('Server unreachable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

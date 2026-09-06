import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PackagesContainer from '../PackagesContainer';
import { fetchPackages } from '../../../services/api/packages';
import { normalizePackage } from '../../../services/api/packages.transform';
import type { NormalizedPackage } from '../../../services/api/packages.transform';

vi.mock('../../../services/api/packages', () => ({
  fetchPackages: vi.fn(),
}));

const fetchPackagesMock = vi.mocked(fetchPackages);

const mockPackages: NormalizedPackage[] = [
  normalizePackage({
    title: 'Bali Honeymoon Special',
    description: 'Romantic beach getaway in Bali with private villa stays',
    destination: 'Bali, Indonesia',
    durationDays: 5,
    sellPrice: 45000,
    rating: 4.8,
    numReviews: 120,
  }),
  normalizePackage({
    title: 'Swiss Alps Explorer',
    description: 'Mountain trekking and scenic train rides through the Alps',
    destination: 'Interlaken, Switzerland',
    durationDays: 8,
    sellPrice: 150000,
    rating: 4.9,
    numReviews: 200,
  }),
];

const renderContainer = () =>
  render(
    <MemoryRouter>
      <PackagesContainer />
    </MemoryRouter>
  );

beforeEach(() => {
  fetchPackagesMock.mockReset();
  fetchPackagesMock.mockResolvedValue({
    packages: mockPackages,
    destinations: [],
    pagination: null,
  });
});

describe('PackagesContainer', () => {
  it('loads and renders the packages with the expected count', async () => {
    renderContainer();

    expect(fetchPackagesMock).toHaveBeenCalledWith({ limit: 100 });
    expect(await screen.findByRole('heading', { name: /Holiday Packages/ })).toBeInTheDocument();
    expect(screen.getByText('Bali Honeymoon Special')).toBeInTheDocument();
    expect(screen.getByText('Swiss Alps Explorer')).toBeInTheDocument();
    expect(screen.getByText('Curated • 2 packages available')).toBeInTheDocument();
  });

  it('filters packages by trip duration and updates the displayed list', async () => {
    const user = userEvent.setup();
    renderContainer();
    await screen.findByText('Bali Honeymoon Special');

    await user.click(screen.getByRole('button', { name: /Show Filters/ }));
    await user.click(screen.getByRole('checkbox', { name: /Medium \(5-7 days\)/ }));

    expect(await screen.findByText('Curated • 1 package available')).toBeInTheDocument();
    expect(screen.getByText('Bali Honeymoon Special')).toBeInTheDocument();
    expect(screen.queryByText('Swiss Alps Explorer')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear all/ })).toBeInTheDocument();
  });

  it('sorts packages by price high to low when selected', async () => {
    const user = userEvent.setup();
    renderContainer();
    await screen.findByText('Bali Honeymoon Special');

    await user.selectOptions(screen.getByRole('combobox'), 'price-high');

    const titles = screen.getAllByRole('heading', { level: 3 });
    expect(titles[0]).toHaveTextContent('Swiss Alps Explorer');
    expect(titles[1]).toHaveTextContent('Bali Honeymoon Special');
  });

  it('shows a clear-filters action in the zero-results state that restores packages', async () => {
    const user = userEvent.setup();
    renderContainer();
    await screen.findByText('Bali Honeymoon Special');

    await user.click(screen.getByRole('button', { name: /Show Filters/ }));
    await user.click(screen.getByRole('checkbox', { name: /Short \(1-4 days\)/ }));

    expect(await screen.findByText('No packages found')).toBeInTheDocument();
    expect(screen.queryByText('Bali Honeymoon Special')).not.toBeInTheDocument();
    expect(screen.queryByText('Swiss Alps Explorer')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));

    expect(screen.getByText('Bali Honeymoon Special')).toBeInTheDocument();
    expect(screen.getByText('Swiss Alps Explorer')).toBeInTheDocument();
  });

  it('shows the error state with the API message when loading fails', async () => {
    fetchPackagesMock.mockRejectedValue(new Error('Server unreachable'));
    renderContainer();

    expect(await screen.findByText('We ran into an issue')).toBeInTheDocument();
    expect(screen.getByText('Server unreachable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

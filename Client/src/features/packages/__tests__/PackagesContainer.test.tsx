import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
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

/**
 * The filters live in the URL, so the URL is part of this component's
 * contract and needs to be observable from a test.
 */
const LocationProbe = () => {
  const { search } = useLocation();
  return <span data-testid="location-search">{search}</span>;
};

const renderContainer = (initialEntry = '/packages') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PackagesContainer />
      <LocationProbe />
    </MemoryRouter>
  );

const respondWith = (packages: NormalizedPackage[], total = packages.length) =>
  fetchPackagesMock.mockResolvedValue({
    packages,
    destinations: [],
    pagination: { page: 1, limit: 12, total, totalPages: Math.max(1, Math.ceil(total / 12)) },
  } as never);

beforeEach(() => {
  fetchPackagesMock.mockReset();
  respondWith(mockPackages);
});

describe('PackagesContainer', () => {
  it('requests the catalogue with the full server-side filter set', async () => {
    renderContainer();

    expect(fetchPackagesMock).toHaveBeenCalledTimes(1);
    expect(fetchPackagesMock).toHaveBeenLastCalledWith({
      destination: undefined,
      category: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      durationMin: undefined,
      durationMax: undefined,
      minRating: undefined,
      sort: 'popularity',
      page: 1,
      limit: 12,
    });

    expect(await screen.findByText('Bali Honeymoon Special')).toBeInTheDocument();
    expect(screen.getByText('Swiss Alps Explorer')).toBeInTheDocument();
    expect(screen.getByText('Curated • 2 packages available')).toBeInTheDocument();
  });

  // The page used to filter a capped page of 100 in the browser, so the count
  // it showed was the count of what it happened to have loaded. It now reports
  // the server's own total, which is the number the catalogue actually has.
  it('reports the server total rather than the number of rows it rendered', async () => {
    respondWith(mockPackages.slice(0, 1), 137);
    renderContainer();

    expect(await screen.findByText('Curated • 137 packages available')).toBeInTheDocument();
    expect(screen.queryByText('Curated • 1 package available')).not.toBeInTheDocument();
  });

  it('restores every filter from the URL and sends them to the server', async () => {
    renderContainer('/packages?priceMin=1000&priceMax=2000&durationMin=5&durationMax=7&rating=4&sort=price-low&page=2');

    expect(fetchPackagesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        minPrice: 1000,
        maxPrice: 2000,
        durationMin: 5,
        durationMax: 7,
        minRating: 4,
        sort: 'price-low',
        page: 2,
      })
    );

    const user = userEvent.setup();
    await screen.findByText('Bali Honeymoon Special');
    await user.click(screen.getByRole('button', { name: /Show Filters/ }));

    // The band the URL came from reads as selected, which only holds while the
    // container and the sidebar read one shared option list.
    expect(
      screen.getByRole('checkbox', { name: (name: string) => name.includes('1,000') && name.includes('2,000') })
    ).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Medium \(5-7 days\)/ })).toBeChecked();
  });

  // An unknown budget must degrade to no filter at all rather than reaching the
  // server as NaN, and must not throw on the way.
  it('ignores a budget in the URL that is not a number', async () => {
    renderContainer('/packages?priceMax=cheap');

    expect(fetchPackagesMock).toHaveBeenLastCalledWith(expect.objectContaining({ maxPrice: undefined }));
    expect(await screen.findByText('Bali Honeymoon Special')).toBeInTheDocument();
  });

  it('writes a clicked duration band into the URL and refetches from page one', async () => {
    const user = userEvent.setup();
    renderContainer('/packages?page=3');
    await screen.findByText('Bali Honeymoon Special');
    expect(fetchPackagesMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3 }));

    await user.click(screen.getByRole('button', { name: /Show Filters/ }));
    await user.click(screen.getByRole('checkbox', { name: /Medium \(5-7 days\)/ }));

    expect(fetchPackagesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ durationMin: 5, durationMax: 7, page: 1 })
    );
    const search = screen.getByTestId('location-search').textContent ?? '';
    expect(search).toContain('durationMin=5');
    expect(search).toContain('durationMax=7');
    // A filter change resets pagination, so a stale page number never survives.
    expect(search).not.toContain('page=3');
  });

  it('sends the chosen sort to the server and reflects it in the URL', async () => {
    const user = userEvent.setup();
    renderContainer();
    await screen.findByText('Bali Honeymoon Special');

    await user.selectOptions(screen.getByRole('combobox'), 'price-high');

    expect(fetchPackagesMock).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'price-high' }));
    expect(screen.getByTestId('location-search')).toHaveTextContent('sort=price-high');
  });

  it('shows the zero-results state and clears the filters back out of the URL', async () => {
    const user = userEvent.setup();
    fetchPackagesMock.mockImplementation((params: Record<string, unknown> = {}) =>
      Promise.resolve(
        params.durationMin === 1
          ? { packages: [], destinations: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 1 } }
          : { packages: mockPackages, destinations: [], pagination: { page: 1, limit: 12, total: 2, totalPages: 1 } }
      ) as never
    );

    renderContainer('/packages?durationMin=1&durationMax=4');

    expect(await screen.findByText('No packages found')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));

    expect(await screen.findByText('Bali Honeymoon Special')).toBeInTheDocument();
    const search = screen.getByTestId('location-search').textContent ?? '';
    expect(search).not.toContain('durationMin');
    expect(search).not.toContain('durationMax');
  });

  it('shows the error state with the API message when loading fails', async () => {
    fetchPackagesMock.mockRejectedValue(new Error('Server unreachable'));
    renderContainer();

    expect(await screen.findByText('We ran into an issue')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecommendedPackagesSection from '../Stats';
import { fetchPackages } from '../../../../services/api/packages';
import type { NormalizedPackage } from '../../../../services/api/packages.transform';

vi.mock('../../../../services/api/packages', () => ({
  fetchPackages: vi.fn(),
}));

const fetchPackagesMock = vi.mocked(fetchPackages);

const mockPackage = (overrides: Partial<NormalizedPackage> = {}): NormalizedPackage => ({
  id: 'pkg-1',
  slug: 'pkg-1',
  title: 'Package',
  name: 'Package',
  description: 'A dreamy escape with villa stays and daily breakfast',
  destinationRaw: 'Bali, Indonesia',
  destination: {
    raw: 'Bali, Indonesia',
    name: 'Bali',
    country: 'Indonesia',
    type: 'international',
    region: 'Global',
    slug: 'bali',
    key: 'bali',
    nameSlug: 'bali',
    countrySlug: 'indonesia',
  },
  duration_days: 5,
  price_from: 50000,
  currency: 'USD',
  termsAndConditions: '',
  category: 'HONEYMOON',
  difficulty: null,
  rating: 4.5,
  reviews_count: 12,
  bookings: 4,
  // Deliberately not a curated category image: the card must stop rendering
  // the cheapest package's own photo.
  image_url: '/uploads/cheapest-package.jpg',
  images: ['/uploads/cheapest-package.jpg'],
  highlights: [],
  inclusions: [],
  exclusions: [],
  activities: [],
  itinerary: [],
  isFeatured: false,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  raw: {},
  ...overrides,
});

const renderSection = () =>
  render(
    <MemoryRouter>
      <RecommendedPackagesSection />
    </MemoryRouter>,
  );

beforeEach(() => {
  fetchPackagesMock.mockReset();
  fetchPackagesMock.mockResolvedValue({
    packages: [
      mockPackage({ id: 'pkg-honeymoon', category: 'HONEYMOON', price_from: 90000 }),
      mockPackage({ id: 'pkg-family', category: 'FAMILY', price_from: 40000 }),
    ],
    destinations: [],
    pagination: null,
  });
});

describe('RecommendedPackagesSection', () => {
  it('renders the curated honeymoon photo instead of the cheapest package photo', async () => {
    renderSection();

    // The carousel renders the mobile rail and the desktop window, so the same
    // card appears more than once.
    const images = await screen.findAllByRole('img', { name: 'HONEYMOON Packages' });
    expect(images.length).toBeGreaterThan(0);
    images.forEach((img) => {
      expect(img).toHaveAttribute('src', '/lush/categories/honeymoon.jpg');
    });
  });

  it('renders the curated family photo for the family card', async () => {
    renderSection();

    const images = await screen.findAllByRole('img', { name: 'FAMILY Packages' });
    expect(images.length).toBeGreaterThan(0);
    images.forEach((img) => {
      expect(img).toHaveAttribute('src', '/lush/categories/family.jpg');
    });
  });

  it('links each card to its own category filter', async () => {
    renderSection();

    const cards = await screen.findAllByRole('link', { name: /HONEYMOON Packages/ });
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0]).toHaveAttribute('href', '/packages?category=honeymoon');
  });
});

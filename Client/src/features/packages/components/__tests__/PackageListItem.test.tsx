import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PackageListItem from '../PackageListItem';
import type { EnrichedPackage } from '../../PackagesContainer';

const mockPackage = (overrides: Partial<EnrichedPackage> = {}): EnrichedPackage => ({
  id: 'pkg-1',
  slug: 'bali-family-bliss',
  title: 'Bali Family Bliss',
  name: 'Bali Family Bliss',
  description: 'A 7-day family escape through Bali.',
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
  duration_days: 7,
  durationLabel: '7 Days / 6 Nights',
  price_from: 1200,
  currency: 'USD',
  termsAndConditions: '',
  category: 'family',
  difficulty: null,
  rating: 4.9,
  reviews_count: 250,
  bookings: 12,
  image_url: '',
  images: [],
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

const renderItem = (pkg: EnrichedPackage) =>
  render(
    <MemoryRouter>
      <PackageListItem pkg={pkg} />
    </MemoryRouter>,
  );

describe('PackageListItem', () => {
  it('renders the curated category image when the package carries no photo', () => {
    renderItem(mockPackage());

    expect(screen.getByRole('img', { name: 'Bali Family Bliss' })).toHaveAttribute(
      'src',
      '/lush/categories/family.jpg',
    );
  });

  it('renders the package photo when it has one', () => {
    renderItem(mockPackage({ image_url: '/uploads/pkg.jpg', images: ['/uploads/pkg.jpg'] }));

    expect(screen.getByRole('img', { name: 'Bali Family Bliss' })).toHaveAttribute(
      'src',
      '/uploads/pkg.jpg',
    );
  });

  it('swaps a broken package photo for the curated category image', () => {
    renderItem(mockPackage({ image_url: '/uploads/pkg.jpg', images: ['/uploads/pkg.jpg'] }));

    const img = screen.getByRole('img', { name: 'Bali Family Bliss' }) as HTMLImageElement;
    fireEvent.error(img);

    expect(img.src).toContain('/lush/categories/family.jpg');
  });

  it('renders the list-row details the view needs', () => {
    renderItem(mockPackage());

    expect(screen.getByRole('heading', { name: 'Bali Family Bliss' })).toBeInTheDocument();
    expect(screen.getByText('7 Days / 6 Nights')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View Package/ })).toHaveAttribute(
      'href',
      '/package/pkg-1',
    );
  });
});

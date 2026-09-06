import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FALLBACK_IMAGE } from '@/config/media';
import PackageCard, { type PackageCardProps } from '../PackageCard';

const baseProps: PackageCardProps = {
  href: '/package/pkg-1',
  image: '/cover.jpg',
  title: 'Bali Paradise',
  price: '₹ 75,000',
};

const renderCard = (overrides: Partial<PackageCardProps> = {}) =>
  render(
    <MemoryRouter>
      <PackageCard {...baseProps} {...overrides} />
    </MemoryRouter>,
  );

describe('PackageCard', () => {
  it('renders the base contract: title, price, and image with the title as alt text', () => {
    renderCard();

    expect(screen.getByRole('heading', { level: 3, name: 'Bali Paradise' })).toBeInTheDocument();
    expect(screen.getByText('₹ 75,000')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Bali Paradise' })).toHaveAttribute('src', '/cover.jpg');
    // The funnel CTA every package surface shares.
    expect(screen.getByText('View Details')).toBeInTheDocument();
  });

  it('links the whole card to the given href', () => {
    renderCard();

    expect(screen.getByRole('link')).toHaveAttribute('href', '/package/pkg-1');
  });

  it('falls back to the site-wide fallback image when the image is missing', () => {
    renderCard({ image: '' });

    expect(screen.getByRole('img', { name: 'Bali Paradise' })).toHaveAttribute(
      'src',
      FALLBACK_IMAGE,
    );
  });

  it('renders the badge slot when provided', () => {
    renderCard({ badge: <span>Featured</span> });

    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('omits the badge slot when not provided', () => {
    renderCard();

    expect(screen.queryByText('Featured')).not.toBeInTheDocument();
  });

  it('renders the overlayMeta slot when provided', () => {
    renderCard({ overlayMeta: <span>5 Days</span> });

    expect(screen.getByText('5 Days')).toBeInTheDocument();
  });

  it('omits overlayMeta, description, and hoverReveal when not provided', () => {
    renderCard();

    expect(screen.queryByText('5 Days')).not.toBeInTheDocument();
    expect(screen.queryByText('Some description')).not.toBeInTheDocument();
    expect(screen.queryByText("What's Included:")).not.toBeInTheDocument();
  });

  it('renders the description and meta slots between the title and footer', () => {
    renderCard({
      description: 'A dreamy escape',
      meta: <span>2 hours ago</span>,
    });

    const title = screen.getByRole('heading', { level: 3, name: 'Bali Paradise' });
    expect(title).toBeInTheDocument();
    expect(screen.getByText('A dreamy escape')).toBeInTheDocument();
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    expect(title.compareDocumentPosition(screen.getByText('A dreamy escape'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});

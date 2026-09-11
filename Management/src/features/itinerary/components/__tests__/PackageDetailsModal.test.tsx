import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PackageDetailsModal from '../PackageDetailsModal';

const LONG_DESTINATION = 'Nuwara Eliya, Kandy, Ella and Yala National Park';

const pkg = {
  id: 'pkg-1',
  title: 'Bali Escape',
  destination: LONG_DESTINATION,
  durationDays: 7,
  category: 'honeymoon',
  basePrice: 1200,
  rating: 4.333333333333333,
  numReviews: 12,
  isActive: true,
  inclusions: [],
  exclusions: [],
  images: [],
};

const renderModal = (overrides = {}) =>
  render(<PackageDetailsModal pkg={{ ...pkg, ...overrides }} onClose={vi.fn()} />);

describe('PackageDetailsModal quick info', () => {
  it('gives the attribute boxes a floor width instead of squeezing six across', () => {
    // Six hand-authored columns in a ~896px dialog left each tile ~130px, which is
    // what pushed values out of their boxes.
    renderModal();

    const grid = screen.getByText(LONG_DESTINATION).closest('.grid');
    expect(grid?.className).toContain('grid-cols-[repeat(auto-fit,minmax(190px,1fr))]');
  });

  it('lets a long value wrap inside its box rather than overflow it', () => {
    renderModal();

    const value = screen.getByText(LONG_DESTINATION);
    expect(value.className).toContain('break-words');
    // The wrapper must be allowed to shrink below its content's min-content width,
    // which is the flex default that caused the overflow.
    expect(value.parentElement?.className).toContain('min-w-0');
    expect(value.closest('.min-w-0')).not.toBeNull();
  });

  it('rounds the rating it shows', () => {
    renderModal();

    expect(screen.queryByText('4.333333333333333')).not.toBeInTheDocument();
    expect(screen.getAllByText('4.3').length).toBeGreaterThan(0);
  });

  it('rounds a fractional margin rather than printing every digit', () => {
    renderModal({ defaultMarginType: 'PERCENTAGE', defaultMarginInput: 12.3456789 });

    expect(screen.getByText('12.35%')).toBeInTheDocument();
    expect(screen.queryByText('12.3456789%')).not.toBeInTheDocument();
  });

  it('falls back to N/A for a missing value', () => {
    renderModal({ destination: null });

    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });
});

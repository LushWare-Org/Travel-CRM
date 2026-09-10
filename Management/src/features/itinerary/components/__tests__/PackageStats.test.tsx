import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PackageStats from '../PackageStats';

// The reported defect: getPackageStats returns a raw Postgres AVG, and the tile
// rendered it verbatim.
describe('PackageStats', () => {
  it('rounds the average rating to one decimal', () => {
    render(<PackageStats stats={{ total: 9, active: 7, featured: 5, avgRating: 4.333333333333333 }} />);

    expect(screen.getByText('4.3')).toBeInTheDocument();
    expect(screen.queryByText('4.333333333333333')).not.toBeInTheDocument();
  });

  it('renders a whole-number average to one decimal rather than dropping it', () => {
    render(<PackageStats stats={{ total: 1, active: 1, featured: 0, avgRating: 5 }} />);

    expect(screen.getByText('5.0')).toBeInTheDocument();
  });

  it('leaves the count tiles as plain integers', () => {
    render(<PackageStats stats={{ total: 9, active: 7, featured: 5, avgRating: 0 }} />);

    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});

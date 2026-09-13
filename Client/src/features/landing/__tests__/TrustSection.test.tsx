import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TrustSection from '../components/TrustSection';

describe('TrustSection', () => {
  it('renders the consolidated trust content: stats, curation, sustainability', () => {
    render(
      <MemoryRouter>
        <TrustSection />
      </MemoryRouter>,
    );

    // Trust stats band (aboutSection source: 100 / 24 / 100 / 11000)
    expect(screen.getByRole('heading', { level: 2, name: /Why Choose/ })).toBeInTheDocument();
    expect(screen.getAllByText('100%')).toHaveLength(2);
    expect(screen.getByText('24x7')).toBeInTheDocument();
    expect(screen.getByText('11,000+')).toBeInTheDocument();
    expect(screen.getByText('Easy Booking')).toBeInTheDocument();
    expect(screen.getByText('On Trip Support')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Rated 4.9 out of 5 on Google' })).toBeInTheDocument();

    // Expert-curation message (whyChooseUs source)
    expect(screen.getByText('Itineraries Crafted Around You')).toBeInTheDocument();
    expect(screen.getByText('Guided by Local Experts')).toBeInTheDocument();
    expect(screen.getByText('Transparent, Fair Pricing')).toBeInTheDocument();
    expect(screen.getByAltText('Guided by Local Experts')).toBeInTheDocument();

    // Sustainability values (SustainabilityStrip source)
    expect(screen.getByRole('heading', { level: 3, name: 'Travel That Gives Back' })).toBeInTheDocument();
    expect(screen.getByText('Carbon-Conscious Itineraries')).toBeInTheDocument();
    expect(screen.getByText('Community-Rooted Partners')).toBeInTheDocument();
    expect(screen.getByText('Responsible by Design')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Read Our Sustainability Commitment/ })).toHaveAttribute(
      'href',
      '/about',
    );
  });
});

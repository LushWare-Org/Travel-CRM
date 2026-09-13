import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Hero from '../Hero.jsx';

describe('Hero', () => {
  it('links the management CTA to the Management Portal', () => {
    render(<Hero />);
    const link = screen.getByRole('link', { name: /open management portal/i });
    expect(link).toHaveAttribute('href', 'https://app.lushtravelcloud.com');
  });

  it('links the client CTA to the Client site', () => {
    render(<Hero />);
    const link = screen.getByRole('link', { name: /explore the client site/i });
    expect(link).toHaveAttribute('href', 'https://user.lushtravelcloud.com');
  });

  it('renders the headline', () => {
    render(<Hero />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Run your travel business, delight every traveler'
    );
  });
});

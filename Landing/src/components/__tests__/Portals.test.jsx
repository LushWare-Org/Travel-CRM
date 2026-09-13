import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Portals from '../Portals.jsx';

describe('Portals', () => {
  it('links the Management Portal card to app.lushtravelcloud.com', () => {
    render(<Portals />);
    const link = screen.getByRole('link', { name: /management portal/i });
    expect(link).toHaveAttribute('href', 'https://app.lushtravelcloud.com');
  });

  it('links the Client Portal card to user.lushtravelcloud.com', () => {
    render(<Portals />);
    const link = screen.getByRole('link', { name: /client portal/i });
    expect(link).toHaveAttribute('href', 'https://user.lushtravelcloud.com');
  });

  it('renders both portal titles', () => {
    render(<Portals />);
    expect(screen.getByText('Management Portal')).toBeInTheDocument();
    expect(screen.getByText('Client Portal')).toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Navbar from '../Navbar.jsx';

describe('Navbar', () => {
  it('links Management Sign In to app.lushtravelcloud.com', () => {
    render(<Navbar />);
    const link = screen.getByRole('link', { name: /management sign in/i });
    expect(link).toHaveAttribute('href', 'https://app.lushtravelcloud.com');
  });

  it('links Client Sign In to user.lushtravelcloud.com', () => {
    render(<Navbar />);
    const link = screen.getByRole('link', { name: /client sign in/i });
    expect(link).toHaveAttribute('href', 'https://user.lushtravelcloud.com');
  });
});

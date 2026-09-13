import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the landing page without crashing', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders exactly one link to each portal outside the nav/footer duplicates', () => {
    render(<App />);
    const managementLinks = screen.getAllByRole('link', { name: /management/i });
    const clientLinks = screen.getAllByRole('link', { name: /client/i });
    expect(managementLinks.length).toBeGreaterThan(0);
    expect(clientLinks.length).toBeGreaterThan(0);
    managementLinks.forEach((link) => {
      if (link.getAttribute('href')?.startsWith('http')) {
        expect(link).toHaveAttribute('href', 'https://app.lushtravelcloud.com');
      }
    });
    clientLinks.forEach((link) => {
      if (link.getAttribute('href')?.startsWith('http')) {
        expect(link).toHaveAttribute('href', 'https://user.lushtravelcloud.com');
      }
    });
  });
});

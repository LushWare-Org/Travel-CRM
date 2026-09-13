import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CtaBanner from '../CtaBanner.jsx';

describe('CtaBanner', () => {
  it('links the management CTA to app.lushtravelcloud.com', () => {
    render(<CtaBanner />);
    const link = screen.getByRole('link', { name: /open management portal/i });
    expect(link).toHaveAttribute('href', 'https://app.lushtravelcloud.com');
  });

  it('links the client CTA to user.lushtravelcloud.com', () => {
    render(<CtaBanner />);
    const link = screen.getByRole('link', { name: /visit client site/i });
    expect(link).toHaveAttribute('href', 'https://user.lushtravelcloud.com');
  });
});

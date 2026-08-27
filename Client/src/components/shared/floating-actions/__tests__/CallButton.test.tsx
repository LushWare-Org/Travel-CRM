import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CallButton from '../CallButton';

describe('CallButton', () => {
  it('links to a tel: URL using the configured phone number', () => {
    render(<CallButton />);
    const link = screen.getByLabelText('Call us');
    expect(link).toHaveAttribute('href', expect.stringMatching(/^tel:/));
  });
});

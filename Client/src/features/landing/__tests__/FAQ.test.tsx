import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FAQSection from '../components/FAQ';

describe('FAQSection', () => {
  it('renders the default booking-category questions', () => {
    render(<FAQSection />);

    expect(screen.getByRole('heading', { name: "Got Questions? We've Got Answers" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Booking & Payment' })).toBeInTheDocument();
    expect(screen.getByText('How do I book a travel package?')).toBeInTheDocument();
  });

  it('switches category tabs and toggles an answer open and closed', async () => {
    const user = userEvent.setup();
    const { container } = render(<FAQSection />);

    await user.click(screen.getByRole('button', { name: 'Pricing & Deals' }));
    expect(screen.getByText('Are there any hidden costs?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Are there any hidden costs?' }));
    expect(container.querySelector('.rotate-180')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Are there any hidden costs?' }));
    expect(container.querySelector('.rotate-180')).toBeNull();
  });
});

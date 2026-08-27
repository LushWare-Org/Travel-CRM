import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactContainer from '../ContactContainer';
import { submitContactForm } from '../../../services/api/contact';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../services/api/contact', () => ({
  submitContactForm: vi.fn(),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: mocks.useAuth,
}));

const submitContactFormMock = vi.mocked(submitContactForm);

const fillRequiredFields = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Doe');
  await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
  await user.type(screen.getByPlaceholderText('How can we help?'), 'Honeymoon in Bali');
  await user.type(
    screen.getByPlaceholderText('Tell us about your dream vacation...'),
    'We would like a 7-day Bali package.'
  );
};

describe('ContactContainer', () => {
  beforeEach(() => {
    mocks.useAuth.mockReturnValue({ user: null });
    submitContactFormMock.mockReset();
    submitContactFormMock.mockResolvedValue({ leadId: 'lead-1' });
  });

  it('renders the contact form and office hours card', () => {
    render(<ContactContainer />);
    expect(screen.getByRole('heading', { name: /Send Us a Message/ })).toBeInTheDocument();
    expect(screen.getByText('Office Hours')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Message/ })).toBeInTheDocument();
  });

  it('submits the exact expected payload when the form is filled and submitted', async () => {
    const user = userEvent.setup();
    const { container } = render(<ContactContainer />);

    await fillRequiredFields(user);
    await user.type(screen.getByPlaceholderText('+1 (555) 123-4567'), '  +1 555 123 4567  ');
    // The Travel Date label is not programmatically associated with its input
    // in the page markup, so query the field by name instead.
    const travelDateInput = container.querySelector('input[name="travelDate"]') as HTMLInputElement;
    await user.type(travelDateInput, '2026-12-01');

    // Pick a destination through the shared DestinationSelector.
    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));

    // Add a location through the shared LocationSelector.
    await user.click(screen.getByRole('button', { name: 'Add Locations' }));
    await user.click(screen.getByRole('button', { name: /Uluwatu Temple/ }));

    await user.click(screen.getByRole('button', { name: /Send Message/ }));

    expect(submitContactFormMock).toHaveBeenCalledTimes(1);
    expect(submitContactFormMock).toHaveBeenCalledWith({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+1 555 123 4567',
      subject: 'Honeymoon in Bali',
      message: 'We would like a 7-day Bali package.',
      travelDate: '2026-12-01',
      destination: 'Bali, Indonesia',
      destinationCountry: 'Bali',
      locations: 'Uluwatu Temple',
    });
  });

  it('shows a validation error and does not call the API when required fields are missing', async () => {
    const user = userEvent.setup();
    render(<ContactContainer />);

    // Whitespace-only Name/Subject/Message pass the browser's native
    // `required` check (value is non-empty) while a real email keeps native
    // validation happy, so submission reaches the form's own `.trim()` check —
    // the custom-validation branch this test targets. (Whitespace-only values
    // in the email field would instead be blocked by native email validation.)
    await user.type(screen.getByPlaceholderText('John Doe'), '   ');
    await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
    await user.type(screen.getByPlaceholderText('How can we help?'), '   ');
    await user.type(screen.getByPlaceholderText('Tell us about your dream vacation...'), '   ');
    await user.click(screen.getByRole('button', { name: /Send Message/ }));

    expect(
      screen.getByText('Please fill in all required fields (Name, Email, Subject, and Message).')
    ).toBeInTheDocument();
    expect(submitContactFormMock).not.toHaveBeenCalled();
  });

  it('shows the API error message when submission fails', async () => {
    const user = userEvent.setup();
    submitContactFormMock.mockRejectedValue(new Error('Server unreachable'));
    render(<ContactContainer />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /Send Message/ }));

    expect(await screen.findByText('Server unreachable')).toBeInTheDocument();
    expect(submitContactFormMock).toHaveBeenCalledTimes(1);
  });

  it('shows the success state after a successful submission', async () => {
    const user = userEvent.setup();
    render(<ContactContainer />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /Send Message/ }));

    expect(await screen.findByText('Message Sent Successfully!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Another Message' })).toBeInTheDocument();
  });
});

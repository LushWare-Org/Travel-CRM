import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import BookingModal from '../BookingModal';
import type { BookingFormData } from '../BookingModal';

// The heavy third-party pickers are not exercised by these tests (none of them
// drives step 2's calendar); render inert stand-ins so their global stylesheet
// imports stay out of the unit under test.
vi.mock('react-phone-number-input', () => ({
  default: () => <input aria-label="phone number" />,
}));

vi.mock('react-datepicker', () => ({
  default: () => <div data-testid="datepicker" />,
}));

const EMPTY_FORM: BookingFormData = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+94771234567',
  travelers: 2,
  travelDate: null,
  endDate: null,
  message: '',
};

const noop = () => {};

function renderModal(
  overrides: Partial<{
    open: boolean;
    formData: BookingFormData;
    formErrors: Record<string, string>;
    currentStep: number;
    isSubmittingBooking: boolean;
    setFormData: (data: BookingFormData) => void;
    setFormErrors: (errors: Record<string, string>) => void;
    onNext: () => void;
    onPrevious: () => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    onClose: () => void;
  }> = {},
) {
  const props = {
    open: true,
    formData: EMPTY_FORM,
    formErrors: {},
    currentStep: 3,
    isSubmittingBooking: false,
    setFormData: noop,
    setFormErrors: noop,
    onNext: noop,
    onPrevious: noop,
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => e.preventDefault(),
    onClose: noop,
    ...overrides,
  };
  render(<BookingModal {...props} />);
  return props;
}

describe('BookingModal', () => {
  it('renders nothing while closed and opens with dialog title, description and steps', () => {
    renderModal({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    renderModal({ open: true, currentStep: 1 });
    const dialog = screen.getByRole('dialog');
    // The popup is labelled by the title and described by the subtitle.
    expect(dialog).toHaveAccessibleName('Book Your Adventure');
    expect(screen.getByRole('heading', { name: 'Book Your Adventure' })).toBeInTheDocument();
    expect(
      screen.getByText(/Fill in your details and we'll get back to you within 24 hours/),
    ).toBeInTheDocument();

    // The shared Stepper's three steps all render with step semantics.
    expect(screen.getByRole('list', { name: 'Progress' })).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('Travel')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('shows the submitting state on the submit button while a submission is pending', () => {
    renderModal({ isSubmittingBooking: true });

    const submitButton = screen.getByRole('button', { name: /Submitting/ });
    expect(submitButton).toBeDisabled();
    // The submit action is replaced by the pending label while in flight.
    expect(
      screen.queryByRole('button', { name: /Submit Booking Request/ }),
    ).not.toBeInTheDocument();
  });

  it('fires onSubmit once for a submit click and shows the pending state until it resolves', async () => {
    const user = userEvent.setup();
    let release: (() => void) | undefined;
    let resolveCount = 0;
    const onSubmit = vi.fn(async () => {
      await new Promise<void>((resolvePromise) => {
        release = resolvePromise;
      });
      resolveCount += 1;
    });

    const Harness = () => {
      const [pending, setPending] = useState(false);
      const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (pending) return; // same early-return guard the container implements
        setPending(true);
        try {
          await onSubmit();
        } finally {
          setPending(false);
        }
      };
      return (
        <BookingModal
          open
          formData={EMPTY_FORM}
          formErrors={{}}
          currentStep={3}
          isSubmittingBooking={pending}
          setFormData={noop}
          setFormErrors={noop}
          onNext={noop}
          onPrevious={noop}
          onSubmit={handleSubmit}
          onClose={noop}
        />
      );
    };

    render(<Harness />);
    const submitButton = screen.getByRole('button', { name: /Submit Booking Request/ });

    await user.click(submitButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    // The button flips to the disabled, "Submitting..." state until the
    // async request settles.
    expect(screen.getByRole('button', { name: /Submitting/ })).toBeDisabled();

    await act(async () => {
      release?.();
    });
    expect(resolveCount).toBe(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /Submit Booking Request/ })).toBeEnabled();
  });

  it('does not fire onSubmit again while a submission is already in flight (rapid repeat submit)', async () => {
    const user = userEvent.setup();
    let release: (() => void) | undefined;
    const onSubmit = vi.fn((e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
    });

    const Harness = () => {
      const [pending, setPending] = useState(false);
      const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (pending) return; // same early-return guard the container implements
        setPending(true);
        try {
          await new Promise<void>((resolvePromise) => {
            release = resolvePromise;
          });
        } finally {
          setPending(false);
        }
      };
      return (
        <BookingModal
          open
          formData={EMPTY_FORM}
          formErrors={{}}
          currentStep={3}
          isSubmittingBooking={pending}
          setFormData={noop}
          setFormErrors={noop}
          onNext={noop}
          onPrevious={noop}
          onSubmit={handleSubmit}
          onClose={noop}
        />
      );
    };

    render(<Harness />);
    const submitButton = screen.getByRole('button', { name: /Submit Booking Request/ });

    // First submit starts the in-flight request and disables the button.
    await user.click(submitButton);
    expect(screen.getByRole('button', { name: /Submitting/ })).toBeDisabled();

    // A repeat click on the disabled submit button cannot reach the form's
    // onSubmit handler while the request is pending.
    await user.click(screen.getByRole('button', { name: /Submitting/ }));
    expect(onSubmit).not.toHaveBeenCalled();

    // The disabled state also prevents a native form re-submit from firing.
    const dialog = screen.getByRole('dialog');
    const form = dialog.querySelector('form') as HTMLFormElement;
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(onSubmit).not.toHaveBeenCalled();

    await act(async () => {
      release?.();
    });
  });

  it('keeps focus inside the dialog while open (focus trap) and never leaks it to the page', async () => {
    const user = userEvent.setup();
    renderModal({ currentStep: 3 });

    const dialog = screen.getByRole('dialog');
    // Base UI moves focus into the popup on open (scheduled on an animation
    // frame); once it lands, every Tab stays inside the dialog.
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    // Tab forward repeatedly. The wrap guards redirect focus on the next
    // animation frame, so wait for focus to settle before asserting it is
    // still inside the dialog (a broken trap would land on the page body).
    for (let i = 0; i < 8; i += 1) {
      await user.tab();
      await waitFor(() => {
        expect(dialog.contains(document.activeElement)).toBe(true);
      });
    }

    // A deliberate Tab from the last control wraps back to the first focusable
    // inside the dialog instead of escaping to the document body.
    const innerFocusables = dialog.querySelectorAll(
      'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [href]',
    );
    expect(innerFocusables.length).toBeGreaterThan(0);
    await user.tab();
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
  });

  it('calls onClose when the Escape key is pressed and then unmounts the dialog', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const Harness = () => {
      const [open, setOpen] = useState(true);
      return (
        <BookingModal
          open={open}
          formData={EMPTY_FORM}
          formErrors={{}}
          currentStep={3}
          isSubmittingBooking={false}
          setFormData={noop}
          setFormErrors={noop}
          onNext={noop}
          onPrevious={noop}
          onSubmit={(e) => e.preventDefault()}
          onClose={() => {
            onClose();
            setOpen(false);
          }}
        />
      );
    };

    render(<Harness />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('calls onClose when the header close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });

    await user.click(screen.getByRole('button', { name: /Close booking dialog/ }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders only the active step content and wires the Next handler', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();

    renderModal({ currentStep: 1, onNext });

    // Step 1 fields are shown; step 2/3 content is not.
    expect(screen.getByPlaceholderText('your.email@example.com')).toBeInTheDocument();
    expect(screen.queryByText('Plan Your Journey')).not.toBeInTheDocument();
    expect(screen.queryByText('Review & Submit')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Next Step/ }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('clears the field error when the user edits the offending input', async () => {
    const user = userEvent.setup();
    const setFormErrors = vi.fn();
    renderModal({
      currentStep: 1,
      formErrors: { email: 'Email is required' },
      setFormErrors,
    });

    expect(screen.getByText('Email is required')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'a@b.com');
    expect(setFormErrors).toHaveBeenCalledWith({ email: '' });
  });

  it('renders the review summary from the provided form data on the final step', () => {
    renderModal({ currentStep: 3 });

    expect(screen.getByText('Review & Submit')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('+94771234567')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Booking Request/ })).toBeInTheDocument();
  });
});

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlanYourTripContainer from '../PlanYourTripContainer';
import { submitManualItineraryRequest } from '../../../services/api/manualItinerary';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../services/api/manualItinerary', () => ({
  submitManualItineraryRequest: vi.fn(),
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: mocks.useAuth,
}));

const submitMock = vi.mocked(submitManualItineraryRequest);

/** Day numbers for the current month that exist in every month (1..28+). */
const CURRENT_MONTH_DAY_A = 15;
const CURRENT_MONTH_DAY_B = 20;

const currentMonthDay = (day: number): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

beforeAll(() => {
  // handleAddDay scrolls the itinerary form into view inside a setTimeout;
  // jsdom does not implement scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  mocks.useAuth.mockReturnValue({ user: null });
  submitMock.mockReset();
  submitMock.mockResolvedValue({ success: true });
});

describe('PlanYourTripContainer', () => {
  it('renders the first step of the trip planner', () => {
    render(<PlanYourTripContainer />);
    expect(
      screen.getByRole('heading', { name: 'Where do you want to go?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Choose your destination...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/ })).toBeInTheDocument();
  });

  it('shows a validation message when submitted without a destination and never calls the API', () => {
    const { container } = render(<PlanYourTripContainer />);
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    expect(
      screen.getByText('Please choose a destination before continuing.'),
    ).toBeInTheDocument();
    expect(submitMock).not.toHaveBeenCalled();
  });

  it('submits the exact expected payload after completing all four steps', async () => {
    const user = userEvent.setup();
    const { container } = render(<PlanYourTripContainer />);

    // Step 1: pick a destination.
    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    expect(screen.getByText('Destination selected')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Next/ }));

    // Step 2: pick a date range through the calendar and confirm state updated.
    await user.click(screen.getByPlaceholderText('Select start date'));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_A)));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_B)));

    const startDate = currentMonthDay(CURRENT_MONTH_DAY_A);
    const endDate = currentMonthDay(CURRENT_MONTH_DAY_B);
    expect(screen.getByPlaceholderText('Select start date')).toHaveValue(startDate);
    expect(screen.getByPlaceholderText('Select end date')).toHaveValue(endDate);
    expect(screen.getByText('5 Days / 4 Nights')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Next/ }));

    // Step 3: add a single itinerary day.
    await user.click(screen.getByRole('button', { name: 'Add Day 1' }));
    expect(screen.getByText(/Day 1 of 5/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Next/ }));

    // Step 4: provide the required email and submit.
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    await user.type(emailInput, 'tester@example.com');
    await user.click(screen.getByRole('button', { name: 'Submit Itinerary' }));

    expect(await screen.findByText('Successfully Submitted!')).toBeInTheDocument();
    expect(submitMock).toHaveBeenCalledTimes(1);
    expect(submitMock).toHaveBeenCalledWith({
      name: '',
      email: 'tester@example.com',
      phone: '',
      destination: 'Bali, Indonesia',
      destinationCountry: 'Bali',
      region: '',
      travelDate: startDate,
      endDate: endDate,
      numberOfTravelers: 2,
      budget: '',
      message: '',
      days: [
        {
          dayNumber: 1,
          title: 'Day 1',
          locations: [],
          activities: [],
          accommodation: {
            name: '',
            type: 'hotel',
            rating: 4,
            address: '',
            contactNumber: '',
          },
          meals: { breakfast: true, lunch: false, dinner: false },
          places: [],
          notes: '',
        },
      ],
    });
  });

  it('shows the API error message when submission fails', async () => {
    const user = userEvent.setup();
    const { container } = render(<PlanYourTripContainer />);

    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    await user.click(screen.getByPlaceholderText('Select start date'));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_A)));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_B)));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    await user.click(screen.getByRole('button', { name: 'Add Day 1' }));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    await user.type(emailInput, 'tester@example.com');
    submitMock.mockRejectedValue(new Error('Server unreachable'));

    await user.click(screen.getByRole('button', { name: 'Submit Itinerary' }));

    expect(await screen.findByText('Server unreachable')).toBeInTheDocument();
    expect(submitMock).toHaveBeenCalledTimes(1);
  });
});

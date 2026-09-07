import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router-dom';
import PlanYourTripContainer from '../PlanYourTripContainer';
import { fetchUserBookings } from '../../../services/api/booking';
import { submitManualItineraryRequest } from '../../../services/api/manualItinerary';
import { generateItineraryPreview } from '../../../services/api/aiItinerary';
import { generateDayPreview, generateDaysRangePreview } from '../../../services/api/aiDayGeneration';
import { sendItineraryChatMessage } from '../../../services/api/itineraryChat';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  swalFire: vi.fn(),
}));

vi.mock('../../../services/api/manualItinerary', () => ({
  submitManualItineraryRequest: vi.fn(),
}));

vi.mock('../../../services/api/aiItinerary', () => ({
  generateItineraryPreview: vi.fn(),
}));

vi.mock('../../../services/api/aiDayGeneration', () => ({
  generateDayPreview: vi.fn(),
  generateDaysRangePreview: vi.fn(),
}));

vi.mock('../../../services/api/itineraryChat', () => ({
  sendItineraryChatMessage: vi.fn(),
}));
vi.mock('../../../services/api/booking', () => ({
  fetchUserBookings: vi.fn(),
}));

vi.mock('sweetalert2', () => ({
  default: { fire: mocks.swalFire },
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: mocks.useAuth,
}));

const submitMock = vi.mocked(submitManualItineraryRequest);
const generateItineraryPreviewMock = vi.mocked(generateItineraryPreview);
const generateDayPreviewMock = vi.mocked(generateDayPreview);
const generateDaysRangePreviewMock = vi.mocked(generateDaysRangePreview);
const sendItineraryChatMessageMock = vi.mocked(sendItineraryChatMessage);
const fetchUserBookingsMock = vi.mocked(fetchUserBookings);

/** Day numbers for the month the tests pick dates in (exist in every month). */
const CURRENT_MONTH_DAY_A = 15;
const CURRENT_MONTH_DAY_B = 20;

/**
 * ISO string for `day` in the month AFTER the real current month — the month
 * every step-2 date pick navigates the calendar to (see openStep2Calendar).
 * The old helper used the current month, whose days 15/20 fall in the past —
 * now rejected with an inline error — whenever the suite runs after the 14th
 * of a month; a fixed future month keeps the suite deterministic on any run
 * date.
 */
const currentMonthDay = (day: number): string => {
  const next = new Date();
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  const yyyy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/** Navigates the already-open step-2 range calendar to the fixed future
 * month the date helpers above agree on (its initial view is the real
 * current month, whose past days the wizard now rejects). */
async function openStep2Calendar(user: UserEvent) {
  // One month ahead of the real current month.
  await user.click(screen.getByText('▶'));
}

/** Renders the container inside a router — it reads/writes `?step=` via
 * useSearchParams, which requires router context. */
const renderContainer = (initialEntry = '/planner') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PlanYourTripContainer />
    </MemoryRouter>,
  );

/** Data-router render for tests that drive history back/forward and assert
 * the URL — returns the router (navigate(-1)/navigate(1),
 * router.state.location.search) plus an unmount for same-test re-renders. */
const renderWithRouter = (initialEntry = '/planner') => {
  const router = createMemoryRouter(
    [{ path: '/planner', element: <PlanYourTripContainer /> }],
    { initialEntries: [initialEntry] },
  );
  const view = render(<RouterProvider router={router} />);
  return { router, unmount: view.unmount };
};

/** Deterministic future ISO date (today + offset days) for fixtures that
 * must stay future-valid on any run date. */
const isoDaysFromToday = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

beforeAll(() => {
  // handleAddDay scrolls the itinerary form into view inside a setTimeout;
  // jsdom does not implement scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  mocks.useAuth.mockReturnValue({ user: null });
  mocks.swalFire.mockReset();
  submitMock.mockReset();
  submitMock.mockResolvedValue({ leadId: 'lead-1', manualItineraryId: 'mi-1' });
  generateItineraryPreviewMock.mockReset();
  generateDayPreviewMock.mockReset();
  generateDaysRangePreviewMock.mockReset();
  sendItineraryChatMessageMock.mockReset();
  fetchUserBookingsMock.mockReset();
});

describe('PlanYourTripContainer', () => {
  it('renders the first step of the trip planner', () => {
    renderContainer();
    expect(
      screen.getByRole('heading', { name: 'Where do you want to go?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Choose your destination...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/ })).toBeInTheDocument();
  });

  it('shows a validation message when submitted without a destination and never calls the API', () => {
    const { container } = renderContainer();
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    expect(
      screen.getByText('Please choose a destination before continuing.'),
    ).toBeInTheDocument();
    expect(submitMock).not.toHaveBeenCalled();
  });

  it('submits the exact expected payload after completing all four steps', async () => {
    const user = userEvent.setup();
    const { container } = renderContainer();

    // Step 1: pick a destination.
    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    expect(screen.getByText('Destination selected')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Next/ }));

    // Step 2: pick a date range through the calendar and confirm state updated.
    await user.click(screen.getByPlaceholderText('Select start date'));
    await openStep2Calendar(user);
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

  it('shows the generic failure message (never a raw server or availability claim) when submission fails', async () => {
    const user = userEvent.setup();
    const { container } = renderContainer();

    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    await user.click(screen.getByPlaceholderText('Select start date'));
    await openStep2Calendar(user);
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_A)));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_B)));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    await user.click(screen.getByRole('button', { name: 'Add Day 1' }));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    await user.type(emailInput, 'tester@example.com');
    submitMock.mockRejectedValue(new Error('Server unreachable'));

    await user.click(screen.getByRole('button', { name: 'Submit Itinerary' }));

    expect(
      await screen.findByText("Couldn't complete your booking — please try again or contact us."),
    ).toBeInTheDocument();
    expect(screen.queryByText('Server unreachable')).not.toBeInTheDocument();
    expect(submitMock).toHaveBeenCalledTimes(1);
  });

  it('clicking "Generate itinerary with AI" at the empty Step 3 state calls it with the derived params, populates the day grid, and the submitted payload matches the AI-mapped day', async () => {
    const user = userEvent.setup();
    generateItineraryPreviewMock.mockResolvedValue({
      days: [{ dayNumber: 1, title: 'Ella Hike', locations: ['Ella'], activities: ['Nine Arch Bridge'] }],
    });
    const { container } = renderContainer();

    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    await user.click(screen.getByPlaceholderText('Select start date'));
    await openStep2Calendar(user);
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_A)));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_B)));
    const startDate = currentMonthDay(CURRENT_MONTH_DAY_A);
    const endDate = currentMonthDay(CURRENT_MONTH_DAY_B);
    await user.click(screen.getByRole('button', { name: /Next/ }));

    await user.click(screen.getByRole('button', { name: /Generate itinerary with AI/ }));

    expect(generateItineraryPreviewMock).toHaveBeenCalledWith({
      destination: 'Bali, Indonesia',
      duration: 5,
      travelers: 2,
      preferences: undefined,
    });
    expect(await screen.findByDisplayValue('Ella Hike')).toBeInTheDocument();
    expect(mocks.swalFire).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Next/ }));
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    await user.type(emailInput, 'tester@example.com');
    await user.click(screen.getByRole('button', { name: 'Submit Itinerary' }));

    expect(await screen.findByText('Successfully Submitted!')).toBeInTheDocument();
    expect(submitMock).toHaveBeenCalledTimes(1);
    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        travelDate: startDate,
        endDate,
        days: [
          {
            dayNumber: 1,
            title: 'Ella Hike',
            locations: ['Ella'],
            activities: ['Nine Arch Bridge'],
            accommodation: { name: '', type: 'hotel', rating: 4, address: '', contactNumber: '' },
            meals: { breakfast: false, lunch: false, dinner: false },
            places: [],
            notes: '',
          },
        ],
      }),
    );
  });

  it('with a day already added, clicking "Regenerate with AI" confirms via SweetAlert2 before replacing days', async () => {
    const user = userEvent.setup();
    renderContainer();

    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByPlaceholderText('Select start date'));
    await openStep2Calendar(user);
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_A)));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_B)));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    await user.click(screen.getByRole('button', { name: 'Add Day 1' }));
    expect(screen.getByText(/Day 1 of 5/)).toBeInTheDocument();

    // Canceling leaves the existing day untouched.
    mocks.swalFire.mockResolvedValue({ isConfirmed: false });
    await user.click(screen.getByRole('button', { name: /Regenerate with AI/ }));
    expect(mocks.swalFire).toHaveBeenCalledTimes(1);
    expect(generateItineraryPreviewMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Day 1 of 5/)).toBeInTheDocument();

    // Confirming replaces the days with the AI-generated ones.
    mocks.swalFire.mockResolvedValue({ isConfirmed: true });
    generateItineraryPreviewMock.mockResolvedValue({
      days: [{ dayNumber: 1, title: 'Ella Hike', locations: [], activities: [] }],
    });
    await user.click(screen.getByRole('button', { name: /Regenerate with AI/ }));

    expect(await screen.findByDisplayValue('Ella Hike')).toBeInTheDocument();
  });

  it('a rejected generateItineraryPreview call shows the AI error banner and leaves the manual "Add Day 1" path usable', async () => {
    const user = userEvent.setup();
    generateItineraryPreviewMock.mockRejectedValue(new Error('AI generation failed'));
    renderContainer();

    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByPlaceholderText('Select start date'));
    await openStep2Calendar(user);
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_A)));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_B)));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    await user.click(screen.getByRole('button', { name: /Generate itinerary with AI/ }));

    expect(await screen.findByText('AI generation failed')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add Day 1' }));
    expect(screen.getByText(/Day 1 of 5/)).toBeInTheDocument();
  });

  it('Step 1 still defaults to "Enter manually" active with the existing destination selector visible', () => {
    renderContainer();
    expect(screen.getByRole('button', { name: 'Enter manually' })).toBeInTheDocument();
    expect(screen.getByText('Choose your destination...')).toBeInTheDocument();
  });

  it('clicking "Chat with AI" hides the destination selector and shows the chat greeting + input', async () => {
    const user = userEvent.setup();
    renderContainer();

    await user.click(screen.getByRole('button', { name: /Chat with AI/ }));

    expect(screen.queryByText('Choose your destination...')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tell us about your trip...')).toBeInTheDocument();
  });

  it('typing a message and sending it calls sendItineraryChatMessage and renders the mocked reply', async () => {
    sendItineraryChatMessageMock.mockResolvedValue({ reply: 'How long is your trip?', slots: {}, readyToGenerate: false });
    const user = userEvent.setup();
    renderContainer();

    await user.click(screen.getByRole('button', { name: /Chat with AI/ }));
    const input = screen.getByPlaceholderText('Tell us about your trip...');
    await user.type(input, 'A trip to Kandy');
    await user.click(input.parentElement!.querySelector('button') as HTMLButtonElement);

    expect(sendItineraryChatMessageMock).toHaveBeenCalledWith({
      messages: [{ role: 'user', content: 'A trip to Kandy' }],
      slots: {},
    });
    expect(await screen.findByText('How long is your trip?')).toBeInTheDocument();
  });

  it('completing the chat and inline calendar advances directly to Step 3 with the AI-generated day visible', async () => {
    sendItineraryChatMessageMock.mockResolvedValue({
      reply: 'Sounds great!',
      slots: { destination: 'Bali', duration: 5 },
      readyToGenerate: true,
    });
    generateItineraryPreviewMock.mockResolvedValue({
      days: [{ dayNumber: 1, title: 'Ella Hike', locations: ['Ella'], activities: ['Nine Arch Bridge'] }],
    });
    const user = userEvent.setup();
    renderContainer();

    await user.click(screen.getByRole('button', { name: /Chat with AI/ }));
    const input = screen.getByPlaceholderText('Tell us about your trip...');
    await user.type(input, '5 days in Bali');
    await user.click(input.parentElement!.querySelector('button') as HTMLButtonElement);
    await screen.findByText(/Sounds like a 5-day trip to Bali!/);

    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_A)));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_B)));

    expect(generateItineraryPreviewMock).toHaveBeenCalledWith({
      destination: 'Bali',
      duration: 5,
      travelers: undefined,
      preferences: undefined,
    });
    expect(await screen.findByText('Plan Your Itinerary')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ella Hike')).toBeInTheDocument();
  });

  it('a rejected sendItineraryChatMessage shows the error banner with a working Retry button and never calls generateItineraryPreview', async () => {
    sendItineraryChatMessageMock.mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    renderContainer();

    await user.click(screen.getByRole('button', { name: /Chat with AI/ }));
    const input = screen.getByPlaceholderText('Tell us about your trip...');
    await user.type(input, 'Hi');
    await user.click(input.parentElement!.querySelector('button') as HTMLButtonElement);

    expect(await screen.findByText('offline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(generateItineraryPreviewMock).not.toHaveBeenCalled();
  });

  it('clicking the sparkle button on a day regenerates only that day, leaving other days untouched', async () => {
    const user = userEvent.setup();
    renderContainer();

    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByPlaceholderText('Select start date'));
    await openStep2Calendar(user);
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_A)));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_B)));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    // Add two days manually; handleAddDay navigates to the newly added day.
    await user.click(screen.getByRole('button', { name: 'Add Day 1' }));
    await user.click(screen.getByRole('button', { name: 'Add Day 2' }));
    const day2Title = screen.getByPlaceholderText(/e\.g\., Arrival in/);
    await user.clear(day2Title);
    await user.type(day2Title, 'Manual Day 2');

    // Navigate back to day 1 and regenerate just that day.
    await user.click(screen.getByRole('button', { name: /Previous/ }));
    expect(screen.getByText(/Day 1 of 2/)).toBeInTheDocument();

    generateDayPreviewMock.mockResolvedValue({
      day: { dayNumber: 1, title: 'AI Day 1', locations: ['Ubud'], activities: ['Temple visit'] },
    });
    await user.click(screen.getByRole('button', { name: 'Regenerate day 1' }));

    expect(generateDayPreviewMock).toHaveBeenCalledWith({
      destination: 'Bali, Indonesia',
      dayNumber: 1,
      totalDuration: 5,
      travelers: 2,
      preferences: undefined,
      existingDays: [
        { dayNumber: 1, title: 'Day 1', locations: [], activities: [] },
        { dayNumber: 2, title: 'Manual Day 2', locations: [], activities: [] },
      ],
    });
    expect(await screen.findByDisplayValue('AI Day 1')).toBeInTheDocument();

    // Day 2's manual edit survives the day-1-only regeneration. Scope to the
    // day-nav container: the page also has an unrelated step-Next button
    // with the same accessible name.
    const dayNavContainer = screen.getByRole('button', { name: /Previous/ }).closest('div') as HTMLElement;
    await user.click(within(dayNavContainer).getByRole('button', { name: /Next/ }));
    expect(screen.getByDisplayValue('Manual Day 2')).toBeInTheDocument();
  });

  it('after a per-day regeneration, clicking Undo in the toast restores the day\'s prior content', async () => {
    const user = userEvent.setup();
    renderContainer();

    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByPlaceholderText('Select start date'));
    await openStep2Calendar(user);
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_A)));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_B)));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    await user.click(screen.getByRole('button', { name: 'Add Day 1' }));

    generateDayPreviewMock.mockResolvedValue({
      day: { dayNumber: 1, title: 'AI Day 1', locations: ['Ubud'], activities: ['Temple visit'] },
    });
    await user.click(screen.getByRole('button', { name: 'Regenerate day 1' }));
    expect(await screen.findByDisplayValue('AI Day 1')).toBeInTheDocument();

    expect(screen.getByText('Day 1 regenerated')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.getByDisplayValue('Day 1')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('AI Day 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Day 1 regenerated')).not.toBeInTheDocument();
  });

  it('clicking "Generate remaining days with AI" fills every unplanned day and keeps the manually-added day', async () => {
    const user = userEvent.setup();
    renderContainer();

    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByPlaceholderText('Select start date'));
    await openStep2Calendar(user);
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_A)));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_B)));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    await user.click(screen.getByRole('button', { name: 'Add Day 1' }));

    generateDaysRangePreviewMock.mockResolvedValue({
      days: [
        { dayNumber: 2, title: 'Ubud', locations: [], activities: [] },
        { dayNumber: 3, title: 'Waterfalls', locations: [], activities: [] },
        { dayNumber: 4, title: 'Beach', locations: [], activities: [] },
        { dayNumber: 5, title: 'Departure', locations: [], activities: [] },
      ],
    });

    await user.click(screen.getByRole('button', { name: /Generate remaining 4 days with AI/ }));

    expect(generateDaysRangePreviewMock).toHaveBeenCalledWith({
      destination: 'Bali, Indonesia',
      dayNumbers: [2, 3, 4, 5],
      totalDuration: 5,
      travelers: 2,
      preferences: undefined,
      existingDays: [{ dayNumber: 1, title: 'Day 1', locations: [], activities: [] }],
    });

    expect(await screen.findByText('✓ All 5 days have been added to your itinerary')).toBeInTheDocument();
  });

  it('after a bulk-fill, clicking Undo in the toast removes exactly the newly-generated days', async () => {
    const user = userEvent.setup();
    renderContainer();

    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByPlaceholderText('Select start date'));
    await openStep2Calendar(user);
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_A)));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_B)));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    await user.click(screen.getByRole('button', { name: 'Add Day 1' }));

    generateDaysRangePreviewMock.mockResolvedValue({
      days: [
        { dayNumber: 2, title: 'Ubud', locations: [], activities: [] },
        { dayNumber: 3, title: 'Waterfalls', locations: [], activities: [] },
        { dayNumber: 4, title: 'Beach', locations: [], activities: [] },
        { dayNumber: 5, title: 'Departure', locations: [], activities: [] },
      ],
    });
    await user.click(screen.getByRole('button', { name: /Generate remaining 4 days with AI/ }));
    await screen.findByText('✓ All 5 days have been added to your itinerary');

    expect(screen.getByText('4 days generated')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.queryByText('✓ All 5 days have been added to your itinerary')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate remaining 4 days with AI/ })).toBeInTheDocument();
  });

  it('removing a pre-existing manual day during the toast window never leaves AI content mislabeled — Undo fully restores the pre-fill snapshot', async () => {
    // Regression test: dayNumber-keyed undo used to filter the CURRENT array
    // by the original requested day numbers. Once handleRemoveDay renumbers
    // everything after a manual delete, a surviving AI-generated day can
    // shift onto a number outside that filter and survive undo mislabeled,
    // while an unrelated manual day is gone for good. Snapshot-based undo
    // must restore the exact pre-fill state (both manual days, no AI content)
    // regardless of what was removed in between.
    const user = userEvent.setup();
    renderContainer();

    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByPlaceholderText('Select start date'));
    await openStep2Calendar(user);
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_A)));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_B)));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    // Two pre-existing manual days.
    await user.click(screen.getByRole('button', { name: 'Add Day 1' }));
    await user.click(screen.getByRole('button', { name: 'Add Day 2' }));

    generateDaysRangePreviewMock.mockResolvedValue({
      days: [
        { dayNumber: 3, title: 'Waterfalls', locations: [], activities: [] },
        { dayNumber: 4, title: 'Beach', locations: [], activities: [] },
        { dayNumber: 5, title: 'Departure', locations: [], activities: [] },
      ],
    });
    await user.click(screen.getByRole('button', { name: /Generate remaining 3 days with AI/ }));
    await screen.findByText('✓ All 5 days have been added to your itinerary');

    // Remove day 2 (the second manual day) inside the still-open 6s toast
    // window — this renumbers days 3,4,5 down to 2,3,4, shifting the
    // AI-generated "Waterfalls" day onto number 2.
    await user.click(screen.getByRole('button', { name: 'Remove this day' }));

    await user.click(screen.getByRole('button', { name: 'Undo' }));

    // Fully reverted: both original manual days back, no AI content
    // survives mislabeled, and the bulk CTA re-offers the same 3 days.
    expect(screen.getByDisplayValue('Day 2')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Waterfalls')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate remaining 3 days with AI/ })).toBeInTheDocument();
  });

  it('a rejected per-day regeneration shows the per-day error banner and leaves the day content untouched', async () => {
    const user = userEvent.setup();
    renderContainer();

    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByPlaceholderText('Select start date'));
    await openStep2Calendar(user);
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_A)));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_B)));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: 'Add Day 1' }));

    generateDayPreviewMock.mockRejectedValue(new Error('Network Error'));
    await user.click(screen.getByRole('button', { name: 'Regenerate day 1' }));

    expect(await screen.findByText('Network Error')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Day 1')).toBeInTheDocument();
    expect(screen.queryByText('Day 1 regenerated')).not.toBeInTheDocument();
  });

  it('a partial bulk-fill shows the "N of M days generated" note and the CTA re-shows for the rest', async () => {
    const user = userEvent.setup();
    renderContainer();

    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByPlaceholderText('Select start date'));
    await openStep2Calendar(user);
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_A)));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_B)));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: 'Add Day 1' }));

    generateDaysRangePreviewMock.mockResolvedValue({
      days: [{ dayNumber: 2, title: 'Ubud', locations: [], activities: [] }],
    });
    await user.click(screen.getByRole('button', { name: /Generate remaining 4 days with AI/ }));

    expect(await screen.findByText('1 of 4 days generated. Click again to fill the rest.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate remaining 3 days with AI/ })).toBeInTheDocument();
  });

  it('while a per-day regeneration is in flight, the whole-trip regenerate and Add Day buttons are disabled', async () => {
    const user = userEvent.setup();
    let resolveGenerate: (value: { day: { dayNumber: number; title: string; locations: string[]; activities: string[] } }) => void = () => {};
    // Executor form (not Promise.withResolvers) — this project's tsconfig
    // targets ES2020/lib ES2020, which predates withResolvers.
    generateDayPreviewMock.mockReturnValue(new Promise((resolve) => { resolveGenerate = resolve; }));
    renderContainer();

    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByPlaceholderText('Select start date'));
    await openStep2Calendar(user);
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_A)));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_B)));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: 'Add Day 1' }));

    await user.click(screen.getByRole('button', { name: 'Regenerate day 1' }));

    expect(screen.getByRole('button', { name: /Regenerate with AI/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Add Day 2/ })).toBeDisabled();

    await act(async () => {
      resolveGenerate({ day: { dayNumber: 1, title: 'AI Day 1', locations: [], activities: [] } });
      await Promise.resolve();
    });
  });

  it('renders the shared Stepper above the manual flow with the four wizard steps', () => {
    renderContainer();
    const progress = screen.getByRole('list', { name: 'Progress' });
    for (const label of ['Destination', 'Dates & Travelers', 'Plan Itinerary', 'Contact Info']) {
      expect(within(progress).getByText(label)).toBeInTheDocument();
    }
    // Step 1 is active and renders its number (no check mark yet).
    const activeStep = within(progress).getByText('Destination').closest('li') as HTMLElement;
    expect(activeStep).toHaveAttribute('aria-current', 'step');
    expect(within(activeStep).getByText('1')).toBeInTheDocument();
  });

  it('writes ?step= on forward and back transitions and reads it on deep-link mount', async () => {
    const user = userEvent.setup();
    const { router } = renderWithRouter('/planner');
    expect(router.state.location.search).toBe('');

    // Forward: step 1 → 2.
    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(router.state.location.search).toBe('?step=2');
    expect(screen.getByRole('heading', { name: 'When & How Many?' })).toBeInTheDocument();

    // Back button: step 2 → 1 (URL follows).
    await user.click(screen.getByRole('button', { name: /Back/ }));
    expect(router.state.location.search).toBe('?step=1');
    expect(screen.getByRole('heading', { name: 'Where do you want to go?' })).toBeInTheDocument();
  });

  it('restores the correct step content on browser back/forward through ?step= history', async () => {
    const user = userEvent.setup();
    const { router } = renderWithRouter('/planner');

    // Real UI transitions to step 3 (each pushes a distinct ?step= entry).
    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByPlaceholderText('Select start date'));
    await openStep2Calendar(user);
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_A)));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_B)));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(router.state.location.search).toBe('?step=3');
    expect(screen.getByRole('heading', { name: 'Plan Your Itinerary' })).toBeInTheDocument();

    // Back to step 2: URL pops AND the step-2 content (with the previously
    // entered dates still in the fields) is what renders — not just a state
    // variable flip.
    await act(async () => {
      router.navigate(-1);
    });
    expect(router.state.location.search).toBe('?step=2');
    expect(screen.getByRole('heading', { name: 'When & How Many?' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Select start date')).toHaveValue(currentMonthDay(CURRENT_MONTH_DAY_A));
    expect(screen.getByPlaceholderText('Select end date')).toHaveValue(currentMonthDay(CURRENT_MONTH_DAY_B));

    // Back to step 1 — the pre-step-2 URL is the bare initial entry (no
    // ?step= written on mount), which still renders step 1's content.
    await act(async () => {
      router.navigate(-1);
    });
    expect(router.state.location.search).toBe('');
    expect(screen.getByRole('heading', { name: 'Where do you want to go?' })).toBeInTheDocument();

    // Forward again returns to step 2 with its content.
    await act(async () => {
      router.navigate(1);
    });
    expect(router.state.location.search).toBe('?step=2');
    expect(screen.getByRole('heading', { name: 'When & How Many?' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Select start date')).toHaveValue(currentMonthDay(CURRENT_MONTH_DAY_A));
  });

  it('mounts on a deep-linked ?step= and clamps out-of-range or invalid values', () => {
    const { unmount } = renderWithRouter('/planner?step=3');
    expect(screen.getByRole('heading', { name: 'Plan Your Itinerary' })).toBeInTheDocument();
    unmount();

    // Clamp above range → step 4.
    const { unmount: unmountStep4 } = renderWithRouter('/planner?step=9');
    expect(screen.getByRole('heading', { name: 'Your Contact Details' })).toBeInTheDocument();
    unmountStep4();

    // Non-numeric → default to step 1.
    const { unmount: unmountDefault } = renderWithRouter('/planner?step=abc');
    expect(screen.getByRole('heading', { name: 'Where do you want to go?' })).toBeInTheDocument();
    unmountDefault();
  });

  const loggedInUser = { id: 'u1', name: 'Traveller', email: 'travel@example.com', phone: null };
  const makeBooking = (overrides: Record<string, unknown> = {}) => ({
    id: 'b1',
    createdAt: isoDaysFromToday(-3),
    travelDate: isoDaysFromToday(30),
    endDate: isoDaysFromToday(35),
    numberOfTravelers: 3,
    packageDestination: 'Bali',
    ...overrides,
  });

  it('pre-fills destination, dates and travelers from the most recent booking of a logged-in visitor', async () => {
    const user = userEvent.setup();
    mocks.useAuth.mockReturnValue({ user: loggedInUser });
    // Older booking (Sri Lanka) must lose to the more recent one (Bali).
    fetchUserBookingsMock.mockResolvedValue([
      makeBooking({ id: 'b-old', createdAt: isoDaysFromToday(-60), packageDestination: 'Sri Lanka' }),
      makeBooking({ id: 'b-new' }),
    ]);

    renderContainer();

    // Step 1 shows the prefilled destination, ready to edit.
    expect(await screen.findByText('Destination selected')).toBeInTheDocument();
    expect(screen.getAllByText('Bali, Indonesia').length).toBeGreaterThan(0);
    expect(screen.queryByText('Sri Lanka')).not.toBeInTheDocument();

    // Step 2 shows the prefilled future dates + traveler count, no errors.
    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(screen.getByPlaceholderText('Select start date')).toHaveValue(isoDaysFromToday(30));
    expect(screen.getByPlaceholderText('Select end date')).toHaveValue(isoDaysFromToday(35));
    expect(screen.getByText('5 Days / 4 Nights')).toBeInTheDocument();
    expect(screen.queryByText(/cannot be in the past/i)).not.toBeInTheDocument();
    expect(fetchUserBookingsMock).toHaveBeenCalledTimes(1);
  });

  it('fails silently to the empty defaults when the pre-fill request rejects', async () => {
    mocks.useAuth.mockReturnValue({ user: loggedInUser });
    fetchUserBookingsMock.mockRejectedValue(new Error('offline'));

    renderContainer();

    expect(screen.getByRole('heading', { name: 'Where do you want to go?' })).toBeInTheDocument();
    expect(await screen.findByText('Choose your destination...')).toBeInTheDocument();
    // No error banner for a convenience pre-fill, and nothing was chosen.
    expect(screen.queryByText('Destination selected')).not.toBeInTheDocument();
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
    expect(fetchUserBookingsMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the empty defaults when the visitor has no bookings', async () => {
    mocks.useAuth.mockReturnValue({ user: loggedInUser });
    fetchUserBookingsMock.mockResolvedValue([]);

    renderContainer();

    expect(await screen.findByText('Choose your destination...')).toBeInTheDocument();
    expect(screen.queryByText('Destination selected')).not.toBeInTheDocument();
    expect(fetchUserBookingsMock).toHaveBeenCalledTimes(1);
  });

  it('never overwrites a destination the visitor already chose when the pre-fill resolves later', async () => {
    type Bookings = Awaited<ReturnType<typeof fetchUserBookings>>;
    let resolveFetch: (bookings: Bookings) => void = () => {};
    fetchUserBookingsMock.mockReturnValue(new Promise<Bookings>((resolve) => { resolveFetch = resolve; }));
    mocks.useAuth.mockReturnValue({ user: loggedInUser });
    const user = userEvent.setup();

    renderContainer();

    // The visitor picks Bali before the slow pre-fill returns (Sri Lanka).
    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    await act(async () => {
      resolveFetch([makeBooking({ packageDestination: 'Sri Lanka' })]);
      await Promise.resolve();
    });

    expect(screen.getByText('Destination selected')).toBeInTheDocument();
    expect(screen.getAllByText('Bali, Indonesia').length).toBeGreaterThan(0);
    expect(screen.queryByText('Sri Lanka')).not.toBeInTheDocument();
  });

  it('shows inline per-field past-date errors for a prefilled past trip and blocks Next', async () => {
    const user = userEvent.setup();
    mocks.useAuth.mockReturnValue({ user: loggedInUser });
    fetchUserBookingsMock.mockResolvedValue([
      makeBooking({ travelDate: isoDaysFromToday(-20), endDate: isoDaysFromToday(-15), numberOfTravelers: 2 }),
    ]);

    renderContainer();
    await user.click(await screen.findByRole('button', { name: /Next/ }));

    expect(screen.getByText('Start date cannot be in the past.')).toBeInTheDocument();
    expect(screen.getByText('End date cannot be in the past.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled();
  });

  it('shows the inline "window too long" error for a >90-day trip and blocks Next', async () => {
    const user = userEvent.setup();
    mocks.useAuth.mockReturnValue({ user: loggedInUser });
    fetchUserBookingsMock.mockResolvedValue([
      makeBooking({ travelDate: isoDaysFromToday(10), endDate: isoDaysFromToday(110), numberOfTravelers: 2 }),
    ]);

    renderContainer();
    await user.click(await screen.findByRole('button', { name: /Next/ }));

    expect(screen.getByText('Trip length cannot exceed 90 days.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled();
  });

  it('offers a "Continue with manual entry" action when whole-trip AI generation fails on the empty state', async () => {
    const user = userEvent.setup();
    generateItineraryPreviewMock.mockRejectedValue(new Error('AI generation failed'));
    renderContainer();

    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByPlaceholderText('Select start date'));
    await openStep2Calendar(user);
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_A)));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_B)));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    await user.click(screen.getByRole('button', { name: /Generate itinerary with AI/ }));
    expect(await screen.findByText('AI generation failed')).toBeInTheDocument();

    // The failure affordance drops the visitor onto the manual day form of
    // this same step — no progress reset, no AI retry required.
    await user.click(screen.getByRole('button', { name: /Continue with manual entry/ }));
    expect(screen.getByRole('heading', { name: 'Plan Your Itinerary' })).toBeInTheDocument();
    expect(screen.getByText(/Day 1 of 5/)).toBeInTheDocument();
  });

  it('keeps the manual "Add Day 1" path usable next to the new failure affordance', async () => {
    const user = userEvent.setup();
    generateItineraryPreviewMock.mockRejectedValue(new Error('AI generation failed'));
    renderContainer();

    await user.click(screen.getByText('Choose your destination...'));
    await user.click(screen.getByRole('button', { name: 'Bali, Indonesia' }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByPlaceholderText('Select start date'));
    await openStep2Calendar(user);
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_A)));
    await user.click(screen.getByText(String(CURRENT_MONTH_DAY_B)));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    await user.click(screen.getByRole('button', { name: /Generate itinerary with AI/ }));
    await screen.findByText('AI generation failed');

    await user.click(screen.getByRole('button', { name: 'Add Day 1' }));
    expect(screen.getByText(/Day 1 of 5/)).toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomizePackageContainer from '../CustomizePackageContainer';
import { fetchPackageById } from '../../../services/api/packages';
import { submitCustomizationRequest } from '../../../services/api/customization';
import { normalizePackage } from '../../../services/api/packages.transform';
import { generateItineraryPreview } from '../../../services/api/aiItinerary';
import { generateDayPreview, generateDaysRangePreview } from '../../../services/api/aiDayGeneration';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useNavigate: vi.fn(),
  useLocation: vi.fn(),
  swalFire: vi.fn(),
}));

vi.mock('../../../services/api/packages', () => ({
  fetchPackageById: vi.fn(),
}));

vi.mock('../../../services/api/customization', () => ({
  submitCustomizationRequest: vi.fn(),
}));

vi.mock('../../../services/api/aiItinerary', () => ({
  generateItineraryPreview: vi.fn(),
}));

vi.mock('../../../services/api/aiDayGeneration', () => ({
  generateDayPreview: vi.fn(),
  generateDaysRangePreview: vi.fn(),
}));

vi.mock('sweetalert2', () => ({
  default: { fire: mocks.swalFire },
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: mocks.useAuth,
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'pkg-123' }),
  useNavigate: () => mocks.useNavigate(),
  useLocation: () => mocks.useLocation(),
}));

const fetchPackageByIdMock = vi.mocked(fetchPackageById);
const submitCustomizationRequestMock = vi.mocked(submitCustomizationRequest);
const generateItineraryPreviewMock = vi.mocked(generateItineraryPreview);
const generateDayPreviewMock = vi.mocked(generateDayPreview);
const generateDaysRangePreviewMock = vi.mocked(generateDaysRangePreview);

const rawPackage = {
  _id: 'pkg-123',
  title: 'Sri Lanka Highlights',
  description: 'A 7-day tour across Sri Lanka',
  destination: 'Sri Lanka',
  durationDays: 7,
  sellPrice: 1299,
  images: [{ url: 'https://example.com/sri-lanka.jpg' }],
  itineraryDays: [
    {
      dayNumber: 1,
      title: 'Day 1',
      description: 'Arrival in Colombo',
      activities: [{ activity: { name: 'Beach' } }],
      places: [{ place: { name: 'Colombo' } }],
    },
  ],
};

beforeEach(() => {
  mocks.useAuth.mockReturnValue({ user: null });
  mocks.useNavigate.mockReturnValue(vi.fn());
  mocks.useLocation.mockReturnValue({ state: null });
  mocks.swalFire.mockReset();
  fetchPackageByIdMock.mockReset();
  fetchPackageByIdMock.mockResolvedValue(normalizePackage(rawPackage));
  submitCustomizationRequestMock.mockReset();
  submitCustomizationRequestMock.mockResolvedValue({ customizedPackageId: 'cp-1', leadId: 'lead-1' });
  generateItineraryPreviewMock.mockReset();
  generateDayPreviewMock.mockReset();
  generateDaysRangePreviewMock.mockReset();
});


describe('CustomizePackageContainer', () => {
  it('shows a loading state, then renders the package customization form', async () => {
    render(<CustomizePackageContainer />);

    expect(screen.getByText('Preparing customization experience...')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Sri Lanka Highlights' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Tailored Journey Request')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Next/ }),
    ).toBeInTheDocument();
  });

  it('prefills travelers and preferences from wizard navigation state, and submits them', async () => {
    mocks.useLocation.mockReturnValue({ state: { travelers: 4, preferences: 'love hiking' } });
    const user = userEvent.setup();
    render(<CustomizePackageContainer />);
    await screen.findByRole('heading', { name: 'Sri Lanka Highlights' });

    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'tester@example.com');
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));

    expect(submitCustomizationRequestMock).toHaveBeenCalledWith(expect.objectContaining({
      travelers: 4,
      message: 'love hiking',
    }));
  });

  it('submits the exact expected payload after stepping through the form', async () => {
    const user = userEvent.setup();
    render(<CustomizePackageContainer />);
    await screen.findByRole('heading', { name: 'Sri Lanka Highlights' });

    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'tester@example.com');
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    expect(screen.getByText('Review & Submit')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));

    expect(submitCustomizationRequestMock).toHaveBeenCalledTimes(1);
    expect(submitCustomizationRequestMock).toHaveBeenCalledWith({
      packageId: 'pkg-123',
      name: '',
      email: 'tester@example.com',
      phone: '',
      travelers: 2,
      travelDate: undefined,
      message: '',
      overrides: {
        days: [
          { dayNumber: 1, activities: ['Beach'], locations: ['Colombo'] },
        ],
      },
    });
    expect(await screen.findByText('Thank you!')).toBeInTheDocument();
  });

  it('shows the error state when the package cannot be loaded', async () => {
    fetchPackageByIdMock.mockRejectedValue(new Error('Package not found'));
    render(<CustomizePackageContainer />);

    expect(
      await screen.findByText('Unable to Customize Package'),
    ).toBeInTheDocument();
    expect(screen.getByText('Package not found')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Browse other packages' }),
    ).toBeInTheDocument();
    expect(submitCustomizationRequestMock).not.toHaveBeenCalled();
  });

  it('clicking "Regenerate with AI" shows the confirm dialog — canceling leaves the existing day untouched', async () => {
    const user = userEvent.setup();
    render(<CustomizePackageContainer />);
    await screen.findByRole('heading', { name: 'Sri Lanka Highlights' });

    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'tester@example.com');
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    expect(screen.getByText('Day 1')).toBeInTheDocument();

    mocks.swalFire.mockResolvedValue({ isConfirmed: false });
    await user.click(screen.getByRole('button', { name: /Regenerate with AI/ }));

    expect(mocks.swalFire).toHaveBeenCalledTimes(1);
    expect(generateItineraryPreviewMock).not.toHaveBeenCalled();
    expect(screen.getByText('Day 1')).toBeInTheDocument();
  });

  it('confirming "Regenerate with AI" calls the API with the package-derived params and replaces the day cards', async () => {
    const user = userEvent.setup();
    mocks.swalFire.mockResolvedValue({ isConfirmed: true });
    generateItineraryPreviewMock.mockResolvedValue({
      days: [{ dayNumber: 1, title: 'Ella Hike', locations: ['Ella'], activities: ['Nine Arch Bridge'] }],
    });
    render(<CustomizePackageContainer />);
    await screen.findByRole('heading', { name: 'Sri Lanka Highlights' });

    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'tester@example.com');
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    await user.click(screen.getByRole('button', { name: /Regenerate with AI/ }));

    expect(generateItineraryPreviewMock).toHaveBeenCalledWith({
      destination: 'Sri Lanka',
      duration: 7,
      travelers: 2,
      preferences: undefined,
    });
    expect(await screen.findByText('Ella Hike')).toBeInTheDocument();
  });

  it('a rejected generateItineraryPreview call shows the AI error banner and leaves "Add Day" usable', async () => {
    const user = userEvent.setup();
    mocks.swalFire.mockResolvedValue({ isConfirmed: true });
    generateItineraryPreviewMock.mockRejectedValue(new Error('AI generation failed'));
    render(<CustomizePackageContainer />);
    await screen.findByRole('heading', { name: 'Sri Lanka Highlights' });

    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'tester@example.com');
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    await user.click(screen.getByRole('button', { name: /Regenerate with AI/ }));

    expect(await screen.findByText('AI generation failed')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add Day' }));
    expect(screen.getByText('Day 2')).toBeInTheDocument();
  });

  it("handleSubmit's overrides.days mapping (dayNumber, activities, locations only) is unchanged for AI-populated days", async () => {
    const user = userEvent.setup();
    mocks.swalFire.mockResolvedValue({ isConfirmed: true });
    generateItineraryPreviewMock.mockResolvedValue({
      days: [{ dayNumber: 1, title: 'Ella Hike', description: 'A scenic hike', locations: ['Ella'], activities: ['Nine Arch Bridge'] }],
    });
    render(<CustomizePackageContainer />);
    await screen.findByRole('heading', { name: 'Sri Lanka Highlights' });

    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'tester@example.com');
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Regenerate with AI/ }));
    await screen.findByText('Ella Hike');

    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));

    expect(submitCustomizationRequestMock).toHaveBeenCalledTimes(1);
    expect(submitCustomizationRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        overrides: {
          days: [{ dayNumber: 1, activities: ['Nine Arch Bridge'], locations: ['Ella'] }],
        },
      }),
    );
  });

  it('clicking the sparkle button on a day regenerates only that day, leaving other days untouched through submit', async () => {
    const user = userEvent.setup();
    render(<CustomizePackageContainer />);
    await screen.findByRole('heading', { name: 'Sri Lanka Highlights' });

    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'tester@example.com');
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    expect(screen.getByText('Day 1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add Day' }));
    expect(screen.getByText('Day 2')).toBeInTheDocument();

    generateDayPreviewMock.mockResolvedValue({
      day: { dayNumber: 1, title: 'AI Colombo Day', locations: ['Galle Face'], activities: ['Sunset walk'] },
    });
    await user.click(screen.getByRole('button', { name: 'Regenerate day 1' }));

    expect(generateDayPreviewMock).toHaveBeenCalledWith({
      destination: 'Sri Lanka',
      dayNumber: 1,
      totalDuration: 7,
      travelers: 2,
      preferences: undefined,
      existingDays: [
        { dayNumber: 1, title: 'Day 1', locations: ['Colombo'], activities: ['Beach'] },
        { dayNumber: 2, title: 'Day 2', locations: [], activities: [] },
      ],
    });
    expect(await screen.findByText('AI Colombo Day')).toBeInTheDocument();

    // Day 2 survives the day-1-only regeneration untouched — prove it via
    // the final submit payload (dayNumber 2, still blank, still present).
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));

    expect(submitCustomizationRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        overrides: {
          days: [
            { dayNumber: 1, activities: ['Sunset walk'], locations: ['Galle Face'] },
            { dayNumber: 2, activities: [], locations: [] },
          ],
        },
      }),
    );
  });

  it('clicking "Generate remaining days with AI" fills every unplanned day up to the package duration', async () => {
    const user = userEvent.setup();
    render(<CustomizePackageContainer />);
    await screen.findByRole('heading', { name: 'Sri Lanka Highlights' });

    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'tester@example.com');
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    generateDaysRangePreviewMock.mockResolvedValue({
      days: [2, 3, 4, 5, 6, 7].map((dayNumber) => ({
        dayNumber,
        title: `AI Day ${dayNumber}`,
        locations: [],
        activities: [],
      })),
    });

    await user.click(screen.getByRole('button', { name: /Generate remaining 6 days with AI/ }));

    expect(generateDaysRangePreviewMock).toHaveBeenCalledWith({
      destination: 'Sri Lanka',
      dayNumbers: [2, 3, 4, 5, 6, 7],
      totalDuration: 7,
      travelers: 2,
      preferences: undefined,
      existingDays: [{ dayNumber: 1, title: 'Day 1', locations: ['Colombo'], activities: ['Beach'] }],
    });

    expect(await screen.findByText('AI Day 7')).toBeInTheDocument();
    expect(screen.getByText('Day 7')).toBeInTheDocument();
    expect(screen.queryByText(/Generate remaining/)).not.toBeInTheDocument();
  });

  it('after a per-day regeneration, clicking Undo in the toast restores the day\'s prior content', async () => {
    const user = userEvent.setup();
    render(<CustomizePackageContainer />);
    await screen.findByRole('heading', { name: 'Sri Lanka Highlights' });

    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'tester@example.com');
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    generateDayPreviewMock.mockResolvedValue({
      day: { dayNumber: 1, title: 'AI Colombo Day', locations: ['Galle Face'], activities: ['Sunset walk'] },
    });
    await user.click(screen.getByRole('button', { name: 'Regenerate day 1' }));
    expect(await screen.findByText('AI Colombo Day')).toBeInTheDocument();
    expect(screen.getByText('Day 1 regenerated')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.queryByText('AI Colombo Day')).not.toBeInTheDocument();
    expect(screen.queryByText('Day 1 regenerated')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));

    expect(submitCustomizationRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        overrides: { days: [{ dayNumber: 1, activities: ['Beach'], locations: ['Colombo'] }] },
      }),
    );
  });

  it('after a bulk-fill, clicking Undo in the toast removes exactly the newly-generated days', async () => {
    const user = userEvent.setup();
    render(<CustomizePackageContainer />);
    await screen.findByRole('heading', { name: 'Sri Lanka Highlights' });

    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'tester@example.com');
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    generateDaysRangePreviewMock.mockResolvedValue({
      days: [2, 3, 4, 5, 6, 7].map((dayNumber) => ({ dayNumber, title: `AI Day ${dayNumber}`, locations: [], activities: [] })),
    });
    await user.click(screen.getByRole('button', { name: /Generate remaining 6 days with AI/ }));
    await screen.findByText('AI Day 7');
    expect(screen.getByText('6 days generated')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.queryByText('Day 7')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate remaining 6 days with AI/ })).toBeInTheDocument();
  });

  it('a rejected per-day regeneration shows the per-day error banner and leaves the day content untouched', async () => {
    const user = userEvent.setup();
    render(<CustomizePackageContainer />);
    await screen.findByRole('heading', { name: 'Sri Lanka Highlights' });

    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'tester@example.com');
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    generateDayPreviewMock.mockRejectedValue(new Error('Network Error'));
    await user.click(screen.getByRole('button', { name: 'Regenerate day 1' }));

    expect(await screen.findByText('Network Error')).toBeInTheDocument();
    expect(screen.queryByText('AI Colombo Day')).not.toBeInTheDocument();
    expect(screen.queryByText('Day 1 regenerated')).not.toBeInTheDocument();
  });

  it('a partial bulk-fill shows the "N of M days generated" note and the CTA re-shows for the rest', async () => {
    const user = userEvent.setup();
    render(<CustomizePackageContainer />);
    await screen.findByRole('heading', { name: 'Sri Lanka Highlights' });

    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'tester@example.com');
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    generateDaysRangePreviewMock.mockResolvedValue({
      days: [{ dayNumber: 2, title: 'Ubud', locations: [], activities: [] }],
    });
    await user.click(screen.getByRole('button', { name: /Generate remaining 6 days with AI/ }));

    expect(await screen.findByText('1 of 6 days generated. Click again to fill the rest.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate remaining 5 days with AI/ })).toBeInTheDocument();
  });

  it('while a per-day regeneration is in flight, the whole-trip regenerate and Add Day buttons are disabled', async () => {
    const user = userEvent.setup();
    let resolveGenerate: (value: { day: { dayNumber: number; title: string; locations: string[]; activities: string[] } }) => void = () => {};
    // Executor form (not Promise.withResolvers) — this project's tsconfig
    // targets ES2020/lib ES2020, which predates withResolvers.
    generateDayPreviewMock.mockReturnValue(new Promise((resolve) => { resolveGenerate = resolve; }));
    render(<CustomizePackageContainer />);
    await screen.findByRole('heading', { name: 'Sri Lanka Highlights' });

    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'tester@example.com');
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));

    await user.click(screen.getByRole('button', { name: 'Regenerate day 1' }));

    expect(screen.getByRole('button', { name: /Regenerate with AI/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add Day' })).toBeDisabled();

    await act(async () => {
      resolveGenerate({ day: { dayNumber: 1, title: 'AI Colombo Day', locations: [], activities: [] } });
      await Promise.resolve();
    });
  });
});

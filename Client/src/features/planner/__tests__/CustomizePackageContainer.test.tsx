import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
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
  Link: ({ to, children, className }: { to: string; children?: ReactNode; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
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

  it('renders the shared Stepper with the five funnel step labels', async () => {
    render(<CustomizePackageContainer />);
    await screen.findByRole('heading', { name: 'Sri Lanka Highlights' });

    const progress = screen.getByRole('list', { name: 'Progress' });
    for (const label of ['Contact', 'Travel', 'Itinerary', 'Notes', 'Review']) {
      expect(within(progress).getByText(label)).toBeInTheDocument();
    }
    expect(within(progress).getAllByRole('listitem')).toHaveLength(5);
  });

  it('surfaces price clarity, cancellation/deposit terms, and human support at the Review step', async () => {
    const user = userEvent.setup();
    render(<CustomizePackageContainer />);
    await screen.findByRole('heading', { name: 'Sri Lanka Highlights' });

    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'tester@example.com');
    for (let i = 0; i < 4; i += 1) await user.click(screen.getByRole('button', { name: /Next/ }));

    expect(screen.getByText('Good to know before you send')).toBeInTheDocument();

    // (a) Price clarity: per-person starting price, grounded in pkg.price_from
    // (sellPrice 1299 in the fixture) + the site's per-person display convention.
    const priceLine = screen.getByText(/is this package's starting price, shown/);
    expect(priceLine.textContent).toContain('1,299');
    expect(priceLine.textContent).toContain('per person');
    expect(
      screen.getByText(/Taxes and service fees are included in the price shown above/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Submitting this request is free — nothing is charged today/),
    ).toBeInTheDocument();

    // (b) + (c) Cancellation/refund and deposit terms — non-committal about
    // refund specifics (repo copy conflicts), 30% deposit matches both live sources.
    expect(
      screen.getByText(/Cancellation and refund terms apply once your trip is booked/),
    ).toBeInTheDocument();
    expect(screen.getByText(/a 30% deposit secures your trip/)).toBeInTheDocument();

    // (d) Human-support escape hatch on the submit step — sourced from
    // branding.ts (never a hardcoded number) and the /contact route.
    const callLink = screen.getByRole('link', { name: 'Call us' });
    expect(callLink.getAttribute('href')).toBe('tel:+1-800-000-0000');
    const whatsappLink = screen.getByRole('link', { name: 'Chat on WhatsApp' });
    expect(whatsappLink.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/18000000000\?text=/);
    expect(screen.getByRole('link', { name: 'Contact page' }).getAttribute('href')).toBe('/contact');
  });

  it('ignores a second form submit while a request is in flight (double-submit guard)', async () => {
    const user = userEvent.setup();
    const { container } = render(<CustomizePackageContainer />);
    await screen.findByRole('heading', { name: 'Sri Lanka Highlights' });

    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'tester@example.com');
    for (let i = 0; i < 4; i += 1) await user.click(screen.getByRole('button', { name: /Next/ }));

    let resolveSubmit: (value: { customizedPackageId: string; leadId: string; salesRepId?: string | null }) => void = () => {};
    const pendingSubmit = new Promise<{ customizedPackageId: string; leadId: string; salesRepId?: string | null }>(
      (resolve) => { resolveSubmit = resolve; },
    );
    submitCustomizationRequestMock.mockReturnValue(pendingSubmit);

    await user.click(screen.getByRole('button', { name: /Send My Request/ }));
    expect(submitCustomizationRequestMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Creating Your Request/ })).toBeDisabled();

    // A second submit event on the form (not just the disabled button) must be
    // dropped by the in-handler guard, not double-sent.
    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);
    expect(submitCustomizationRequestMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSubmit({ customizedPackageId: 'cp-1', leadId: 'lead-1' });
      await Promise.resolve();
    });
    expect(await screen.findByText('Thank you!')).toBeInTheDocument();
  });

  it('a rejected submit shows the generic failure message and keeps the form data for retry', async () => {
    const user = userEvent.setup();
    render(<CustomizePackageContainer />);
    await screen.findByRole('heading', { name: 'Sri Lanka Highlights' });

    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'tester@example.com');
    for (let i = 0; i < 4; i += 1) await user.click(screen.getByRole('button', { name: /Next/ }));

    submitCustomizationRequestMock.mockRejectedValueOnce(new Error('backend exploded'));
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));

    // Generic copy only — never the raw server error, and never a specific
    // "sold out"/"conflict" claim (the backend has no availability check).
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't complete your request/);
    expect(screen.queryByText(/backend exploded/)).not.toBeInTheDocument();

    // The form data survived the failure: a straight retry resubmits the same
    // email, the error banner clears, and the success state appears.
    submitCustomizationRequestMock.mockResolvedValueOnce({ customizedPackageId: 'cp-1', leadId: 'lead-1' });
    await user.click(screen.getByRole('button', { name: /Send My Request/ }));

    expect(submitCustomizationRequestMock).toHaveBeenCalledTimes(2);
    expect(submitCustomizationRequestMock.mock.calls[1][0]).toMatchObject({ email: 'tester@example.com' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(await screen.findByText('Thank you!')).toBeInTheDocument();
  });

  it('the success modal states what happens next (email, agent, payment) and links to /my-account', async () => {
    const user = userEvent.setup();
    const navigateMock = vi.fn();
    mocks.useNavigate.mockReturnValue(navigateMock);
    render(<CustomizePackageContainer />);
    await screen.findByRole('heading', { name: 'Sri Lanka Highlights' });

    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'tester@example.com');
    for (let i = 0; i < 4; i += 1) await user.click(screen.getByRole('button', { name: /Next/ }));

    await user.click(screen.getByRole('button', { name: /Send My Request/ }));

    expect(await screen.findByText('Thank you!')).toBeInTheDocument();
    // No automated confirmation email exists for this flow (lead-service sends
    // none) — the copy says the expert reaches out instead of claiming one.
    expect(
      screen.getByText(/No automated confirmation email is sent for customization requests/),
    ).toBeInTheDocument();
    expect(screen.getByText(/personalized itinerary and quote within 24 hours/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing is charged today/)).toBeInTheDocument();

    const accountLink = screen.getByRole('link', { name: 'Track your request in My Account' });
    expect(accountLink.getAttribute('href')).toBe('/my-account');

    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(navigateMock).toHaveBeenCalledWith('/package/pkg-123');
    expect(screen.queryByText('Thank you!')).not.toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomizePackageContainer from '../CustomizePackageContainer';
import { fetchPackageById } from '../../../services/api/packages';
import { submitCustomizationRequest } from '../../../services/api/customization';
import { normalizePackage } from '../../../services/api/packages.transform';
import { generateItineraryPreview } from '../../../services/api/aiItinerary';

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
});

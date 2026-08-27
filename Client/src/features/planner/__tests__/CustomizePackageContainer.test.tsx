import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomizePackageContainer from '../CustomizePackageContainer';
import { fetchPackageById } from '../../../services/api/packages';
import { submitCustomizationRequest } from '../../../services/api/customization';
import { normalizePackage } from '../../../services/api/packages.transform';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useNavigate: vi.fn(),
}));

vi.mock('../../../services/api/packages', () => ({
  fetchPackageById: vi.fn(),
}));

vi.mock('../../../services/api/customization', () => ({
  submitCustomizationRequest: vi.fn(),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: mocks.useAuth,
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'pkg-123' }),
  useNavigate: () => mocks.useNavigate(),
}));

const fetchPackageByIdMock = vi.mocked(fetchPackageById);
const submitCustomizationRequestMock = vi.mocked(submitCustomizationRequest);

const rawPackage = {
  _id: 'pkg-123',
  name: 'Sri Lanka Highlights',
  description: 'A 7-day tour across Sri Lanka',
  destination: 'Sri Lanka',
  duration: 7,
  price: 1299,
  images: [{ url: 'https://example.com/sri-lanka.jpg' }],
  itinerary: {
    days: [
      {
        dayNumber: 1,
        title: 'Day 1',
        description: 'Arrival in Colombo',
        activities: ['Beach'],
        locations: ['Colombo'],
      },
    ],
  },
};

beforeEach(() => {
  mocks.useAuth.mockReturnValue({ user: null });
  mocks.useNavigate.mockReturnValue(vi.fn());
  fetchPackageByIdMock.mockReset();
  fetchPackageByIdMock.mockResolvedValue(normalizePackage(rawPackage));
  submitCustomizationRequestMock.mockReset();
  submitCustomizationRequestMock.mockResolvedValue({ success: true });
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
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import MyAccountContainer from '../MyAccountContainer';
import { fetchUserBookings } from '../../../services/api/booking';
import { fetchUserCustomizedPackages } from '../../../services/api/customization';
import { fetchUserManualItineraries } from '../../../services/api/manualItinerary';
import { updateProfile } from '../../../services/api/account';
import { mergeStoredUser } from '../../../services/auth/tokenStorage';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: mocks.useAuth,
}));

vi.mock('../../../services/api/booking', () => ({
  fetchUserBookings: vi.fn(),
}));

vi.mock('../../../services/api/customization', () => ({
  fetchUserCustomizedPackages: vi.fn(),
}));

vi.mock('../../../services/api/manualItinerary', () => ({
  fetchUserManualItineraries: vi.fn(),
}));

vi.mock('../../../services/api/account', () => ({
  updateProfile: vi.fn(),
}));

vi.mock('../../../services/auth/tokenStorage', () => ({
  mergeStoredUser: vi.fn(),
}));

const fetchUserBookingsMock = vi.mocked(fetchUserBookings);
const fetchUserCustomizedPackagesMock = vi.mocked(fetchUserCustomizedPackages);
const fetchUserManualItinerariesMock = vi.mocked(fetchUserManualItineraries);
const updateProfileMock = vi.mocked(updateProfile);
const mergeStoredUserMock = vi.mocked(mergeStoredUser);

const loggedInUser = {
  name: 'Jane Traveler',
  email: 'jane@example.com',
  phone: '9876543210',
};

const sampleBookings = [
  {
    _id: 'b1',
    packageId: 'p1',
    packageName: 'Bali Honeymoon',
    packageDestination: 'Bali, Indonesia',
    bookingStatus: 'confirmed',
    paymentStatus: 'paid',
    totalAmount: 5000,
    travelDate: '2026-12-01',
    numberOfTravelers: 2,
    createdAt: '2026-01-10',
  },
];

const sampleCustomizedPackages = [
  {
    _id: 'c1',
    name: 'Custom Alps',
    destination: 'Switzerland',
    price: 3000,
    duration: 7,
    maxGroupSize: 4,
    status: 'pending',
    createdAt: '2026-01-11',
  },
];

const sampleManualItineraries = [
  {
    _id: 'm1',
    lead: { name: 'Goa Road Trip', destination: 'Goa', numberOfTravelers: 3 },
    days: [{ dayNumber: 1 }, { dayNumber: 2 }, { dayNumber: 3 }],
    status: 'pending',
    createdAt: '2026-01-12',
  },
];

const renderContainer = () =>
  render(
    <MemoryRouter>
      <MyAccountContainer />
    </MemoryRouter>
  );

describe('MyAccountContainer', () => {
  beforeEach(() => {
    mocks.useAuth.mockReturnValue({ user: loggedInUser, loading: false });
    fetchUserBookingsMock.mockReset();
    fetchUserCustomizedPackagesMock.mockReset();
    fetchUserManualItinerariesMock.mockReset();
    updateProfileMock.mockReset();
    mergeStoredUserMock.mockReset();
    fetchUserBookingsMock.mockResolvedValue(sampleBookings);
    fetchUserCustomizedPackagesMock.mockResolvedValue(sampleCustomizedPackages);
    fetchUserManualItinerariesMock.mockResolvedValue(sampleManualItineraries);
    updateProfileMock.mockResolvedValue({ user: { name: 'Jane Doe', email: 'jane.doe@example.com' } });
    mergeStoredUserMock.mockReturnValue({ ...loggedInUser });
  });

  it('renders the logged-in dashboard with tabs and booking cards', async () => {
    renderContainer();

    expect(await screen.findByText('My Requests')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Regular Bookings \(1\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Customized Packages \(1\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Trip Plans \(1\)/ })).toBeInTheDocument();
    expect(screen.getByText('Bali Honeymoon')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('saves the edited profile with the exact payload and merges the stored user', async () => {
    // The success path schedules window.location.reload() via setTimeout(…,
    // 1000). jsdom's reload is non-configurable, so it cannot be stubbed;
    // the fired timer only logs a "Not implemented: navigation" jsdom error
    // (harmless console noise, verified) without failing the test.
    const user = userEvent.setup();
    renderContainer();

    await user.click(await screen.findByRole('button', { name: /Edit Profile/ }));
    expect(screen.getByRole('heading', { name: 'Edit Profile' })).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('Enter your name');
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const phoneInput = screen.getByPlaceholderText('Enter your phone number');

    await user.clear(nameInput);
    await user.type(nameInput, 'Jane Doe');
    await user.clear(emailInput);
    await user.type(emailInput, 'jane.doe@example.com');
    await user.clear(phoneInput);
    await user.type(phoneInput, '9123456789');

    await user.click(screen.getByRole('button', { name: /Save Changes/ }));

    expect(updateProfileMock).toHaveBeenCalledTimes(1);
    expect(updateProfileMock).toHaveBeenCalledWith({
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      phone: '9123456789',
    });
    expect(mergeStoredUserMock).toHaveBeenCalledTimes(1);
    expect(mergeStoredUserMock).toHaveBeenCalledWith({
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      phone: '9123456789',
    });
    // A successful save closes the modal immediately (the original page then
    // reloads ~1s later), so assert the modal is dismissed.
    expect(screen.queryByRole('heading', { name: 'Edit Profile' })).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Edit Profile/ })).toBeInTheDocument();
  });

  it('shows the API error message when the profile save fails', async () => {
    const user = userEvent.setup();
    updateProfileMock.mockRejectedValueOnce(new Error('Server unreachable'));
    renderContainer();

    await user.click(await screen.findByRole('button', { name: /Edit Profile/ }));
    await user.click(screen.getByRole('button', { name: /Save Changes/ }));

    expect(await screen.findByText('Server unreachable')).toBeInTheDocument();
    expect(updateProfileMock).toHaveBeenCalledTimes(1);
    expect(mergeStoredUserMock).not.toHaveBeenCalled();
  });

  it('redirects to /login carrying the current location so login can return the visitor here', async () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: false });

    const LoginProbe = () => {
      const location = useLocation();
      const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
      const fromPath = from ? from.pathname + (from.search ?? '') : 'no-from';
      return <div>{`login-screen:${fromPath}`}</div>;
    };

    render(
      <MemoryRouter initialEntries={['/my-account?tab=customized']}>
        <Routes>
          <Route path="/my-account" element={<MyAccountContainer />} />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('login-screen:/my-account?tab=customized')).toBeInTheDocument();
  });

  it('shows an inline error banner with a working retry when the request data fails to load', async () => {
    const user = userEvent.setup();
    fetchUserBookingsMock.mockRejectedValueOnce(new Error('Network unreachable'));
    fetchUserCustomizedPackagesMock.mockRejectedValueOnce(new Error('Network unreachable'));
    fetchUserManualItinerariesMock.mockRejectedValueOnce(new Error('Network unreachable'));
    renderContainer();

    expect(await screen.findByText('Error Loading Requests')).toBeInTheDocument();
    expect(screen.getByText('Network unreachable')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Bali Honeymoon')).toBeInTheDocument();
    expect(screen.queryByText('Error Loading Requests')).not.toBeInTheDocument();
  });
});

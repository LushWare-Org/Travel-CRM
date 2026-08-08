import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockGetByLead, mockCancelBooking, mockGetFlights, mockAddFlight, mockDeleteFlight } = vi.hoisted(() => ({
  mockGetByLead: vi.fn(),
  mockCancelBooking: vi.fn(),
  mockGetFlights: vi.fn(),
  mockAddFlight: vi.fn(),
  mockDeleteFlight: vi.fn(),
}));

vi.mock('../../../../services/flight.service', () => ({
  flightAPI: { getByLead: mockGetByLead, cancelBooking: mockCancelBooking },
}));

vi.mock('../../../../services/api', () => ({
  leadAPI: { getFlights: mockGetFlights, addFlight: mockAddFlight, deleteFlight: mockDeleteFlight },
}));

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

let lastFlightModalProps = null;
vi.mock('../../../shared', async () => ({
  FlightPreferenceCard: (await import('../../../shared/components/FlightPreferenceCard.jsx')).default,
  FlightSelectionModal: (props) => {
    lastFlightModalProps = props;
    if (!props.isOpen) return null;
    return (
      <div data-testid="flight-modal">
        <span data-testid="modal-initial-origin">{props.initialData?.origin || ''}</span>
        <span data-testid="modal-initial-destination">{props.initialData?.destination || ''}</span>
        <span data-testid="modal-initial-cabin">{props.initialData?.cabinClass || ''}</span>
        <span data-testid="modal-initial-airline">{props.initialData?.airlinePreference || ''}</span>
        <span data-testid="modal-initial-departure">{props.initialData?.departureTime || ''}</span>
        <button
          type="button"
          onClick={() =>
            props.onSelectTemplate({
              origin: 'AAA',
              destination: 'BBB',
              cabinClass: 'Economy',
              departureTime: 'morning',
              airlinePreference: 'QR',
            })
          }
        >
          Submit Flight
        </button>
      </div>
    );
  },
}));

import LeadFlightBookingsSection from '../LeadFlightBookingsSection.jsx';

const toStartFixture = {
  id: 'flight-to-start',
  flightType: 'TO_START',
  origin: 'CMB',
  destination: 'DXB',
  cabinClass: 'Business',
  airlinePreference: 'EK',
  departureTime: 'morning',
};

beforeEach(() => {
  mockGetByLead.mockReset();
  mockCancelBooking.mockReset();
  mockGetFlights.mockReset();
  mockAddFlight.mockReset();
  mockDeleteFlight.mockReset();
  lastFlightModalProps = null;

  mockGetByLead.mockResolvedValue({ data: [] });
  mockGetFlights.mockResolvedValue({ data: [] });
  mockAddFlight.mockResolvedValue({ success: true, data: { id: 'new-flight' } });
  mockDeleteFlight.mockResolvedValue({ success: true, data: {} });
});

function renderSection(props = {}) {
  return render(
    <LeadFlightBookingsSection
      leadId="lead-1"
      leadStatus="DRAFTING"
      itineraryDays={[]}
      travelDate="2026-01-01"
      onUpdateDay={vi.fn()}
      {...props}
    />
  );
}

describe('LeadFlightBookingsSection — loading optional flights', () => {
  it('fetches optional flights via leadAPI.getFlights on mount', async () => {
    renderSection();
    await waitFor(() => expect(mockGetFlights).toHaveBeenCalledWith('lead-1'));
  });

  it('renders a persisted optional flight from leadAPI, not flightAPI', async () => {
    mockGetFlights.mockResolvedValue({ data: [toStartFixture] });
    renderSection();
    expect(await screen.findByText('CMB → DXB')).toBeInTheDocument();
    expect(screen.getByText('To Start')).toBeInTheDocument();
  });
});

describe('LeadFlightBookingsSection — add flight persists correctly', () => {
  it('calls leadAPI.addFlight with flightType TO_START when the "start" button is used', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole('button', { name: /add flight preferences to start/i }));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    await waitFor(() => expect(mockAddFlight).toHaveBeenCalledWith('lead-1', expect.objectContaining({
      flightType: 'TO_START',
      origin: 'AAA',
      destination: 'BBB',
      cabinClass: 'Economy',
      departureTime: 'morning',
      airlinePreference: 'QR',
    })));
  });

  it('calls leadAPI.addFlight with flightType RETURN_HOME when the "return" button is used', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole('button', { name: /add return flight preferences/i }));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    await waitFor(() => expect(mockAddFlight).toHaveBeenCalledWith('lead-1', expect.objectContaining({ flightType: 'RETURN_HOME' })));
  });

  it('refetches the optional flights list after a successful add', async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByRole('button', { name: /add flight preferences to start/i });
    mockGetFlights.mockClear();

    await user.click(screen.getByRole('button', { name: /add flight preferences to start/i }));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    await waitFor(() => expect(mockGetFlights).toHaveBeenCalledTimes(1));
  });

  it('shows an error toast and does not crash when addFlight fails', async () => {
    mockAddFlight.mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole('button', { name: /add flight preferences to start/i }));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    await waitFor(() => expect(mockAddFlight).toHaveBeenCalled());
  });
});

describe('LeadFlightBookingsSection — inbound to outbound flip default', () => {
  it('prefills the return-flight modal with flipped origin/destination when a to-start flight exists', async () => {
    mockGetFlights.mockResolvedValue({ data: [toStartFixture] });
    const user = userEvent.setup();
    renderSection();

    await screen.findByText('CMB → DXB');
    await user.click(screen.getByRole('button', { name: /add return flight preferences/i }));

    expect(screen.getByTestId('modal-initial-origin')).toHaveTextContent('DXB');
    expect(screen.getByTestId('modal-initial-destination')).toHaveTextContent('CMB');
  });

  it('carries cabinClass and airlinePreference into the flipped default', async () => {
    mockGetFlights.mockResolvedValue({ data: [toStartFixture] });
    const user = userEvent.setup();
    renderSection();

    await screen.findByText('CMB → DXB');
    await user.click(screen.getByRole('button', { name: /add return flight preferences/i }));

    expect(screen.getByTestId('modal-initial-cabin')).toHaveTextContent('Business');
    expect(screen.getByTestId('modal-initial-airline')).toHaveTextContent('EK');
  });

  it('clears departureTime in the flipped default', async () => {
    mockGetFlights.mockResolvedValue({ data: [toStartFixture] });
    const user = userEvent.setup();
    renderSection();

    await screen.findByText('CMB → DXB');
    await user.click(screen.getByRole('button', { name: /add return flight preferences/i }));

    expect(screen.getByTestId('modal-initial-departure')).toHaveTextContent('');
  });

  it('does not flip when no to-start flight exists yet', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole('button', { name: /add return flight preferences/i }));

    expect(screen.getByTestId('modal-initial-origin')).toHaveTextContent('');
  });
});

describe('LeadFlightBookingsSection — editing an existing direction', () => {
  it('deletes the old flight before adding the new one, triggered by clicking the card', async () => {
    mockGetFlights.mockResolvedValue({ data: [toStartFixture] });
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole('button', { name: /edit flight preferences: cmb to dxb/i }));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    await waitFor(() => expect(mockAddFlight).toHaveBeenCalled());
    expect(mockDeleteFlight).toHaveBeenCalledWith('lead-1', 'flight-to-start');

    const deleteOrder = mockDeleteFlight.mock.invocationCallOrder[0];
    const addOrder = mockAddFlight.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(addOrder);
  });

  it('also opens the edit modal when the pencil icon specifically is clicked', async () => {
    mockGetFlights.mockResolvedValue({ data: [toStartFixture] });
    const user = userEvent.setup();
    renderSection();

    await screen.findByText('CMB → DXB');
    await user.click(screen.getByTitle('Edit preferences'));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    await waitFor(() => expect(mockAddFlight).toHaveBeenCalled());
  });

  it('prefills the edit modal with the existing flight data', async () => {
    mockGetFlights.mockResolvedValue({ data: [toStartFixture] });
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole('button', { name: /edit flight preferences: cmb to dxb/i }));

    expect(screen.getByTestId('modal-initial-origin')).toHaveTextContent('CMB');
    expect(screen.getByTestId('modal-initial-destination')).toHaveTextContent('DXB');
  });

  it('clicking Remove does not also open the edit modal', async () => {
    mockGetFlights.mockResolvedValue({ data: [toStartFixture] });
    const user = userEvent.setup();
    renderSection();

    await screen.findByText('CMB → DXB');
    await user.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() => expect(mockDeleteFlight).toHaveBeenCalledWith('lead-1', 'flight-to-start'));
    expect(mockAddFlight).not.toHaveBeenCalled();
  });
});

describe('LeadFlightBookingsSection — removing a flight', () => {
  it('calls leadAPI.deleteFlight when Remove is clicked', async () => {
    mockGetFlights.mockResolvedValue({ data: [toStartFixture] });
    const user = userEvent.setup();
    renderSection();

    await screen.findByText('CMB → DXB');
    await user.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() => expect(mockDeleteFlight).toHaveBeenCalledWith('lead-1', 'flight-to-start'));
  });
});

describe('LeadFlightBookingsSection — empty slots', () => {
  it('shows an add-placeholder button in place of the card when a direction has no flight', async () => {
    renderSection();
    expect(await screen.findByRole('button', { name: /add flight preferences to start/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add return flight preferences/i })).toBeInTheDocument();
  });

  it('replaces the add-placeholder with a card once a flight exists for that direction', async () => {
    mockGetFlights.mockResolvedValue({ data: [toStartFixture] });
    renderSection();

    await screen.findByText('CMB → DXB');
    expect(screen.queryByRole('button', { name: /add flight preferences to start/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add return flight preferences/i })).toBeInTheDocument();
  });
});

describe('LeadFlightBookingsSection — itinerary-day flights are unaffected', () => {
  it('does not call any leadAPI methods when saving a day-linked flight', async () => {
    const onUpdateDay = vi.fn();
    const user = userEvent.setup();
    renderSection({
      itineraryDays: [{ dayNumber: 1, flights: [{ id: 'f1', origin: '', destination: '' }] }],
      leadStatus: 'APPROVED',
      onUpdateDay,
    });

    await user.click(await screen.findByRole('button', { name: /book flight/i }));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    await waitFor(() => expect(onUpdateDay).toHaveBeenCalledWith(1, expect.objectContaining({
      flights: expect.arrayContaining([expect.objectContaining({ origin: 'AAA', destination: 'BBB' })]),
    })));
    expect(mockAddFlight).not.toHaveBeenCalled();
    expect(mockDeleteFlight).not.toHaveBeenCalled();
  });
});

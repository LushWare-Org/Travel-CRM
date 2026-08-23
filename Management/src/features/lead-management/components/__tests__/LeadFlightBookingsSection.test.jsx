import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockGetByLead, mockCancelBooking, mockGetSelectionFlights, mockAddSelectionFlight, mockDeleteSelectionFlight } = vi.hoisted(() => ({
  mockGetByLead: vi.fn(),
  mockCancelBooking: vi.fn(),
  mockGetSelectionFlights: vi.fn(),
  mockAddSelectionFlight: vi.fn(),
  mockDeleteSelectionFlight: vi.fn(),
}));

vi.mock('../../../../services/flight.service', () => ({
  flightAPI: { getByLead: mockGetByLead, cancelBooking: mockCancelBooking },
}));

vi.mock('../../../../services/api', () => ({
  leadAPI: { getSelectionFlights: mockGetSelectionFlights, addSelectionFlight: mockAddSelectionFlight, deleteSelectionFlight: mockDeleteSelectionFlight },
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
        <span data-testid="modal-initial-price">{props.initialData?.estimatedUnitPrice ?? ''}</span>
        <button
          type="button"
          onClick={() =>
            props.onSelectTemplate({
              origin: 'AAA',
              destination: 'BBB',
              cabinClass: 'Economy',
              departureTime: 'morning',
              airlinePreference: 'QR',
              estimatedUnitPrice: 99,
            })
          }
        >
          Submit Flight
        </button>
      </div>
    );
  },
}));

import LeadFlightBookingsSection from '../LeadFlightBookingsSection';

const toStartFixture = {
  id: 'flight-to-start',
  flightType: 'TO_START',
  origin: 'CMB',
  destination: 'DXB',
  cabinClass: 'Business',
  airlinePreference: 'EK',
  departureTime: 'morning',
  estimatedUnitPrice: 180,
};

beforeEach(() => {
  mockGetByLead.mockReset();
  mockCancelBooking.mockReset();
  mockGetSelectionFlights.mockReset();
  mockAddSelectionFlight.mockReset();
  mockDeleteSelectionFlight.mockReset();
  lastFlightModalProps = null;

  mockGetByLead.mockResolvedValue({ data: [] });
  mockGetSelectionFlights.mockResolvedValue({ data: [] });
  mockAddSelectionFlight.mockResolvedValue({ success: true, data: { id: 'new-flight' } });
  mockDeleteSelectionFlight.mockResolvedValue({ success: true, data: {} });
});

function renderSection(props = {}) {
  return render(
    <LeadFlightBookingsSection
      leadId="lead-1"
      selectionId="sel-1"
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
    await waitFor(() => expect(mockGetSelectionFlights).toHaveBeenCalledWith('lead-1', 'sel-1'));
  });

  it('renders a persisted optional flight from leadAPI, not flightAPI', async () => {
    mockGetSelectionFlights.mockResolvedValue({ data: [toStartFixture] });
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

    await waitFor(() => expect(mockAddSelectionFlight).toHaveBeenCalledWith('lead-1', 'sel-1', expect.objectContaining({
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

    await waitFor(() => expect(mockAddSelectionFlight).toHaveBeenCalledWith('lead-1', 'sel-1', expect.objectContaining({ flightType: 'RETURN_HOME' })));
  });

  it('refetches the optional flights list after a successful add', async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByRole('button', { name: /add flight preferences to start/i });
    mockGetSelectionFlights.mockClear();

    await user.click(screen.getByRole('button', { name: /add flight preferences to start/i }));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    await waitFor(() => expect(mockGetSelectionFlights).toHaveBeenCalledTimes(1));
  });

  it('shows an error toast and does not crash when addFlight fails', async () => {
    mockAddSelectionFlight.mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole('button', { name: /add flight preferences to start/i }));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    await waitFor(() => expect(mockAddSelectionFlight).toHaveBeenCalled());
  });

  it('sends the entered estimated cost as estimatedUnitPrice', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole('button', { name: /add flight preferences to start/i }));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    await waitFor(() => expect(mockAddSelectionFlight).toHaveBeenCalledWith('lead-1', 'sel-1', expect.objectContaining({ estimatedUnitPrice: 99 })));
  });

  it('notifies the parent via onFlightsChanged so the pricing preview knows to recompute', async () => {
    const onFlightsChanged = vi.fn();
    const user = userEvent.setup();
    renderSection({ onFlightsChanged });

    await user.click(await screen.findByRole('button', { name: /add flight preferences to start/i }));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    await waitFor(() => expect(onFlightsChanged).toHaveBeenCalledTimes(1));
  });

  it('does not call onFlightsChanged when addFlight fails', async () => {
    mockAddSelectionFlight.mockRejectedValue(new Error('Network error'));
    const onFlightsChanged = vi.fn();
    const user = userEvent.setup();
    renderSection({ onFlightsChanged });

    await user.click(await screen.findByRole('button', { name: /add flight preferences to start/i }));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    await waitFor(() => expect(mockAddSelectionFlight).toHaveBeenCalled());
    expect(onFlightsChanged).not.toHaveBeenCalled();
  });
});

describe('LeadFlightBookingsSection — inbound to outbound flip default', () => {
  it('prefills the return-flight modal with flipped origin/destination when a to-start flight exists', async () => {
    mockGetSelectionFlights.mockResolvedValue({ data: [toStartFixture] });
    const user = userEvent.setup();
    renderSection();

    await screen.findByText('CMB → DXB');
    await user.click(screen.getByRole('button', { name: /add return flight preferences/i }));

    expect(screen.getByTestId('modal-initial-origin')).toHaveTextContent('DXB');
    expect(screen.getByTestId('modal-initial-destination')).toHaveTextContent('CMB');
  });

  it('carries cabinClass and airlinePreference into the flipped default', async () => {
    mockGetSelectionFlights.mockResolvedValue({ data: [toStartFixture] });
    const user = userEvent.setup();
    renderSection();

    await screen.findByText('CMB → DXB');
    await user.click(screen.getByRole('button', { name: /add return flight preferences/i }));

    expect(screen.getByTestId('modal-initial-cabin')).toHaveTextContent('Business');
    expect(screen.getByTestId('modal-initial-airline')).toHaveTextContent('EK');
  });

  it('clears departureTime in the flipped default', async () => {
    mockGetSelectionFlights.mockResolvedValue({ data: [toStartFixture] });
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
    mockGetSelectionFlights.mockResolvedValue({ data: [toStartFixture] });
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole('button', { name: /edit flight preferences: cmb to dxb/i }));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    await waitFor(() => expect(mockAddSelectionFlight).toHaveBeenCalled());
    expect(mockDeleteSelectionFlight).toHaveBeenCalledWith('lead-1', 'sel-1', 'flight-to-start');

    const deleteOrder = mockDeleteSelectionFlight.mock.invocationCallOrder[0];
    const addOrder = mockAddSelectionFlight.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(addOrder);
  });

  it('also opens the edit modal when the pencil icon specifically is clicked', async () => {
    mockGetSelectionFlights.mockResolvedValue({ data: [toStartFixture] });
    const user = userEvent.setup();
    renderSection();

    await screen.findByText('CMB → DXB');
    await user.click(screen.getByTitle('Edit preferences'));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    await waitFor(() => expect(mockAddSelectionFlight).toHaveBeenCalled());
  });

  it('prefills the edit modal with the existing flight data', async () => {
    mockGetSelectionFlights.mockResolvedValue({ data: [toStartFixture] });
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole('button', { name: /edit flight preferences: cmb to dxb/i }));

    expect(screen.getByTestId('modal-initial-origin')).toHaveTextContent('CMB');
    expect(screen.getByTestId('modal-initial-destination')).toHaveTextContent('DXB');
    expect(screen.getByTestId('modal-initial-price')).toHaveTextContent('180');
  });

  it('clicking Remove does not also open the edit modal', async () => {
    mockGetSelectionFlights.mockResolvedValue({ data: [toStartFixture] });
    const user = userEvent.setup();
    renderSection();

    await screen.findByText('CMB → DXB');
    await user.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() => expect(mockDeleteSelectionFlight).toHaveBeenCalledWith('lead-1', 'sel-1', 'flight-to-start'));
    expect(mockAddSelectionFlight).not.toHaveBeenCalled();
  });
});

describe('LeadFlightBookingsSection — removing a flight', () => {
  it('calls leadAPI.deleteFlight when Remove is clicked', async () => {
    mockGetSelectionFlights.mockResolvedValue({ data: [toStartFixture] });
    const user = userEvent.setup();
    renderSection();

    await screen.findByText('CMB → DXB');
    await user.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() => expect(mockDeleteSelectionFlight).toHaveBeenCalledWith('lead-1', 'sel-1', 'flight-to-start'));
  });

  it('notifies the parent via onFlightsChanged after removing a flight', async () => {
    mockGetSelectionFlights.mockResolvedValue({ data: [toStartFixture] });
    const onFlightsChanged = vi.fn();
    const user = userEvent.setup();
    renderSection({ onFlightsChanged });

    await screen.findByText('CMB → DXB');
    await user.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() => expect(onFlightsChanged).toHaveBeenCalledTimes(1));
  });
});

describe('LeadFlightBookingsSection — empty slots', () => {
  it('shows an add-placeholder button in place of the card when a direction has no flight', async () => {
    renderSection();
    expect(await screen.findByRole('button', { name: /add flight preferences to start/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add return flight preferences/i })).toBeInTheDocument();
  });

  it('replaces the add-placeholder with a card once a flight exists for that direction', async () => {
    mockGetSelectionFlights.mockResolvedValue({ data: [toStartFixture] });
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
    expect(mockAddSelectionFlight).not.toHaveBeenCalled();
    expect(mockDeleteSelectionFlight).not.toHaveBeenCalled();
  });

  it('writes the entered estimated cost into the day flight as totalAmount', async () => {
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
      flights: expect.arrayContaining([expect.objectContaining({ totalAmount: 99 })]),
    })));
  });

  it('prefills the day flight edit modal from the existing totalAmount', async () => {
    const user = userEvent.setup();
    renderSection({
      itineraryDays: [{ dayNumber: 1, flights: [{ id: 'f1', origin: 'CMB', destination: 'DXB', totalAmount: 320 }] }],
      leadStatus: 'APPROVED',
    });

    await user.click(await screen.findByRole('button', { name: /edit/i }));

    expect(screen.getByTestId('modal-initial-price')).toHaveTextContent('320');
  });

  it('shows a $0-pricing warning on the day card when no cost has been set', async () => {
    renderSection({
      itineraryDays: [{ dayNumber: 1, flights: [{ id: 'f1', origin: 'CMB', destination: 'DXB' }] }],
      leadStatus: 'APPROVED',
    });

    expect(await screen.findByText(/no cost set/i)).toBeInTheDocument();
  });
});

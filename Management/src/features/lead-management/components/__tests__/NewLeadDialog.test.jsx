import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockCreateLead, mockAddSelectionFlight, mockUpdatePackageSelectionItinerary, mockGetAllPackages, mockGetPackageById } = vi.hoisted(() => ({
  mockCreateLead: vi.fn(),
  mockAddSelectionFlight: vi.fn(),
  mockUpdatePackageSelectionItinerary: vi.fn(),
  mockGetAllPackages: vi.fn(),
  mockGetPackageById: vi.fn(),
}));

vi.mock('../../../../services/api', () => ({
  leadAPI: { createLead: mockCreateLead, addSelectionFlight: mockAddSelectionFlight, updatePackageSelectionItinerary: mockUpdatePackageSelectionItinerary },
  packageAPI: { getAll: mockGetAllPackages, getById: mockGetPackageById },
}));

vi.mock('../../../itinerary/components/ItineraryEditor', () => ({
  default: ({ days, onAddDay }) => (
    <div data-testid="itinerary-editor">
      <span data-testid="itinerary-days-count">{days?.length ?? 0}</span>
      <button type="button" onClick={onAddDay}>Add Day</button>
    </div>
  ),
}));

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', role: 'admin', name: 'Admin User' } }),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../LocationAutocomplete', () => ({
  default: ({ value, onChange }) => (
    <input aria-label="Departure City" value={value || ''} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock('../../../../components/CountrySelect', () => ({
  default: ({ value, onChange }) => (
    <input aria-label="Country of Residence" value={value || ''} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock('../PricingSection', () => ({
  default: () => <div data-testid="pricing-section" />,
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

import NewLeadDialog from '../NewLeadDialog';

const PKG_A = 'pkg-a';
const packagesFixture = [{ _id: PKG_A, title: 'Sri Lanka Explorer', destination: 'Sri Lanka' }];

beforeEach(() => {
  mockCreateLead.mockReset();
  mockAddSelectionFlight.mockReset();
  mockUpdatePackageSelectionItinerary.mockReset();
  mockGetAllPackages.mockReset();
  mockGetPackageById.mockReset();
  lastFlightModalProps = null;

  mockGetAllPackages.mockResolvedValue({ success: true, data: packagesFixture });
  mockGetPackageById.mockResolvedValue({ success: true, data: { data: { itineraryDays: [{ dayNumber: 1, title: 'Blueprint Day 1' }] } } });
  // createLead also creates the initial package/manual selection in the same
  // request — its id is what the follow-up flight/itinerary calls target.
  mockCreateLead.mockResolvedValue({ data: { _id: 'new-lead-1', packageSelections: [{ id: 'sel-1' }] } });
  mockAddSelectionFlight.mockResolvedValue({ success: true, data: { id: 'flight-1' } });
  mockUpdatePackageSelectionItinerary.mockResolvedValue({ success: true, data: {} });
});

function renderDialog(props = {}) {
  return render(
    <NewLeadDialog isOpen={true} onClose={vi.fn()} salesReps={[]} onSuccess={vi.fn()} {...props} />
  );
}

// The Transfer Flights section starts collapsed.
async function expandTransfers(user) {
  await user.click(screen.getByRole('button', { name: /transfer flights/i }));
}

describe('NewLeadDialog — inbound to outbound flip default', () => {
  it('prefills the outbound modal with flipped inbound origin/destination', async () => {
    const user = userEvent.setup();
    renderDialog();
    await expandTransfers(user);

    await user.click(screen.getByRole('button', { name: /add inbound flight preferences/i }));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    await user.click(screen.getByRole('button', { name: /add outbound flight preferences/i }));

    expect(screen.getByTestId('modal-initial-origin')).toHaveTextContent('BBB');
    expect(screen.getByTestId('modal-initial-destination')).toHaveTextContent('AAA');
  });

  it('does not re-flip when the outbound leg was already set explicitly', async () => {
    const user = userEvent.setup();
    renderDialog();
    await expandTransfers(user);

    // Set inbound (AAA -> BBB via the mock's fixed submit payload)
    await user.click(screen.getByRole('button', { name: /add inbound flight preferences/i }));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    // Set outbound explicitly to the same fixed AAA -> BBB (not a flip of inbound)
    await user.click(screen.getByRole('button', { name: /add outbound flight preferences/i }));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    // Reopen outbound for editing — should show its own saved prefs (AAA), not a flip of inbound (which would be BBB)
    const editButtons = screen.getAllByTitle('Edit preferences');
    await user.click(editButtons[1]);

    expect(screen.getByTestId('modal-initial-origin')).toHaveTextContent('AAA');
  });

  it('shows no prefill when neither leg is set yet', async () => {
    const user = userEvent.setup();
    renderDialog();
    await expandTransfers(user);

    await user.click(screen.getByRole('button', { name: /add outbound flight preferences/i }));
    expect(screen.getByTestId('modal-initial-origin')).toHaveTextContent('');
  });
});

describe('NewLeadDialog — clicking a filled flight card reopens the modal', () => {
  it('opens the edit modal prefilled when the inbound card itself is clicked (not just the pencil)', async () => {
    const user = userEvent.setup();
    renderDialog();
    await expandTransfers(user);

    await user.click(screen.getByRole('button', { name: /add inbound flight preferences/i }));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    await user.click(screen.getByRole('button', { name: /edit flight preferences: aaa to bbb/i }));

    expect(screen.getByTestId('modal-initial-origin')).toHaveTextContent('AAA');
    expect(screen.getByTestId('modal-initial-destination')).toHaveTextContent('BBB');
  });
});

describe('NewLeadDialog — persists flight prefs after lead creation', () => {
  it('calls addFlight with TO_START for a set inbound leg', async () => {
    const user = userEvent.setup();
    renderDialog();
    await expandTransfers(user);

    await user.click(screen.getByRole('button', { name: /add inbound flight preferences/i }));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    await user.type(screen.getByPlaceholderText('Enter full name'), 'Jane Doe');
    await user.type(screen.getByPlaceholderText('Enter phone number'), '+94771234567');

    await user.click(screen.getByRole('button', { name: /create lead/i }));

    await waitFor(() => expect(mockCreateLead).toHaveBeenCalled());
    await waitFor(() => expect(mockAddSelectionFlight).toHaveBeenCalledWith('new-lead-1', 'sel-1', expect.objectContaining({
      flightType: 'TO_START',
      origin: 'AAA',
      destination: 'BBB',
    })));
  });

  it('calls addFlight with RETURN_HOME for a set outbound leg', async () => {
    const user = userEvent.setup();
    renderDialog();
    await expandTransfers(user);

    await user.click(screen.getByRole('button', { name: /add outbound flight preferences/i }));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    await user.click(screen.getByRole('button', { name: /create lead/i }));

    await waitFor(() => expect(mockAddSelectionFlight).toHaveBeenCalledWith('new-lead-1', 'sel-1', expect.objectContaining({
      flightType: 'RETURN_HOME',
    })));
  });

  it('does not call addFlight when no flight prefs were set', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: /create lead/i }));

    await waitFor(() => expect(mockCreateLead).toHaveBeenCalled());
    expect(mockAddSelectionFlight).not.toHaveBeenCalled();
  });

  it('still succeeds the lead creation even if a flight save fails', async () => {
    mockAddSelectionFlight.mockRejectedValue(new Error('flight save failed'));
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderDialog({ onSuccess });
    await expandTransfers(user);

    await user.click(screen.getByRole('button', { name: /add inbound flight preferences/i }));
    await user.click(screen.getByRole('button', { name: /submit flight/i }));

    await user.click(screen.getByRole('button', { name: /create lead/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});

const MANUAL_ITINERARY_VALUE = '__manual__';

describe('NewLeadDialog — manual itinerary option', () => {
  it('offers "Manual Itinerary (No Package)" as an option in the Package select', async () => {
    renderDialog();
    const select = await screen.findByLabelText('Package');
    expect(within(select).getByRole('option', { name: /manual itinerary \(no package\)/i })).toBeInTheDocument();
  });

  it('shows a blank-day itinerary editor and clears package fields when Manual Itinerary is selected', async () => {
    const user = userEvent.setup();
    renderDialog();

    const select = await screen.findByLabelText('Package');
    await user.selectOptions(select, PKG_A);
    await waitFor(() => expect(mockGetPackageById).toHaveBeenCalledWith(PKG_A));
    expect(screen.queryByTestId('itinerary-editor')).not.toBeInTheDocument();

    await user.selectOptions(select, MANUAL_ITINERARY_VALUE);

    expect(select).toHaveValue(MANUAL_ITINERARY_VALUE);
    expect(screen.getByTestId('itinerary-editor')).toBeInTheDocument();
    expect(screen.getByTestId('itinerary-days-count')).toHaveTextContent('1');
  });

  it('reloads the package blueprint when switching from manual back to a real package', async () => {
    const user = userEvent.setup();
    renderDialog();

    const select = await screen.findByLabelText('Package');
    await user.selectOptions(select, MANUAL_ITINERARY_VALUE);
    expect(screen.getByTestId('itinerary-editor')).toBeInTheDocument();

    await user.selectOptions(select, PKG_A);

    await waitFor(() => expect(mockGetPackageById).toHaveBeenCalledWith(PKG_A));
    await waitFor(() => expect(screen.queryByTestId('itinerary-editor')).not.toBeInTheDocument());
  });

  it('sends isManualItinerary: true and null packageId on create, and saves the built days via updateLeadItinerary', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByPlaceholderText('Enter full name'), 'Jane Doe');
    await user.type(screen.getByPlaceholderText('Enter phone number'), '+94771234567');

    const select = await screen.findByLabelText('Package');
    await user.selectOptions(select, MANUAL_ITINERARY_VALUE);
    await user.click(screen.getByRole('button', { name: /add day/i }));

    await user.click(screen.getByRole('button', { name: /create lead/i }));

    await waitFor(() => expect(mockCreateLead).toHaveBeenCalledWith(
      expect.objectContaining({ isManualItinerary: true, packageId: undefined, packageName: undefined })
    ));
    await waitFor(() => expect(mockUpdatePackageSelectionItinerary).toHaveBeenCalledWith(
      'new-lead-1',
      'sel-1',
      expect.objectContaining({ days: expect.arrayContaining([expect.objectContaining({ dayNumber: 1 })]) })
    ));
  });

  it('does not call updateLeadItinerary when a real package was selected instead of manual', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByPlaceholderText('Enter full name'), 'Jane Doe');
    await user.type(screen.getByPlaceholderText('Enter phone number'), '+94771234567');

    const select = await screen.findByLabelText('Package');
    await user.selectOptions(select, PKG_A);
    await waitFor(() => expect(mockGetPackageById).toHaveBeenCalledWith(PKG_A));

    await user.click(screen.getByRole('button', { name: /create lead/i }));

    await waitFor(() => expect(mockCreateLead).toHaveBeenCalledWith(
      expect.objectContaining({ isManualItinerary: false, packageId: PKG_A })
    ));
    expect(mockUpdatePackageSelectionItinerary).not.toHaveBeenCalled();
  });
});

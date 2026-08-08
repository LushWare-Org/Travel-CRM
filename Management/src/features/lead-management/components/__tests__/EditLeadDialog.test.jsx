import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const {
  mockGetLead,
  mockUpdateLead,
  mockAssignLead,
  mockUpdateLeadItinerary,
  mockGetAllPackages,
  mockGetPackageById,
} = vi.hoisted(() => ({
  mockGetLead: vi.fn(),
  mockUpdateLead: vi.fn(),
  mockAssignLead: vi.fn(),
  mockUpdateLeadItinerary: vi.fn(),
  mockGetAllPackages: vi.fn(),
  mockGetPackageById: vi.fn(),
}));

vi.mock('../../../../services/api', () => ({
  leadAPI: {
    getLead: mockGetLead,
    updateLead: mockUpdateLead,
    assignLead: mockAssignLead,
    updateLeadItinerary: mockUpdateLeadItinerary,
  },
  packageAPI: {
    getAll: mockGetAllPackages,
    getById: mockGetPackageById,
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../LocationAutocomplete', () => ({
  default: ({ value, onChange }) => (
    <input aria-label="Departure City" value={value || ''} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock('../../../itinerary/components/ItineraryEditor', () => ({
  default: () => <div data-testid="itinerary-editor" />,
}));

vi.mock('../../../itinerary/components/DestinationSelector', () => ({
  default: ({ value, onChange }) => (
    <input aria-label="Destination" value={value || ''} onChange={onChange} />
  ),
}));

vi.mock('../LeadFlightBookingsSection', () => ({
  default: () => <div data-testid="flight-bookings" />,
}));

vi.mock('../PricingSection', () => ({
  default: ({ days, pricing, onSettingsChange }) => (
    <div data-testid="pricing-section">
      <span data-testid="pricing-margin-type">{String(pricing?.marginType)}</span>
      <span data-testid="pricing-margin-value">{String(pricing?.marginValue)}</span>
      <span data-testid="pricing-discount-type">{String(pricing?.discountType)}</span>
      <span data-testid="pricing-discount-value">{String(pricing?.discountValue)}</span>
      <span data-testid="pricing-days-count">{days?.length ?? 0}</span>
      <button type="button" onClick={() => onSettingsChange({ ...pricing, marginValue: 99 })}>
        Change margin
      </button>
    </div>
  ),
}));

import EditLeadDialog from '../EditLeadDialog.jsx';

const PKG_A = 'pkg-a';
const PKG_B = 'pkg-b';

const packagesFixture = [
  { _id: PKG_A, title: 'Sri Lanka Explorer' },
  { _id: PKG_B, title: 'Maldives Getaway' },
];

const leadFixture = (overrides = {}) => ({
  _id: 'lead-1',
  name: 'John Doe',
  email: 'john@test.com',
  phone: '+94771234567',
  numberOfTravelers: 2,
  packageId: PKG_A,
  packageName: 'Sri Lanka Explorer',
  lifecycleStatus: 'DRAFTING',
  travelDate: '2026-01-01',
  endDate: '2026-01-10',
  remarks: [],
  ...overrides,
});

const freshLeadFixture = (overrides = {}) => ({
  ...leadFixture(),
  sourcePackageId: PKG_A,
  pricing: {
    marginType: 'PERCENTAGE',
    marginValue: 10,
    depositType: 'PERCENTAGE',
    depositValue: 30,
    discountType: 'percentage',
    discountValue: 15,
    serviceChargeRate: 5,
  },
  itineraryDays: [{ dayNumber: 1, title: 'Day 1', places: [], activities: [], transports: [] }],
  ...overrides,
});

const packageBlueprintFixture = (id, overrides = {}) => ({
  success: true,
  data: {
    _id: id,
    title: id === PKG_A ? 'Sri Lanka Explorer' : 'Maldives Getaway',
    itineraryDays: [
      { dayNumber: 1, title: 'Blueprint Day 1', places: [], activities: [], transports: [] },
      { dayNumber: 2, title: 'Blueprint Day 2', places: [], activities: [], transports: [] },
    ],
    ...overrides,
  },
});

function renderDialog({ lead = leadFixture(), isOpen = true, onClose = vi.fn(), onSuccess = vi.fn(), salesReps = [] } = {}) {
  const utils = render(
    <EditLeadDialog isOpen={isOpen} onClose={onClose} lead={lead} salesReps={salesReps} onSuccess={onSuccess} />
  );
  return { ...utils, onClose, onSuccess, lead };
}

beforeEach(() => {
  mockGetLead.mockReset();
  mockUpdateLead.mockReset();
  mockAssignLead.mockReset();
  mockUpdateLeadItinerary.mockReset();
  mockGetAllPackages.mockReset();
  mockGetPackageById.mockReset();

  mockGetAllPackages.mockResolvedValue({ success: true, data: packagesFixture });
  mockGetLead.mockResolvedValue({ data: freshLeadFixture() });
  mockUpdateLead.mockResolvedValue({ success: true, data: {} });
  mockUpdateLeadItinerary.mockResolvedValue({ success: true, data: {} });
  mockGetPackageById.mockImplementation((id) => Promise.resolve(packageBlueprintFixture(id)));
});

describe('EditLeadDialog — load behavior', () => {
  it('shows the lead name in the header', async () => {
    renderDialog();
    expect(await screen.findByText('John Doe')).toBeInTheDocument();
  });

  it('selects the lead current package once packages load', async () => {
    renderDialog();
    const select = await screen.findByLabelText('Package');
    await waitFor(() => expect(select).toHaveValue(PKG_A));
  });

  it('loads saved pricing settings into the pricing preview', async () => {
    renderDialog();
    await waitFor(() => expect(screen.getByTestId('pricing-margin-type')).toHaveTextContent('PERCENTAGE'));
    expect(screen.getByTestId('pricing-margin-value')).toHaveTextContent('10');
    expect(screen.getByTestId('pricing-discount-type')).toHaveTextContent('percentage');
    expect(screen.getByTestId('pricing-discount-value')).toHaveTextContent('15');
  });

  it('loads the lead persisted itinerary days into the pricing preview', async () => {
    renderDialog();
    await waitFor(() => expect(screen.getByTestId('pricing-days-count')).toHaveTextContent('1'));
  });
});

describe('EditLeadDialog — field locking by lifecycle status', () => {
  it('leaves package, dates and travelers editable while DRAFTING', async () => {
    renderDialog({ lead: leadFixture({ lifecycleStatus: 'DRAFTING' }) });
    const select = await screen.findByLabelText('Package');
    expect(select).not.toBeDisabled();
    expect(screen.getByLabelText('Travel Date (Start)')).not.toBeDisabled();
    expect(screen.getByLabelText('End Date')).not.toBeDisabled();
    expect(screen.getByLabelText('Number of Travelers')).not.toBeDisabled();
  });

  it('leaves fields editable for a brand new lead', async () => {
    renderDialog({ lead: leadFixture({ lifecycleStatus: 'NEW' }) });
    const select = await screen.findByLabelText('Package');
    expect(select).not.toBeDisabled();
  });

  it.each(['QUOTED', 'REVISION', 'APPROVED', 'BOOKING_IN_PROGRESS', 'CONFIRMED', 'BOOKING_FAILED'])(
    'locks package, dates and travelers once status is %s',
    async (status) => {
      renderDialog({ lead: leadFixture({ lifecycleStatus: status }) });
      const select = await screen.findByLabelText('Package');
      expect(select).toBeDisabled();
      expect(screen.getByLabelText('Travel Date (Start)')).toBeDisabled();
      expect(screen.getByLabelText('End Date')).toBeDisabled();
      expect(screen.getByLabelText('Number of Travelers')).toBeDisabled();
    }
  );

  it('shows a lock indicator next to locked fields', async () => {
    renderDialog({ lead: leadFixture({ lifecycleStatus: 'QUOTED' }) });
    await screen.findByLabelText('Package');
    expect(screen.getAllByText('Locked').length).toBeGreaterThan(0);
  });

  it('does not show a lock indicator while DRAFTING', async () => {
    renderDialog({ lead: leadFixture({ lifecycleStatus: 'DRAFTING' }) });
    await screen.findByLabelText('Package');
    expect(screen.queryByText('Locked')).not.toBeInTheDocument();
  });

  it('the name field always stays editable, even when locked', async () => {
    renderDialog({ lead: leadFixture({ lifecycleStatus: 'QUOTED' }) });
    await screen.findByLabelText('Package');
    expect(screen.getByLabelText('Full Name')).not.toBeDisabled();
  });
});

describe('EditLeadDialog — package switching (pristine itinerary)', () => {
  it('carries margin over and resets discount when switching to a new package', async () => {
    const user = userEvent.setup();
    renderDialog();

    const select = await screen.findByLabelText('Package');
    await waitFor(() => expect(select).toHaveValue(PKG_A));
    await waitFor(() => expect(screen.getByTestId('pricing-margin-type')).toHaveTextContent('PERCENTAGE'));

    await user.selectOptions(select, PKG_B);

    await waitFor(() => expect(screen.getByTestId('pricing-discount-type')).toHaveTextContent('none'));
    expect(screen.getByTestId('pricing-discount-value')).toHaveTextContent('0');
    // Margin is untouched by the switch.
    expect(screen.getByTestId('pricing-margin-type')).toHaveTextContent('PERCENTAGE');
    expect(screen.getByTestId('pricing-margin-value')).toHaveTextContent('10');
  });

  it('replaces the itinerary preview with the new package blueprint when pristine', async () => {
    const user = userEvent.setup();
    renderDialog();

    const select = await screen.findByLabelText('Package');
    await waitFor(() => expect(screen.getByTestId('pricing-days-count')).toHaveTextContent('1'));

    await user.selectOptions(select, PKG_B);

    await waitFor(() => expect(mockGetPackageById).toHaveBeenCalledWith(PKG_B));
    await waitFor(() => expect(screen.getByTestId('pricing-days-count')).toHaveTextContent('2'));
  });

  it('sends the new packageId and carried pricing settings on save', async () => {
    const user = userEvent.setup();
    renderDialog();

    const select = await screen.findByLabelText('Package');
    await waitFor(() => expect(select).toHaveValue(PKG_A));
    await user.selectOptions(select, PKG_B);
    await waitFor(() => expect(screen.getByTestId('pricing-discount-type')).toHaveTextContent('none'));

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockUpdateLead).toHaveBeenCalledWith('lead-1', expect.objectContaining({
      packageId: PKG_B,
      packageName: 'Maldives Getaway',
      pricing: expect.objectContaining({ marginType: 'PERCENTAGE', marginValue: 10, discountType: 'none', discountValue: 0 }),
    })));
    // No manual itinerary edit happened — the backend handles the pristine
    // replacement internally, so the itinerary endpoint is not called.
    expect(mockUpdateLeadItinerary).not.toHaveBeenCalled();
  });
});

describe('EditLeadDialog — package switching (customized itinerary)', () => {
  beforeEach(() => {
    // sourcePackageId null => itinerary was manually edited, no longer pristine.
    mockGetLead.mockResolvedValue({ data: freshLeadFixture({ sourcePackageId: null }) });
  });

  it('keeps the existing itinerary preview instead of pulling the new blueprint', async () => {
    const user = userEvent.setup();
    renderDialog();

    const select = await screen.findByLabelText('Package');
    await waitFor(() => expect(screen.getByTestId('pricing-days-count')).toHaveTextContent('1'));

    await user.selectOptions(select, PKG_B);

    // Still resets discount / carries margin (pricing settings are independent of itinerary state).
    await waitFor(() => expect(screen.getByTestId('pricing-discount-type')).toHaveTextContent('none'));
    // But the itinerary days count stays at the original lead itinerary, not the new blueprint's 2 days.
    expect(screen.getByTestId('pricing-days-count')).toHaveTextContent('1');
  });

  it('still sends the new packageId on save, without an itinerary payload', async () => {
    const user = userEvent.setup();
    renderDialog();

    const select = await screen.findByLabelText('Package');
    await waitFor(() => expect(select).toHaveValue(PKG_A));
    await user.selectOptions(select, PKG_B);
    await waitFor(() => expect(screen.getByTestId('pricing-discount-type')).toHaveTextContent('none'));

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockUpdateLead).toHaveBeenCalledWith('lead-1', expect.objectContaining({
      packageId: PKG_B,
      packageName: 'Maldives Getaway',
    })));
    expect(mockUpdateLeadItinerary).not.toHaveBeenCalled();
  });
});

describe('EditLeadDialog — cancel discards unsaved changes', () => {
  it('calls onClose without saving anything', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await screen.findByLabelText('Package');
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockUpdateLead).not.toHaveBeenCalled();
  });

  it('reverts an edited name back to the saved value after cancel, even if reopened with the same lead reference', async () => {
    const user = userEvent.setup();
    const lead = leadFixture();
    const onClose = vi.fn();
    const { rerender } = render(
      <EditLeadDialog isOpen={true} onClose={onClose} lead={lead} salesReps={[]} onSuccess={vi.fn()} />
    );

    const nameInput = await screen.findByLabelText('Full Name');
    await waitFor(() => expect(nameInput).toHaveValue('John Doe'));
    await user.clear(nameInput);
    await user.type(nameInput, 'Edited Name');
    expect(nameInput).toHaveValue('Edited Name');

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onClose).toHaveBeenCalled();

    // Simulate the parent closing then reopening with the exact same lead object reference.
    rerender(<EditLeadDialog isOpen={false} onClose={onClose} lead={lead} salesReps={[]} onSuccess={vi.fn()} />);
    rerender(<EditLeadDialog isOpen={true} onClose={onClose} lead={lead} salesReps={[]} onSuccess={vi.fn()} />);

    expect(await screen.findByLabelText('Full Name')).toHaveValue('John Doe');
  });

  it('reverts a package switch after cancel', async () => {
    const user = userEvent.setup();
    const lead = leadFixture();
    const onClose = vi.fn();
    const { rerender } = render(
      <EditLeadDialog isOpen={true} onClose={onClose} lead={lead} salesReps={[]} onSuccess={vi.fn()} />
    );

    const select = await screen.findByLabelText('Package');
    await waitFor(() => expect(select).toHaveValue(PKG_A));
    await user.selectOptions(select, PKG_B);
    await waitFor(() => expect(select).toHaveValue(PKG_B));

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    rerender(<EditLeadDialog isOpen={false} onClose={onClose} lead={lead} salesReps={[]} onSuccess={vi.fn()} />);
    rerender(<EditLeadDialog isOpen={true} onClose={onClose} lead={lead} salesReps={[]} onSuccess={vi.fn()} />);

    await waitFor(() => expect(screen.getByLabelText('Package')).toHaveValue(PKG_A));
  });
});

describe('EditLeadDialog — save behavior', () => {
  it('saves core lead fields in a single updateLead call when nothing else changed', async () => {
    const user = userEvent.setup();
    renderDialog();

    await screen.findByLabelText('Package');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockUpdateLead).toHaveBeenCalledTimes(1));
    expect(mockUpdateLeadItinerary).not.toHaveBeenCalled();
  });

  it('persists a manual pricing edit through updateLeadItinerary before updateLead', async () => {
    const user = userEvent.setup();
    renderDialog();

    await screen.findByLabelText('Package');
    await user.click(screen.getByRole('button', { name: /change margin/i }));

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockUpdateLeadItinerary).toHaveBeenCalledWith('lead-1', expect.objectContaining({
      pricing: expect.objectContaining({ marginValue: 99 }),
    })));
    expect(mockUpdateLead).toHaveBeenCalled();

    const itineraryCallOrder = mockUpdateLeadItinerary.mock.invocationCallOrder[0];
    const updateLeadCallOrder = mockUpdateLead.mock.invocationCallOrder[0];
    expect(itineraryCallOrder).toBeLessThan(updateLeadCallOrder);
  });

  it('calls onSuccess and onClose after a successful save', async () => {
    const user = userEvent.setup();
    const { onClose, onSuccess } = renderDialog();

    await screen.findByLabelText('Package');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an error and keeps the dialog open when updateLead fails', async () => {
    mockUpdateLead.mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();
    const { onClose, onSuccess } = renderDialog();

    await screen.findByLabelText('Package');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockUpdateLead).toHaveBeenCalled());
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call updateLead when saving the itinerary fails', async () => {
    mockUpdateLeadItinerary.mockRejectedValue(new Error('Itinerary save failed'));
    const user = userEvent.setup();
    renderDialog();

    await screen.findByLabelText('Package');
    await user.click(screen.getByRole('button', { name: /change margin/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockUpdateLeadItinerary).toHaveBeenCalled());
    expect(mockUpdateLead).not.toHaveBeenCalled();
  });
});

describe('EditLeadDialog — visibility', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = renderDialog({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when lead is null', () => {
    const { container } = render(
      <EditLeadDialog isOpen={true} onClose={vi.fn()} lead={null} salesReps={[]} onSuccess={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

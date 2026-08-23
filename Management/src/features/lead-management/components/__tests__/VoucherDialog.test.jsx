import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const {
  mockGetPackageSelections, mockPackageGetById,
  mockVoucherGetByLead, mockVoucherCreate, mockVoucherSend,
  mockGetItineraryFlights,
} = vi.hoisted(() => ({
  mockGetPackageSelections: vi.fn(),
  mockPackageGetById: vi.fn(),
  mockVoucherGetByLead: vi.fn(),
  mockVoucherCreate: vi.fn(),
  mockVoucherSend: vi.fn(),
  mockGetItineraryFlights: vi.fn(),
}));

vi.mock('../../../../services/api', () => ({
  leadAPI: { getPackageSelections: mockGetPackageSelections },
  packageAPI: { getById: mockPackageGetById },
  voucherAPI: {
    getByLead: mockVoucherGetByLead,
    getById: vi.fn(),
    create: mockVoucherCreate,
    update: vi.fn(),
    send: mockVoucherSend,
    downloadPDF: vi.fn(),
  },
}));

vi.mock('../../../../services/flight.service', () => ({
  flightAPI: { getItineraryFlights: mockGetItineraryFlights },
}));

vi.mock('../PDFPreviewDialog', () => ({
  default: ({ isOpen, pdfUrl }) => (isOpen ? <div data-testid="pdf-preview">{pdfUrl}</div> : null),
}));

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import VoucherDialog from '../VoucherDialog';

const lead = {
  id: 'lead-1',
  name: 'Alice Traveller',
  email: 'alice@test.com',
  phone: '+15551234567',
  primarySelectionId: 'sel-2',
  travelDate: '2026-05-10',
  endDate: '2026-05-15',
};

const day = {
  dayNumber: 1,
  title: 'Arrival',
  places: [{ customName: 'Bali' }],
  activities: [{ name: 'City tour' }],
  accommodation: { name: 'Bali Hotel', type: 'hotel' },
  breakfastCount: 1,
  lunchCount: 0,
  dinnerCount: 1,
};

const selections = [
  { id: 'sel-1', isManual: false, packageId: 'pkg-1', packageName: 'Maldives Escape', itineraryDays: [], quoteAcceptedAt: null },
  { id: 'sel-2', isManual: false, packageId: 'pkg-2', packageName: 'Bali Adventure', itineraryDays: [day], quoteAcceptedAt: '2026-01-01T00:00:00Z' },
  { id: 'sel-3', isManual: false, packageId: 'pkg-3', packageName: 'Newest Pick', itineraryDays: [], quoteAcceptedAt: '2026-02-01T00:00:00Z' },
];

const packageDetailsFor = (packageId) => ({
  data: {
    title: { 'pkg-1': 'Maldives Escape Deluxe', 'pkg-2': 'Bali Adventure Deluxe', 'pkg-3': 'Newest Pick Deluxe' }[packageId],
    destination: 'Somewhere',
    durationDays: 5,
    category: 'Standard',
    inclusions: [],
    exclusions: [],
    basePrice: 1000,
    coverImage: null,
  },
});

const renderDialog = (props = {}) =>
  render(<VoucherDialog isOpen lead={lead} onClose={vi.fn()} onSuccess={vi.fn()} onEditLead={vi.fn()} {...props} />);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPackageSelections.mockResolvedValue({ data: selections });
  mockPackageGetById.mockImplementation((id) => Promise.resolve(packageDetailsFor(id)));
  mockVoucherGetByLead.mockResolvedValue({ data: [] });
  mockGetItineraryFlights.mockResolvedValue({
    data: [
      {
        dayNumber: 2,
        segments: [
          { sequence: 1, marketingCarrier: 'UL', flightNumber: 'UL103', origin: 'CMB', destination: 'MLE', departureAt: '2026-05-10T10:00:00Z', arrivalAt: '2026-05-10T12:00:00Z' },
        ],
      },
    ],
  });
  mockVoucherCreate.mockResolvedValue({ data: { id: 'vch-new', voucherNumber: 'VOU-1' } });
  mockVoucherSend.mockResolvedValue({ data: { id: 'vch-new', emailSent: true } });
});

describe('VoucherDialog', () => {
  it('defaults to the selection with the most recently accepted quote, not primarySelectionId', async () => {
    renderDialog();
    // sel-3 (Newest Pick) was accepted after sel-2 (the lead's primarySelectionId) — should win.
    expect(await screen.findAllByText('Newest Pick Deluxe')).not.toHaveLength(0);
  });

  it('falls back to primarySelectionId when no selection has an accepted quote', async () => {
    mockGetPackageSelections.mockResolvedValue({
      data: selections.map((s) => ({ ...s, quoteAcceptedAt: null })),
    });
    renderDialog();
    expect(await screen.findAllByText('Bali Adventure Deluxe')).not.toHaveLength(0);
  });

  it('submits a flat payload with flight segments carrying the parent booking dayNumber', async () => {
    renderDialog();
    await screen.findAllByText('Newest Pick Deluxe');

    await userEvent.click(screen.getByRole('button', { name: /Create Voucher/ }));

    await waitFor(() => expect(mockVoucherCreate).toHaveBeenCalled());
    const payload = mockVoucherCreate.mock.calls[0][0];
    expect(payload.customerName).toBe('Alice Traveller');
    expect(payload.customerEmail).toBe('alice@test.com');
    expect(payload.customer).toBeUndefined();
    expect(payload.flightSegments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dayNumber: 2, marketingCarrier: 'UL', flightNumber: 'UL103', origin: 'CMB', destination: 'MLE' }),
      ]),
    );
  });

  it('sends the saved voucher via the configured channel through SendDocumentPanel', async () => {
    renderDialog();
    await screen.findAllByText('Newest Pick Deluxe');
    await userEvent.click(screen.getByRole('button', { name: /Create Voucher/ }));
    await waitFor(() => expect(mockVoucherCreate).toHaveBeenCalled());

    await userEvent.click(screen.getAllByRole('button', { name: 'Notes' })[0]);
    await userEvent.click(screen.getByRole('button', { name: /Send via Email/ }));

    await waitFor(() => expect(mockVoucherSend).toHaveBeenCalledWith('vch-new', { channel: 'email', email: 'alice@test.com' }));
  });

  it('calls onEditLead with the active selection when "Manage flights & itinerary" is clicked', async () => {
    const onEditLead = vi.fn();
    renderDialog({ onEditLead });
    await screen.findAllByText('Newest Pick Deluxe');

    await userEvent.click(screen.getAllByRole('button', { name: 'Flights' })[0]);
    await userEvent.click(screen.getByRole('button', { name: /Manage flights & itinerary/ }));

    expect(onEditLead).toHaveBeenCalledWith(lead, 'sel-3');
  });
});

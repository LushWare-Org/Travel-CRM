import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const {
  mockGetPackageSelections, mockQuotePackageSelection, mockSend,
  mockUpdatePackageSelection, mockGetPackageById, mockSwalFire,
} = vi.hoisted(() => ({
  mockGetPackageSelections: vi.fn(),
  mockQuotePackageSelection: vi.fn(),
  mockSend: vi.fn(),
  mockUpdatePackageSelection: vi.fn(),
  mockGetPackageById: vi.fn(),
  mockSwalFire: vi.fn(),
}));

vi.mock('../../../../../services/api', () => ({
  leadAPI: {
    getPackageSelections: mockGetPackageSelections,
    quotePackageSelection: mockQuotePackageSelection,
    updatePackageSelection: mockUpdatePackageSelection,
  },
  quotationAPI: { send: mockSend },
  packageAPI: { getById: mockGetPackageById },
}));

vi.mock('@/components/shared/PdfPreview', () => ({
  default: ({ isOpen, pdfUrl }) => (isOpen ? <div data-testid="pdf-preview">{pdfUrl}</div> : null),
}));

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('sweetalert2', () => ({
  default: { fire: mockSwalFire },
}));

import QuotationModal from '../QuotationModal';

const lead = {
  id: 'lead-1',
  name: 'Alice Traveller',
  email: 'alice@test.com',
  phone: '+15551234567',
  destination: 'Bali',
  numberOfTravelers: 2,
  primarySelectionId: 'sel-2',
};

const selections = [
  {
    id: 'sel-1', isManual: false, packageId: 'pkg-1', packageName: 'Maldives Escape',
    currentQuoteId: null, itineraryDays: [], pricing: { currency: 'USD', totalAmount: 3200, sellSubtotal: 3200 },
  },
  {
    id: 'sel-2', isManual: false, packageId: 'pkg-2', packageName: 'Bali Adventure',
    currentQuoteId: 'quote-existing', itineraryDays: [{ dayNumber: 1, title: 'Arrival' }],
    pricing: { currency: 'USD', totalAmount: 2450, sellSubtotal: 2600, discountAmount: 150 },
  },
];

const renderModal = (props = {}) =>
  render(<QuotationModal isOpen lead={lead} onClose={vi.fn()} onSuccess={vi.fn()} onEditLead={vi.fn()} {...props} />);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPackageSelections.mockResolvedValue({ data: selections });
  mockQuotePackageSelection.mockResolvedValue({
    data: { quotation: { id: 'quote-new' }, selection: { id: 'sel-1', currentQuoteId: 'quote-new' } },
  });
  mockSend.mockResolvedValue({ success: true });
  mockGetPackageById.mockImplementation(async (id) => ({
    data: { id, destination: id === 'pkg-1' ? 'Maldives' : 'Bali' },
  }));
  mockUpdatePackageSelection.mockImplementation(async (leadId, selectionId, payload) => ({
    data: { id: selectionId, destinationOverride: payload.destinationOverride },
  }));
  mockSwalFire.mockResolvedValue({ isConfirmed: true });
});

describe('QuotationModal', () => {
  it('loads the package selections and defaults to the primary selection', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bali Adventure' })).toBeInTheDocument());
    // The primary selection (sel-2) already has a quote → shows the Quoted badge.
    expect(screen.getByText('Quoted')).toBeInTheDocument();
  });

  it('swaps the summary when a different package is chosen', async () => {
    renderModal();
    await screen.findByRole('heading', { name: 'Bali Adventure' });

    await userEvent.click(screen.getByRole('button', { name: /Maldives Escape/ }));

    expect(await screen.findByRole('heading', { name: 'Maldives Escape' })).toBeInTheDocument();
    // Maldives subtotal and total are both $3,200 — assert it renders at all.
    expect(screen.getAllByText('$3,200.00').length).toBeGreaterThan(0);
  });

  it('generates a quotation for the active selection', async () => {
    renderModal();
    await screen.findByRole('heading', { name: 'Bali Adventure' });
    await userEvent.click(screen.getByRole('button', { name: /Maldives Escape/ }));

    await userEvent.click(screen.getByRole('button', { name: /Generate quotation/ }));

    await waitFor(() => expect(mockQuotePackageSelection).toHaveBeenCalledWith('lead-1', 'sel-1'));
  });

  it('sends the current quotation via email with the recipient address', async () => {
    renderModal();
    await screen.findByRole('heading', { name: 'Bali Adventure' });

    await userEvent.click(screen.getByRole('button', { name: /Send via Email/ }));

    await waitFor(() => expect(mockSend).toHaveBeenCalledWith('quote-existing', {
      channel: 'email',
      email: 'alice@test.com',
    }));
  });

  it('sends via WhatsApp with the phone number when that channel is chosen', async () => {
    renderModal();
    await screen.findByRole('heading', { name: 'Bali Adventure' });

    await userEvent.click(screen.getByRole('button', { name: /WhatsApp/ }));
    await userEvent.click(screen.getByRole('button', { name: /Send via WhatsApp/ }));

    await waitFor(() => expect(mockSend).toHaveBeenCalledWith('quote-existing', {
      channel: 'whatsapp',
      phone: '+15551234567',
    }));
  });

  it('passes the active selection id to onEditLead when Edit details is clicked', async () => {
    const onEditLead = vi.fn();
    renderModal({ onEditLead });
    await screen.findByRole('heading', { name: 'Bali Adventure' });

    await userEvent.click(screen.getByRole('button', { name: /Edit details/ }));

    expect(onEditLead).toHaveBeenCalledWith(lead, 'sel-2');

    await userEvent.click(screen.getByRole('button', { name: /Maldives Escape/ }));
    await userEvent.click(screen.getByRole('button', { name: /Edit details/ }));

    expect(onEditLead).toHaveBeenCalledWith(lead, 'sel-1');
  });

  it('shows the price for the selection passed via initialSelectionId, not primarySelectionId', async () => {
    renderModal({ initialSelectionId: 'sel-1' });

    // primarySelectionId points at sel-2 (Bali Adventure), but initialSelectionId
    // should win, landing on sel-1 (Maldives Escape) instead.
    expect(await screen.findByRole('heading', { name: 'Maldives Escape' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bali Adventure' })).not.toBeInTheDocument();
  });

  it('opens the PDF preview for a quoted selection', async () => {
    renderModal();
    await screen.findByRole('heading', { name: 'Bali Adventure' });

    await userEvent.click(screen.getByRole('button', { name: /Preview PDF/ }));

    expect(await screen.findByTestId('pdf-preview')).toHaveTextContent('/billing/quotations/quote-existing/pdf');
  });

  it('defaults the destination field to the active package\'s own destination', async () => {
    renderModal();
    await screen.findByRole('heading', { name: 'Bali Adventure' });

    await waitFor(() => expect(screen.getByLabelText('Quote destination')).toHaveValue('Bali'));
  });

  it('confirms before saving a destination that overrides the package\'s own', async () => {
    renderModal();
    await screen.findByRole('heading', { name: 'Bali Adventure' });
    await waitFor(() => expect(screen.getByLabelText('Quote destination')).toHaveValue('Bali'));

    const input = screen.getByLabelText('Quote destination');
    await userEvent.clear(input);
    await userEvent.type(input, 'Bali & Lombok');
    await userEvent.click(screen.getByRole('button', { name: /Save/ }));

    await waitFor(() => expect(mockSwalFire).toHaveBeenCalled());
    await waitFor(() => expect(mockUpdatePackageSelection).toHaveBeenCalledWith(
      'lead-1', 'sel-2', { destinationOverride: 'Bali & Lombok' },
    ));
  });

  it('does not save the destination override when the confirmation is cancelled', async () => {
    mockSwalFire.mockResolvedValueOnce({ isConfirmed: false });
    renderModal();
    await screen.findByRole('heading', { name: 'Bali Adventure' });
    await waitFor(() => expect(screen.getByLabelText('Quote destination')).toHaveValue('Bali'));

    const input = screen.getByLabelText('Quote destination');
    await userEvent.clear(input);
    await userEvent.type(input, 'Somewhere else');
    await userEvent.click(screen.getByRole('button', { name: /Save/ }));

    await waitFor(() => expect(mockSwalFire).toHaveBeenCalled());
    expect(mockUpdatePackageSelection).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const {
  mockGetAllLeads, mockGetLeadStats, mockGetSalesReps, mockGetSettings, mockGetStoredUser,
} = vi.hoisted(() => ({
  mockGetAllLeads: vi.fn(),
  mockGetLeadStats: vi.fn(),
  mockGetSalesReps: vi.fn(),
  mockGetSettings: vi.fn(),
  mockGetStoredUser: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  leadAPI: { getAllLeads: mockGetAllLeads, getLeadStats: mockGetLeadStats },
  adminAPI: { getSalesReps: mockGetSalesReps, getSettings: mockGetSettings },
  authAPI: { getStoredUser: mockGetStoredUser },
}));

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  useNavigate: () => vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// Stubs for dialogs not under test here — the coupling this suite guards is
// specific to Quotation/Invoice/Receipt/Voucher sharing LeadManagement's
// billingLead state (see closeLeadEditor / openLeadEditorFromQuote).
vi.mock('../../features/lead-management/components/LeadStats', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/LeadFilters', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/NewLeadDialog', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/RemarksDialog', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/FilterDialog', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/SettingsDialog', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/StatusChangeDialog', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/ActiveSalesRepsDialog', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/LeadSectionView', () => ({ default: () => null }));

vi.mock('../../features/lead-management/components/LeadTable', () => ({
  default: ({ leads, onQuotationClick, onInvoiceClick, onReceiptClick, onVoucherClick }) => (
    <div data-testid="lead-table">
      {leads.map((lead) => (
        <div key={lead._id}>
          <button onClick={() => onQuotationClick(lead)}>{`Quotation:${lead.name}`}</button>
          <button onClick={() => onInvoiceClick(lead)}>{`Invoice:${lead.name}`}</button>
          <button onClick={() => onReceiptClick(lead)}>{`Receipt:${lead.name}`}</button>
          <button onClick={() => onVoucherClick(lead)}>{`Voucher:${lead.name}`}</button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../../features/lead-management/components/EditLeadDialog', () => ({
  default: ({ isOpen, lead, onClose }) =>
    isOpen ? (
      <div data-testid="edit-lead-dialog">
        <span data-testid="edit-lead-name">{lead?.name}</span>
        <button onClick={onClose}>Close Editor</button>
      </div>
    ) : null,
}));

vi.mock('../../features/lead-management/components/quotation/QuotationModal', () => ({
  default: ({ lead, onClose, onSuccess, onEditLead }) => (
    <div data-testid="quotation-modal">
      <span data-testid="quotation-modal-lead">{lead?.name}</span>
      <button onClick={onClose}>Close Quotation</button>
      <button onClick={onSuccess}>Quotation Success</button>
      <button onClick={() => onEditLead(lead)}>Edit details</button>
    </div>
  ),
}));

vi.mock('../../features/lead-management/components/InvoiceDialog', () => ({
  default: ({ lead, onClose, onSuccess }) => (
    <div data-testid="invoice-dialog">
      <span data-testid="invoice-dialog-lead">{lead?.name}</span>
      <button onClick={onClose}>Close Invoice</button>
      <button onClick={onSuccess}>Invoice Success</button>
    </div>
  ),
}));

vi.mock('../../features/lead-management/components/ReceiptDialog', () => ({
  default: ({ lead, onClose }) => (
    <div data-testid="receipt-dialog">
      <span data-testid="receipt-dialog-lead">{lead?.name}</span>
      <button onClick={onClose}>Close Receipt</button>
    </div>
  ),
}));

vi.mock('../../features/lead-management/components/VoucherDialog', () => ({
  default: ({ lead, onClose }) => (
    <div data-testid="voucher-dialog">
      <span data-testid="voucher-dialog-lead">{lead?.name}</span>
      <button onClick={onClose}>Close Voucher</button>
    </div>
  ),
}));

import LeadManagement from '../LeadManagement';

const leadA = { _id: 'lead-a', name: 'Alice Traveller' };
const leadB = { _id: 'lead-b', name: 'Bob Explorer' };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAllLeads.mockResolvedValue({
    success: true,
    data: [leadA, leadB],
    pagination: { pages: 1, total: 2 },
  });
  mockGetLeadStats.mockResolvedValue({ success: true, summary: { total: 2 }, data: [] });
  mockGetSalesReps.mockResolvedValue({ success: true, data: [] });
  mockGetSettings.mockResolvedValue({ success: true, data: {} });
  mockGetStoredUser.mockReturnValue(null);
});

describe('LeadManagement — shared billing dialog state', () => {
  it('does not leak the previous lead when switching from Quotation to Invoice for a different lead', async () => {
    render(<LeadManagement />);
    await screen.findByText('Quotation:Alice Traveller');

    await userEvent.click(screen.getByText('Quotation:Alice Traveller'));
    expect(await screen.findByTestId('quotation-modal-lead')).toHaveTextContent('Alice Traveller');

    await userEvent.click(screen.getByText('Close Quotation'));
    expect(screen.queryByTestId('quotation-modal')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('Invoice:Bob Explorer'));
    expect(await screen.findByTestId('invoice-dialog-lead')).toHaveTextContent('Bob Explorer');
  });

  it('refetches leads on Quotation success without disturbing a subsequently opened Invoice for a different lead', async () => {
    render(<LeadManagement />);
    await screen.findByText('Quotation:Alice Traveller');
    const callsBeforeSuccess = mockGetAllLeads.mock.calls.length;

    await userEvent.click(screen.getByText('Quotation:Alice Traveller'));
    await screen.findByTestId('quotation-modal');
    await userEvent.click(screen.getByText('Quotation Success'));

    await waitFor(() => expect(mockGetAllLeads.mock.calls.length).toBeGreaterThan(callsBeforeSuccess));

    await userEvent.click(screen.getByText('Invoice:Bob Explorer'));
    expect(await screen.findByTestId('invoice-dialog-lead')).toHaveTextContent('Bob Explorer');
    const callsBeforeInvoiceSuccess = mockGetAllLeads.mock.calls.length;

    await userEvent.click(screen.getByText('Invoice Success'));
    await waitFor(() => expect(mockGetAllLeads.mock.calls.length).toBeGreaterThan(callsBeforeInvoiceSuccess));
  });

  it('reopens Quotation for the same lead after editing details from within the quotation flow', async () => {
    render(<LeadManagement />);
    await screen.findByText('Quotation:Alice Traveller');

    await userEvent.click(screen.getByText('Quotation:Alice Traveller'));
    await screen.findByTestId('quotation-modal');

    await userEvent.click(screen.getByText('Edit details'));
    expect(await screen.findByTestId('edit-lead-name')).toHaveTextContent('Alice Traveller');
    expect(screen.queryByTestId('quotation-modal')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('Close Editor'));

    expect(await screen.findByTestId('quotation-modal-lead')).toHaveTextContent('Alice Traveller');
  });
});

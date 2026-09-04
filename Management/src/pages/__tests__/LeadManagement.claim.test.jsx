import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const {
  mockGetAllLeads, mockClaimLead, mockGetLeadStats, mockGetSalesReps, mockGetAssignmentSettings, mockGetStoredUser,
} = vi.hoisted(() => ({
  mockGetAllLeads: vi.fn(),
  mockClaimLead: vi.fn(),
  mockGetLeadStats: vi.fn(),
  mockGetSalesReps: vi.fn(),
  mockGetAssignmentSettings: vi.fn(),
  mockGetStoredUser: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  leadAPI: {
    getAllLeads: mockGetAllLeads,
    claimLead: mockClaimLead,
    getLeadStats: mockGetLeadStats,
    getAssignmentSettings: mockGetAssignmentSettings,
  },
  adminAPI: { getSalesReps: mockGetSalesReps },
  authAPI: { getStoredUser: mockGetStoredUser },
}));

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  useNavigate: () => vi.fn(),
}));

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// Keep LeadTable real so the Claim row action is driven end-to-end; stub
// everything else so the suite only guards the claim flow.
vi.mock('../../features/lead-management/components/LeadStats', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/LeadFilters', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/NewLeadDialog', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/EditLeadDialog', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/RemarksDialog', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/WhatsAppHistoryDialog', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/FilterDialog', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/SettingsDialog', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/StatusChangeDialog', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/ActiveSalesRepsDialog', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/LeadSectionView', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/quotation/QuotationModal', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/InvoiceDialog', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/ReceiptDialog', () => ({ default: () => null }));
vi.mock('../../features/lead-management/components/VoucherDialog', () => ({ default: () => null }));

import LeadManagement from '../LeadManagement';

const pendingLead = {
  _id: 'p-1',
  id: 'p-1',
  name: 'Chat Lead',
  lifecycleStatus: 'PENDING_VERIFICATION',
  phone: '123456',
  email: 'chat@example.com',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAllLeads.mockResolvedValue({ success: true, data: [pendingLead], pagination: { pages: 1, total: 1 } });
  mockClaimLead.mockResolvedValue({ success: true, data: { id: 'p-1', lifecycleStatus: 'NEW' } });
  mockGetLeadStats.mockResolvedValue({ success: true, summary: { total: 1 }, data: [] });
  mockGetSalesReps.mockResolvedValue({ success: true, data: [] });
  mockGetAssignmentSettings.mockResolvedValue({ success: true, data: {} });
  mockGetStoredUser.mockReturnValue(null);
});

describe('LeadManagement — claim flow', () => {
  it('calls leadAPI.claimLead on the Claim action and refreshes the list', async () => {
    const user = userEvent.setup();
    render(<LeadManagement />);

    const claimButton = await screen.findByRole('button', { name: /claim/i });
    await user.click(claimButton);

    await waitFor(() => expect(mockClaimLead).toHaveBeenCalledWith('p-1'));
    // A successful claim triggers a list + stats refetch.
    expect(mockGetAllLeads.mock.calls.length).toBeGreaterThan(1);
    expect(mockGetLeadStats.mock.calls.length).toBeGreaterThan(1);
  });
});

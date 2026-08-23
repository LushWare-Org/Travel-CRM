import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const {
  mockGetAllSalesReps, mockDeleteSalesRep, mockGetOnlineStatus, mockGetSalesRepStats,
} = vi.hoisted(() => ({
  mockGetAllSalesReps: vi.fn(),
  mockDeleteSalesRep: vi.fn(),
  mockGetOnlineStatus: vi.fn(),
  mockGetSalesRepStats: vi.fn(),
}));

vi.mock('../../../../../services/salesRep.service', () => ({
  default: {
    getAllSalesReps: mockGetAllSalesReps,
    deleteSalesRep: mockDeleteSalesRep,
    getOnlineStatus: mockGetOnlineStatus,
    getSalesRepStats: mockGetSalesRepStats,
    resetSalesRepPassword: vi.fn(),
    updateSalesRep: vi.fn(),
    createSalesRep: vi.fn(),
  },
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import SalesRepManagement from '../SalesRepManagement';

const REP_ID = 'a0000000-0000-4000-8000-000000000002';

beforeEach(() => {
  mockGetAllSalesReps.mockReset();
  mockDeleteSalesRep.mockReset();
  mockGetOnlineStatus.mockResolvedValue({ status: 'success', data: { onlineStatus: {} } });
  mockGetSalesRepStats.mockResolvedValue({ status: 'success', data: { total: 1, active: 1, totalLeads: 0, totalEarnings: 0, avgConversion: 0 } });
});

describe('SalesRepManagement', () => {
  it('renders the list from the real flat-array backend contract (regression: list previously stayed empty)', async () => {
    mockGetAllSalesReps.mockResolvedValue({
      status: 'success',
      data: [{ id: REP_ID, name: 'Priya Nair', email: 'priya@test.com', isActive: true, isEmailVerified: true }],
      pagination: { total: 1, page: 1, limit: 10, pages: 1 },
    });

    render(<SalesRepManagement />);

    await waitFor(() => expect(screen.getByText('Priya Nair')).toBeInTheDocument());
  });

  it('sends the real id when deleting a sales rep', async () => {
    mockGetAllSalesReps.mockResolvedValue({
      status: 'success',
      data: [{ id: REP_ID, name: 'Priya Nair', email: 'priya@test.com', isActive: true, isEmailVerified: true }],
      pagination: { total: 1, page: 1, limit: 10, pages: 1 },
    });
    mockDeleteSalesRep.mockResolvedValue({ status: 'success' });

    const user = userEvent.setup();
    render(<SalesRepManagement />);

    await waitFor(() => expect(screen.getByText('Priya Nair')).toBeInTheDocument());

    await user.click(screen.getByTitle('Delete'));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Sales Representative' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(mockDeleteSalesRep).toHaveBeenCalledWith(REP_ID));
  });
});

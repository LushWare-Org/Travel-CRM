import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockGetAllVendors, mockDeleteVendor } = vi.hoisted(() => ({
  mockGetAllVendors: vi.fn(),
  mockDeleteVendor: vi.fn(),
}));

vi.mock('../../../../../services/vendor.service', () => ({
  default: {
    getAllVendors: mockGetAllVendors,
    deleteVendor: mockDeleteVendor,
    resetVendorPassword: vi.fn(),
    updateVendor: vi.fn(),
    createVendor: vi.fn(),
    getVendorStats: vi.fn().mockResolvedValue({ status: 'success', data: {} }),
    validateVendorData: () => ({ isValid: true, errors: {} }),
    cleanVendorData: (d) => d,
    getServiceTypeLabel: (t) => t,
    getStatusLabel: (s) => s,
    formatDate: () => '—',
  },
}));

import VendorManagement from '../VendorManagement';

const VENDOR_ID = 'a0000000-0000-4000-8000-000000000003';

beforeEach(() => {
  mockGetAllVendors.mockReset();
  mockDeleteVendor.mockReset();
});

describe('VendorManagement', () => {
  it('renders vendors from the real backend response (id, not _id)', async () => {
    mockGetAllVendors.mockResolvedValue({
      status: 'success',
      data: [{ id: VENDOR_ID, name: 'Ahmed Hassan', email: 'ahmed@test.com', businessName: 'Sunrise Hotels', isActive: true, vendorStatus: 'verified' }],
      pagination: { total: 1, page: 1, limit: 10, pages: 1 },
    });

    render(<VendorManagement />);

    await waitFor(() => expect(screen.getByText('Sunrise Hotels')).toBeInTheDocument());
  });

  it('sends the real id (via the _id-or-id fallback) when deleting a vendor (regression)', async () => {
    mockGetAllVendors.mockResolvedValue({
      status: 'success',
      data: [{ id: VENDOR_ID, name: 'Ahmed Hassan', email: 'ahmed@test.com', businessName: 'Sunrise Hotels', isActive: true, vendorStatus: 'verified' }],
      pagination: { total: 1, page: 1, limit: 10, pages: 1 },
    });
    mockDeleteVendor.mockResolvedValue({ status: 'success' });

    const user = userEvent.setup();
    render(<VendorManagement />);

    await waitFor(() => expect(screen.getByText('Sunrise Hotels')).toBeInTheDocument());

    await user.click(screen.getByTitle('Delete Vendor'));
    const dialog = await screen.findByRole('heading', { name: 'Delete Vendor' });
    await user.click(within(dialog.closest('div.p-6')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(mockDeleteVendor).toHaveBeenCalledWith(VENDOR_ID));
    expect(mockDeleteVendor).not.toHaveBeenCalledWith(undefined);
  });

  it('sends isActive (not vendorStatus) for the "Active Status" filter (regression: this used to mis-send vendorStatus=active, which the now-strict backend validator would 400 on)', async () => {
    mockGetAllVendors.mockResolvedValue({ status: 'success', data: [], pagination: { total: 0, page: 1, limit: 10, pages: 1 } });

    const user = userEvent.setup();
    render(<VendorManagement />);

    await waitFor(() => expect(mockGetAllVendors).toHaveBeenCalled());
    mockGetAllVendors.mockClear();

    const statusSelect = screen.getByDisplayValue('All Vendors');
    await user.selectOptions(statusSelect, 'active');

    await waitFor(() => expect(mockGetAllVendors).toHaveBeenCalled());
    const callParams = mockGetAllVendors.mock.calls[0][0];
    expect(callParams.isActive).toBe(true);
    expect(callParams).not.toHaveProperty('vendorStatus');
  });
});

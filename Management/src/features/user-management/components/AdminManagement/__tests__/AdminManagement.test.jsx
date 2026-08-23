import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockGetAllAdmins, mockDeleteUser, mockResetUserPassword, mockUpdateAdmin, mockUpdateAdminPermissions } = vi.hoisted(() => ({
  mockGetAllAdmins: vi.fn(),
  mockDeleteUser: vi.fn(),
  mockResetUserPassword: vi.fn(),
  mockUpdateAdmin: vi.fn(),
  mockUpdateAdminPermissions: vi.fn(),
}));

vi.mock('../../../../../services/admin.service', () => ({
  default: {
    getAllAdmins: mockGetAllAdmins,
    deleteUser: mockDeleteUser,
    resetUserPassword: mockResetUserPassword,
    updateAdmin: mockUpdateAdmin,
    updateAdminPermissions: mockUpdateAdminPermissions,
    generateTemporaryPassword: () => 'Temp1234!@#$',
  },
}));

vi.mock('../../../../../contexts/PermissionContext', () => ({
  usePermission: () => ({ hasPermission: () => true }),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

import AdminManagement from '../AdminManagement';

const ADMIN_ID = 'a0000000-0000-4000-8000-000000000001';

beforeEach(() => {
  mockGetAllAdmins.mockReset();
  mockDeleteUser.mockReset();
  mockResetUserPassword.mockReset();
});

describe('AdminManagement', () => {
  it('renders admins from the real backend response shape (data.users, id not _id)', async () => {
    mockGetAllAdmins.mockResolvedValue({
      status: 'success',
      data: {
        users: [{ id: ADMIN_ID, name: 'Alice Admin', email: 'alice@test.com', role: 'admin', isActive: true, permissions: [], canBeDeleted: true }],
        pagination: { total: 1 },
      },
    });

    render(<AdminManagement />);

    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument());
  });

  it('sends the real Postgres id (not undefined) when deleting an admin (regression)', async () => {
    mockGetAllAdmins.mockResolvedValue({
      status: 'success',
      data: {
        users: [{ id: ADMIN_ID, name: 'Alice Admin', email: 'alice@test.com', role: 'admin', isActive: true, permissions: [], canBeDeleted: true }],
        pagination: { total: 1 },
      },
    });
    mockDeleteUser.mockResolvedValue({ status: 'success' });

    const user = userEvent.setup();
    render(<AdminManagement />);

    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument());

    await user.click(screen.getByTitle('Delete Admin'));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Admin' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(mockDeleteUser).toHaveBeenCalledWith(ADMIN_ID));
    expect(mockDeleteUser).not.toHaveBeenCalledWith(undefined);
  });
});

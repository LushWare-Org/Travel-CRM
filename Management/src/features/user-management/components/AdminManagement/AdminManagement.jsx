import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash, Shield, Eye, EyeOff } from 'lucide-react';
import { 
  UserTableHeader, 
  Pagination, 
  UserFormDialog, 
  ConfirmationDialog,
  StatsCard,
  FormGroup 
} from '../Common';
import { STATUS_COLORS, ROLE_COLORS, ADMIN_PERMISSIONS_LIST } from '../../utils/constants';
import { filterUsers, paginateArray } from '../../utils/helpers';
import AdminTable from './AdminTable';
import AdminDetailsModal from './AdminDetailsModal';

const AdminManagement = () => {
  const [admins, setAdmins] = useState([
    {
      id: 1,
      name: 'Lisa Anderson',
      email: 'lisa@travelagency.com',
      phone: '+1-555-9012',
      status: 'active',
      createdAt: '2024-03-05',
      lastActive: '2024-10-20',
      permissions: ['manage_users', 'manage_sales_reps', 'manage_vendors', 'view_reports', 'manage_billing'],
      twoFactorEnabled: true
    },
    {
      id: 2,
      name: 'James Wilson',
      email: 'james@travelagency.com',
      phone: '+1-555-4321',
      status: 'active',
      createdAt: '2024-04-10',
      lastActive: '2024-10-19',
      permissions: ['manage_users', 'manage_sales_reps', 'view_reports', 'system_settings'],
      twoFactorEnabled: false
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewAdminDialog, setShowNewAdminDialog] = useState(false);
  const [showEditAdminDialog, setShowEditAdminDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [adminToDelete, setAdminToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    permissions: [],
    twoFactorEnabled: false
  });

  const ITEMS_PER_PAGE = 10;

  const filteredAdmins = useMemo(() => {
    return filterUsers(admins, searchTerm, {});
  }, [admins, searchTerm]);

  const paginatedData = useMemo(() => {
    return paginateArray(filteredAdmins, currentPage, ITEMS_PER_PAGE);
  }, [filteredAdmins, currentPage]);

  const stats = useMemo(() => ({
    total: admins.length,
    active: admins.filter(a => a.status === 'active').length,
    inactive: admins.filter(a => a.status === 'inactive').length,
    twoFactorEnabled: admins.filter(a => a.twoFactorEnabled).length
  }), [admins]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      permissions: [],
      twoFactorEnabled: false
    });
  };

  const handleAddAdmin = () => {
    if (formData.name && formData.email && formData.phone && formData.password) {
      const newAdmin = {
        id: Math.max(...admins.map(a => a.id), 0) + 1,
        ...formData,
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0],
        lastActive: new Date().toISOString().split('T')[0]
      };
      setAdmins([...admins, newAdmin]);
      setShowNewAdminDialog(false);
      resetForm();
    }
  };

  const handleEditAdmin = () => {
    if (selectedAdmin && formData.name && formData.email && formData.phone) {
      setAdmins(admins.map(a => 
        a.id === selectedAdmin.id 
          ? {
              ...a,
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              permissions: formData.permissions,
              twoFactorEnabled: formData.twoFactorEnabled
            }
          : a
      ));
      setSelectedAdmin(null);
      setShowEditAdminDialog(false);
      resetForm();
    }
  };

  const handleDeleteAdmin = (admin) => {
    setAdminToDelete(admin);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setAdmins(admins.filter(a => a.id !== adminToDelete.id));
    setShowDeleteConfirm(false);
    setAdminToDelete(null);
    setSelectedAdmin(null);
  };

  const openEditDialog = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      password: '',
      confirmPassword: '',
      permissions: admin.permissions || [],
      twoFactorEnabled: admin.twoFactorEnabled || false
    });
    setShowEditAdminDialog(true);
  };

  const togglePermission = (permissionId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Management</h2>
          <p className="text-gray-600 mt-1">Manage system administrators and their permissions</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowNewAdminDialog(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Admin
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard label="Total Admins" value={stats.total} icon={Shield} color="purple" />
        <StatsCard label="Active Admins" value={stats.active} icon={Shield} color="green" />
        <StatsCard label="2FA Enabled" value={stats.twoFactorEnabled} icon={Shield} color="blue" />
        <StatsCard label="Inactive" value={stats.inactive} icon={Shield} color="red" />
      </div>

      {/* Table Section */}
      <UserTableHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onFilterClick={() => {}}
        title="Admins List"
        subtitle="View and manage all system administrators"
      />

      <AdminTable
        admins={paginatedData.data}
        onEdit={openEditDialog}
        onDelete={handleDeleteAdmin}
        onSelectAdmin={setSelectedAdmin}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={paginatedData.pages}
        onPageChange={setCurrentPage}
        itemsPerPage={ITEMS_PER_PAGE}
        totalItems={filteredAdmins.length}
      />

      {/* Add Admin Dialog */}
      <UserFormDialog
        isOpen={showNewAdminDialog}
        onClose={() => {
          setShowNewAdminDialog(false);
          resetForm();
        }}
        onSubmit={handleAddAdmin}
        title="Add New Admin"
        subtitle="Create a new system administrator account"
        submitLabel="Create Admin"
        submitColor="purple"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Name" required>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Full Name"
              />
            </FormGroup>
            <FormGroup label="Email" required>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="admin@email.com"
              />
            </FormGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Phone" required>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="+1-555-0000"
              />
            </FormGroup>
            <FormGroup label="Password" required>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Set password"
              />
            </FormGroup>
          </div>

          <FormGroup label="Confirm Password" required>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Confirm password"
            />
          </FormGroup>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-semibold text-gray-900 mb-3">Permissions</p>
            <div className="space-y-2">
              {ADMIN_PERMISSIONS_LIST.map(perm => (
                <label key={perm.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-2 rounded">
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(perm.id)}
                    onChange={() => togglePermission(perm.id)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-gray-900">{perm.label}</span>
                    <span className="ml-2 text-xs text-gray-500">({perm.category})</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer p-3 bg-blue-50 rounded-lg border border-blue-200">
            <input
              type="checkbox"
              checked={formData.twoFactorEnabled}
              onChange={(e) => setFormData({ ...formData, twoFactorEnabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-gray-900 font-medium">Require Two-Factor Authentication</span>
          </label>
        </div>
      </UserFormDialog>

      {/* Edit Admin Dialog */}
      <UserFormDialog
        isOpen={showEditAdminDialog}
        onClose={() => {
          setShowEditAdminDialog(false);
          resetForm();
        }}
        onSubmit={handleEditAdmin}
        title="Edit Admin"
        subtitle="Update administrator information and permissions"
        submitLabel="Update Admin"
        submitColor="purple"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Name" required>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </FormGroup>
            <FormGroup label="Email" required>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </FormGroup>
          </div>

          <FormGroup label="Phone" required>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </FormGroup>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-semibold text-gray-900 mb-3">Permissions</p>
            <div className="space-y-2">
              {ADMIN_PERMISSIONS_LIST.map(perm => (
                <label key={perm.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-2 rounded">
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(perm.id)}
                    onChange={() => togglePermission(perm.id)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-gray-900">{perm.label}</span>
                    <span className="ml-2 text-xs text-gray-500">({perm.category})</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer p-3 bg-blue-50 rounded-lg border border-blue-200">
            <input
              type="checkbox"
              checked={formData.twoFactorEnabled}
              onChange={(e) => setFormData({ ...formData, twoFactorEnabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-gray-900 font-medium">Require Two-Factor Authentication</span>
          </label>
        </div>
      </UserFormDialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setAdminToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Admin"
        description={`Are you sure you want to delete ${adminToDelete?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDangerous={true}
      />
    </div>
  );
};

export default AdminManagement;

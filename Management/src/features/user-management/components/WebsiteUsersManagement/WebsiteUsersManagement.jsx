import React, { useState } from 'react';
import { Plus, Edit, Trash, Users, UserCheck, UserX, AlertCircle } from 'lucide-react';
import { 
  UserTableHeader, 
  Pagination, 
  UserFormDialog, 
  ConfirmationDialog,
  StatsCard,
  FormGroup 
} from '../Common';
import { STATUS_COLORS } from '../../utils/constants';
import WebsiteUsersTable from './WebsiteUsersTable';
import useWebsiteUsers from '../../hooks/useWebsiteUsers';

const WebsiteUsersManagement = () => {
  const {
    users,
    loading,
    error,
    pagination,
    filters,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    searchUsers,
    changePage,
    clearError,
  } = useWebsiteUsers();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    status: 'active'
  });

  // Calculate stats from all users
  const stats = {
    total: pagination?.totalUsers || 0,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    totalRevenue: users.reduce((sum, user) => sum + (user.totalSpent || 0), 0),
    totalBookings: users.reduce((sum, user) => sum + (user.bookings || 0), 0),
    avgSpent: users.length > 0 ? (users.reduce((sum, user) => sum + (user.totalSpent || 0), 0) / users.length).toFixed(2) : 0
  };

  // Filter users based on status
  const filteredUsers = filterStatus === 'all'
    ? users
    : users.filter(u => u.status === filterStatus);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      status: 'active'
    });
    setFormError('');
  };

  const handleAddUser = async () => {
    setFormError('');
    
    // Validation
    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      setFormError('All fields are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await createUser(formData);
      setShowNewUserDialog(false);
      resetForm();
      // Clear search and filters after successful user creation
      setSearchTerm('');
      setFilterStatus('all');
    } catch (err) {
      setFormError(err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    setFormError('');
    
    // Validation
    if (!formData.name || !formData.email || !formData.phone) {
      setFormError('Name, email, and phone are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUser(selectedUser.id, formData);
      setShowEditUserDialog(false);
      setSelectedUser(null);
      resetForm();
      // Clear search and filters after successful update
      setSearchTerm('');
      setFilterStatus('all');
    } catch (err) {
      setFormError(err.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setIsSubmitting(true);
    try {
      await deleteUser(userToDelete.id);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      setSelectedUser(null);
      // Clear search and filters after successful deletion
      setSearchTerm('');
      setFilterStatus('all');
    } catch (err) {
      setFormError(err.message || 'Failed to delete user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await toggleUserStatus(user.id, user.status);
    } catch (err) {
      setFormError(err.message || 'Failed to toggle user status');
    }
  };

  const openEditDialog = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      password: '' // Don't show password in edit
    });
    setShowEditUserDialog(true);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    searchUsers(value);
  };

  const handleFilterStatusChange = (value) => {
    setFilterStatus(value);
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-900 font-medium text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Website Users</h2>
          <p className="text-gray-600 mt-1">Manage platform users and their bookings</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowNewUserDialog(true);
          }}
          disabled={loading}
          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <StatsCard label="Total Users" value={stats.total} icon={Users} color="cyan" />
        <StatsCard label="Active Users" value={stats.active} icon={UserCheck} color="green" />
        <StatsCard label="Inactive" value={stats.inactive} icon={UserX} color="red" />
        <StatsCard label="Total Bookings" value={stats.totalBookings} icon={Users} color="purple" />
        <StatsCard 
          label="Total Revenue" 
          value={`$${(stats.totalRevenue / 1000).toFixed(1)}K`} 
          icon={Users} 
          color="green" 
        />
        <StatsCard 
          label="Avg. Spent" 
          value={`$${stats.avgSpent}`} 
          icon={Users} 
          color="blue" 
        />
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex gap-4">
        <div className="w-64">
          <label className="block text-sm font-medium text-gray-700 mb-2">User Status</label>
          <select
            value={filterStatus}
            onChange={(e) => handleFilterStatusChange(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
          >
            <option value="all">All Users</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <UserTableHeader
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onFilterClick={() => {}}
        title="Users List"
        subtitle={loading ? 'Loading users...' : `Showing ${filteredUsers.length} users`}
        disabled={loading}
      />

      {loading && !users.length ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">Loading users...</p>
        </div>
      ) : (
        <>
          <WebsiteUsersTable
            users={filteredUsers}
            onEdit={openEditDialog}
            onDelete={handleDeleteUser}
            onToggleStatus={handleToggleStatus}
            loading={loading}
          />

          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={changePage}
            itemsPerPage={pagination.usersPerPage}
            totalItems={pagination.totalUsers}
            disabled={loading}
          />
        </>
      )}

      {/* Add User Dialog */}
      <UserFormDialog
        isOpen={showNewUserDialog}
        onClose={() => {
          setShowNewUserDialog(false);
          resetForm();
        }}
        onSubmit={handleAddUser}
        title="Add New Website User"
        subtitle="Register a new platform user"
        submitLabel="Create User"
        submitColor="cyan"
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Full Name" required>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                placeholder="John Doe"
              />
            </FormGroup>
            <FormGroup label="Email" required>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                placeholder="john@example.com"
              />
            </FormGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Phone" required>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                placeholder="+1-555-0000"
              />
            </FormGroup>
            <FormGroup label="Password" required>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                placeholder="Minimum 6 characters"
              />
            </FormGroup>
          </div>

          <div className="bg-cyan-50 border border-cyan-200 p-4 rounded-lg">
            <p className="text-xs font-semibold text-cyan-900 mb-2">Quick Info</p>
            <ul className="text-xs text-cyan-800 space-y-1">
              <li>• User can access the platform immediately after creation</li>
              <li>• Activation email will be sent to provided email</li>
              <li>• All bookings and spending tracked automatically</li>
            </ul>
          </div>
        </div>
      </UserFormDialog>

      {/* Edit User Dialog */}
      <UserFormDialog
        isOpen={showEditUserDialog}
        onClose={() => {
          setShowEditUserDialog(false);
          resetForm();
        }}
        onSubmit={handleEditUser}
        title="Edit Website User"
        subtitle="Update user information"
        submitLabel="Update User"
        submitColor="cyan"
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Full Name" required>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
              />
            </FormGroup>
            <FormGroup label="Email" required>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
              />
            </FormGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Phone" required>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
              />
            </FormGroup>
            <FormGroup label="Status" required>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FormGroup>
          </div>
        </div>
      </UserFormDialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Website User"
        description={`Are you sure you want to delete ${userToDelete?.name}? This action cannot be undone and will remove all associated data.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDangerous={true}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default WebsiteUsersManagement;

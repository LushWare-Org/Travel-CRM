import React, { useState } from 'react';
import { Edit, Trash, Users, UserCheck, UserX, AlertCircle, Globe } from 'lucide-react';
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
import { validatePhone, formatPhoneToE164, getPhonePlaceholder, COUNTRIES } from '../../utils/phoneUtils';

const WebsiteUsersManagement = () => {
  const {
    users,
    loading,
    error,
    pagination,
    filters,
    updateUser,
    deleteUser,
    toggleUserStatus,
    searchUsers,
    changePage,
    clearError,
  } = useWebsiteUsers();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
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
    phoneCountry: 'US', // Default to US
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
      phoneCountry: 'US',
      password: '',
      status: 'active'
    });
    setFormError('');
  };

  const handleEditUser = async () => {
    setFormError('');
    
    // Validation
    if (!formData.name || !formData.email || !formData.phone) {
      setFormError('Name, email, and phone are required');
      return;
    }

    // Validate phone number format
    if (!validatePhone(formData.phone, formData.phoneCountry)) {
      setFormError(`Please provide a valid phone number for ${formData.phoneCountry}`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Format phone to E.164 for API
      const phoneData = formatPhoneToE164(formData.phone, formData.phoneCountry);
      
      if (!phoneData) {
        setFormError('Failed to format phone number. Please check the input.');
        setIsSubmitting(false);
        return;
      }

      const dataToSend = {
        ...formData,
        phone: phoneData.e164,
        phoneCountry: phoneData.countryCode
      };

      await updateUser(selectedUser.id, dataToSend);
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
      phoneCountry: user.phoneCountry || 'US',
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

      {/* Edit User Dialog */}
      <UserFormDialog
        isOpen={showEditUserDialog}
        onClose={() => {
          setShowEditUserDialog(false);
          setFormError('');
          resetForm();
        }}
        onSubmit={handleEditUser}
        title="Edit Website User"
        subtitle="Update user information"
        submitLabel="Update User"
        submitColor="cyan"
        isSubmitting={isSubmitting}
        error={formError}
      >
        <div className="space-y-4">

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
              <div className="flex gap-2">
                <select
                  value={formData.phoneCountry}
                  onChange={(e) => setFormData({ ...formData, phoneCountry: e.target.value })}
                  disabled={isSubmitting}
                  className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                >
                  {COUNTRIES.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={isSubmitting}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                  placeholder={getPhonePlaceholder(formData.phoneCountry)}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Enter phone number with or without country code</p>
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

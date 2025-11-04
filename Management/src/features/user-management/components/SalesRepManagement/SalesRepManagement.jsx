import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Edit, Trash, User, TrendingUp, Mail, CheckCircle, AlertCircle, Copy, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  UserTableHeader, 
  Pagination, 
  UserFormDialog, 
  ConfirmationDialog,
  StatsCard,
  FormGroup 
} from '../Common';
import { STATUS_COLORS } from '../../utils/constants';
import { filterUsers, paginateArray } from '../../utils/helpers';
import SalesRepTable from './SalesRepTable';
import salesRepService from '../../../../services/salesRep.service';

const SalesRepManagement = () => {
  const isInitialMount = useRef(true);
  const [salesReps, setSalesReps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showNewRepDialog, setShowNewRepDialog] = useState(false);
  const [showEditRepDialog, setShowEditRepDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResendInviteConfirm, setShowResendInviteConfirm] = useState(false);
  const [showPasswordResetConfirm, setShowPasswordResetConfirm] = useState(false);
  const [selectedRep, setSelectedRep] = useState(null);
  const [repToDelete, setRepToDelete] = useState(null);
  const [repToResendInvite, setRepToResendInvite] = useState(null);
  const [repToResetPassword, setRepToResetPassword] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalLeads: 0,
    totalEarnings: 0,
    avgConversion: 0
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commissionRate: 10,
    targetLeads: 50
  });

  const ITEMS_PER_PAGE = 10;

  // Load sales reps from backend on mount
  useEffect(() => {
    loadSalesReps();
    loadStats();
  }, []);

  // Reload when page or search changes (skip initial mount to avoid duplicate call)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    loadSalesReps();
  }, [currentPage, searchTerm]);

  /**
   * Load sales reps from backend API with pagination
   */
  const loadSalesReps = async (page = currentPage, search = searchTerm) => {
    try {
      setIsLoading(true);
      setError('');
      
      // Build params object - only include search if it has a value
      const params = {
        page: page,
        limit: ITEMS_PER_PAGE,
        sort: '-createdAt'
      };
      
      // Only add search if it's not empty
      if (search && search.trim()) {
        params.search = search.trim();
      }
      
      const response = await salesRepService.getAllSalesReps(params);

      // Handle different response structures
      let repsData = [];
      if (response.status === 'success' && response.data) {
        repsData = response.data.salesReps || [];
      } else if (Array.isArray(response.data)) {
        repsData = response.data;
      } else if (Array.isArray(response)) {
        repsData = response;
      }

      // Transform the data to match the expected format
      const transformedReps = repsData.map(rep => ({
        id: rep._id || rep.id,
        name: rep.name,
        email: rep.email,
        phone: rep.phone || '',
        status: rep.isActive ? 'active' : 'inactive',
        accountStatus: rep.mustChangePassword ? 'pending_password_reset' : (rep.isEmailVerified ? 'verified' : 'pending_first_login'),
        commissionRate: rep.commissionRate || 10,
        leadsAssigned: rep.leadsAssigned || 0,
        leadsConverted: rep.leadsConverted || 0,
        createdAt: rep.createdAt,
        isActive: rep.isActive,
        isEmailVerified: rep.isEmailVerified,
        isTempPassword: rep.isTempPassword,
        mustChangePassword: rep.mustChangePassword
      }));
      
      setSalesReps(transformedReps);
      
      // Handle pagination
      if (response.data && response.data.pagination) {
        setTotalPages(response.data.pagination.totalPages || 1);
      } else {
        setTotalPages(1);
      }
    } catch (err) {
      const errorMsg = err.userMessage || err.message || 'Failed to load sales representatives';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Load sales reps error:', err);
      console.error('Error details:', err.response || err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load statistics from backend
   */
  const loadStats = async () => {
    try {
      const response = await salesRepService.getSalesRepStats();
      
      if (response.data) {
        setStats({
          total: response.data.total || 0,
          active: response.data.active || 0,
          totalLeads: response.data.totalLeads || 0,
          totalEarnings: response.data.totalEarnings || 0,
          avgConversion: response.data.avgConversion || 0
        });
      }
    } catch (err) {
      console.error('Load stats error:', err);
    }
  };

  const openEditDialog = (rep) => {
    setSelectedRep(rep);
    setFormData({
      name: rep.name,
      email: rep.email,
      phone: rep.phone,
      commissionRate: rep.commissionRate,
      targetLeads: 50
    });
    setShowEditRepDialog(true);
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      commissionRate: 10,
      targetLeads: 50
    });
    setSelectedRep(null);
  };

  /**
   * Handle adding a new sales representative
   */
  const handleAddRep = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.commissionRate < 0 || formData.commissionRate > 100) {
      toast.error('Commission rate must be between 0 and 100');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        commissionRate: formData.commissionRate
      };

      const response = await salesRepService.createSalesRep(payload);

      if (response.data) {
        toast.success(`✅ Sales rep created! Invitation sent to ${formData.email}`);
        setShowNewRepDialog(false);
        resetForm();
        
        // Reset search and pagination state
        setSearchTerm('');
        setCurrentPage(1);
        
        // Force reload with explicit parameters to ensure we get all reps
        await loadSalesReps(1, '');
        await loadStats();
      }
    } catch (err) {
      const errorMsg = err.userMessage || err.message || 'Failed to create sales representative';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Create sales rep error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle editing a sales representative
   */
  const handleEditRep = async (e) => {
    e.preventDefault();

    if (!selectedRep) return;

    // Validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.commissionRate < 0 || formData.commissionRate > 100) {
      toast.error('Commission rate must be between 0 and 100');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        commissionRate: formData.commissionRate
      };

      const response = await salesRepService.updateSalesRep(selectedRep.id, payload);

      if (response.data) {
        toast.success('✅ Sales representative updated successfully');
        setShowEditRepDialog(false);
        resetForm();
        await loadSalesReps();
        await loadStats();
      }
    } catch (err) {
      const errorMsg = err.userMessage || err.message || 'Failed to update sales representative';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Update sales rep error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle delete confirmation dialog
   */
  const handleDeleteRep = (rep) => {
    setRepToDelete(rep);
    setShowDeleteConfirm(true);
  };

  /**
   * Confirm and delete sales representative
   */
  const confirmDelete = async () => {
    if (!repToDelete) return;

    try {
      setIsSubmitting(true);
      setError('');

      const response = await salesRepService.deleteSalesRep(repToDelete.id);

      if (response.status === 'success') {
        toast.success(`✅ Sales representative deleted successfully`);
        setShowDeleteConfirm(false);
        setRepToDelete(null);
        await loadSalesReps();
        await loadStats();
      }
    } catch (err) {
      const errorMsg = err.userMessage || err.message || 'Failed to delete sales representative';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Delete sales rep error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle resend invitation confirmation dialog
   */
  const handleResendInvitation = (rep) => {
    setRepToResendInvite(rep);
    setShowResendInviteConfirm(true);
  };

  /**
   * Confirm and resend invitation
   */
  const confirmResendInvitation = async () => {
    if (!repToResendInvite) return;

    try {
      setIsSubmitting(true);
      setError('');

      const response = await salesRepService.resetSalesRepPassword(repToResendInvite.id);

      if (response.data) {
        toast.success(`✅ Invitation resent to ${repToResendInvite.email}`);
        setShowResendInviteConfirm(false);
        setRepToResendInvite(null);
      }
    } catch (err) {
      const errorMsg = err.userMessage || err.message || 'Failed to resend invitation';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Resend invitation error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle force password reset confirmation dialog
   */
  const handleForcePasswordReset = (rep) => {
    setRepToResetPassword(rep);
    setShowPasswordResetConfirm(true);
  };

  /**
   * Confirm and send password reset
   */
  const confirmPasswordReset = async () => {
    if (!repToResetPassword) return;

    try {
      setIsSubmitting(true);
      setError('');

      const response = await salesRepService.resetSalesRepPassword(repToResetPassword.id);

      if (response.data) {
        toast.success(`✅ Password reset email sent to ${repToResetPassword.email}`);
        setShowPasswordResetConfirm(false);
        setRepToResetPassword(null);
      }
    } catch (err) {
      const errorMsg = err.userMessage || err.message || 'Failed to send password reset';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Password reset error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center gap-3">
          <Loader className="w-5 h-5 text-blue-600 animate-spin" />
          <p className="text-gray-700 font-medium">Loading sales representatives...</p>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Sales Representatives</h2>
              <p className="text-gray-600 mt-1">Manage sales team members and track performance</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowNewRepDialog(true);
              }}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Sales Rep
            </button>
          </div>

          {/* Security Info Banner */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Account & Security Policy</p>
              <p className="text-sm text-blue-800 mt-1">
                Sales reps receive invitation emails with temporary passwords. They must set a permanent password on first login. 
                Passwords expire after 90 days and require: 12+ characters, uppercase, lowercase, numbers, and symbols.
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <StatsCard label="Total Reps" value={stats.total} icon={User} color="blue" />
            <StatsCard label="Active Reps" value={stats.active} icon={User} color="green" />
            <StatsCard label="Total Leads" value={stats.totalLeads} icon={TrendingUp} color="purple" />
            <StatsCard label="Conv. Rate (%)" value={stats.avgConversion} icon={TrendingUp} color="orange" />
            <StatsCard 
              label="Total Earnings" 
              value={`$${(stats.totalEarnings / 1000).toFixed(1)}K`} 
              icon={User} 
              color="green" 
            />
          </div>

          {/* Table Section */}
          <UserTableHeader
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onFilterClick={() => {}}
            title="Sales Representatives List"
            subtitle="Monitor performance and manage sales team"
          />

          {salesReps.length > 0 ? (
            <>
              <SalesRepTable
                reps={salesReps}
                onEdit={openEditDialog}
                onDelete={handleDeleteRep}
                onResendInvite={handleResendInvitation}
                onForcePasswordReset={handleForcePasswordReset}
              />

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={ITEMS_PER_PAGE}
                totalItems={salesReps.length}
              />
            </>
          ) : (
            <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No sales representatives found</p>
              <p className="text-sm text-gray-500 mt-1">Create your first sales rep by clicking the "Add Sales Rep" button</p>
            </div>
          )}
        </>
      )}

      {/* Add Sales Rep Dialog */}
      <UserFormDialog
        isOpen={showNewRepDialog}
        onClose={() => {
          setShowNewRepDialog(false);
          resetForm();
        }}
        onSubmit={handleAddRep}
        title="Add New Sales Representative"
        subtitle="Onboard a new sales team member"
        submitLabel={isSubmitting ? 'Creating...' : 'Create & Send Invitation'}
        submitColor="blue"
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          {/* What Happens Next */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-xs font-semibold text-blue-900">WHAT HAPPENS NEXT:</p>
            <ol className="text-xs text-blue-800 mt-2 space-y-1 ml-4">
              <li>1. ✅ Sales rep account is created in the system</li>
              <li>2. 🔐 Temporary password is generated automatically</li>
              <li>3. 📧 Invitation email is sent to their address</li>
              <li>4. 🔑 They must set permanent password on first login</li>
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Full Name" required>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="John Doe"
              />
            </FormGroup>
            <FormGroup label="Email" required>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="john@email.com"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="+1-555-0000"
              />
            </FormGroup>
            <FormGroup label="Commission Rate (%)" required>
              <input
                type="number"
                value={formData.commissionRate}
                onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) })}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="10"
                min="0"
                max="100"
              />
            </FormGroup>
          </div>

          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <p className="text-xs font-semibold text-green-900 mb-2">🔐 Account Security</p>
            <ul className="text-xs text-green-800 space-y-1">
              <li>• Temporary password: Auto-generated (12 chars, secure)</li>
              <li>• Sent via email: Sales rep receives invitation link</li>
              <li>• First login: Must create permanent password</li>
              <li>• Password expires: After 90 days</li>
            </ul>
          </div>
        </div>
      </UserFormDialog>

      {/* Edit Sales Rep Dialog */}
      <UserFormDialog
        isOpen={showEditRepDialog}
        onClose={() => {
          setShowEditRepDialog(false);
          resetForm();
        }}
        onSubmit={handleEditRep}
        title="Edit Sales Representative"
        subtitle="Update sales rep information"
        submitLabel={isSubmitting ? 'Updating...' : 'Update Sales Rep'}
        submitColor="blue"
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Full Name" required>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </FormGroup>
            <FormGroup label="Email" required>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </FormGroup>
            <FormGroup label="Commission Rate (%)" required>
              <input
                type="number"
                value={formData.commissionRate}
                onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) })}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                min="0"
                max="100"
              />
            </FormGroup>
          </div>
        </div>
      </UserFormDialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setRepToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Sales Representative"
        description={`Are you sure you want to delete ${repToDelete?.name}? Their assigned leads will need to be reassigned.`}
        confirmLabel={isSubmitting ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        isDangerous={true}
        isSubmitting={isSubmitting}
      />

      {/* Resend Invitation Dialog */}
      <ConfirmationDialog
        isOpen={showResendInviteConfirm}
        onClose={() => {
          setShowResendInviteConfirm(false);
          setRepToResendInvite(null);
        }}
        onConfirm={confirmResendInvitation}
        title="Resend Invitation"
        description={`Resend invitation email to ${repToResendInvite?.email}? They will receive a new temporary password and invitation link.`}
        confirmLabel={isSubmitting ? 'Sending...' : 'Resend'}
        cancelLabel="Cancel"
        isSubmitting={isSubmitting}
      />

      {/* Password Reset Dialog */}
      <ConfirmationDialog
        isOpen={showPasswordResetConfirm}
        onClose={() => {
          setShowPasswordResetConfirm(false);
          setRepToResetPassword(null);
        }}
        onConfirm={confirmPasswordReset}
        title="Force Password Reset"
        description={`Send password reset email to ${repToResetPassword?.email}? They will receive a new temporary password and must create a permanent one.`}
        confirmLabel={isSubmitting ? 'Sending...' : 'Send Reset Email'}
        cancelLabel="Cancel"
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default SalesRepManagement;

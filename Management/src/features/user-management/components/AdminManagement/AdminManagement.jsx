import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit, Trash, Shield, Mail, AlertCircle, CheckCircle, RotateCcw, Clock, Loader } from 'lucide-react';
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
import { formatPhoneToE164, COUNTRIES } from '../../utils/phoneUtils';
import AdminTable from './AdminTable';
import adminService from '../../../../services/admin.service';

const AdminManagement = () => {
  // State management
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewAdminDialog, setShowNewAdminDialog] = useState(false);
  const [showEditAdminDialog, setShowEditAdminDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInviteResendConfirm, setShowInviteResendConfirm] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [adminToDelete, setAdminToDelete] = useState(null);
  const [adminToResendInvite, setAdminToResendInvite] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: 'US',
    permissions: []
  });

  const ITEMS_PER_PAGE = 10;

  // Load admins on component mount
  useEffect(() => {
    loadAdmins();
  }, []);

  /**
   * Load all admins from backend
   */
  const loadAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getAllAdmins({
        limit: 100,
        page: 1,
        sort: '-createdAt'
      });

      if (response.status === 'success') {
        // Handle different response data structures
        const adminsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.users || response.data?.data || []);

        // Transform backend data to frontend format
        const transformedAdmins = adminsData.map(admin => ({
          id: admin._id,
          name: admin.name,
          email: admin.email,
          phone: admin.phone || '',
          role: admin.role,
          isSuperAdmin: admin.isSuperAdmin || false,
          status: admin.isActive ? 'active' : 'inactive',
          // Use mustChangePassword flag to determine account status
          accountStatus: admin.mustChangePassword ? 'pending_password_reset' : (admin.isEmailVerified ? 'verified' : 'pending_first_login'),
          createdAt: admin.createdAt,
          lastActive: admin.lastLogin,
          permissions: admin.permissions || [],
          passwordExpireDate: admin.passwordExpireDate,
          invitationSentAt: admin.createdAt,
          firstLoginAt: admin.lastLogin,
          isEmailVerified: admin.isEmailVerified,
          isTempPassword: admin.isTempPassword,
          mustChangePassword: admin.mustChangePassword,
          canBeDeleted: admin.canBeDeleted !== false // Default to true if not set
        }));
        setAdmins(transformedAdmins);
      } else {
        setError('Failed to load admins: Invalid response from server');
      }
    } catch (err) {
      console.error('Error loading admins:', err);
      setError(err.message || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  // 🔐 Generate secure temporary password
  const generateTemporaryPassword = () => {
    return adminService.generateTemporaryPassword();
  };

  // 📧 Simulate sending invitation email
  const sendInvitationEmail = (admin, tempPassword) => {
    console.log(`📧 Email sent to ${admin.email}`);
    console.log(`
      ╔════════════════════════════════════════════════════════════╗
      ║           ADMIN ACCOUNT INVITATION EMAIL                   ║
      ╚════════════════════════════════════════════════════════════╝
      
      To: ${admin.email}
      Subject: Welcome to Trip Sky Way - Admin Account Created
      
      ─────────────────────────────────────────────────────────────
      
      Dear ${admin.name},
      
      Your admin account has been successfully created in Trip Sky Way.
      
      📋 ACCOUNT DETAILS:
      ├─ Email: ${admin.email}
      ├─ Temporary Password: ${tempPassword}
      └─ Link: https://tripskiway.com/auth/invite/${admin.id}
      
      🔐 FIRST LOGIN INSTRUCTIONS:
      1. Click the invitation link above
      2. Enter your email and temporary password
      3. You will be prompted to SET A NEW PERMANENT PASSWORD
      4. (Optional) Enable two-factor authentication
      5. Complete setup and start using the system
      
      ⏰ IMPORTANT: Temporary password expires in 48 hours
      
      PASSWORD REQUIREMENTS:
      ├─ Minimum 12 characters
      ├─ At least one uppercase letter (A-Z)
      ├─ At least one lowercase letter (a-z)
      ├─ At least one number (0-9)
      └─ At least one special character (!@#$%^&*)
      
      💡 YOUR PERMISSIONS:
      ${admin.permissions.map(p => `      ├─ ${ADMIN_PERMISSIONS_LIST.find(x => x.id === p)?.label}`).join('\n')}
      
      If you did not request this account or have questions, please
      contact the support team immediately.
      
      Best regards,
      Trip Sky Way Admin Team
      https://tripskiway.com/support
      
      ─────────────────────────────────────────────────────────────
    `);
    
    // TODO: Replace with actual email service (SendGrid, AWS SES, Nodemailer, etc.)
  };

  // 📧 Simulate sending password reset email
  const sendPasswordResetEmail = (admin, tempPassword) => {
    console.log(`📧 Password Reset Email sent to ${admin.email}`);
    console.log(`
      ╔════════════════════════════════════════════════════════════╗
      ║           PASSWORD RESET REQUEST                           ║
      ╚════════════════════════════════════════════════════════════╝
      
      To: ${admin.email}
      Subject: Password Reset - Trip Sky Way Admin Account
      
      ─────────────────────────────────────────────────────────────
      
      Dear ${admin.name},
      
      A password reset has been initiated for your admin account.
      
      🔑 NEW TEMPORARY PASSWORD: ${tempPassword}
      🔗 Reset Link: https://tripskiway.com/auth/reset/${admin.id}
      
      ⏰ This temporary password expires in 48 hours
      
      PASSWORD REQUIREMENTS:
      ├─ Minimum 12 characters
      ├─ At least one uppercase letter
      ├─ At least one lowercase letter
      ├─ At least one number
      └─ At least one special character
      
      If you did not request this password reset, please contact
      your system administrator immediately.
      
      Best regards,
      Trip Sky Way Admin Team
      
      ─────────────────────────────────────────────────────────────
    `);
  };

  const filteredAdmins = useMemo(() => {
    return filterUsers(admins, searchTerm, {});
  }, [admins, searchTerm]);

  const paginatedData = useMemo(() => {
    return paginateArray(filteredAdmins, currentPage, ITEMS_PER_PAGE);
  }, [filteredAdmins, currentPage]);

  const stats = useMemo(() => ({
    total: admins.length,
    active: admins.filter(a => a.status === 'active').length,
    invited: admins.filter(a => a.status === 'invited').length,
    inactive: admins.filter(a => a.status === 'inactive').length
  }), [admins]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      countryCode: 'US',
      permissions: []
    });
  };

  const handleAddAdmin = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      setError('Please fill in all required fields');
      return;
    }

    // Format phone to E.164 format
    const phoneFormatted = formatPhoneToE164(formData.phone, formData.countryCode);
    if (!phoneFormatted) {
      setError(`Invalid phone number for ${formData.countryCode}. Please check the format.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Generate temporary password
      const tempPassword = generateTemporaryPassword();

      // Create admin via API
      const response = await adminService.createAdmin({
        name: formData.name,
        email: formData.email,
        phone: phoneFormatted.e164, // Send E.164 formatted phone
        password: tempPassword,
        role: 'admin',
        permissions: formData.permissions || [] // ✅ Include permissions
      });

      if (response.status === 'success') {
        // Get user data from response
        const userData = response.data?.user || response.data;
        
        // Verify we have the ID field
        if (!userData._id && !userData.id) {
          throw new Error('Invalid response: missing user ID');
        }

        // Apply defaults for fields that backend might not return
        const isEmailVerified = userData.isEmailVerified ?? false;
        const isTempPassword = userData.isTempPassword ?? true;
        const mustChangePassword = userData.mustChangePassword ?? true;

        // Determine account status based on the actual flags (after defaults applied)
        let accountStatus = 'pending_first_login';
        if (mustChangePassword) {
          accountStatus = 'pending_password_reset';
        } else if (isEmailVerified) {
          accountStatus = 'verified';
        }

        const newAdmin = {
          id: userData._id || userData.id,
          name: userData.name || formData.name,
          email: userData.email || formData.email,
          phone: userData.phone || phoneFormatted.e164,
          status: 'active',
          accountStatus: accountStatus,
          createdAt: userData.createdAt || new Date().toISOString(),
          lastActive: userData.lastLogin || null,
          permissions: userData.permissions || formData.permissions || [], // ✅ Use backend data first
          passwordExpireDate: userData.passwordExpireDate || null,
          invitationSentAt: new Date().toISOString(),
          firstLoginAt: userData.lastLogin || null,
          isEmailVerified: isEmailVerified,
          isTempPassword: isTempPassword,
          mustChangePassword: mustChangePassword
        };

        // Log email details AFTER creating the object (so email is defined)
        console.log(`📧 Email sent to ${newAdmin.email}`);
        console.log(`Temporary Password: ${tempPassword}`);

        // Update state with new admin
        setAdmins(prev => [...prev, newAdmin]);
        setShowNewAdminDialog(false);
        setSearchTerm(''); // Clear search bar after creation
        setSuccessMessage(`✅ Admin created! Invitation sent to ${newAdmin.email}`);
        setTimeout(() => setSuccessMessage(''), 5000);
        resetForm();
      }
    } catch (err) {
      console.error('Error creating admin:', err);
      setError(err.message || 'Failed to create admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAdmin = async () => {
    if (!selectedAdmin || !formData.name || !formData.email || !formData.phone) {
      setError('Please fill in all required fields');
      return;
    }

    // Format phone to E.164 format
    const phoneFormatted = formatPhoneToE164(formData.phone, formData.countryCode);
    if (!phoneFormatted) {
      setError(`Invalid phone number for ${formData.countryCode}. Please check the format.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Get current user from localStorage
      const currentUserStr = localStorage.getItem('user');
      const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
      const isEditingSelf = currentUser && (currentUser.id === selectedAdmin.id || currentUser._id === selectedAdmin.id);

      // Update admin basic info via API
      const response = await adminService.updateAdmin(selectedAdmin.id, {
        name: formData.name,
        email: formData.email,
        phone: phoneFormatted.e164, // Send E.164 formatted phone
        role: 'admin'
      });

      // Only update permissions if NOT editing own account
      if (!isEditingSelf) {
        await adminService.updateAdminPermissions(selectedAdmin.id, formData.permissions || []);
      } else {
        console.log('⚠️ Skipping permission update - cannot modify own permissions');
      }

      if (response.status === 'success') {
        setAdmins(admins.map(a => 
          a.id === selectedAdmin.id 
            ? {
                ...a,
                name: formData.name,
                email: formData.email,
                phone: phoneFormatted.e164,
                permissions: isEditingSelf ? a.permissions : (formData.permissions || [])
              }
            : a
        ));
        setSelectedAdmin(null);
        setShowEditAdminDialog(false);
        
        if (isEditingSelf) {
          setSuccessMessage(`✅ Profile updated successfully (permissions cannot be self-modified)`);
        } else {
          setSuccessMessage(`✅ Admin updated successfully`);
        }
        
        setTimeout(() => setSuccessMessage(''), 5000);
        resetForm();
      }
    } catch (err) {
      console.error('Error updating admin:', err);
      setError(err.message || 'Failed to update admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔄 Resend invitation to pending admin
  const handleResendInvitation = (admin) => {
    setAdminToResendInvite(admin);
    setShowInviteResendConfirm(true);
  };

  const confirmResendInvitation = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const tempPassword = generateTemporaryPassword();
      
      // In a real app, you'd call an API to resend the invitation
      // For now, we'll just update the local state and log
      setAdmins(admins.map(a => 
        a.id === adminToResendInvite.id 
          ? { ...a, invitationSentAt: new Date().toISOString() }
          : a
      ));
      
      setSuccessMessage(`✅ Invitation resent to ${adminToResendInvite.email}`);
      setTimeout(() => setSuccessMessage(''), 5000);
      setShowInviteResendConfirm(false);
      setAdminToResendInvite(null);

      // Log email details
      console.log(`📧 Invitation resent to ${adminToResendInvite.email}`);
      console.log(`Temporary Password: ${tempPassword}`);
    } catch (err) {
      console.error('Error resending invitation:', err);
      setError(err.message || 'Failed to resend invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔑 Force password reset
  const handleForcePasswordReset = async (admin) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // ✅ Call the backend API to force password reset and send email
      const response = await adminService.resetUserPassword(admin.id);

      if (response.status === 'success') {
        // Update admin status to reflect password reset
        setAdmins(admins.map(a => 
          a.id === admin.id 
            ? { 
                ...a, 
                status: 'password_reset_required',
                accountStatus: 'pending_password_change',
                isTempPassword: true
              }
            : a
        ));
        
        setSuccessMessage(`✅ Password reset email sent to ${admin.email}`);
        setTimeout(() => setSuccessMessage(''), 5000);

        console.log(`📧 Password reset email sent to ${admin.email}`);
        console.log(`Response:`, response);
      } else {
        setError(response.message || 'Failed to send password reset email');
      }
    } catch (err) {
      console.error('Error sending password reset:', err);
      
      // Provide better error messages
      let errorMessage = err.message || 'Failed to send password reset email';
      
      if (err.message.includes('Cannot reset other admin passwords')) {
        errorMessage = '🔒 Security Policy: Admins can only reset their own password or non-admin user passwords. You cannot reset another admin\'s password.';
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAdmin = (admin) => {
    setAdminToDelete(admin);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Delete admin via API
      const response = await adminService.deleteUser(adminToDelete.id);

      if (response.status === 'success') {
        setAdmins(admins.filter(a => a.id !== adminToDelete.id));
        setShowDeleteConfirm(false);
        setAdminToDelete(null);
        setSelectedAdmin(null);
        setSuccessMessage(`✅ Admin deleted successfully`);
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      console.error('Error deleting admin:', err);
      setError(err.message || 'Failed to delete admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      phone: admin.phone || '',
      countryCode: 'US', // Default country code when editing
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

  // Check if editing own account
  const isEditingSelf = () => {
    if (!selectedAdmin) return false;
    const currentUserStr = localStorage.getItem('user');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    return currentUser && (currentUser.id === selectedAdmin.id || currentUser._id === selectedAdmin.id);
  };

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="ml-3 text-gray-600">Loading admins...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {!loading && (
        <>
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

          {/* Info Banner - Password & Security Policy */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Password & Security Policy</p>
              <p className="text-sm text-blue-800 mt-1">
                New admins receive temporary passwords via email. They must set a permanent password on first login. 
                Passwords expire after 90 days and require: 12+ characters, uppercase, lowercase, numbers, and symbols.
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsCard label="Total Admins" value={stats.total} icon={Shield} color="purple" />
            <StatsCard label="Active" value={stats.active} icon={Shield} color="green" />
            <StatsCard label="Invited" value={stats.invited} icon={Mail} color="blue" />
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
            onResendInvite={handleResendInvitation}
            onForcePasswordReset={handleForcePasswordReset}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={paginatedData.pages}
            onPageChange={setCurrentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={filteredAdmins.length}
          />
        </>
      )}

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
        submitLabel="Create & Send Invitation"
        submitColor="purple"
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          {/* Step Indicator */}
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
            <p className="text-xs font-semibold text-purple-900">WHAT HAPPENS NEXT:</p>
            <ol className="text-xs text-purple-800 mt-2 space-y-1 ml-4">
              <li>1. ✅ Admin account is created in the system</li>
              <li>2. 📧 Temporary password is generated automatically</li>
              <li>3. 📬 Invitation email is sent to their address</li>
              <li>4. 🔐 Admin must set permanent password on first login</li>
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Full Name" required>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., John Doe"
              />
            </FormGroup>
            <FormGroup label="Email Address" required>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="john@company.com"
              />
            </FormGroup>
          </div>

          <FormGroup label="Phone Number" required>
            <div className="flex gap-2">
              <select
                value={formData.countryCode}
                onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                {COUNTRIES.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.callingCode} {country.name}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter phone number"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Select country and enter phone number (with or without country code)</p>
          </FormGroup>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-semibold text-gray-900 mb-3">Assign Permissions</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {ADMIN_PERMISSIONS_LIST.map(perm => (
                <label key={perm.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-2 rounded transition-colors">
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
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Full Name" required>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </FormGroup>
            <FormGroup label="Email Address" required>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </FormGroup>
          </div>

          <FormGroup label="Phone Number" required>
            <div className="flex gap-2">
              <select
                value={formData.countryCode}
                onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                {COUNTRIES.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.callingCode} {country.name}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter phone number"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Select country and enter phone number</p>
          </FormGroup>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-semibold text-gray-900 mb-3">Permissions</p>
            
            {/* Warning for self-edit */}
            {isEditingSelf() && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>Note:</strong> You cannot modify your own permissions for security reasons.
                </div>
              </div>
            )}
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {ADMIN_PERMISSIONS_LIST.map(perm => (
                <label 
                  key={perm.id} 
                  className={`flex items-center gap-2 text-sm p-2 rounded transition-colors ${
                    isEditingSelf() 
                      ? 'opacity-60 cursor-not-allowed bg-gray-100' 
                      : 'cursor-pointer hover:bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(perm.id)}
                    onChange={() => togglePermission(perm.id)}
                    disabled={isEditingSelf()}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div>
                    <span className="text-gray-900">{perm.label}</span>
                    <span className="ml-2 text-xs text-gray-500">({perm.category})</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
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
        description={`Are you sure you want to delete ${adminToDelete?.name}? This action cannot be undone. They will lose all access to the system.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDangerous={true}
      />

      {/* Resend Invitation Confirmation */}
      <ConfirmationDialog
        isOpen={showInviteResendConfirm}
        onClose={() => {
          setShowInviteResendConfirm(false);
          setAdminToResendInvite(null);
        }}
        onConfirm={confirmResendInvitation}
        title="Resend Invitation"
        description={`Resend invitation email to ${adminToResendInvite?.email}? They will receive a new temporary password.`}
        confirmLabel="Resend"
        cancelLabel="Cancel"
      />
    </div>
  );
};

export default AdminManagement;

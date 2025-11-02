import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash, Shield, Mail, AlertCircle, CheckCircle, RotateCcw, Clock } from 'lucide-react';
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

const AdminManagement = () => {
  const [admins, setAdmins] = useState([
    {
      id: 1,
      name: 'Lisa Anderson',
      email: 'lisa@travelagency.com',
      phone: '+1-555-9012',
      status: 'active',
      accountStatus: 'verified',
      createdAt: '2024-03-05',
      lastActive: '2024-10-20',
      permissions: ['manage_users', 'manage_sales_reps', 'manage_vendors', 'view_reports', 'manage_billing'],
      twoFactorEnabled: true,
      passwordExpireDate: '2025-01-05',
      invitationSentAt: '2024-03-05',
      firstLoginAt: '2024-03-06'
    },
    {
      id: 2,
      name: 'James Wilson',
      email: 'james@travelagency.com',
      phone: '+1-555-4321',
      status: 'invited',
      accountStatus: 'pending_first_login',
      createdAt: '2024-10-15',
      lastActive: null,
      permissions: ['manage_users', 'manage_sales_reps', 'view_reports'],
      twoFactorEnabled: false,
      passwordExpireDate: null,
      invitationSentAt: '2024-10-15',
      firstLoginAt: null
    }
  ]);

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

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    permissions: [],
    twoFactorEnabled: false
  });

  const ITEMS_PER_PAGE = 10;

  // 🔐 Generate secure temporary password
  const generateTemporaryPassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    
    const allChars = uppercase + lowercase + numbers + symbols;
    let password = '';
    
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill rest randomly to make 12 characters
    for (let i = password.length; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle password
    return password.split('').sort(() => Math.random() - 0.5).join('');
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
    inactive: admins.filter(a => a.status === 'inactive').length,
    twoFactorEnabled: admins.filter(a => a.twoFactorEnabled).length
  }), [admins]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      permissions: [],
      twoFactorEnabled: false
    });
  };

  const handleAddAdmin = () => {
    if (formData.name && formData.email && formData.phone) {
      // Generate temporary password
      const tempPassword = generateTemporaryPassword();
      
      const newAdmin = {
        id: Math.max(...admins.map(a => a.id), 0) + 1,
        ...formData,
        status: 'invited',
        accountStatus: 'pending_first_login',
        createdAt: new Date().toISOString().split('T')[0],
        lastActive: null,
        passwordExpireDate: null,
        invitationSentAt: new Date().toISOString().split('T')[0],
        firstLoginAt: null
      };
      
      // Send invitation email (console log in this demo)
      sendInvitationEmail(newAdmin, tempPassword);
      
      setAdmins([...admins, newAdmin]);
      setShowNewAdminDialog(false);
      setSuccessMessage(`✅ Admin created! Invitation sent to ${newAdmin.email}`);
      setTimeout(() => setSuccessMessage(''), 5000);
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
      setSuccessMessage(`✅ Admin updated successfully`);
      setTimeout(() => setSuccessMessage(''), 5000);
      resetForm();
    }
  };

  // 🔄 Resend invitation to pending admin
  const handleResendInvitation = (admin) => {
    setAdminToResendInvite(admin);
    setShowInviteResendConfirm(true);
  };

  const confirmResendInvitation = () => {
    const tempPassword = generateTemporaryPassword();
    sendInvitationEmail(adminToResendInvite, tempPassword);
    
    setAdmins(admins.map(a => 
      a.id === adminToResendInvite.id 
        ? { ...a, invitationSentAt: new Date().toISOString().split('T')[0] }
        : a
    ));
    
    setSuccessMessage(`✅ Invitation resent to ${adminToResendInvite.email}`);
    setTimeout(() => setSuccessMessage(''), 5000);
    setShowInviteResendConfirm(false);
    setAdminToResendInvite(null);
  };

  // 🔑 Force password reset
  const handleForcePasswordReset = (admin) => {
    const tempPassword = generateTemporaryPassword();
    
    // Send password reset email
    sendPasswordResetEmail(admin, tempPassword);
    
    setAdmins(admins.map(a => 
      a.id === admin.id 
        ? { 
            ...a, 
            status: 'password_reset_required',
            accountStatus: 'pending_password_change'
          }
        : a
    ));
    
    setSuccessMessage(`✅ Password reset email sent to ${admin.email}`);
    setTimeout(() => setSuccessMessage(''), 5000);
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
    setSuccessMessage(`✅ Admin deleted successfully`);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const openEditDialog = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
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
      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatsCard label="Total Admins" value={stats.total} icon={Shield} color="purple" />
        <StatsCard label="Active" value={stats.active} icon={Shield} color="green" />
        <StatsCard label="Invited" value={stats.invited} icon={Mail} color="blue" />
        <StatsCard label="2FA Enabled" value={stats.twoFactorEnabled} icon={Shield} color="amber" />
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
        submitLabel="Create & Send Invitation"
        submitColor="purple"
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
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="+1-555-0000"
            />
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

          <label className="flex items-center gap-2 text-sm cursor-pointer p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
            <input
              type="checkbox"
              checked={formData.twoFactorEnabled}
              onChange={(e) => setFormData({ ...formData, twoFactorEnabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <span className="text-gray-900 font-medium">Require Two-Factor Authentication</span>
              <p className="text-xs text-gray-600">Admin must set up 2FA on first login</p>
            </div>
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
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </FormGroup>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-semibold text-gray-900 mb-3">Permissions</p>
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

          <label className="flex items-center gap-2 text-sm cursor-pointer p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
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

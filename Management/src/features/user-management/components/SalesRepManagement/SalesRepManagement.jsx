import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash, User, TrendingUp, Mail, CheckCircle, AlertCircle, Copy } from 'lucide-react';
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

const SalesRepManagement = () => {
  const [salesReps, setSalesReps] = useState([
    {
      id: 1,
      name: 'Sarah Johnson',
      email: 'sarah@travelagency.com',
      phone: '+1-555-1234',
      status: 'active', // active, invited, inactive
      accountStatus: 'verified', // verified, pending_first_login, pending_password_reset
      createdAt: '2024-01-15',
      lastActive: '2024-10-22',
      invitationSentAt: '2024-01-15',
      firstLoginAt: '2024-01-16',
      leadsAssigned: 45,
      leadsConverted: 12,
      commissionRate: 10,
      totalEarnings: 25000,
      passwordExpireDate: '2025-01-15',
      twoFactorEnabled: true
    },
    {
      id: 2,
      name: 'Mike Chen',
      email: 'mike@travelagency.com',
      phone: '+1-555-5678',
      status: 'active',
      accountStatus: 'verified',
      createdAt: '2024-02-10',
      lastActive: '2024-10-21',
      invitationSentAt: '2024-02-10',
      firstLoginAt: '2024-02-11',
      leadsAssigned: 32,
      leadsConverted: 8,
      commissionRate: 10,
      totalEarnings: 18500,
      passwordExpireDate: '2025-02-10',
      twoFactorEnabled: false
    },
    {
      id: 3,
      name: 'Emma Wilson',
      email: 'emma@travelagency.com',
      phone: '+1-555-7890',
      status: 'invited',
      accountStatus: 'pending_first_login',
      createdAt: '2024-05-20',
      lastActive: null,
      invitationSentAt: '2024-05-20',
      firstLoginAt: null,
      leadsAssigned: 0,
      leadsConverted: 0,
      commissionRate: 12,
      totalEarnings: 0,
      passwordExpireDate: null,
      twoFactorEnabled: false
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewRepDialog, setShowNewRepDialog] = useState(false);
  const [showEditRepDialog, setShowEditRepDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResendInviteConfirm, setShowResendInviteConfirm] = useState(false);
  const [showPasswordResetConfirm, setShowPasswordResetConfirm] = useState(false);
  const [selectedRep, setSelectedRep] = useState(null);
  const [repToDelete, setRepToDelete] = useState(null);
  const [repToResendInvite, setRepToResendInvite] = useState(null);
  const [repToResetPassword, setRepToResetPassword] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commissionRate: 10,
    targetLeads: 50
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
  const sendInvitationEmail = (rep, tempPassword) => {
    console.log(`📧 Invitation email sent to ${rep.email}`);
    console.log(`
      ╔════════════════════════════════════════════════════════════╗
      ║         SALES REP ACCOUNT INVITATION EMAIL                 ║
      ╚════════════════════════════════════════════════════════════╝
      
      To: ${rep.email}
      Subject: Welcome to Trip Sky Way - Your Sales Rep Account
      
      ─────────────────────────────────────────────────────────────
      
      Dear ${rep.name},
      
      Welcome to Trip Sky Way! Your sales representative account has
      been created and is ready for you to activate.
      
      📋 ACCOUNT DETAILS:
      ├─ Email: ${rep.email}
      ├─ Temporary Password: ${tempPassword}
      └─ Invitation Link: https://tripskiway.com/auth/invite/${rep.id}
      
      🔐 FIRST LOGIN INSTRUCTIONS:
      1. Click the invitation link above (expires in 48 hours)
      2. Enter your email and temporary password
      3. You MUST create a new permanent password
      4. Review and accept commission terms
      5. Your account will be fully activated
      
      ⏰ IMPORTANT: Temporary password expires in 48 hours
      
      PASSWORD REQUIREMENTS:
      ├─ Minimum 12 characters
      ├─ At least one uppercase letter (A-Z)
      ├─ At least one lowercase letter (a-z)
      ├─ At least one number (0-9)
      └─ At least one special character (!@#$%^&*)
      
      💰 YOUR COMMISSION:
      ├─ Commission Rate: ${rep.commissionRate}%
      ├─ Calculated on: Confirmed bookings only
      └─ Paid: Monthly via bank transfer
      
      📊 START USING THE SYSTEM:
      After first login, you'll have access to:
      ├─ Lead Dashboard
      ├─ Performance Metrics
      ├─ Commission Tracking
      └─ Customer Management Tools
      
      If you have any questions or didn't request this account,
      please contact support@tripskiway.com immediately.
      
      Best regards,
      Trip Sky Way Team
      https://tripskiway.com/support
      
      ─────────────────────────────────────────────────────────────
    `);
  };

  // 📧 Simulate sending password reset email
  const sendPasswordResetEmail = (rep, tempPassword) => {
    console.log(`📧 Password reset email sent to ${rep.email}`);
    console.log(`
      ╔════════════════════════════════════════════════════════════╗
      ║           PASSWORD RESET REQUEST                           ║
      ╚════════════════════════════════════════════════════════════╝
      
      To: ${rep.email}
      Subject: Password Reset - Trip Sky Way Account
      
      ─────────────────────────────────────────────────────────────
      
      Dear ${rep.name},
      
      A password reset has been initiated for your account.
      
      🔑 NEW TEMPORARY PASSWORD: ${tempPassword}
      🔗 Reset Link: https://tripskiway.com/auth/reset/${rep.id}
      
      ⏰ This temporary password expires in 48 hours
      
      PASSWORD REQUIREMENTS:
      ├─ Minimum 12 characters
      ├─ At least one uppercase letter
      ├─ At least one lowercase letter
      ├─ At least one number
      └─ At least one special character
      
      If you did not request this password reset, please contact
      support@tripskiway.com immediately.
      
      Best regards,
      Trip Sky Way Team
      
      ─────────────────────────────────────────────────────────────
    `);
  };

  const filteredReps = useMemo(() => {
    return filterUsers(salesReps, searchTerm, {});
  }, [salesReps, searchTerm]);

  const paginatedData = useMemo(() => {
    return paginateArray(filteredReps, currentPage, ITEMS_PER_PAGE);
  }, [filteredReps, currentPage]);

  const stats = useMemo(() => {
    const totalEarnings = salesReps.reduce((sum, rep) => sum + rep.totalEarnings, 0);
    const totalLeads = salesReps.reduce((sum, rep) => sum + rep.leadsAssigned, 0);
    const totalConverted = salesReps.reduce((sum, rep) => sum + rep.leadsConverted, 0);
    const conversionRate = totalLeads > 0 ? ((totalConverted / totalLeads) * 100).toFixed(1) : 0;

    return {
      total: salesReps.length,
      active: salesReps.filter(r => r.status === 'active').length,
      totalLeads,
      totalEarnings,
      avgConversion: conversionRate
    };
  }, [salesReps]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      commissionRate: 10,
      targetLeads: 50
    });
  };

  const handleAddRep = () => {
    if (formData.name && formData.email && formData.phone) {
      const tempPassword = generateTemporaryPassword();
      
      const newRep = {
        id: Math.max(...salesReps.map(r => r.id), 0) + 1,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        status: 'invited',
        accountStatus: 'pending_first_login',
        createdAt: new Date().toISOString().split('T')[0],
        lastActive: null,
        invitationSentAt: new Date().toISOString().split('T')[0],
        firstLoginAt: null,
        leadsAssigned: 0,
        leadsConverted: 0,
        commissionRate: formData.commissionRate,
        totalEarnings: 0,
        passwordExpireDate: null,
        twoFactorEnabled: false
      };
      
      // Send invitation email
      sendInvitationEmail(newRep, tempPassword);
      
      setSalesReps([...salesReps, newRep]);
      setShowNewRepDialog(false);
      setSuccessMessage(`✅ Invitation sent to ${formData.email}`);
      setTimeout(() => setSuccessMessage(''), 5000);
      resetForm();
    }
  };

  const handleEditRep = () => {
    if (selectedRep && formData.name && formData.email && formData.phone) {
      setSalesReps(salesReps.map(r => 
        r.id === selectedRep.id 
          ? {
              ...r,
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              commissionRate: formData.commissionRate
            }
          : r
      ));
      setSelectedRep(null);
      setShowEditRepDialog(false);
      setSuccessMessage('✅ Sales rep updated successfully');
      setTimeout(() => setSuccessMessage(''), 5000);
      resetForm();
    }
  };

  // 🔄 Resend invitation to pending rep
  const handleResendInvitation = (rep) => {
    setRepToResendInvite(rep);
    setShowResendInviteConfirm(true);
  };

  const confirmResendInvitation = () => {
    const tempPassword = generateTemporaryPassword();
    sendInvitationEmail(repToResendInvite, tempPassword);
    
    setSalesReps(salesReps.map(r => 
      r.id === repToResendInvite.id 
        ? { ...r, invitationSentAt: new Date().toISOString().split('T')[0] }
        : r
    ));
    
    setSuccessMessage(`✅ Invitation resent to ${repToResendInvite.email}`);
    setTimeout(() => setSuccessMessage(''), 5000);
    setShowResendInviteConfirm(false);
    setRepToResendInvite(null);
  };

  // 🔑 Force password reset
  const handleForcePasswordReset = (rep) => {
    setRepToResetPassword(rep);
    setShowPasswordResetConfirm(true);
  };

  const confirmPasswordReset = () => {
    const tempPassword = generateTemporaryPassword();
    sendPasswordResetEmail(repToResetPassword, tempPassword);
    
    setSalesReps(salesReps.map(r => 
      r.id === repToResetPassword.id 
        ? { ...r, accountStatus: 'pending_password_reset' }
        : r
    ));
    
    setSuccessMessage(`✅ Password reset link sent to ${repToResetPassword.email}`);
    setTimeout(() => setSuccessMessage(''), 5000);
    setShowPasswordResetConfirm(false);
    setRepToResetPassword(null);
  };

  const handleDeleteRep = (rep) => {
    setRepToDelete(rep);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setSalesReps(salesReps.filter(r => r.id !== repToDelete.id));
    setShowDeleteConfirm(false);
    setRepToDelete(null);
    setSelectedRep(null);
    setSuccessMessage(`✅ Sales rep deleted successfully`);
    setTimeout(() => setSuccessMessage(''), 5000);
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
          <h2 className="text-2xl font-bold text-gray-900">Sales Representatives</h2>
          <p className="text-gray-600 mt-1">Manage sales team members and track performance</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowNewRepDialog(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-colors font-medium flex items-center gap-2"
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

      <SalesRepTable
        reps={paginatedData.data}
        onEdit={openEditDialog}
        onDelete={handleDeleteRep}
        onResendInvite={handleResendInvitation}
        onForcePasswordReset={handleForcePasswordReset}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={paginatedData.pages}
        onPageChange={setCurrentPage}
        itemsPerPage={ITEMS_PER_PAGE}
        totalItems={filteredReps.length}
      />

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
        submitLabel="Create & Send Invitation"
        submitColor="blue"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
            </FormGroup>
            <FormGroup label="Email" required>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1-555-0000"
              />
            </FormGroup>
            <FormGroup label="Commission Rate (%)" required>
              <input
                type="number"
                value={formData.commissionRate}
                onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        submitLabel="Update Sales Rep"
        submitColor="blue"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Full Name" required>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FormGroup>
            <FormGroup label="Email" required>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FormGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Phone" required>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FormGroup>
            <FormGroup label="Commission Rate (%)" required>
              <input
                type="number"
                value={formData.commissionRate}
                onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDangerous={true}
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
        confirmLabel="Resend"
        cancelLabel="Cancel"
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
        confirmLabel="Send Reset Email"
        cancelLabel="Cancel"
      />
    </div>
  );
};

export default SalesRepManagement;

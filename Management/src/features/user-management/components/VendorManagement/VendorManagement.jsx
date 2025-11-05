import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash, Building2, CheckCircle, AlertCircle, Copy, Mail } from 'lucide-react';
import { 
  UserTableHeader, 
  Pagination, 
  UserFormDialog, 
  ConfirmationDialog,
  StatsCard,
  FormGroup 
} from '../Common';
import { VENDOR_VERIFICATION_COLORS, VENDOR_TYPE_COLORS } from '../../utils/constants';
import { filterUsers, paginateArray } from '../../utils/helpers';
import VendorTable from './VendorTable';

const VENDOR_TYPES = ['Hotel', 'Travel Agent', 'Resort', 'Restaurant', 'Car Rental', 'Tour Operator', 'Airline', 'Other'];

const VendorManagement = () => {
  const [vendors, setVendors] = useState([
    {
      id: 1,
      name: 'Paradise Resort',
      type: 'Resort',
      email: 'contact@paradiseresort.com',
      phone: '+1-555-1111',
      location: 'Maldives',
      verificationStatus: 'verified',
      accountStatus: 'verified',
      createdAt: '2024-02-01',
      invitationSentAt: '2024-02-01',
      firstLoginAt: '2024-02-02',
      rating: 4.8,
      partneredSince: '2024-02-01',
      contactPerson: 'Ahmed Hassan',
      passwordExpireDate: '2025-02-01',
      twoFactorEnabled: true
    },
    {
      id: 2,
      name: 'City Hotel Chain',
      type: 'Hotel',
      email: 'biz@cityhotel.com',
      phone: '+1-555-2222',
      location: 'Multiple Cities',
      verificationStatus: 'verified',
      accountStatus: 'verified',
      createdAt: '2024-01-15',
      invitationSentAt: '2024-01-15',
      firstLoginAt: '2024-01-16',
      rating: 4.5,
      partneredSince: '2024-01-15',
      contactPerson: 'Maria Garcia',
      passwordExpireDate: '2025-01-15',
      twoFactorEnabled: false
    },
    {
      id: 3,
      name: 'Adventure Tours Co',
      type: 'Tour Operator',
      email: 'info@adventuretours.com',
      phone: '+1-555-3333',
      location: 'Nepal',
      verificationStatus: 'pending',
      accountStatus: 'pending_first_login',
      createdAt: '2024-10-01',
      invitationSentAt: '2024-10-01',
      firstLoginAt: null,
      rating: 0,
      partneredSince: null,
      contactPerson: 'Raj Patel',
      passwordExpireDate: null,
      twoFactorEnabled: false
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewVendorDialog, setShowNewVendorDialog] = useState(false);
  const [showEditVendorDialog, setShowEditVendorDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResendInviteConfirm, setShowResendInviteConfirm] = useState(false);
  const [showPasswordResetConfirm, setShowPasswordResetConfirm] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  const [vendorToResendInvite, setVendorToResendInvite] = useState(null);
  const [vendorToResetPassword, setVendorToResetPassword] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    email: '',
    phone: '',
    location: '',
    contactPerson: '',
    description: ''
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
  const sendInvitationEmail = (vendor, tempPassword) => {
    console.log(`📧 Invitation email sent to ${vendor.email}`);
    console.log(`
      ╔════════════════════════════════════════════════════════════╗
      ║         VENDOR PARTNER ACCOUNT INVITATION EMAIL            ║
      ╚════════════════════════════════════════════════════════════╝
      
      To: ${vendor.email}
      Subject: Welcome to Trip Sky Way - Vendor Partner Account
      
      ─────────────────────────────────────────────────────────────
      
      Dear ${vendor.contactPerson},
      
      Welcome to Trip Sky Way! Your vendor partner account has been
      created and is ready for activation.
      
      🏢 BUSINESS DETAILS:
      ├─ Business Name: ${vendor.name}
      ├─ Type: ${vendor.type}
      └─ Location: ${vendor.location}
      
      📋 ACCOUNT DETAILS:
      ├─ Email: ${vendor.email}
      ├─ Temporary Password: ${tempPassword}
      └─ Invitation Link: https://tripskiway.com/auth/invite/${vendor.id}
      
      🔐 FIRST LOGIN INSTRUCTIONS:
      1. Click the invitation link above (expires in 48 hours)
      2. Enter your email and temporary password
      3. You MUST create a new permanent password
      4. Complete business verification steps
      5. Your account will be activated after admin review
      
      ⏰ IMPORTANT: Temporary password expires in 48 hours
      
      PASSWORD REQUIREMENTS:
      ├─ Minimum 12 characters
      ├─ At least one uppercase letter (A-Z)
      ├─ At least one lowercase letter (a-z)
      ├─ At least one number (0-9)
      └─ At least one special character (!@#$%^&*)
      
      📊 NEXT STEPS:
      After first login, you can:
      ├─ Manage your inventory/services
      ├─ View bookings and reservations
      ├─ Access reporting and analytics
      ├─ Manage pricing and availability
      └─ Track commissions and payments
      
      ✅ ACCOUNT VERIFICATION:
      Your account is currently pending verification. Our team will
      review your business details within 24-48 hours.
      
      If you have any questions or didn't request this account,
      please contact support@tripskiway.com immediately.
      
      Best regards,
      Trip Sky Way Partner Team
      https://tripskiway.com/partner-support
      
      ─────────────────────────────────────────────────────────────
    `);
  };

  // 📧 Simulate sending password reset email
  const sendPasswordResetEmail = (vendor, tempPassword) => {
    console.log(`📧 Password reset email sent to ${vendor.email}`);
    console.log(`
      ╔════════════════════════════════════════════════════════════╗
      ║           PASSWORD RESET REQUEST                           ║
      ╚════════════════════════════════════════════════════════════╝
      
      To: ${vendor.email}
      Subject: Password Reset - Trip Sky Way Vendor Account
      
      ─────────────────────────────────────────────────────────────
      
      Dear ${vendor.contactPerson},
      
      A password reset has been initiated for your vendor account.
      
      🔑 NEW TEMPORARY PASSWORD: ${tempPassword}
      🔗 Reset Link: https://tripskiway.com/auth/reset/${vendor.id}
      
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
      Trip Sky Way Partner Team
      
      ─────────────────────────────────────────────────────────────
    `);
  };

  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        vendor.name.toLowerCase().includes(searchLower) ||
        vendor.email.toLowerCase().includes(searchLower) ||
        vendor.location.toLowerCase().includes(searchLower);
      
      const matchesStatus = filterStatus === 'all' || vendor.verificationStatus === filterStatus;
      const matchesType = filterType === 'all' || vendor.type === filterType;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [vendors, searchTerm, filterStatus, filterType]);

  const paginatedData = useMemo(() => {
    return paginateArray(filteredVendors, currentPage, ITEMS_PER_PAGE);
  }, [filteredVendors, currentPage]);

  const stats = useMemo(() => ({
    total: vendors.length,
    verified: vendors.filter(v => v.verificationStatus === 'verified').length,
    pending: vendors.filter(v => v.verificationStatus === 'pending').length,
    rejected: vendors.filter(v => v.verificationStatus === 'rejected').length,
    avgRating: vendors.filter(v => v.rating > 0).length > 0 
      ? (vendors.filter(v => v.rating > 0).reduce((sum, v) => sum + v.rating, 0) / vendors.filter(v => v.rating > 0).length).toFixed(1)
      : 0
  }), [vendors]);

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      email: '',
      phone: '',
      location: '',
      contactPerson: '',
      description: ''
    });
  };

  const handleAddVendor = () => {
    if (formData.name && formData.type && formData.email && formData.location) {
      const tempPassword = generateTemporaryPassword();
      
      const newVendor = {
        id: Math.max(...vendors.map(v => v.id), 0) + 1,
        ...formData,
        verificationStatus: 'pending',
        accountStatus: 'pending_first_login',
        createdAt: new Date().toISOString().split('T')[0],
        invitationSentAt: new Date().toISOString().split('T')[0],
        firstLoginAt: null,
        rating: 0,
        partneredSince: null,
        passwordExpireDate: null,
        twoFactorEnabled: false
      };
      
      // Send invitation email
      sendInvitationEmail(newVendor, tempPassword);
      
      setVendors([...vendors, newVendor]);
      setShowNewVendorDialog(false);
      setSuccessMessage(`✅ Invitation sent to ${formData.email}`);
      setTimeout(() => setSuccessMessage(''), 5000);
      resetForm();
    }
  };

  const handleEditVendor = () => {
    if (selectedVendor && formData.name && formData.type && formData.email) {
      setVendors(vendors.map(v => 
        v.id === selectedVendor.id 
          ? {
              ...v,
              name: formData.name,
              type: formData.type,
              email: formData.email,
              phone: formData.phone,
              location: formData.location,
              contactPerson: formData.contactPerson
            }
          : v
      ));
      setSelectedVendor(null);
      setShowEditVendorDialog(false);
      setSuccessMessage('✅ Vendor updated successfully');
      setTimeout(() => setSuccessMessage(''), 5000);
      resetForm();
    }
  };

  // 🔄 Resend invitation to pending vendor
  const handleResendInvitation = (vendor) => {
    setVendorToResendInvite(vendor);
    setShowResendInviteConfirm(true);
  };

  const confirmResendInvitation = () => {
    const tempPassword = generateTemporaryPassword();
    sendInvitationEmail(vendorToResendInvite, tempPassword);
    
    setVendors(vendors.map(v => 
      v.id === vendorToResendInvite.id 
        ? { ...v, invitationSentAt: new Date().toISOString().split('T')[0] }
        : v
    ));
    
    setSuccessMessage(`✅ Invitation resent to ${vendorToResendInvite.email}`);
    setTimeout(() => setSuccessMessage(''), 5000);
    setShowResendInviteConfirm(false);
    setVendorToResendInvite(null);
  };

  // 🔑 Force password reset
  const handleForcePasswordReset = (vendor) => {
    setVendorToResetPassword(vendor);
    setShowPasswordResetConfirm(true);
  };

  const confirmPasswordReset = () => {
    const tempPassword = generateTemporaryPassword();
    sendPasswordResetEmail(vendorToResetPassword, tempPassword);
    
    setVendors(vendors.map(v => 
      v.id === vendorToResetPassword.id 
        ? { ...v, accountStatus: 'pending_password_reset' }
        : v
    ));
    
    setSuccessMessage(`✅ Password reset link sent to ${vendorToResetPassword.email}`);
    setTimeout(() => setSuccessMessage(''), 5000);
    setShowPasswordResetConfirm(false);
    setVendorToResetPassword(null);
  };

  const handleDeleteVendor = (vendor) => {
    setVendorToDelete(vendor);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setVendors(vendors.filter(v => v.id !== vendorToDelete.id));
    setShowDeleteConfirm(false);
    setVendorToDelete(null);
    setSelectedVendor(null);
    setSuccessMessage(`✅ Vendor deleted successfully`);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleVerifyVendor = (vendor) => {
    setVendors(vendors.map(v =>
      v.id === vendor.id
        ? { ...v, verificationStatus: 'verified', accountStatus: 'verified', partneredSince: new Date().toISOString().split('T')[0] }
        : v
    ));
    setSuccessMessage(`✅ Vendor verified successfully`);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleRejectVendor = (vendor) => {
    setVendors(vendors.map(v =>
      v.id === vendor.id
        ? { ...v, verificationStatus: 'rejected', accountStatus: 'rejected' }
        : v
    ));
    setSuccessMessage(`✅ Vendor rejected`);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const openEditDialog = (vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      name: vendor.name,
      type: vendor.type,
      email: vendor.email,
      phone: vendor.phone,
      location: vendor.location,
      contactPerson: vendor.contactPerson,
      description: ''
    });
    setShowEditVendorDialog(true);
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
          <h2 className="text-2xl font-bold text-gray-900">Vendor Management</h2>
          <p className="text-gray-600 mt-1">Manage partner hotels, travel agents, and service providers</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowNewVendorDialog(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-teal-600 text-white rounded-lg hover:from-indigo-700 hover:to-teal-700 transition-colors font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Vendor
        </button>
      </div>

      {/* Security Info Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Account & Security Policy</p>
          <p className="text-sm text-blue-800 mt-1">
            Vendors receive invitation emails with temporary passwords. They must set a permanent password on first login. 
            Passwords expire after 90 days and require: 12+ characters, uppercase, lowercase, numbers, and symbols.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatsCard label="Total Vendors" value={stats.total} icon={Building2} color="indigo" />
        <StatsCard label="Verified" value={stats.verified} icon={CheckCircle} color="green" />
        <StatsCard label="Pending" value={stats.pending} icon={AlertCircle} color="yellow" />
        <StatsCard label="Rejected" value={stats.rejected} icon={AlertCircle} color="red" />
        <StatsCard label="Avg. Rating" value={stats.avgRating} icon={Building2} color="purple" />
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Verification Status</label>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Vendors</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending Review</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Type</label>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Types</option>
            {VENDOR_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Section */}
      <UserTableHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onFilterClick={() => {}}
        title="Vendors List"
        subtitle="Manage partner relationships and verify vendors"
      />

      <VendorTable
        vendors={paginatedData.data}
        onEdit={openEditDialog}
        onDelete={handleDeleteVendor}
        onVerify={handleVerifyVendor}
        onReject={handleRejectVendor}
        onResendInvite={handleResendInvitation}
        onForcePasswordReset={handleForcePasswordReset}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={paginatedData.pages}
        onPageChange={setCurrentPage}
        itemsPerPage={ITEMS_PER_PAGE}
        totalItems={filteredVendors.length}
      />

      {/* Add Vendor Dialog */}
      <UserFormDialog
        isOpen={showNewVendorDialog}
        onClose={() => {
          setShowNewVendorDialog(false);
          resetForm();
        }}
        onSubmit={handleAddVendor}
        title="Add New Vendor"
        subtitle="Register a new partner (hotel, travel agent, service provider, etc.)"
        submitLabel="Register & Send Invitation"
        submitColor="indigo"
      >
        <div className="space-y-4">
          {/* What Happens Next */}
          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
            <p className="text-xs font-semibold text-indigo-900">WHAT HAPPENS NEXT:</p>
            <ol className="text-xs text-indigo-800 mt-2 space-y-1 ml-4">
              <li>1. ✅ Vendor account is created in the system</li>
              <li>2. 🔐 Temporary password is generated automatically</li>
              <li>3. 📧 Invitation email is sent to their address</li>
              <li>4. 🔑 They must set permanent password on first login</li>
              <li>5. ✓ Admin must verify business details before activation</li>
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Business Name" required>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Paradise Resort"
              />
            </FormGroup>
            <FormGroup label="Vendor Type" required>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Type</option>
                {['Hotel', 'Travel Agent', 'Resort', 'Restaurant', 'Car Rental', 'Tour Operator', 'Airline', 'Other'].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </FormGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Email" required>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="contact@vendor.com"
              />
            </FormGroup>
            <FormGroup label="Phone" required>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="+1-555-0000"
              />
            </FormGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Location" required>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="City, Country"
              />
            </FormGroup>
            <FormGroup label="Contact Person">
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Primary Contact Name"
              />
            </FormGroup>
          </div>

          <FormGroup label="Description">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Brief description of services offered"
              rows="3"
            />
          </FormGroup>

          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <p className="text-xs font-semibold text-green-900 mb-2">🔐 Account Security</p>
            <ul className="text-xs text-green-800 space-y-1">
              <li>• Temporary password: Auto-generated (12 chars, secure)</li>
              <li>• Sent via email: Vendor receives invitation link</li>
              <li>• First login: Must create permanent password</li>
              <li>• Verification: Admin reviews business details</li>
              <li>• Password expires: After 90 days</li>
            </ul>
          </div>
        </div>
      </UserFormDialog>

      {/* Edit Vendor Dialog */}
      <UserFormDialog
        isOpen={showEditVendorDialog}
        onClose={() => {
          setShowEditVendorDialog(false);
          resetForm();
        }}
        onSubmit={handleEditVendor}
        title="Edit Vendor"
        subtitle="Update vendor information"
        submitLabel="Update Vendor"
        submitColor="indigo"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Business Name" required>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </FormGroup>
            <FormGroup label="Vendor Type" required>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {VENDOR_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </FormGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Email" required>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </FormGroup>
            <FormGroup label="Phone" required>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </FormGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Location" required>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </FormGroup>
            <FormGroup label="Contact Person">
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          setVendorToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Vendor"
        description={`Are you sure you want to delete ${vendorToDelete?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDangerous={true}
      />

      {/* Resend Invitation Dialog */}
      <ConfirmationDialog
        isOpen={showResendInviteConfirm}
        onClose={() => {
          setShowResendInviteConfirm(false);
          setVendorToResendInvite(null);
        }}
        onConfirm={confirmResendInvitation}
        title="Resend Invitation"
        description={`Resend invitation email to ${vendorToResendInvite?.email}? They will receive a new temporary password and invitation link.`}
        confirmLabel="Resend"
        cancelLabel="Cancel"
      />

      {/* Password Reset Dialog */}
      <ConfirmationDialog
        isOpen={showPasswordResetConfirm}
        onClose={() => {
          setShowPasswordResetConfirm(false);
          setVendorToResetPassword(null);
        }}
        onConfirm={confirmPasswordReset}
        title="Force Password Reset"
        description={`Send password reset email to ${vendorToResetPassword?.email}? They will receive a new temporary password and must create a permanent one.`}
        confirmLabel="Send Reset Email"
        cancelLabel="Cancel"
      />
    </div>
  );
};

export default VendorManagement;

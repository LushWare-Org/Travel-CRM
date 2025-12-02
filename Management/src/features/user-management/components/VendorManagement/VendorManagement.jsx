import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import { validatePhone, formatPhoneToE164, getPhonePlaceholder, parseE164, COUNTRIES } from '../../utils/phoneUtils';
import vendorService from '../../../../services/vendor.service';
import VendorTable from './VendorTable';

const VENDOR_TYPES = ['hotel', 'transport', 'activity', 'restaurant', 'guide', 'other'];
const VENDOR_TYPE_LABELS = {
  hotel: 'Hotel',
  transport: 'Transportation',
  activity: 'Activity',
  restaurant: 'Restaurant',
  guide: 'Tour Guide',
  other: 'Other'
};

const VendorManagement = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewVendorDialog, setShowNewVendorDialog] = useState(false);
  const [showEditVendorDialog, setShowEditVendorDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResendInviteConfirm, setShowResendInviteConfirm] = useState(false);
  const [showPasswordResetConfirm, setShowPasswordResetConfirm] = useState(false);
  const [showStatusUpdateConfirm, setShowStatusUpdateConfirm] = useState(false);
  const [showRatingUpdateConfirm, setShowRatingUpdateConfirm] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  const [vendorToResendInvite, setVendorToResendInvite] = useState(null);
  const [vendorToResetPassword, setVendorToResetPassword] = useState(null);
  const [vendorStatusUpdate, setVendorStatusUpdate] = useState(null);
  const [vendorRatingUpdate, setVendorRatingUpdate] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    phoneCountry: 'US',
    businessName: '',
    serviceType: '',
    businessRegistrationNumber: '',
    taxIdentificationNumber: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    contactPerson: {
      name: '',
      phone: '',
      phoneCountry: 'US',
      email: '',
      designation: ''
    },
    bankDetails: {
      accountName: '',
      accountNumber: '',
      bankName: '',
      branchName: '',
      ifscCode: '',
      swiftCode: ''
    }
  });

  const ITEMS_PER_PAGE = 10;

  // Load vendors on component mount
  useEffect(() => {
    loadVendors();
  }, []);

  // Load vendors from API
  const loadVendors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchTerm || undefined,
        vendorStatus: filterStatus !== 'all' ? filterStatus : undefined,
        serviceType: filterType !== 'all' ? filterType : undefined,
        sort: '-createdAt'
      };
      
      // Remove undefined values
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
      
      const response = await vendorService.getAllVendors(params);
      
      if (response.status === 'success' && response.data) {
        setVendors(response.data.vendors || response.data || []);
      }
    } catch (err) {
      console.error('Error loading vendors:', err);
      setError(err.userMessage || err.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterStatus, filterType]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      phoneCountry: 'US',
      businessName: '',
      serviceType: '',
      businessRegistrationNumber: '',
      taxIdentificationNumber: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      contactPerson: {
        name: '',
        phone: '',
        phoneCountry: 'US',
        email: '',
        designation: ''
      },
      bankDetails: {
        accountName: '',
        accountNumber: '',
        bankName: '',
        branchName: '',
        ifscCode: '',
        swiftCode: ''
      }
    });
    setValidationErrors({});
    setError(null);
  };

  const handleAddVendor = async () => {
    // Validate phone number first
    if (!validatePhone(formData.phone, formData.phoneCountry)) {
      setValidationErrors({ phone: `Please provide a valid phone number for ${formData.phoneCountry}` });
      setError('Please fix the validation errors below');
      return;
    }

    // Format phone to E.164
    const phoneData = formatPhoneToE164(formData.phone, formData.phoneCountry);
    if (!phoneData) {
      setValidationErrors({ phone: `Please provide a valid phone number for ${formData.phoneCountry}` });
      setError('Please fix the validation errors below');
      return;
    }

    // Validate contact person phone if provided
    if (formData.contactPerson.phone && !validatePhone(formData.contactPerson.phone, formData.contactPerson.phoneCountry)) {
      setValidationErrors({ contactPersonPhone: `Please provide a valid phone number for ${formData.contactPerson.phoneCountry}` });
      setError('Please fix the validation errors below');
      return;
    }

    // Format contact person phone if provided
    let contactPersonPhoneData = null;
    if (formData.contactPerson.phone) {
      contactPersonPhoneData = formatPhoneToE164(formData.contactPerson.phone, formData.contactPerson.phoneCountry);
      if (!contactPersonPhoneData) {
        setValidationErrors({ contactPersonPhone: `Please provide a valid phone number for ${formData.contactPerson.phoneCountry}` });
        setError('Please fix the validation errors below');
        return;
      }
    }

    // Validate form data
    const validation = vendorService.validateVendorData(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setError('Please fix the validation errors below');
      return;
    }

    // Clear validation errors if all valid
    setValidationErrors({});

    try {
      setActionLoading(true);
      // Create submission data with E.164 formatted phone numbers
      const submitData = {
        ...formData,
        phone: phoneData.e164,
        phoneCountry: phoneData.countryCode,
        contactPerson: {
          ...formData.contactPerson,
          phone: contactPersonPhoneData ? contactPersonPhoneData.e164 : '',
          phoneCountry: contactPersonPhoneData ? contactPersonPhoneData.countryCode : formData.contactPerson.phoneCountry
        }
      };
      const response = await vendorService.createVendor(submitData);
      
      if (response.status === 'success') {
        setShowNewVendorDialog(false);
        setSuccessMessage(`✅ Invitation sent to ${formData.email}`);
        setTimeout(() => setSuccessMessage(''), 5000);
        resetForm();
        setValidationErrors({});
        loadVendors();
      }
    } catch (err) {
      console.error('Error creating vendor:', err);
      
      // Extract validation errors from backend if available
      if (err.validationErrors) {
        // Convert validation errors object to field-specific errors
        const backendErrors = {};
        Object.entries(err.validationErrors).forEach(([field, messages]) => {
          backendErrors[field] = Array.isArray(messages) ? messages[0] : messages;
        });
        setValidationErrors(backendErrors);
      }
      
      setError(err.userMessage || err.message || 'Failed to create vendor');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditVendor = async () => {
    if (!selectedVendor) return;

    // Validate main vendor phone if provided
    if (formData.phone && !validatePhone(formData.phone, formData.phoneCountry)) {
      setValidationErrors({ phone: `Please provide a valid phone number for ${formData.phoneCountry}` });
      setError('Please fix the validation errors below');
      return;
    }

    // Format main vendor phone if provided
    let phoneData = null;
    if (formData.phone) {
      phoneData = formatPhoneToE164(formData.phone, formData.phoneCountry);
      if (!phoneData) {
        setValidationErrors({ phone: `Please provide a valid phone number for ${formData.phoneCountry}` });
        setError('Please fix the validation errors below');
        return;
      }
    }

    try {
      setActionLoading(true);
      // Send all updated fields with E.164 formatted phone numbers
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: phoneData ? phoneData.e164 : formData.phone,
        phoneCountry: phoneData ? phoneData.countryCode : formData.phoneCountry,
        businessName: formData.businessName,
        serviceType: formData.serviceType,
        businessRegistrationNumber: formData.businessRegistrationNumber,
        taxIdentificationNumber: formData.taxIdentificationNumber,
        address: formData.address,
        bankDetails: formData.bankDetails
      };

      const response = await vendorService.updateVendor(selectedVendor._id, updateData);
      
      if (response.status === 'success') {
        setSelectedVendor(null);
        setShowEditVendorDialog(false);
        setSuccessMessage('✅ Vendor updated successfully');
        setTimeout(() => setSuccessMessage(''), 5000);
        resetForm();
        loadVendors();
      }
    } catch (err) {
      console.error('Error updating vendor:', err);
      setError(err.userMessage || err.message || 'Failed to update vendor');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle verification/rejection
  const handleVerifyVendor = async (vendor) => {
    try {
      setActionLoading(true);
      const response = await vendorService.updateVendorStatus(vendor._id, 'verified');
      
      if (response.status === 'success') {
        setSuccessMessage(`✅ Vendor verified successfully`);
        setTimeout(() => setSuccessMessage(''), 5000);
        loadVendors();
      }
    } catch (err) {
      console.error('Error verifying vendor:', err);
      setError(err.userMessage || err.message || 'Failed to verify vendor');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectVendor = async (vendor) => {
    try {
      setActionLoading(true);
      const response = await vendorService.updateVendorStatus(vendor._id, 'rejected', 'Rejected by admin');
      
      if (response.status === 'success') {
        setSuccessMessage(`✅ Vendor rejected`);
        setTimeout(() => setSuccessMessage(''), 5000);
        loadVendors();
      }
    } catch (err) {
      console.error('Error rejecting vendor:', err);
      setError(err.userMessage || err.message || 'Failed to reject vendor');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle resend invitation
  const handleResendInvitation = (vendor) => {
    setVendorToResendInvite(vendor);
    setShowResendInviteConfirm(true);
  };

  const confirmResendInvitation = async () => {
    if (!vendorToResendInvite) return;

    try {
      setActionLoading(true);
      // The backend will send the invitation email
      const response = await vendorService.resetVendorPassword(vendorToResendInvite._id);
      
      if (response.status === 'success') {
        setSuccessMessage(`✅ Invitation resent to ${vendorToResendInvite.email}`);
        setTimeout(() => setSuccessMessage(''), 5000);
        loadVendors();
        setShowResendInviteConfirm(false);
        setVendorToResendInvite(null);
      }
    } catch (err) {
      console.error('Error resending invitation:', err);
      setError(err.userMessage || err.message || 'Failed to resend invitation');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle password reset
  const handleForcePasswordReset = (vendor) => {
    setVendorToResetPassword(vendor);
    setShowPasswordResetConfirm(true);
  };

  const confirmPasswordReset = async () => {
    if (!vendorToResetPassword) return;

    try {
      setActionLoading(true);
      const response = await vendorService.resetVendorPassword(vendorToResetPassword._id);
      
      if (response.status === 'success') {
        setSuccessMessage(`✅ Password reset link sent to ${vendorToResetPassword.email}`);
        setTimeout(() => setSuccessMessage(''), 5000);
        loadVendors();
        setShowPasswordResetConfirm(false);
        setVendorToResetPassword(null);
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      setError(err.userMessage || err.message || 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete vendor
  const handleDeleteVendor = (vendor) => {
    setVendorToDelete(vendor);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!vendorToDelete) return;

    try {
      setActionLoading(true);
      const response = await vendorService.deleteVendor(vendorToDelete._id);
      
      if (response.status === 'success') {
        setShowDeleteConfirm(false);
        setVendorToDelete(null);
        setSelectedVendor(null);
        setSuccessMessage(`✅ Vendor deleted successfully`);
        setTimeout(() => setSuccessMessage(''), 5000);
        loadVendors();
      }
    } catch (err) {
      console.error('Error deleting vendor:', err);
      setError(err.userMessage || err.message || 'Failed to delete vendor');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditDialog = (vendor) => {
    setSelectedVendor(vendor);
    
    // Parse phone number if it's in E.164 format
    let phoneCountry = 'US';
    let phoneNumber = '';
    if (vendor.phone) {
      const parsed = parseE164(vendor.phone);
      if (parsed) {
        phoneCountry = parsed.countryCode || 'US';
        // Extract phone number without country code
        phoneNumber = vendor.phone.replace(/^\+\d+/, '').trim();
      } else {
        phoneNumber = vendor.phone;
      }
    }

    // Parse contact person phone if it's in E.164 format
    let contactPhoneCountry = 'US';
    let contactPhoneNumber = '';
    if (vendor.contactPerson?.phone) {
      const parsed = parseE164(vendor.contactPerson.phone);
      if (parsed) {
        contactPhoneCountry = parsed.countryCode || 'US';
        contactPhoneNumber = vendor.contactPerson.phone.replace(/^\+\d+/, '').trim();
      } else {
        contactPhoneNumber = vendor.contactPerson.phone;
      }
    }

    setFormData({
      name: vendor.name || '',
      email: vendor.email || '',
      phone: phoneNumber,
      phoneCountry: phoneCountry,
      businessName: vendor.businessName || '',
      serviceType: vendor.serviceType || '',
      businessRegistrationNumber: vendor.businessRegistrationNumber || '',
      taxIdentificationNumber: vendor.taxIdentificationNumber || '',
      address: vendor.address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      contactPerson: vendor.contactPerson || {
        name: '',
        phone: contactPhoneNumber,
        phoneCountry: contactPhoneCountry,
        email: '',
        designation: ''
      },
      bankDetails: vendor.bankDetails || {
        accountName: '',
        accountNumber: '',
        bankName: '',
        branchName: '',
        ifscCode: '',
        swiftCode: ''
      }
    });
    setShowEditVendorDialog(true);
  };

  return (
    <div className="space-y-6">
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
          disabled={actionLoading}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-teal-600 text-white rounded-lg hover:from-indigo-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
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
        <StatsCard label="Total Vendors" value={vendors.length} icon={Building2} color="indigo" />
        <StatsCard label="Verified" value={vendors.filter(v => v.vendorStatus === 'verified').length} icon={CheckCircle} color="green" />
        <StatsCard label="Pending" value={vendors.filter(v => v.vendorStatus === 'pending_verification').length} icon={AlertCircle} color="yellow" />
        <StatsCard label="Rejected" value={vendors.filter(v => v.vendorStatus === 'rejected').length} icon={AlertCircle} color="red" />
        <StatsCard label="Avg. Rating" value={vendors.filter(v => v.rating > 0).length > 0 
          ? (vendors.filter(v => v.rating > 0).reduce((sum, v) => sum + v.rating, 0) / vendors.filter(v => v.rating > 0).length).toFixed(1)
          : '0'} icon={Building2} color="purple" />
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
            <option value="pending_verification">Pending Review</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
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
              <option key={type} value={type}>{VENDOR_TYPE_LABELS[type]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Section */}
      <UserTableHeader
        searchTerm={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        onFilterClick={() => {}}
        title="Vendors List"
        subtitle="Manage partner relationships and verify vendors"
      />

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-600 text-lg">Loading vendors...</div>
        </div>
      ) : (
        <>
          <VendorTable
            vendors={vendors}
            onEdit={openEditDialog}
            onDelete={handleDeleteVendor}
            onVerify={handleVerifyVendor}
            onReject={handleRejectVendor}
            onResendInvite={handleResendInvitation}
            onForcePasswordReset={handleForcePasswordReset}
          />
          
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(vendors.length / ITEMS_PER_PAGE)}
            onPageChange={setCurrentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={vendors.length}
          />
        </>
      )}

      {/* Add Vendor Dialog */}
      <UserFormDialog
        isOpen={showNewVendorDialog}
        onClose={() => {
          setShowNewVendorDialog(false);
          setError(null);
          resetForm();
        }}
        onSubmit={handleAddVendor}
        title="Add New Vendor"
        subtitle="Register a new partner (hotel, travel agent, service provider, etc.)"
        submitLabel="Register & Send Invitation"
        submitColor="indigo"
        isLoading={actionLoading}
        error={error}
        successMessage={successMessage}
      >
        <div className="space-y-4">
          {/* Validation Error Summary */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
              <p className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Please fix the following errors:
              </p>
              <ul className="space-y-2">
                {Object.entries(validationErrors).map(([field, error]) => (
                  <li key={field} className="text-sm text-red-800 flex items-start gap-2">
                    <span className="text-red-600 font-bold mt-0.5">•</span>
                    <span>
                      <strong>{field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}:</strong> {error}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
            <FormGroup label="Name" required error={validationErrors.name}>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  validationErrors.name 
                    ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-indigo-500'
                }`}
                placeholder="Contact Person Name"
              />
            </FormGroup>
            <FormGroup label="Email" required error={validationErrors.email}>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  validationErrors.email 
                    ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-indigo-500'
                }`}
                placeholder="contact@vendor.com"
              />
            </FormGroup>
          </div>

          <FormGroup label="Phone" required error={validationErrors.phone}>
            <div className="flex gap-2">
              <select
                value={formData.phoneCountry}
                onChange={(e) => setFormData({ ...formData, phoneCountry: e.target.value })}
                className="w-40 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                title="Select country code"
              >
                {COUNTRIES.map(country => (
                  <option key={country.code} value={country.code} title={country.name}>
                    {country.flag} {country.code} {country.callingCode}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  validationErrors.phone 
                    ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-indigo-500'
                }`}
                placeholder={getPhonePlaceholder(formData.phoneCountry)}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Enter phone number with or without country code</p>
          </FormGroup>

          <FormGroup label="Business Name" required error={validationErrors.businessName}>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                validationErrors.businessName 
                  ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-indigo-500'
              }`}
              placeholder="Business/Company Name"
            />
          </FormGroup>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Service Type" required error={validationErrors.serviceType}>
              <select
                value={formData.serviceType}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  validationErrors.serviceType 
                    ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-indigo-500'
                }`}
              >
                <option value="">Select Type</option>
                {VENDOR_TYPES.map(type => (
                  <option key={type} value={type}>{VENDOR_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </FormGroup>
            <FormGroup label="Registration Number" required error={validationErrors.businessRegistrationNumber}>
              <input
                type="text"
                value={formData.businessRegistrationNumber}
                onChange={(e) => setFormData({ ...formData, businessRegistrationNumber: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  validationErrors.businessRegistrationNumber 
                    ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-indigo-500'
                }`}
                placeholder="Business Reg. Number"
              />
            </FormGroup>
          </div>

          <FormGroup label="Tax Identification Number" required error={validationErrors.taxIdentificationNumber}>
            <input
              type="text"
              value={formData.taxIdentificationNumber}
              onChange={(e) => setFormData({ ...formData, taxIdentificationNumber: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                validationErrors.taxIdentificationNumber 
                  ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-indigo-500'
              }`}
              placeholder="Tax ID"
            />
          </FormGroup>

          {/* Address Section */}
          <div className="border-t pt-4">
            <p className="font-semibold text-gray-700 mb-3">Address Information</p>
            <FormGroup label="Street Address">
              <input
                type="text"
                value={formData.address.street}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Street address"
              />
            </FormGroup>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="City">
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="City"
                />
              </FormGroup>
              <FormGroup label="State">
                <input
                  type="text"
                  value={formData.address.state}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="State"
                />
              </FormGroup>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="ZIP Code">
                <input
                  type="text"
                  value={formData.address.zipCode}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, zipCode: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="ZIP Code"
                />
              </FormGroup>
              <FormGroup label="Country">
                <input
                  type="text"
                  value={formData.address.country}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Country"
                />
              </FormGroup>
            </div>
          </div>

          {/* Bank Details Section */}
          <div className="border-t pt-4">
            <p className="font-semibold text-gray-700 mb-3">Bank Details</p>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Account Name">
                <input
                  type="text"
                  value={formData.bankDetails.accountName}
                  onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountName: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Account Holder Name"
                />
              </FormGroup>
              <FormGroup label="Account Number">
                <input
                  type="text"
                  value={formData.bankDetails.accountNumber}
                  onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountNumber: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Account Number"
                />
              </FormGroup>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Bank Name">
                <input
                  type="text"
                  value={formData.bankDetails.bankName}
                  onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, bankName: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Bank Name"
                />
              </FormGroup>
              <FormGroup label="Branch Name">
                <input
                  type="text"
                  value={formData.bankDetails.branchName}
                  onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, branchName: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Branch Name"
                />
              </FormGroup>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="IFSC Code">
                <input
                  type="text"
                  value={formData.bankDetails.ifscCode}
                  onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, ifscCode: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="IFSC Code"
                />
              </FormGroup>
              <FormGroup label="SWIFT Code (International)">
                <input
                  type="text"
                  value={formData.bankDetails.swiftCode}
                  onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, swiftCode: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="SWIFT Code"
                />
              </FormGroup>
            </div>
          </div>

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
          setError(null);
          resetForm();
        }}
        onSubmit={handleEditVendor}
        title="Edit Vendor"
        subtitle="Update vendor information"
        submitLabel="Update Vendor"
        submitColor="indigo"
        isLoading={actionLoading}
        error={error}
        successMessage={successMessage}
      >
        <div className="space-y-4">
          {/* Validation Error Summary */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
              <p className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Please fix the following errors:
              </p>
              <ul className="space-y-2">
                {Object.entries(validationErrors).map(([field, error]) => (
                  <li key={field} className="text-sm text-red-800 flex items-start gap-2">
                    <span className="text-red-600 font-bold mt-0.5">•</span>
                    <span>
                      <strong>{field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}:</strong> {error}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Name" required>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  validationErrors.name 
                    ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-indigo-500'
                }`}
                placeholder="Contact Person Name"
              />
            </FormGroup>
            <FormGroup label="Email" required>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  validationErrors.email 
                    ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-indigo-500'
                }`}
                placeholder="contact@vendor.com"
              />
            </FormGroup>
          </div>

          <FormGroup label="Phone" required error={validationErrors.phone}>
            <div className="flex gap-2">
              <select
                value={formData.phoneCountry}
                onChange={(e) => setFormData({ ...formData, phoneCountry: e.target.value })}
                className="w-40 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                title="Select country code"
              >
                {COUNTRIES.map(country => (
                  <option key={country.code} value={country.code} title={country.name}>
                    {country.flag} {country.code} {country.callingCode}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  validationErrors.phone 
                    ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-indigo-500'
                }`}
                placeholder={getPhonePlaceholder(formData.phoneCountry)}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Enter phone number with or without country code</p>
          </FormGroup>

          <FormGroup label="Business Name" required>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                validationErrors.businessName 
                  ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-indigo-500'
              }`}
              placeholder="Business/Company Name"
            />
          </FormGroup>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Service Type" required>
              <select
                value={formData.serviceType}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  validationErrors.serviceType 
                    ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-indigo-500'
                }`}
              >
                <option value="">Select Type</option>
                {VENDOR_TYPES.map(type => (
                  <option key={type} value={type}>{VENDOR_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </FormGroup>
            <FormGroup label="Registration Number" required>
              <input
                type="text"
                value={formData.businessRegistrationNumber}
                onChange={(e) => setFormData({ ...formData, businessRegistrationNumber: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  validationErrors.businessRegistrationNumber 
                    ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-indigo-500'
                }`}
                placeholder="Business Reg. Number"
              />
            </FormGroup>
          </div>

          <FormGroup label="Tax Identification Number" required>
            <input
              type="text"
              value={formData.taxIdentificationNumber}
              onChange={(e) => setFormData({ ...formData, taxIdentificationNumber: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                validationErrors.taxIdentificationNumber 
                  ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-indigo-500'
              }`}
              placeholder="Tax ID"
            />
          </FormGroup>

          {/* Address Section */}
          <div className="border-t pt-4">
            <p className="font-semibold text-gray-700 mb-3">Address Information</p>
            <FormGroup label="Street Address">
              <input
                type="text"
                value={formData.address.street}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Street address"
              />
            </FormGroup>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="City">
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="City"
                />
              </FormGroup>
              <FormGroup label="State">
                <input
                  type="text"
                  value={formData.address.state}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="State"
                />
              </FormGroup>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="ZIP Code">
                <input
                  type="text"
                  value={formData.address.zipCode}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, zipCode: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="ZIP Code"
                />
              </FormGroup>
              <FormGroup label="Country">
                <input
                  type="text"
                  value={formData.address.country}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Country"
                />
              </FormGroup>
            </div>
          </div>

          {/* Bank Details Section */}
          <div className="border-t pt-4">
            <p className="font-semibold text-gray-700 mb-3">Bank Details</p>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Account Name">
                <input
                  type="text"
                  value={formData.bankDetails.accountName}
                  onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountName: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Account Holder Name"
                />
              </FormGroup>
              <FormGroup label="Account Number">
                <input
                  type="text"
                  value={formData.bankDetails.accountNumber}
                  onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountNumber: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Account Number"
                />
              </FormGroup>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Bank Name">
                <input
                  type="text"
                  value={formData.bankDetails.bankName}
                  onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, bankName: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Bank Name"
                />
              </FormGroup>
              <FormGroup label="Branch Name">
                <input
                  type="text"
                  value={formData.bankDetails.branchName}
                  onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, branchName: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Branch Name"
                />
              </FormGroup>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="IFSC Code">
                <input
                  type="text"
                  value={formData.bankDetails.ifscCode}
                  onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, ifscCode: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="IFSC Code"
                />
              </FormGroup>
              <FormGroup label="SWIFT Code (International)">
                <input
                  type="text"
                  value={formData.bankDetails.swiftCode}
                  onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, swiftCode: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="SWIFT Code"
                />
              </FormGroup>
            </div>
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
        description={`Are you sure you want to delete ${vendorToDelete?.businessName}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDangerous={true}
        isLoading={actionLoading}
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
        isLoading={actionLoading}
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
        isLoading={actionLoading}
      />
    </div>
  );
};

export default VendorManagement;

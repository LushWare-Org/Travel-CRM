import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash, Building2, CheckCircle, AlertCircle } from 'lucide-react';
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
      createdAt: '2024-02-01',
      rating: 4.8,
      partneredSince: '2024-02-01',
      contactPerson: 'Ahmed Hassan'
    },
    {
      id: 2,
      name: 'City Hotel Chain',
      type: 'Hotel',
      email: 'biz@cityhotel.com',
      phone: '+1-555-2222',
      location: 'Multiple Cities',
      verificationStatus: 'verified',
      createdAt: '2024-01-15',
      rating: 4.5,
      partneredSince: '2024-01-15',
      contactPerson: 'Maria Garcia'
    },
    {
      id: 3,
      name: 'Adventure Tours Co',
      type: 'Tour Operator',
      email: 'info@adventuretours.com',
      phone: '+1-555-3333',
      location: 'Nepal',
      verificationStatus: 'pending',
      createdAt: '2024-10-01',
      rating: 0,
      partneredSince: null,
      contactPerson: 'Raj Patel'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewVendorDialog, setShowNewVendorDialog] = useState(false);
  const [showEditVendorDialog, setShowEditVendorDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorToDelete, setVendorToDelete] = useState(null);

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
      const newVendor = {
        id: Math.max(...vendors.map(v => v.id), 0) + 1,
        ...formData,
        verificationStatus: 'pending',
        createdAt: new Date().toISOString().split('T')[0],
        rating: 0,
        partneredSince: null
      };
      setVendors([...vendors, newVendor]);
      setShowNewVendorDialog(false);
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
      resetForm();
    }
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
  };

  const handleVerifyVendor = (vendor) => {
    setVendors(vendors.map(v =>
      v.id === vendor.id
        ? { ...v, verificationStatus: 'verified', partneredSince: new Date().toISOString().split('T')[0] }
        : v
    ));
  };

  const handleRejectVendor = (vendor) => {
    setVendors(vendors.map(v =>
      v.id === vendor.id
        ? { ...v, verificationStatus: 'rejected' }
        : v
    ));
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
        submitLabel="Register Vendor"
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

          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
            <p className="text-xs font-semibold text-indigo-900 mb-2">Verification Process</p>
            <ul className="text-xs text-indigo-800 space-y-1">
              <li>• New vendors will be marked as "Pending Review"</li>
              <li>• Admin verification required before partnership activation</li>
              <li>• Rating system updated after first booking</li>
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
    </div>
  );
};

export default VendorManagement;

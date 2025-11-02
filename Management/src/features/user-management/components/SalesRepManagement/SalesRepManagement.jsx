import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash, User, TrendingUp } from 'lucide-react';
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
      status: 'active',
      createdAt: '2024-01-15',
      lastActive: '2024-10-22',
      leadsAssigned: 45,
      leadsConverted: 12,
      commissionRate: 10,
      totalEarnings: 25000
    },
    {
      id: 2,
      name: 'Mike Chen',
      email: 'mike@travelagency.com',
      phone: '+1-555-5678',
      status: 'active',
      createdAt: '2024-02-10',
      lastActive: '2024-10-21',
      leadsAssigned: 32,
      leadsConverted: 8,
      commissionRate: 10,
      totalEarnings: 18500
    },
    {
      id: 3,
      name: 'Emma Wilson',
      email: 'emma@travelagency.com',
      phone: '+1-555-7890',
      status: 'active',
      createdAt: '2024-05-20',
      lastActive: '2024-10-19',
      leadsAssigned: 28,
      leadsConverted: 5,
      commissionRate: 12,
      totalEarnings: 12000
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewRepDialog, setShowNewRepDialog] = useState(false);
  const [showEditRepDialog, setShowEditRepDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedRep, setSelectedRep] = useState(null);
  const [repToDelete, setRepToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    commissionRate: 10,
    targetLeads: 50
  });

  const ITEMS_PER_PAGE = 10;

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
      password: '',
      confirmPassword: '',
      commissionRate: 10,
      targetLeads: 50
    });
  };

  const handleAddRep = () => {
    if (formData.name && formData.email && formData.phone && formData.password) {
      const newRep = {
        id: Math.max(...salesReps.map(r => r.id), 0) + 1,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0],
        lastActive: new Date().toISOString().split('T')[0],
        leadsAssigned: 0,
        leadsConverted: 0,
        commissionRate: formData.commissionRate,
        totalEarnings: 0
      };
      setSalesReps([...salesReps, newRep]);
      setShowNewRepDialog(false);
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
      resetForm();
    }
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
  };

  const openEditDialog = (rep) => {
    setSelectedRep(rep);
    setFormData({
      name: rep.name,
      email: rep.email,
      phone: rep.phone,
      password: '',
      confirmPassword: '',
      commissionRate: rep.commissionRate,
      targetLeads: 50
    });
    setShowEditRepDialog(true);
  };

  return (
    <div className="space-y-6">
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
        submitLabel="Create Sales Rep"
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

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Password" required>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Set password"
              />
            </FormGroup>
            <FormGroup label="Confirm Password" required>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm password"
              />
            </FormGroup>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-xs font-semibold text-blue-900 mb-2">Quick Info</p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Leads will be assigned based on region and performance</li>
              <li>• Commission calculated on confirmed bookings</li>
              <li>• Access dashboard after account activation</li>
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
    </div>
  );
};

export default SalesRepManagement;

import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash, Users, UserCheck, UserX } from 'lucide-react';
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
import WebsiteUsersTable from './WebsiteUsersTable';

const WebsiteUsersManagement = () => {
  const [websiteUsers, setWebsiteUsers] = useState([
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-1111',
      status: 'active',
      createdAt: '2024-01-10',
      lastLogin: '2024-10-22',
      bookings: 3,
      totalSpent: 5400
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1-555-2222',
      status: 'active',
      createdAt: '2024-02-15',
      lastLogin: '2024-10-20',
      bookings: 1,
      totalSpent: 1200
    },
    {
      id: 3,
      name: 'Robert Wilson',
      email: 'robert@example.com',
      phone: '+1-555-3333',
      status: 'inactive',
      createdAt: '2024-03-20',
      lastLogin: '2024-08-10',
      bookings: 0,
      totalSpent: 0
    },
    {
      id: 4,
      name: 'Alice Johnson',
      email: 'alice@example.com',
      phone: '+1-555-4444',
      status: 'active',
      createdAt: '2024-04-05',
      lastLogin: '2024-10-21',
      bookings: 5,
      totalSpent: 12300
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'active'
  });

  const ITEMS_PER_PAGE = 10;

  const filteredUsers = useMemo(() => {
    return websiteUsers.filter(user => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.phone.includes(searchTerm);
      
      const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [websiteUsers, searchTerm, filterStatus]);

  const paginatedData = useMemo(() => {
    return paginateArray(filteredUsers, currentPage, ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const stats = useMemo(() => {
    const totalRevenue = websiteUsers.reduce((sum, user) => sum + user.totalSpent, 0);
    const totalBookings = websiteUsers.reduce((sum, user) => sum + user.bookings, 0);
    const avgSpent = websiteUsers.length > 0 ? (totalRevenue / websiteUsers.length).toFixed(2) : 0;

    return {
      total: websiteUsers.length,
      active: websiteUsers.filter(u => u.status === 'active').length,
      inactive: websiteUsers.filter(u => u.status === 'inactive').length,
      totalRevenue,
      totalBookings,
      avgSpent
    };
  }, [websiteUsers]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      status: 'active'
    });
  };

  const handleAddUser = () => {
    if (formData.name && formData.email && formData.phone) {
      const newUser = {
        id: Math.max(...websiteUsers.map(u => u.id), 0) + 1,
        ...formData,
        createdAt: new Date().toISOString().split('T')[0],
        lastLogin: null,
        bookings: 0,
        totalSpent: 0
      };
      setWebsiteUsers([...websiteUsers, newUser]);
      setShowNewUserDialog(false);
      resetForm();
    }
  };

  const handleEditUser = () => {
    if (selectedUser && formData.name && formData.email && formData.phone) {
      setWebsiteUsers(websiteUsers.map(u => 
        u.id === selectedUser.id 
          ? {
              ...u,
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              status: formData.status
            }
          : u
      ));
      setSelectedUser(null);
      setShowEditUserDialog(false);
      resetForm();
    }
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setWebsiteUsers(websiteUsers.filter(u => u.id !== userToDelete.id));
    setShowDeleteConfirm(false);
    setUserToDelete(null);
    setSelectedUser(null);
  };

  const handleToggleStatus = (user) => {
    setWebsiteUsers(websiteUsers.map(u =>
      u.id === user.id
        ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' }
        : u
    ));
  };

  const openEditDialog = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status
    });
    setShowEditUserDialog(true);
  };

  return (
    <div className="space-y-6">
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
          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-colors font-medium flex items-center gap-2"
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
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
        onSearchChange={setSearchTerm}
        onFilterClick={() => {}}
        title="Users List"
        subtitle="Monitor user activity and manage accounts"
      />

      <WebsiteUsersTable
        users={paginatedData.data}
        onEdit={openEditDialog}
        onDelete={handleDeleteUser}
        onToggleStatus={handleToggleStatus}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={paginatedData.pages}
        onPageChange={setCurrentPage}
        itemsPerPage={ITEMS_PER_PAGE}
        totalItems={filteredUsers.length}
      />

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
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Full Name" required>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="John Doe"
              />
            </FormGroup>
            <FormGroup label="Email" required>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="+1-555-0000"
              />
            </FormGroup>
            <FormGroup label="Initial Status" required>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
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
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Full Name" required>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </FormGroup>
            <FormGroup label="Email" required>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </FormGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Phone" required>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </FormGroup>
            <FormGroup label="Status" required>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
      />
    </div>
  );
};

export default WebsiteUsersManagement;

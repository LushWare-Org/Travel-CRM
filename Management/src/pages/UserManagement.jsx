import { useState } from "react";
import { ArrowLeft, Plus, Search, Filter, MoreVertical, Phone, Mail, User, Shield, Clock, X, Edit, Trash } from "lucide-react";

const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToReset, setUserToReset] = useState(null);
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    password: "",
    confirmPassword: "",
  });
  const [editUserForm, setEditUserForm] = useState({
    id: null,
    name: "",
    email: "",
    phone: "",
    role: "",
  });
  const [filterLastActiveStart, setFilterLastActiveStart] = useState("");
  const [filterLastActiveEnd, setFilterLastActiveEnd] = useState("");
  const [filterRoles, setFilterRoles] = useState([]);

  const [users, setUsers] = useState([
    {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah@travelagency.com",
      phone: "+1-555-1234",
      role: "Adviser",
      status: "active",
      createdDate: "2024-01-15",
      lastActive: "2024-10-22",
      leadsAssigned: 45,
    },
    {
      id: 2,
      name: "Mike Chen",
      email: "mike@travelagency.com",
      phone: "+1-555-5678",
      role: "Adviser",
      status: "active",
      createdDate: "2024-02-10",
      lastActive: "2024-10-21",
      leadsAssigned: 32,
    },
    {
      id: 3,
      name: "Lisa Anderson",
      email: "lisa@travelagency.com",
      phone: "+1-555-9012",
      role: "Admin",
      status: "active",
      createdDate: "2024-03-05",
      lastActive: "2024-10-20",
      leadsAssigned: 0,
    },
    {
      id: 4,
      name: "David Brown",
      email: "david@travelagency.com",
      phone: "+1-555-3456",
      role: "Accountant",
      status: "inactive",
      createdDate: "2024-04-01",
      lastActive: "2024-09-15",
      leadsAssigned: 0,
    },
    {
      id: 5,
      name: "Emma Wilson",
      email: "emma@travelagency.com",
      phone: "+1-555-7890",
      role: "Adviser",
      status: "active",
      createdDate: "2024-05-20",
      lastActive: "2024-10-19",
      leadsAssigned: 28,
    },
  ]);

  const roleColors = {
    Admin: { 
      badge: "bg-purple-100 text-purple-800",
      tab: "bg-purple-100 text-purple-800"
    },
    Adviser: { 
      badge: "bg-blue-100 text-blue-800",
      tab: "bg-blue-100 text-blue-800"
    },
    Accountant: { 
      badge: "bg-green-100 text-green-800",
      tab: "bg-green-100 text-green-800"
    },
  };

  const statusColors = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-red-100 text-red-800",
  };

  const roles = ["Admin", "Adviser", "Accountant"];

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.phone.includes(searchTerm);
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesLastActive =
      (!filterLastActiveStart || user.lastActive >= filterLastActiveStart) &&
      (!filterLastActiveEnd || user.lastActive <= filterLastActiveEnd);
    const matchesRoles = filterRoles.length === 0 || filterRoles.includes(user.role);
    return matchesSearch && matchesRole && matchesLastActive && matchesRoles;
  });

  const handleAddUser = () => {
    if (
      newUserForm.name &&
      newUserForm.email &&
      newUserForm.phone &&
      newUserForm.role &&
      newUserForm.password &&
      newUserForm.password === newUserForm.confirmPassword
    ) {
      const newId = users.length + 1;
      const newUser = {
        id: newId,
        name: newUserForm.name.trim(),
        email: newUserForm.email,
        phone: newUserForm.phone,
        role: newUserForm.role,
        status: "active",
        createdDate: new Date().toISOString().split("T")[0],
        lastActive: new Date().toISOString().split("T")[0],
        leadsAssigned: 0,
      };
      setUsers([...users, newUser]);
      setShowNewUserDialog(false);
      setNewUserForm({
        name: "",
        email: "",
        phone: "",
        role: "",
        password: "",
        confirmPassword: "",
      });
    }
  };

  const handleEditUser = () => {
    if (editUserForm.name && editUserForm.email && editUserForm.phone && editUserForm.role) {
      const updatedUser = {
        ...editUserForm,
        name: editUserForm.name.trim(),
      };
      setUsers(
        users.map((u) =>
          u.id === editUserForm.id ? { ...u, ...updatedUser } : u
        )
      );
      setSelectedUser(updatedUser);
      setShowEditUserDialog(false);
      setEditUserForm({
        id: null,
        name: "",
        email: "",
        phone: "",
        role: "",
      });
    }
  };

  const handleDeleteUser = (id) => {
    setUserToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = () => {
    setUsers(users.filter((u) => u.id !== userToDelete));
    setSelectedUser(null);
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  const handleResetPassword = (user) => {
    setUserToReset(user);
    setShowResetConfirm(true);
  };

  const confirmResetPassword = () => {
    // Simulate sending a password reset email
    console.log(`Password reset email sent to ${userToReset.email}`);
    setShowResetConfirm(false);
    setUserToReset(null);
  };

  const openEditUserDialog = (user) => {
    setEditUserForm({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });
    setShowEditUserDialog(true);
  };

  const handleRoleFilterChange = (role) => {
    setFilterRoles((prev) =>
      prev.includes(role)
        ? prev.filter((r) => r !== role)
        : [...prev, role]
    );
  };

  const clearFilters = () => {
    setFilterLastActiveStart("");
    setFilterLastActiveEnd("");
    setFilterRoles([]);
    setShowFilterDialog(false);
  };

  const applyFilters = () => {
    setShowFilterDialog(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600 mt-1">Manage staff, advisers, and access permissions</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewUserDialog(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New User
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium">Total Users</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{users.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium">Active Users</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{users.filter(u => u.status === "active").length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium">Advisers</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{users.filter(u => u.role === "Adviser").length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium">Avg. Leads/Adviser</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {users.filter(u => u.role === "Adviser").reduce((acc, u) => acc + u.leadsAssigned, 0) / 
              (users.filter(u => u.role === "Adviser").length || 1)}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilterDialog(true)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Role Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: "all", label: "All Users", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: "bg-white", textColor: "text-gray-700" },
            { key: "Admin", label: "Admins", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: roleColors.Admin.tab, textColor: "text-purple-800" },
            { key: "Adviser", label: "Advisers", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: roleColors.Adviser.tab, textColor: "text-blue-800" },
            { key: "Accountant", label: "Accountants", activeBg: "bg-gradient-to-r from-blue-600 to-purple-600", inactiveBg: roleColors.Accountant.tab, textColor: "text-green-800" },
          ].map(({ key, label, activeBg, inactiveBg, textColor }) => (
            <button
              key={key}
              onClick={() => setFilterRole(key)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors shadow-sm ${
                filterRole === key
                  ? `${activeBg} text-white`
                  : `${inactiveBg} border border-gray-300 ${textColor} hover:bg-slate-200`
              }`}
            >
              {label}
              <span className="ml-2 text-xs bg-opacity-20 bg-gray-200 px-2 py-1 rounded-full">
                {key === "all" ? users.length : users.filter((u) => u.role === key).length}
              </span>
            </button>
          ))}
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[150px]">Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[180px]">Email</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[130px]">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[120px]">Role</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[120px]">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[120px]">Last Active</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[120px]">Leads Assigned</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
                  <td className="px-4 py-3 text-sm font-bold border-r border-gray-200">{user.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 font-semibold">{user.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{user.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{user.phone}</td>
                  <td className="px-4 py-3 whitespace-nowrap border-r border-gray-200">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColors[user.role]?.badge}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap border-r border-gray-200">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[user.status]}`}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{user.lastActive}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{user.leadsAssigned}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <button className="p-2 hover:bg-opacity-80 rounded-lg transition-colors bg-gray-100">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No users found</p>
              <p className="text-sm mt-2">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>

        {/* User Detail Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedUser.name}</h2>
                  <p className="text-gray-600 mt-1">User details and performance</p>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Role & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Role</label>
                    <select
                      value={selectedUser.role}
                      onChange={(e) =>
                        setUsers(
                          users.map((u) =>
                            u.id === selectedUser.id ? { ...u, role: e.target.value } : u
                          )
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Adviser">Adviser</option>
                      <option value="Accountant">Accountant</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Status</label>
                    <select
                      value={selectedUser.status}
                      onChange={(e) =>
                        setUsers(
                          users.map((u) =>
                            u.id === selectedUser.id ? { ...u, status: e.target.value } : u
                          )
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${selectedUser.email}`} className="hover:text-blue-600">Email: {selectedUser.email}</a>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${selectedUser.phone}`} className="hover:text-blue-600">Phone: {selectedUser.phone}</a>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Created Date</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{selectedUser.createdDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Last Active</p>
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1 mt-1">
                      <Clock className="w-4 h-4" />
                      {selectedUser.lastActive}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Leads Assigned</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{selectedUser.leadsAssigned}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Conversion Rate</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">18.5% (Placeholder)</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => openEditUserDialog(selectedUser)}
                    className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit User
                  </button>
                  <button
                    onClick={() => handleDeleteUser(selectedUser.id)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Trash className="w-4 h-4" />
                    Delete User
                  </button>
                  <button
                    onClick={() => handleResetPassword(selectedUser)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Reset Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Popup */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Trash className="w-6 h-6 text-red-600" />
                  <h2 className="text-xl font-bold text-gray-900">Confirm Delete</h2>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete the user <span className="font-semibold">
                    {users.find(u => u.id === userToDelete)?.name}
                  </span>? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteUser}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reset Password Confirmation Popup */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Confirm Password Reset</h2>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to reset the password for <span className="font-semibold">
                    {userToReset?.name}
                  </span>? A password reset link will be sent to <span className="font-semibold">
                    {userToReset?.email}
                  </span>.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmResetPassword}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Reset Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New User Dialog */}
        {showNewUserDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Add New User</h2>
                  <p className="text-sm text-gray-600 mt-1">Fill in user information</p>
                </div>
                <button
                  onClick={() => setShowNewUserDialog(false)}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      value={newUserForm.name}
                      onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="email@travelagency.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                    <input
                      type="tel"
                      value={newUserForm.phone}
                      onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1-555-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                    <select
                      value={newUserForm.role}
                      onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Role</option>
                      <option value="Admin">Admin</option>
                      <option value="Adviser">Adviser</option>
                      <option value="Accountant">Accountant</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                    <input
                      type="password"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                    <input
                      type="password"
                      value={newUserForm.confirmPassword}
                      onChange={(e) => setNewUserForm({ ...newUserForm, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Confirm password"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowNewUserDialog(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddUser}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
                  >
                    Add User
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Dialog */}
        {showEditUserDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
                  <p className="text-sm text-gray-600 mt-1">Update user information</p>
                </div>
                <button
                  onClick={() => setShowEditUserDialog(false)}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      value={editUserForm.name}
                      onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      value={editUserForm.email}
                      onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="email@travelagency.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                    <input
                      type="tel"
                      value={editUserForm.phone}
                      onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1-555-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                    <select
                      value={editUserForm.role}
                      onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Role</option>
                      <option value="Admin">Admin</option>
                      <option value="Adviser">Adviser</option>
                      <option value="Accountant">Accountant</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowEditUserDialog(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditUser}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Dialog */}
        {showFilterDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Filter Users</h2>
                  <p className="text-sm text-gray-600 mt-1">Select filters to refine user list</p>
                </div>
                <button
                  onClick={() => setShowFilterDialog(false)}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Active Range</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={filterLastActiveStart}
                        onChange={(e) => setFilterLastActiveStart(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">End Date</label>
                      <input
                        type="date"
                        value={filterLastActiveEnd}
                        onChange={(e) => setFilterLastActiveEnd(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                  <div className="grid grid-cols-2 gap-2">
                    {roles.map((role) => (
                      <label key={role} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={filterRoles.includes(role)}
                          onChange={() => handleRoleFilterChange(role)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={clearFilters}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors font-medium"
                  >
                    Clear
                  </button>
                  <button
                    onClick={applyFilters}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
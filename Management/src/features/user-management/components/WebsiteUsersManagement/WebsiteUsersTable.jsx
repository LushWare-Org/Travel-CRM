import React from 'react';
import { Edit, Trash, Eye, EyeOff } from 'lucide-react';
import { STATUS_COLORS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';

const WebsiteUsersTable = ({ users, onEdit, onDelete, onToggleStatus, loading }) => {
  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Name</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Email</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Phone</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Bookings</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Total Spent</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Joined</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Last Login</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Status</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                <p>Loading users...</p>
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                <p className="text-lg">No users found</p>
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-all duration-200">
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">{user.name}</td>
                <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{user.email}</td>
                <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{user.phone}</td>
                <td className="px-4 py-3 text-sm border-r border-gray-200">
                  <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-semibold text-xs">{user.bookings}</span>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">
                  ${user.totalSpent.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">{formatDate(user.createdAt)}</td>
                <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">
                  {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                </td>
                <td className="px-4 py-3 text-sm border-r border-gray-200">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[user.status] || STATUS_COLORS.active}`}>
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onToggleStatus(user)}
                      disabled={loading}
                      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${user.status === 'active' ? 'hover:bg-red-100 text-red-600' : 'hover:bg-green-100 text-green-600'}`}
                      title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                    >
                      {user.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => onEdit(user)}
                      disabled={loading}
                      className="p-2 hover:bg-yellow-100 rounded-lg transition-colors text-yellow-600 disabled:opacity-50"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(user)}
                      disabled={loading}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600 disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default WebsiteUsersTable;

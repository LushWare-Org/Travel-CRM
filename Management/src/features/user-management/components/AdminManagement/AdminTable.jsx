import React from 'react';
import { Edit, Trash, Eye } from 'lucide-react';
import { STATUS_COLORS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';

const AdminTable = ({ admins, onEdit, onDelete, onSelectAdmin }) => {
  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Name</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Email</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Phone</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Permissions</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">2FA</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Status</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Last Active</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {admins.map((admin) => (
            <tr key={admin.id} className="hover:bg-gray-50 transition-all duration-200">
              <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">{admin.name}</td>
              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{admin.email}</td>
              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{admin.phone}</td>
              <td className="px-4 py-3 text-sm border-r border-gray-200">
                <span className="text-xs font-semibold text-gray-700">{(admin.permissions || []).length} permissions</span>
              </td>
              <td className="px-4 py-3 text-sm border-r border-gray-200">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${admin.twoFactorEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {admin.twoFactorEnabled ? '✓ Enabled' : 'Disabled'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm border-r border-gray-200">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[admin.status] || STATUS_COLORS.active}`}>
                  {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">{formatDate(admin.lastActive)}</td>
              <td className="px-4 py-3 text-sm">
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(admin)}
                    className="p-2 hover:bg-yellow-100 rounded-lg transition-colors text-yellow-600"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(admin)}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                    title="Delete"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {admins.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No admins found</p>
        </div>
      )}
    </div>
  );
};

export default AdminTable;

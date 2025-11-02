import React from 'react';
import { Edit, Trash, Mail, RotateCcw, CheckCircle, Clock } from 'lucide-react';
import { STATUS_COLORS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';

const AdminTable = ({ admins, onEdit, onDelete, onResendInvite, onForcePasswordReset }) => {
  const getStatusBadge = (admin) => {
    if (admin.status === 'invited') {
      return (
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
          <Clock className="w-3 h-3" /> 
          Pending Invite
        </span>
      );
    }
    if (admin.status === 'password_reset_required') {
      return (
        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
          <RotateCcw className="w-3 h-3" /> 
          Reset Required
        </span>
      );
    }
    if (admin.status === 'active') {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
          <CheckCircle className="w-3 h-3" /> 
          Active
        </span>
      );
    }
    return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Inactive</span>;
  };

  const getAccountStatusLabel = (accountStatus) => {
    switch (accountStatus) {
      case 'verified':
        return <span className="text-xs text-green-700 font-medium">✓ Verified</span>;
      case 'pending_first_login':
        return <span className="text-xs text-blue-700 font-medium">Pending First Login</span>;
      case 'pending_password_change':
        return <span className="text-xs text-orange-700 font-medium">Password Change Required</span>;
      default:
        return <span className="text-xs text-gray-600">{accountStatus}</span>;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Account Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">2FA</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Permissions</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Last Active</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {admins.map(admin => (
              <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{admin.name}</p>
                  <p className="text-xs text-gray-500">{admin.phone}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{admin.email}</td>
                <td className="px-6 py-4">
                  {getStatusBadge(admin)}
                </td>
                <td className="px-6 py-4">
                  {getAccountStatusLabel(admin.accountStatus)}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-medium ${admin.twoFactorEnabled ? 'text-green-700' : 'text-gray-500'}`}>
                    {admin.twoFactorEnabled ? '✓ Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-full">
                    {(admin.permissions || []).length} permissions
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {admin.lastActive ? (
                    <div>
                      <p>{formatDate(admin.lastActive)}</p>
                      <p className="text-xs text-gray-500">{new Date(admin.lastActive).toLocaleDateString()}</p>
                    </div>
                  ) : (
                    <span className="text-gray-400">Never</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {admin.status === 'invited' && (
                      <button
                        onClick={() => onResendInvite(admin)}
                        title="Resend Invitation"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    )}
                    {(admin.status === 'password_reset_required' || admin.status === 'active') && (
                      <button
                        onClick={() => onForcePasswordReset(admin)}
                        title="Force Password Reset"
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(admin)}
                      title="Edit Admin"
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(admin)}
                      title="Delete Admin"
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {admins.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No admins found</p>
        </div>
      )}
    </div>
  );
};

export default AdminTable;

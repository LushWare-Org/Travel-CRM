import React from 'react';
import { Edit, Trash, Mail, Key } from 'lucide-react';
import { STATUS_COLORS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';

const SalesRepTable = ({ reps, onEdit, onDelete, onResendInvite, onForcePasswordReset }) => {
  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Name</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Email</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Phone</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Leads Assigned</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Converted</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Conv. Rate</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Commission</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Status</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {reps.map((rep) => {
            const conversionRate = rep.leadsAssigned > 0 ? ((rep.leadsConverted / rep.leadsAssigned) * 100).toFixed(1) : 0;
            
            return (
              <tr key={rep.id} className="hover:bg-gray-50 transition-all duration-200">
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">{rep.name}</td>
                <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{rep.email}</td>
                <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{rep.phone}</td>
                <td className="px-4 py-3 text-sm border-r border-gray-200">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">{rep.leadsAssigned}</span>
                </td>
                <td className="px-4 py-3 text-sm border-r border-gray-200">
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full font-semibold">{rep.leadsConverted}</span>
                </td>
                <td className="px-4 py-3 text-sm border-r border-gray-200">
                  <span className={`inline-block px-3 py-1 rounded-full font-semibold ${
                    conversionRate >= 30 ? 'bg-green-100 text-green-800' : 
                    conversionRate >= 15 ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {conversionRate}%
                  </span>
                </td>
                <td className="px-4 py-3 text-sm border-r border-gray-200">
                  <span className="text-gray-700 font-semibold">{rep.commissionRate}%</span>
                </td>
                <td className="px-4 py-3 text-sm border-r border-gray-200">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[rep.status] || STATUS_COLORS.active}`}>
                    {rep.status.charAt(0).toUpperCase() + rep.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-2 flex-wrap">
                    {/* Resend Invitation - Show if pending first login */}
                    {rep.accountStatus === 'pending_first_login' && (
                      <button
                        onClick={() => onResendInvite?.(rep)}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600 flex-shrink-0"
                        title="Resend Invitation Email"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    )}

                    {/* Force Password Reset - Show if account is active or needs reset */}
                    {(rep.accountStatus === 'verified' || rep.accountStatus === 'pending_password_reset') && (
                      <button
                        onClick={() => onForcePasswordReset?.(rep)}
                        className="p-2 hover:bg-purple-100 rounded-lg transition-colors text-purple-600 flex-shrink-0"
                        title="Force Password Reset"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                    )}

                    {/* Edit Button */}
                    <button
                      onClick={() => onEdit(rep)}
                      className="p-2 hover:bg-yellow-100 rounded-lg transition-colors text-yellow-600 flex-shrink-0"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => onDelete(rep)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600 flex-shrink-0"
                      title="Delete"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {reps.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No sales representatives found</p>
        </div>
      )}
    </div>
  );
};

export default SalesRepTable;

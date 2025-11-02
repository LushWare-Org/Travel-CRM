import React from 'react';
import { Edit, Trash, CheckCircle, XCircle, Mail, Key } from 'lucide-react';
import { VENDOR_VERIFICATION_COLORS, VENDOR_TYPE_COLORS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';

const VendorTable = ({ vendors, onEdit, onDelete, onVerify, onReject, onResendInvite, onForcePasswordReset }) => {
  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Business Name</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Type</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Location</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Email</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Rating</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Status</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Registered</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {vendors.map((vendor) => (
            <tr key={vendor.id} className="hover:bg-gray-50 transition-all duration-200">
              <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">{vendor.name}</td>
              <td className="px-4 py-3 text-sm border-r border-gray-200">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${VENDOR_TYPE_COLORS[vendor.type] || 'bg-gray-100 text-gray-800'}`}>
                  {vendor.type}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">{vendor.location}</td>
              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 truncate">{vendor.email}</td>
              <td className="px-4 py-3 text-sm border-r border-gray-200">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">★</span>
                  <span className="font-semibold text-gray-900">{vendor.rating > 0 ? vendor.rating : 'N/A'}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm border-r border-gray-200">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${VENDOR_VERIFICATION_COLORS[vendor.verificationStatus] || 'bg-gray-100 text-gray-800'}`}>
                  {vendor.verificationStatus.charAt(0).toUpperCase() + vendor.verificationStatus.slice(1)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">{formatDate(vendor.createdAt)}</td>
              <td className="px-4 py-3 text-sm">
                <div className="flex gap-2 flex-wrap">
                  {/* Verification Actions - Only show for pending vendors */}
                  {vendor.verificationStatus === 'pending' && (
                    <>
                      <button
                        onClick={() => onVerify(vendor)}
                        className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600 flex-shrink-0"
                        title="Verify Vendor"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onReject(vendor)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600 flex-shrink-0"
                        title="Reject Vendor"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* Resend Invitation - Show if pending first login */}
                  {vendor.accountStatus === 'pending_first_login' && (
                    <button
                      onClick={() => onResendInvite?.(vendor)}
                      className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600 flex-shrink-0"
                      title="Resend Invitation Email"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                  )}

                  {/* Force Password Reset - Show if account is active or needs reset */}
                  {(vendor.accountStatus === 'verified' || vendor.accountStatus === 'pending_password_reset') && (
                    <button
                      onClick={() => onForcePasswordReset?.(vendor)}
                      className="p-2 hover:bg-purple-100 rounded-lg transition-colors text-purple-600 flex-shrink-0"
                      title="Force Password Reset"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                  )}

                  {/* Edit Button */}
                  <button
                    onClick={() => onEdit(vendor)}
                    className="p-2 hover:bg-yellow-100 rounded-lg transition-colors text-yellow-600 flex-shrink-0"
                    title="Edit Vendor"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => onDelete(vendor)}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600 flex-shrink-0"
                    title="Delete Vendor"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {vendors.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No vendors found</p>
        </div>
      )}
    </div>
  );
};

export default VendorTable;

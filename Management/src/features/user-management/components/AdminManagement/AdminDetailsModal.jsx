import React from 'react';
import { X, Shield } from 'lucide-react';

const AdminDetailsModal = ({ admin, isOpen, onClose }) => {
  if (!isOpen || !admin) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{admin.name}</h2>
              <p className="text-sm text-gray-600">Administrator Details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase">Email</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{admin.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase">Phone</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{admin.phone}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase">Status</p>
              <span className="inline-block mt-1 px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase">2FA Status</p>
              <span className="inline-block mt-1 px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                {admin.twoFactorEnabled ? '✓ Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDetailsModal;

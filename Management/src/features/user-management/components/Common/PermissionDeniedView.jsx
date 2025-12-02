import React from 'react';
import { Lock, AlertCircle, Mail } from 'lucide-react';

/**
 * PermissionDeniedView Component
 * Shows a friendly message when user lacks permission to access a section
 */
const PermissionDeniedView = ({ 
  section = 'this section', 
  requiredPermission = 'manage_users',
  message = null 
}) => {
  const defaultMessages = {
    manage_users: 'manage website users and customer accounts',
    manage_sales_reps: 'manage sales representatives',
    manage_vendors: 'manage vendor partnerships',
    manage_admins: 'manage admin accounts and permissions',
    view_reports: 'view system reports',
    manage_billing: 'manage billing operations',
  };

  const actionMessage = defaultMessages[requiredPermission] || `access ${section}`;

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-12 text-center">
      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-red-100 rounded-full blur opacity-75 animate-pulse"></div>
          <div className="relative bg-red-50 rounded-full p-6 border-2 border-red-200">
            <Lock className="w-12 h-12 text-red-600" />
          </div>
        </div>
      </div>

      {/* Heading */}
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        Access Restricted
      </h2>

      {/* Message */}
      <div className="max-w-md mx-auto mb-8">
        <p className="text-gray-600 text-base mb-4">
          {message || (
            <>
              You don't have permission to <span className="font-semibold">{actionMessage}</span>.
            </>
          )}
        </p>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Required Permission</p>
              <p className="text-xs text-blue-800 font-mono bg-blue-100 px-2 py-1 rounded inline-block">
                {requiredPermission}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="space-y-4">
        <button
          onClick={() => window.location.href = '/'}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors font-semibold"
        >
          Go to Dashboard
        </button>

        <button
          onClick={() => {
            // Copy permission request to clipboard
            const text = `Permission Request: ${requiredPermission}\n\nI would like to request access to ${actionMessage}.`;
            navigator.clipboard.writeText(text);
            alert('Permission request template copied to clipboard');
          }}
          className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold flex items-center justify-center gap-2"
        >
          <Mail className="w-4 h-4" />
          Request Access
        </button>
      </div>

      {/* Footer Help Text */}
      <p className="text-xs text-gray-500 mt-8 max-w-md mx-auto">
        If you believe this is a mistake, please contact your system administrator or submit a help request through the support portal.
      </p>
    </div>
  );
};

export default PermissionDeniedView;

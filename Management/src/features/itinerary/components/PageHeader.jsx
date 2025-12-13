/**
 * Page Header Component
 * Displays the page title, description, and action buttons
 */

import { Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

const PageHeader = ({ onNewPackage, onAIPackage }) => {
  const { user } = useAuth();
  
  // Check if user is a salesRep (read-only access)
  const isSalesRep = user?.role === 'salesRep';

  return (
    <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm z-10">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Package Management</h1>
            <p className="text-gray-600 mt-1">
              {isSalesRep 
                ? 'View published packages and download itineraries' 
                : 'Create, edit, and manage travel packages with detailed itineraries'}
            </p>
          </div>
        </div>
        
        {/* Action buttons - only visible to admins and staff */}
        {!isSalesRep && (
          <div className="flex items-center gap-3">
            <button
              onClick={onAIPackage}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-medium flex items-center gap-2"
              aria-label="Generate AI package"
            >
              <Sparkles className="w-4 h-4" />
              AI Package
            </button>
            <button
              onClick={onNewPackage}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium flex items-center gap-2"
              aria-label="Create new package"
            >
              <Plus className="w-4 h-4" />
              New Package
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;

import { useState, useEffect } from 'react';
import { X, User, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { adminAPI } from '../../../services/api';

const ActiveSalesRepsDialog = ({ isOpen, onClose, requireActiveLogin48h }) => {
  const [salesReps, setSalesReps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeReps, setActiveReps] = useState([]);
  const [inactiveReps, setInactiveReps] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchSalesReps();
    }
  }, [isOpen, requireActiveLogin48h]);

  const fetchSalesReps = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getSalesReps();
      if (res.status === 'success' && res.data?.users) {
        const reps = res.data.users;
        setSalesReps(reps);
        
        // Filter by 48-hour login if setting is enabled
        if (requireActiveLogin48h) {
          const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
          const active = reps.filter(rep => {
            if (!rep.lastLogin) return false;
            const lastLogin = new Date(rep.lastLogin);
            return lastLogin >= fortyEightHoursAgo;
          });
          const inactive = reps.filter(rep => {
            if (!rep.lastLogin) return true;
            const lastLogin = new Date(rep.lastLogin);
            return lastLogin < fortyEightHoursAgo;
          });
          setActiveReps(active);
          setInactiveReps(inactive);
        } else {
          // If setting is disabled, show all active sales reps
          setActiveReps(reps);
          setInactiveReps([]);
        }
      }
    } catch (error) {
      console.error('Error fetching sales reps:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLastLogin = (lastLogin) => {
    if (!lastLogin) return 'Never';
    const date = new Date(lastLogin);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins < 1 ? 'Just now' : `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Active Sales Representatives</h2>
            <p className="text-sm text-gray-600 mt-1">
              {requireActiveLogin48h 
                ? 'Sales reps who logged in within the last 48 hours' 
                : 'All active sales representatives'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 group"
          >
            <X className="w-5 h-5 text-gray-700 group-hover:text-red-600 transition-colors duration-200" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Sales Reps */}
              {activeReps.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Active {requireActiveLogin48h ? '(Logged in within 48h)' : ''}
                    </h3>
                    <span className="ml-auto bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {activeReps.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {activeReps.map((rep) => (
                      <div
                        key={rep._id || rep.id}
                        className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {rep.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{rep.name}</p>
                            <p className="text-sm text-gray-600">{rep.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{formatLastLogin(rep.lastLogin)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inactive Sales Reps (only shown if 48h filter is enabled) */}
              {requireActiveLogin48h && inactiveReps.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-5 h-5 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-700">
                      Inactive (Not logged in within 48h)
                    </h3>
                    <span className="ml-auto bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {inactiveReps.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {inactiveReps.map((rep) => (
                      <div
                        key={rep._id || rep.id}
                        className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg opacity-75"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-semibold">
                            {rep.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-700">{rep.name}</p>
                            <p className="text-sm text-gray-500">{rep.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{formatLastLogin(rep.lastLogin)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {activeReps.length === 0 && inactiveReps.length === 0 && (
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No sales representatives found</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveSalesRepsDialog;


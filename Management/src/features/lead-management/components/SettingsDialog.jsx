import { useState, useEffect } from 'react';
import { X, Settings, RotateCcw, BarChart3, Check, Users, Eye } from 'lucide-react';
import { adminAPI } from '../../../services/api';
import toast from 'react-hot-toast';

const SettingsDialog = ({
  isOpen,
  onClose,
  assignmentSettings,
  setAssignmentSettings,
  salesReps,
  onViewActiveSalesReps,
}) => {
  const [localSettings, setLocalSettings] = useState({
    mode: 'manual',
    strategy: 'round-robin',
    requireActiveLogin: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [activeSalesReps, setActiveSalesReps] = useState([]);
  const [loadingReps, setLoadingReps] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Map backend field names to frontend field names
      setLocalSettings({
        mode: assignmentSettings.mode || 'manual',
        strategy: assignmentSettings.strategy || 'round-robin',
        requireActiveLogin: assignmentSettings.requireActiveLogin || false,
      });
      fetchActiveSalesReps();
    }
  }, [assignmentSettings, isOpen]);

  const fetchActiveSalesReps = async () => {
    try {
      setLoadingReps(true);
      const res = await adminAPI.getSalesReps();
      if (res.status === 'success' && res.data?.users) {
        setActiveSalesReps(res.data.users);
      }
    } catch (error) {
      console.error('Error fetching sales reps:', error);
    } finally {
      setLoadingReps(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Map frontend field names to backend field names
      const backendPayload = {
        assignmentMode: localSettings.mode,
        autoStrategy: localSettings.strategy === 'round-robin' ? 'round_robin' : 'load_based',
        requireActiveLogin48h: localSettings.requireActiveLogin,
      };

      const response = await adminAPI.updateSettings(backendPayload);
      if (response.success) {
        setAssignmentSettings((prev) => ({ ...prev, ...localSettings }));
        toast.success('Settings saved successfully');
        onClose();
      } else {
        toast.error(response.message || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Count active sales reps (logged in within 1 hour if requireActiveLogin is enabled)
  const getActiveRepsCount = () => {
    if (!localSettings.requireActiveLogin) {
      return activeSalesReps.length;
    }
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
    return activeSalesReps.filter(rep => {
      if (!rep.lastLogin) return false;
      return new Date(rep.lastLogin) >= oneHourAgo;
    }).length;
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Settings className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Assignment Settings</h3>
              <p className="text-sm text-gray-500">Configure lead assignment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Active Sales Reps Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Active Sales Reps</p>
                  <p className="text-xs text-gray-500">
                    {loadingReps ? 'Loading...' : `${getActiveRepsCount()} available for assignment`}
                  </p>
                </div>
              </div>
              {onViewActiveSalesReps && (
                <button
                  onClick={onViewActiveSalesReps}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
              )}
            </div>
          </div>

          {/* Mode Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Assignment Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLocalSettings({ ...localSettings, mode: 'manual' })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${localSettings.mode === 'manual'
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">Manual</span>
                  {localSettings.mode === 'manual' && (
                    <Check className="w-4 h-4 text-gray-900" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Assign leads manually to sales reps
                </p>
              </button>
              <button
                onClick={() => setLocalSettings({ ...localSettings, mode: 'auto' })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${localSettings.mode === 'auto'
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">Automatic</span>
                  {localSettings.mode === 'auto' && (
                    <Check className="w-4 h-4 text-gray-900" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Auto-assign leads using a strategy
                </p>
              </button>
            </div>
          </div>

          {/* Strategy (only for auto mode) */}
          {localSettings.mode === 'auto' && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">
                Distribution Strategy
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setLocalSettings({ ...localSettings, strategy: 'round-robin' })}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${localSettings.strategy === 'round-robin'
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <RotateCcw className="w-4 h-4 text-gray-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">Round Robin</p>
                    <p className="text-xs text-gray-500">Distribute evenly in order</p>
                  </div>
                  {localSettings.strategy === 'round-robin' && (
                    <Check className="w-4 h-4 text-gray-900 ml-auto" />
                  )}
                </button>
                <button
                  onClick={() => setLocalSettings({ ...localSettings, strategy: 'load-based' })}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${localSettings.strategy === 'load-based'
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <BarChart3 className="w-4 h-4 text-gray-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">Load Based</p>
                    <p className="text-xs text-gray-500">Assign to rep with fewest leads</p>
                  </div>
                  {localSettings.strategy === 'load-based' && (
                    <Check className="w-4 h-4 text-gray-900 ml-auto" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Require Active Login Option */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Require Active Login</p>
              <p className="text-xs text-gray-500">Only assign to recently logged-in reps</p>
            </div>
            <button
              onClick={() => setLocalSettings({ ...localSettings, requireActiveLogin: !localSettings.requireActiveLogin })}
              className={`relative w-11 h-6 rounded-full transition-colors ${localSettings.requireActiveLogin ? 'bg-gray-900' : 'bg-gray-300'
                }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${localSettings.requireActiveLogin ? 'translate-x-5' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;

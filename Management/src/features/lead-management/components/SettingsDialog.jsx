import { useState } from 'react';
import { X, Users } from 'lucide-react';
import ActiveSalesRepsDialog from './ActiveSalesRepsDialog';

const SettingsDialog = ({ isOpen, onClose, settings, settingsForm, onSettingsFormChange, onSave }) => {
  const [showActiveRepsDialog, setShowActiveRepsDialog] = useState(false);
  
  if (!isOpen || !settings) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Assignment Settings</h2>
            <p className="text-sm text-gray-600 mt-1">Toggle between manual and auto assignment</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 group">
            <X className="w-5 h-5 text-gray-700 group-hover:text-red-600 transition-colors duration-200" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onSettingsFormChange({ ...settingsForm, assignmentMode: 'manual' })}
                className={`px-4 py-2 rounded-lg border font-medium ${settingsForm.assignmentMode === 'manual' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Manual
              </button>
              <button
                onClick={() => onSettingsFormChange({ ...settingsForm, assignmentMode: 'auto' })}
                className={`px-4 py-2 rounded-lg border font-medium ${settingsForm.assignmentMode === 'auto' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Auto
              </button>
            </div>
          </div>

          {settingsForm.assignmentMode === 'auto' && (
            <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Auto Strategy</label>
              <select
                value={settingsForm.autoStrategy}
                onChange={(e) => onSettingsFormChange({ ...settingsForm, autoStrategy: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="round_robin">Round Robin</option>
                <option value="load_based">Load Based</option>
              </select>
            </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Require Active Login (1 hour)
                    </label>
                    <p className="text-xs text-gray-500">
                      Only assign leads to sales reps who logged in within the last 1 hour
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSettingsFormChange({ 
                      ...settingsForm, 
                      requireActiveLogin48h: !settingsForm.requireActiveLogin48h 
                    })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      settingsForm.requireActiveLogin48h ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settingsForm.requireActiveLogin48h ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* View Active Sales Reps Button */}
                <button
                  type="button"
                  onClick={() => setShowActiveRepsDialog(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                >
                  <Users className="w-4 h-4" />
                  View Active Sales Reps
                </button>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors font-medium"
            >
              Close
            </button>
            <button
              onClick={onSave}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>

      {/* Active Sales Reps Dialog */}
      <ActiveSalesRepsDialog
        isOpen={showActiveRepsDialog}
        onClose={() => setShowActiveRepsDialog(false)}
        requireActiveLogin48h={settingsForm.requireActiveLogin48h}
      />
    </div>
  );
};

export default SettingsDialog;


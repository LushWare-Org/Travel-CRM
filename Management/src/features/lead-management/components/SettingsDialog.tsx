import { useState, useEffect } from 'react';
import { Settings, RotateCcw, BarChart3, Check, Users, Eye } from 'lucide-react';
import { adminAPI, leadAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AssignmentSettings {
  mode: 'manual' | 'auto';
  strategy: 'round-robin' | 'load-based';
  requireActiveLogin: boolean;
}

interface SalesRep {
  lastLogin?: string;
}

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentSettings: Partial<AssignmentSettings>;
  setAssignmentSettings: (settings: AssignmentSettings) => void;
  salesReps: unknown[];
  onViewActiveSalesReps?: () => void;
}

const SettingsDialog = ({
  isOpen,
  onClose,
  assignmentSettings,
  setAssignmentSettings,
  onViewActiveSalesReps,
}: SettingsDialogProps) => {
  const [localSettings, setLocalSettings] = useState<AssignmentSettings>({
    mode: 'manual',
    strategy: 'round-robin',
    requireActiveLogin: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [activeSalesReps, setActiveSalesReps] = useState<SalesRep[]>([]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const response = await leadAPI.updateAssignmentSettings(backendPayload);
      if (response.success) {
        setAssignmentSettings(localSettings);
        toast.success('Settings saved successfully');
        onClose();
      } else {
        toast.error(response.message || 'Failed to save settings');
      }
    } catch (err: any) {
      console.error('Error saving settings:', err);
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Count active sales reps (logged in within 1 hour if requireActiveLogin is enabled)
  const getActiveRepsCount = () => {
    if (!localSettings.requireActiveLogin) {
      return activeSalesReps.length;
    }
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
    return activeSalesReps.filter((rep) => {
      if (!rep.lastLogin) return false;
      return new Date(rep.lastLogin) >= oneHourAgo;
    }).length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <DialogTitle>Assignment Settings</DialogTitle>
              <DialogDescription>Configure lead assignment</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Active Sales Reps Summary */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Active Sales Reps</p>
                  <p className="text-xs text-muted-foreground">
                    {loadingReps ? 'Loading...' : `${getActiveRepsCount()} available for assignment`}
                  </p>
                </div>
              </div>
              {onViewActiveSalesReps && (
                <Button variant="ghost" size="sm" onClick={onViewActiveSalesReps} className="text-primary hover:text-primary">
                  <Eye className="w-4 h-4" />
                  View
                </Button>
              )}
            </div>
          </div>

          {/* Mode Selection */}
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">
              Assignment Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLocalSettings({ ...localSettings, mode: 'manual' })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  localSettings.mode === 'manual' ? 'border-primary bg-primary/5' : 'border-border hover:border-ring'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">Manual</span>
                  {localSettings.mode === 'manual' && <Check className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  Assign leads manually to sales reps
                </p>
              </button>
              <button
                onClick={() => setLocalSettings({ ...localSettings, mode: 'auto' })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  localSettings.mode === 'auto' ? 'border-primary bg-primary/5' : 'border-border hover:border-ring'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">Automatic</span>
                  {localSettings.mode === 'auto' && <Check className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  Auto-assign leads using a strategy
                </p>
              </button>
            </div>
          </div>

          {/* Strategy (only for auto mode) */}
          {localSettings.mode === 'auto' && (
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">
                Distribution Strategy
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setLocalSettings({ ...localSettings, strategy: 'round-robin' })}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    localSettings.strategy === 'round-robin' ? 'border-primary bg-primary/5' : 'border-border hover:border-ring'
                  }`}
                >
                  <RotateCcw className="w-4 h-4 text-muted-foreground" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Round Robin</p>
                    <p className="text-xs text-muted-foreground">Distribute evenly in order</p>
                  </div>
                  {localSettings.strategy === 'round-robin' && <Check className="w-4 h-4 text-primary ml-auto" />}
                </button>
                <button
                  onClick={() => setLocalSettings({ ...localSettings, strategy: 'load-based' })}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    localSettings.strategy === 'load-based' ? 'border-primary bg-primary/5' : 'border-border hover:border-ring'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Load Based</p>
                    <p className="text-xs text-muted-foreground">Assign to rep with fewest leads</p>
                  </div>
                  {localSettings.strategy === 'load-based' && <Check className="w-4 h-4 text-primary ml-auto" />}
                </button>
              </div>
            </div>
          )}

          {/* Require Active Login Option */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium text-foreground">Require Active Login</p>
              <p className="text-xs text-muted-foreground">Only assign to recently logged-in reps</p>
            </div>
            <button
              onClick={() => setLocalSettings({ ...localSettings, requireActiveLogin: !localSettings.requireActiveLogin })}
              className={`relative w-11 h-6 rounded-full transition-colors ${localSettings.requireActiveLogin ? 'bg-primary' : 'bg-border'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-background rounded-full shadow transition-transform ${
                  localSettings.requireActiveLogin ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;

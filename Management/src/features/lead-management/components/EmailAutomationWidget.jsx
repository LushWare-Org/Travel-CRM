import { useMemo } from 'react';
import { Mail, Loader2 } from 'lucide-react';

const Toggle = ({ checked, onClick, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-gray-900' : 'bg-gray-300'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
    />
  </button>
);

const EmailAutomationWidget = ({
  settings,
  savingKey,
  onToggleRecommendation,
  onToggleFollowUp,
}) => {
  const statusLabel = useMemo(() => {
    const rec = settings?.autoRecommendationEmails !== false;
    const follow = settings?.autoFollowUpEmails !== false;
    if (rec && follow) return 'All On';
    if (!rec && !follow) return 'All Off';
    if (rec) return 'Recommendations On';
    return 'Follow-up On';
  }, [settings]);

  return (
    <div className="hidden lg:flex items-center gap-3 px-3 py-2 bg-white border border-gray-300 rounded-lg">
      <div className="p-1.5 bg-gray-100 rounded-md">
        <Mail className="w-4 h-4 text-gray-600" />
      </div>
      <div className="min-w-[140px]">
        <p className="text-xs font-semibold text-gray-900">Email Automation</p>
        <p className="text-[11px] text-gray-500">{statusLabel}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Rec</span>
          {savingKey === 'autoRecommendationEmails' ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
          ) : (
            <Toggle
              checked={settings?.autoRecommendationEmails !== false}
              onClick={onToggleRecommendation}
              disabled={Boolean(savingKey)}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Follow</span>
          {savingKey === 'autoFollowUpEmails' ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
          ) : (
            <Toggle
              checked={settings?.autoFollowUpEmails !== false}
              onClick={onToggleFollowUp}
              disabled={Boolean(savingKey)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailAutomationWidget;

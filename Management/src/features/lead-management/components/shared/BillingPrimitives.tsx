import type { LucideIcon } from 'lucide-react';

// Small presentational pieces shared by the quotation and invoice dialogs so
// both stay visually identical (Signal Console billing-document design language).

interface RowProps {
  label: string;
  value: React.ReactNode;
}

export const Row = ({ label, value }: RowProps) => (
  <div className="flex items-center justify-between text-muted-foreground">
    <span>{label}</span>
    <span className="font-medium text-foreground">{value}</span>
  </div>
);

interface ChannelTabProps {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}

export const ChannelTab = ({ active, onClick, icon: Icon, label }: ChannelTabProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-4 text-sm font-medium transition ${
      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
    }`}
  >
    <Icon className="h-4 w-4" /> {label}
  </button>
);

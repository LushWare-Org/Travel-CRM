// Small presentational pieces shared by the quotation and invoice dialogs so
// both stay visually identical (teal/slate billing-document design language).

export const Row = ({ label, value }) => (
  <div className="flex items-center justify-between text-slate-600">
    <span>{label}</span>
    <span className="font-medium text-slate-800">{value}</span>
  </div>
);

export const ChannelTab = ({ active, onClick, icon: Icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition ${
      active ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-50'
    }`}
  >
    <Icon className="h-4 w-4" /> {label}
  </button>
);

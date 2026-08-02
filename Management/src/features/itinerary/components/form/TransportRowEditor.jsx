/**
 * Transport Row Editor Component
 * One independently configurable transport row (mode, pricing model,
 * unit cost, optional distance) used by the Costs & Pricing subsection.
 */

import { Car, TrendingUp, Trash2 } from 'lucide-react';

const TRANSPORT_MODE_LABELS = {
  CAR: 'Car',
  VAN: 'Van',
  FLIGHT: 'Flight',
  TRAIN: 'Train',
  BUS: 'Bus',
  BOAT: 'Boat',
};

const PRICING_MODEL_LABELS = {
  PER_VEHICLE: 'Per vehicle',
  PER_PERSON: 'Per person',
  PER_KM: 'Per km',
};

const fieldClass =
  'w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all';

const TransportRowEditor = ({ transport, onChange, onRemove, index }) => {
  const row = transport || {};
  const isPerKm = row.pricingModel === 'PER_KM';

  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 px-3 py-2">
      <div className="flex flex-wrap items-end gap-2">
        {/* Mode */}
        <div className="min-w-[130px] flex-1">
          <label className="flex items-center gap-1 text-xs text-slate-500 mb-1">
            <Car className="w-3 h-3 text-slate-400" /> Mode
          </label>
          <select
            value={row.transportMode || 'CAR'}
            onChange={(e) => onChange({ transportMode: e.target.value })}
            className={fieldClass}
          >
            {Object.entries(TRANSPORT_MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Pricing model */}
        <div className="min-w-[130px] flex-1">
          <label className="flex items-center gap-1 text-xs text-slate-500 mb-1">
            <TrendingUp className="w-3 h-3 text-slate-400" /> Pricing
          </label>
          <select
            value={row.pricingModel || 'PER_VEHICLE'}
            onChange={(e) => onChange({ pricingModel: e.target.value })}
            className={fieldClass}
          >
            {Object.entries(PRICING_MODEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Unit cost */}
        <div className="w-28">
          <label className="block text-xs text-slate-500 mb-1">Unit cost</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={row.unitCost ?? ''}
            placeholder="0"
            onChange={(e) => onChange({ unitCost: e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0) })}
            onWheel={(e) => e.currentTarget.blur()}
            className={fieldClass}
          />
        </div>

        {/* Distance — only meaningful for PER_KM */}
        {isPerKm && (
          <div className="w-28">
            <label className="block text-xs text-slate-500 mb-1">Distance (km)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={row.distanceKm ?? ''}
              placeholder="0"
              onChange={(e) => onChange({ distanceKm: e.target.value === '' ? null : (parseFloat(e.target.value) || 0) })}
              onWheel={(e) => e.currentTarget.blur()}
              className={fieldClass}
            />
          </div>
        )}

        {/* Remove */}
        <button
          type="button"
          onClick={() => onRemove(index)}
          title="Remove transport"
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TransportRowEditor;

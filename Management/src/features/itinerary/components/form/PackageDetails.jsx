/**
 * Package Details — pricing, margin, and currency settings.
 */

import { Moon, DollarSign, TrendingUp, Info } from 'lucide-react';
import { getCurrencySymbol, CURRENCY_CODE } from '../../../../utils/currency.js';

const PackageDetails = ({ formData, nightsInput, onFormChange, onNightsChange }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFormChange({ ...formData, [name]: value });
  };

  const handleNumberChange = (field) => (e) => {
    const { value } = e.target;
    const numValue = value === '' ? 0 : parseFloat(value) || 0;
    onFormChange({ ...formData, [field]: numValue });
  };

  const handleNumberInputWheel = (e) => {
    e.currentTarget.blur();
  };

  const InputCard = ({ label, required, icon: Icon, children, hint, className = '' }) => (
    <div className={`bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors ${className}`}>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        {label}
        {required && <span className="text-rose-500 text-xs">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-2">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Duration (nights → days) */}
        <InputCard label="Number of Nights" required icon={Moon}>
          <input
            type="number" min="1"
            value={nightsInput === '' || nightsInput == null ? '' : nightsInput}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') { onNightsChange(''); }
              else { const n = parseInt(value, 10); if (!isNaN(n)) onNightsChange(n); }
            }}
            onBlur={(e) => {
              const value = e.target.value;
              const n = parseInt(value, 10);
              if (value === '' || isNaN(n) || n < 1) onNightsChange(1);
            }}
            onWheel={handleNumberInputWheel}
            placeholder="e.g., 5"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-lg font-medium text-center"
          />
          {nightsInput >= 1 && (
            <div className="mt-2 flex items-center justify-center gap-1 text-xs text-slate-500">
              <span className="px-2 py-1 bg-violet-50 rounded-md text-violet-600 font-medium">
                {parseInt(nightsInput, 10) + 1} Days / {nightsInput} Nights
              </span>
            </div>
          )}
        </InputCard>

        {/* Base Price */}
        <InputCard label="Base Price" required icon={DollarSign} hint={`In ${CURRENCY_CODE}. Leave at 0 to auto-compute from itinerary.`}>
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 font-semibold text-lg">{getCurrencySymbol()}</span>
            <input
              type="number" name="basePrice" min="0" step="0.01"
              value={formData.basePrice ?? ''}
              onChange={handleNumberChange('basePrice')}
              onWheel={handleNumberInputWheel}
              placeholder="Auto-computed"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-lg font-medium"
            />
          </div>
        </InputCard>

        {/* Margin */}
        <InputCard label="Default Margin" icon={TrendingUp} hint="Applied to base price for sell price">
          <div className="flex gap-2">
            <select
              name="defaultMarginType"
              value={formData.defaultMarginType || 'PERCENTAGE'}
              onChange={handleChange}
              className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
            >
              <option value="PERCENTAGE">%</option>
              <option value="FIXED">{getCurrencySymbol()}</option>
            </select>
            <input
              type="number" name="defaultMarginInput" min="0" step="0.01"
              value={formData.defaultMarginInput ?? 20}
              onChange={handleNumberChange('defaultMarginInput')}
              onWheel={handleNumberInputWheel}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-lg font-medium"
            />
          </div>
        </InputCard>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4 flex items-start gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 text-blue-600" />
        </div>
        <p className="text-sm text-blue-800">
          <strong>Auto-compute:</strong> Leave base price at 0 and the pricing engine will calculate
          it from meals, activities, and transport costs entered in the itinerary below.
        </p>
      </div>
    </div>
  );
};

export default PackageDetails;

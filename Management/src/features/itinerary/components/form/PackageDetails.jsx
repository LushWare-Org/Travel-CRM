/**
 * Package Details — pricing, margin, and currency settings.
 */

import { useState } from 'react';
import { Moon, DollarSign, TrendingUp, Info, Calculator, Loader, AlertTriangle } from 'lucide-react';
import ApiService from '../../services/apiService.js';
import { getCurrencySymbol, CURRENCY_CODE, formatCurrency } from '../../../../utils/currency.js';

const PackageDetails = ({ formData, nightsInput, onFormChange, onNightsChange }) => {
  const [calculating, setCalculating] = useState(false);
  const [fareResult, setFareResult] = useState(null);
  const [fareError, setFareError] = useState('');

  const itineraryDays = Array.isArray(formData.days) ? formData.days.filter(Boolean) : [];
  const hasItineraryDays = itineraryDays.length > 0;

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

  const handleCalculateFare = async () => {
    if (calculating || !hasItineraryDays) return;
    setCalculating(true);
    setFareError('');
    setFareResult(null);
    try {
      const response = await ApiService.calculatePrice({
        days: itineraryDays,
        basePrice: formData.basePrice ?? 0,
        defaultMarginType: formData.defaultMarginType || 'PERCENTAGE',
        defaultMarginInput: formData.defaultMarginInput ?? 0,
      });
      const data = response?.data || {};
      setFareResult(data);
      // Auto-populate the computed base price into the form
      onFormChange({ ...formData, basePrice: data.basePrice ?? 0 });
    } catch (error) {
      setFareError(error.message || 'Failed to calculate fare. Please try again.');
    } finally {
      setCalculating(false);
    }
  };

  const breakdown = fareResult?.breakdown || {};
  const costDataTotal =
    (breakdown.meals?.total || 0) +
    (breakdown.activities?.total || 0) +
    (breakdown.transports?.total || 0);
  const hasCostData = costDataTotal > 0;

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

      {/* Calculate Fare */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCalculateFare}
            disabled={calculating || !hasItineraryDays}
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all font-medium shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {calculating ? <Loader className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            {calculating ? 'Calculating...' : 'Calculate Fare'}
          </button>
          {!hasItineraryDays && !calculating && (
            <p className="text-xs text-slate-400">
              Add at least one itinerary day to calculate the fare.
            </p>
          )}
        </div>

        {fareError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <p className="text-sm text-rose-700">{fareError}</p>
          </div>
        )}

        {fareResult && !hasCostData && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              No cost data found in itinerary. Add meal counts, activity costs, or transport costs to day entries first.
            </p>
          </div>
        )}

        {fareResult && hasCostData && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                Price Breakdown
              </span>
              <span className="text-xs text-slate-400">Auto-calculated from itinerary</span>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Base Price</p>
                  <p className="text-lg font-semibold text-slate-800">{formatCurrency(fareResult.basePrice)}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                  <p className="text-xs text-emerald-700 uppercase tracking-wider mb-1">Sell Price</p>
                  <p className="text-lg font-semibold text-emerald-700">{formatCurrency(fareResult.sellPrice)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Margin</p>
                  <p className="text-lg font-semibold text-slate-800">{formatCurrency(fareResult.margin)}</p>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Meals</span>
                  <span className="font-medium text-slate-700">{formatCurrency(breakdown.meals?.total || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Activities</span>
                  <span className="font-medium text-slate-700">{formatCurrency(breakdown.activities?.total || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Transports</span>
                  <span className="font-medium text-slate-700">{formatCurrency(breakdown.transports?.total || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
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

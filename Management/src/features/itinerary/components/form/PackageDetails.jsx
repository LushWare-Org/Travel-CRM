/**
 * Package Details Form Component - Redesigned
 * Modern card-based layout with premium styling
 * Handles pricing, duration, and max group size
 */

import { Moon, DollarSign, Users, Briefcase, Info } from 'lucide-react';

const PackageDetails = ({ formData, nightsInput, onFormChange, onNightsChange }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFormChange({ ...formData, [name]: value });
  };

  const handlePriceChange = (e) => {
    const { value } = e.target;
    const numValue = value === '' ? 0 : parseFloat(value) || 0;
    onFormChange({ ...formData, price: numValue });
  };

  const handleMaxGroupSizeChange = (e) => {
    const { value } = e.target;
    const numValue = value === '' ? 10 : parseInt(value, 10) || 10;
    onFormChange({ ...formData, maxGroupSize: numValue });
  };

  const handleNumberInputWheel = (e) => {
    e.currentTarget.blur();
  };

  // Input Card Component
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
      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Duration */}
        <InputCard label="Number of Nights" required icon={Moon}>
          <input
            type="number"
            min="1"
            value={nightsInput === '' || nightsInput === null || nightsInput === undefined ? '' : nightsInput}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                onNightsChange('');
              } else {
                const numValue = parseInt(value, 10);
                if (!isNaN(numValue)) {
                  onNightsChange(numValue);
                }
              }
            }}
            onBlur={(e) => {
              const value = e.target.value;
              const numValue = parseInt(value, 10);
              if (value === '' || isNaN(numValue) || numValue < 1) {
                onNightsChange(1);
              }
            }}
            onWheel={handleNumberInputWheel}
            placeholder="e.g., 5"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-lg font-medium text-center"
          />
          {nightsInput && nightsInput >= 1 && (
            <div className="mt-2 flex items-center justify-center gap-1 text-xs text-slate-500">
              <span className="px-2 py-1 bg-violet-50 rounded-md text-violet-600 font-medium">
                {parseInt(nightsInput, 10) + 1} Days / {nightsInput} Nights
              </span>
            </div>
          )}
        </InputCard>

        {/* Price */}
        <InputCard label="Price" required icon={DollarSign} hint="Enter price in INR">
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 font-semibold text-lg">₹</span>
            <input
              type="number"
              name="price"
              value={formData.price || ''}
              onChange={handlePriceChange}
              onWheel={handleNumberInputWheel}
              placeholder="e.g., 24999"
              min="0"
              step="0.01"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-lg font-medium"
            />
          </div>
        </InputCard>

        {/* Max Group Size */}
        <InputCard label="Max Group Size" icon={Users} hint="Maximum travelers">
          <input
            type="number"
            name="maxGroupSize"
            value={formData.maxGroupSize || 10}
            onChange={handleMaxGroupSizeChange}
            onWheel={handleNumberInputWheel}
            placeholder="e.g., 10"
            min="1"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-lg font-medium text-center"
          />
        </InputCard>

        {/* Package Type */}
        <InputCard label="Package Type" required icon={Briefcase}>
          <select
            name="packageType"
            value={formData.packageType || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all appearance-none cursor-pointer font-medium"
          >
            <option value="">Select Type</option>
            <option value="Standard">⚡ Standard</option>
            <option value="Deluxe">✨ Deluxe</option>
            <option value="Luxury">💎 Luxury</option>
            <option value="Premium">👑 Premium</option>
          </select>
        </InputCard>
      </div>

      {/* Info Note */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4 flex items-start gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 text-blue-600" />
        </div>
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Specific destinations, activities, accommodation, and transport details
          are added in the Day-wise Itinerary section below.
        </p>
      </div>
    </div>
  );
};

export default PackageDetails;

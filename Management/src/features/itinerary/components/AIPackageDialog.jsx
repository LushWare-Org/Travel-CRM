/**
 * AI Package Generation Dialog - Redesigned
 * Modern modal with premium styling and visual enhancements
 * Allows users to input basic details and generate a complete package using AI
 */

import { useState } from 'react';
import { X, Sparkles, Loader2, MapPin, FileText, Briefcase, Tag, Moon, Zap, Wand2 } from 'lucide-react';
import ApiService from '../services/apiService';
import DestinationSelector from './DestinationSelector';
import Swal from 'sweetalert2';
import { PACKAGE_CATEGORY } from '../types';

const AIPackageDialog = ({ isOpen, onClose, onPackageGenerated }) => {
  const [formData, setFormData] = useState({
    destination: '',
    description: '',
    packageType: 'Standard',
    category: 'family',
    nights: 1,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const packageTypes = [
    { value: 'Standard', label: 'Standard', icon: '⚡' },
    { value: 'Deluxe', label: 'Deluxe', icon: '✨' },
    { value: 'Luxury', label: 'Luxury', icon: '💎' },
    { value: 'Premium', label: 'Premium', icon: '👑' },
  ];

  const categories = [
    { value: 'honeymoon', label: 'Honeymoon', icon: '💑' },
    { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
    { value: 'adventure', label: 'Adventure', icon: '🏔️' },
    { value: 'budget', label: 'Budget', icon: '💰' },
    { value: 'luxury', label: 'Luxury', icon: '✨' },
    { value: 'religious', label: 'Religious', icon: '🛕' },
    { value: 'wildlife', label: 'Wildlife', icon: '🦁' },
    { value: 'beach', label: 'Beach', icon: '🏖️' },
    { value: 'heritage', label: 'Heritage', icon: '🏛️' },
    { value: 'other', label: 'Other', icon: '📦' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'nights' ? Math.max(1, parseInt(value, 10) || 1) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.destination.trim()) {
      Swal.fire('Validation Error', 'Please enter a destination', 'error');
      return;
    }

    if (formData.nights < 1) {
      Swal.fire('Validation Error', 'Number of nights must be at least 1', 'error');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await ApiService.generateAIPackage(
        formData.destination,
        formData.packageType,
        formData.category,
        formData.nights,
        formData.description
      );

      if (response.success && response.data) {
        const packageDataWithCategory = {
          ...response.data,
          category: formData.category,
        };
        onPackageGenerated(packageDataWithCategory);

        Swal.fire({
          icon: 'success',
          title: 'Package Generated!',
          text: 'AI has generated your package. You can now review and edit it before saving.',
          confirmButtonText: 'Continue Editing',
        });

        setFormData({
          destination: '',
          description: '',
          packageType: 'Standard',
          category: 'family',
          nights: 1,
        });

        onClose();
      } else {
        throw new Error(response.message || 'Failed to generate package');
      }
    } catch (error) {
      console.error('Error generating AI package:', error);
      Swal.fire({
        icon: 'error',
        title: 'Generation Failed',
        text: error.message || 'Failed to generate package. Please try again.',
        confirmButtonText: 'OK',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setFormData({
        destination: '',
        description: '',
        packageType: 'Standard',
        category: 'family',
        nights: 1,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Input Card Component
  const InputCard = ({ label, required, icon: Icon, children, hint }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors">
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-200/50">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 px-8 py-6">
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full transform -translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">AI Package Generator</h2>
                <p className="text-violet-100 text-sm mt-1">Create complete packages with AI magic</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isGenerating}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto max-h-[calc(90vh-180px)] bg-gradient-to-b from-slate-50 to-white">
          <div className="space-y-4">
            {/* Destination */}
            <InputCard label="Destination" required icon={MapPin}>
              <div className={isGenerating ? 'pointer-events-none opacity-60' : ''}>
                <DestinationSelector
                  value={formData.destination}
                  onChange={handleChange}
                  name="destination"
                />
              </div>
            </InputCard>

            {/* Two Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Package Type */}
              <InputCard label="Package Type" icon={Briefcase}>
                <select
                  name="packageType"
                  value={formData.packageType}
                  onChange={handleChange}
                  disabled={isGenerating}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  {packageTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </InputCard>

              {/* Category */}
              <InputCard label="Category" icon={Tag}>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  disabled={isGenerating}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </InputCard>
            </div>

            {/* Number of Nights */}
            <InputCard label="Number of Nights" required icon={Moon}>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  name="nights"
                  value={formData.nights}
                  onChange={handleChange}
                  min="1"
                  required
                  disabled={isGenerating}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-lg font-medium text-center disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <div className="px-4 py-3 bg-violet-50 rounded-xl border border-violet-100">
                  <span className="text-sm font-medium text-violet-700">{formData.nights + 1} Days / {formData.nights} Nights</span>
                </div>
              </div>
            </InputCard>

            {/* Package Details (Optional) */}
            <InputCard label="Special Requirements" icon={FileText} hint="Add any specific requests or preferences">
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="e.g., Include water sports, prefer beachside hotels, need vegetarian food options..."
                disabled={isGenerating}
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all resize-none disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
            </InputCard>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-5 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Wand2 className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="font-semibold text-violet-800 text-sm mb-1">What AI will generate:</p>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                    Complete day-by-day itinerary with activities
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                    Hotel recommendations and accommodations
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                    Highlights, inclusions, and exclusions
                  </li>
                </ul>
                <p className="text-xs text-slate-500 mt-2 italic">
                  Package will be saved as draft for your review before publishing
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={isGenerating}
              className="flex-1 px-6 py-3.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="flex-1 px-6 py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all font-medium shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Package
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIPackageDialog;

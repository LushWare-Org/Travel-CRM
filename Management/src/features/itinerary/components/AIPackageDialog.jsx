/**
 * AI Package Generation Dialog
 * Allows users to input basic details and generate a complete package using AI
 */

import { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
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

  const packageTypes = ['Standard', 'Deluxe', 'Luxury', 'Premium'];
  const categories = [
    { value: 'honeymoon', label: 'Honeymoon' },
    { value: 'family', label: 'Family' },
    { value: 'adventure', label: 'Adventure' },
    { value: 'budget', label: 'Budget' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'religious', label: 'Religious' },
    { value: 'wildlife', label: 'Wildlife' },
    { value: 'beach', label: 'Beach' },
    { value: 'heritage', label: 'Heritage' },
    { value: 'other', label: 'Other' },
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
        // Call the callback with the generated package data
        onPackageGenerated(packageDataWithCategory);
        
        Swal.fire({
          icon: 'success',
          title: 'Package Generated!',
          text: 'AI has generated your package. You can now review and edit it before saving.',
          confirmButtonText: 'Continue Editing',
        });

        // Reset form
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
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={handleBackdropClick}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">AI Package Generator</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          <div className="space-y-4">
            {/* Destination */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination <span className="text-red-500">*</span>
              </label>
              <div className={isGenerating ? 'pointer-events-none opacity-60' : ''}>
                <DestinationSelector
                  value={formData.destination}
                  onChange={handleChange}
                  name="destination"
                />
              </div>
            </div>

            {/* Package Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Package Details <span className="text-xs text-gray-500">(optional)</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Any special requirements..."
                disabled={isGenerating}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Package Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Package Type
              </label>
              <select
                name="packageType"
                value={formData.packageType}
                onChange={handleChange}
                disabled={isGenerating}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {packageTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                disabled={isGenerating}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Number of Nights */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Nights <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="nights"
                value={formData.nights}
                onChange={handleChange}
                min="1"
                required
                disabled={isGenerating}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                AI will generate {formData.nights + 1} days itinerary
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> AI will generate a complete package including itinerary, 
              hotels, activities, highlights, inclusions, and exclusions. The package will be 
              saved as a draft for your review and editing.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={isGenerating}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
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


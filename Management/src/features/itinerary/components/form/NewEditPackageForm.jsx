/**
 * New/Edit Package Form Component - Redesigned
 * Modern form layout with sections, cards, and premium styling
 * Preserves all original functionality
 */

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
  Save, Send, X, Info, ChevronDown, ChevronUp,
  FileText, DollarSign, Image, Calendar, Sparkles, Eye
} from 'lucide-react';
import BasicPackageInfo from './BasicPackageInfo';
import PackageDetails from './PackageDetails';
import ImageUpload from '../ImageUpload';
import ItineraryEditor from '../ItineraryEditor';
import ItineraryDisplay from '../ItineraryDisplay';
import { validateItinerary } from '../../utils/helpers';
import { VALIDATION_MESSAGES } from '../../utils/constants';
import { createDefaultDay } from '../../types/index.js';
import { formatCurrency } from '../../../../utils/currency.js';

// ═══════════════════════════════════════════════════════════════════
//  StableSectionCard — defined at module scope so React never
//  unmounts/remounts it on parent re-renders. This prevents the
//  ItineraryEditor (and other children) from losing scroll position
//  and internal state when a day field changes.
// ═══════════════════════════════════════════════════════════════════
function StableSectionCard({ id, icon: Icon, title, description, children, gradient, expanded, onToggle }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 hover:to-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 bg-gradient-to-br ${gradient || 'from-slate-500 to-slate-600'} rounded-xl flex items-center justify-center shadow-sm`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <div className={`w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-5 h-5 text-slate-500" />
        </div>
      </button>
      {expanded && (
        <div className="px-6 pb-6 pt-2 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  );
}

const NewEditPackageForm = ({
  formData,
  setFormData,
  onSave,
  onCancel,
  onImageUpload,
  onImageRemove,
  images,
  isUploadingImages,
  hideLeadManagementButtons = false,
  onlyItineraryEditable = false,
}) => {
  const [localFormData, setLocalFormData] = useState(formData);
  const [showItinerary, setShowItinerary] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    details: true,
    images: true,
    itinerary: true,
  });

  useEffect(() => {
    let initialData = { ...formData };

    if ((!initialData.days || initialData.days.length === 0) && initialData.duration && initialData.duration > 0) {
      console.log('[Form] Initializing empty days array with', initialData.duration, 'days');
      const newDays = [];
      for (let i = 1; i <= initialData.duration; i++) {
        newDays.push(createDefaultDay(i));
      }
      initialData.days = newDays;
    }

    setLocalFormData(initialData);
  }, [formData]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleBasicInfoChange = (data) => {
    setLocalFormData(data);
  };

  const handleDetailsChange = (data) => {
    setLocalFormData(data);
  };

  const handleDurationChange = (nights) => {
    if (nights === '' || nights === null || nights === undefined) {
      setLocalFormData((prev) => ({ ...prev, duration: '' }));
      return;
    }

    const nightsCount = parseInt(nights, 10);
    if (isNaN(nightsCount) || nightsCount < 1) {
      const minNights = 1;
      const minDays = minNights + 1;
      let newDays = [...(localFormData.days || [])];

      if (newDays.length === 0) {
        newDays = [createDefaultDay(1), createDefaultDay(2)];
      } else if (newDays.length < minDays) {
        for (let i = newDays.length + 1; i <= minDays; i++) {
          newDays.push(createDefaultDay(i));
        }
      }

      setLocalFormData((prev) => ({ ...prev, duration: minDays, days: newDays }));
      return;
    }

    const daysCount = nightsCount + 1;
    let newDays = [...(localFormData.days || [])];

    if (newDays.length < daysCount) {
      for (let i = newDays.length + 1; i <= daysCount; i++) {
        newDays.push(createDefaultDay(i));
      }
    } else if (newDays.length > daysCount) {
      newDays = newDays.slice(0, daysCount);
    }

    setLocalFormData((prev) => ({ ...prev, duration: daysCount, days: newDays }));
  };

  const handleDayChange = (dayNumber, dayData) => {
    setLocalFormData((prev) => ({
      ...prev,
      days: prev.days.map((day) =>
        day.dayNumber === dayNumber ? { ...day, ...dayData } : day
      ),
    }));
  };

  const handleAddDay = () => {
    setLocalFormData((prev) => {
      const newDayNumber = (prev.days?.length || 0) + 1;
      return {
        ...prev,
        duration: newDayNumber,
        days: [...(prev.days || []), createDefaultDay(newDayNumber)],
      };
    });
  };

  const handleRemoveDay = (dayNumber) => {
    setLocalFormData((prev) => {
      const filteredDays = prev.days.filter((day) => day.dayNumber !== dayNumber);
      const renumberedDays = filteredDays.map((day, index) => ({
        ...day,
        dayNumber: index + 1,
      }));
      return { ...prev, duration: renumberedDays.length, days: renumberedDays };
    });
  };

  const handleItinerarySubmit = () => {
    const errors = validateItinerary(localFormData.days);

    if (Object.keys(errors).length > 0) {
      Swal.fire({
        title: 'Incomplete Itinerary',
        html: `
          <p>Some itinerary fields are incomplete:</p>
          <ul style="text-align: left; margin-top: 10px;">
            ${Object.entries(errors).map(([day, fields]) =>
          `<li><strong>Day ${day}:</strong> ${fields.join(', ')}</li>`
        ).join('')}
          </ul>
          <p style="margin-top: 15px;"><em>You can still save as draft with incomplete data.</em></p>
        `,
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    setShowItinerary(true);
    Swal.fire('Success', 'Itinerary is complete and ready for preview!', 'success');
  };

  const handleResetItinerary = () => {
    setLocalFormData((prev) => ({ ...prev, duration: 1, days: [] }));
    setShowItinerary(false);
  };

  const handleSave = (status) => {
    const packageId = localFormData._id || localFormData.id;

    const dataToSave = {
      ...localFormData,
      days: localFormData.days || [],
      status,
      updatedDate: new Date().toISOString().split('T')[0],
    };

    if (packageId) {
      dataToSave._id = packageId;
      if (localFormData.id) {
        dataToSave.id = localFormData.id;
      }
    }

    console.log('[Form] ========== SAVE DEBUG ==========');
    console.log('[Form] handleSave called with status:', status);
    console.log('[Form] localFormData.days:', localFormData.days);
    console.log('[Form] localFormData.days length:', localFormData.days?.length);
    console.log('[Form] dataToSave.days:', dataToSave.days);
    console.log('[Form] dataToSave.days length:', dataToSave.days?.length);
    console.log('[Form] Full dataToSave:', JSON.stringify(dataToSave, null, 2));
    console.log('[Form] ====================================');

    setFormData(dataToSave);
    onSave?.(dataToSave);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info Section */}
      {!onlyItineraryEditable ? (
        <StableSectionCard
          id="basic"
          expanded={expandedSections.basic}
          onToggle={toggleSection}
          icon={FileText}
          title="Basic Information"
          description="Package name, destination, and description"
          gradient="from-blue-500 to-indigo-600"
        >
          <BasicPackageInfo
            formData={localFormData}
            onChange={handleBasicInfoChange}
            packageId={localFormData._id || localFormData.id || null}
          />
        </StableSectionCard>
      ) : (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-700">Basic Information</h3>
              <p className="text-xs text-slate-500">Read-only</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Package Name</p>
              <p className="font-medium text-slate-800">{localFormData.name || 'N/A'}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Category</p>
              <p className="font-medium text-slate-800">{localFormData.category || 'N/A'}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 md:col-span-2">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Destination</p>
              <p className="font-medium text-slate-800">{localFormData.destination || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Package Details Section */}
      {!onlyItineraryEditable ? (
        <StableSectionCard
          id="details"
          expanded={expandedSections.details}
          onToggle={toggleSection}
          icon={DollarSign}
          title="Package Details"
          description="Pricing, duration, and package type"
          gradient="from-emerald-500 to-teal-600"
        >
          <PackageDetails
            formData={localFormData}
            nightsInput={(() => {
              if (localFormData.duration === null || localFormData.duration === undefined || localFormData.duration === '' || localFormData.duration === 0) {
                return '';
              }
              const nights = localFormData.duration - 1;
              return nights >= 1 ? nights : '';
            })()}
            onFormChange={handleDetailsChange}
            onNightsChange={handleDurationChange}
          />
        </StableSectionCard>
      ) : (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-700">Package Details</h3>
              <p className="text-xs text-slate-500">Read-only</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Duration</p>
              <p className="font-medium text-slate-800">{localFormData.duration || 0} Days</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Price</p>
              <p className="font-medium text-slate-800">{formatCurrency(localFormData.price, { minimumFractionDigits: 2 })}</p>
            </div>
            {localFormData.highlights && localFormData.highlights.length > 0 && (
              <div className="bg-white rounded-xl p-4 border border-slate-200 md:col-span-2">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Highlights</p>
                <ul className="space-y-1">
                  {localFormData.highlights.map((highlight, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {localFormData.inclusions && localFormData.inclusions.length > 0 && (
              <div className="bg-white rounded-xl p-4 border border-slate-200 md:col-span-2">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Inclusions</p>
                <ul className="space-y-1">
                  {localFormData.inclusions.map((inclusion, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      {inclusion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {localFormData.exclusions && localFormData.exclusions.length > 0 && (
              <div className="bg-white rounded-xl p-4 border border-slate-200 md:col-span-2">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Exclusions</p>
                <ul className="space-y-1">
                  {localFormData.exclusions.map((exclusion, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                      {exclusion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Images Section */}
      {!onlyItineraryEditable && (
        <StableSectionCard
          id="images"
          expanded={expandedSections.images}
          onToggle={toggleSection}
          icon={Image}
          title="Package Images"
          description="Upload attractive images for your package"
          gradient="from-violet-500 to-purple-600"
        >
          <ImageUpload
            images={images || localFormData.images || []}
            onImageUpload={onImageUpload}
            onImageRemove={onImageRemove}
            isUploading={isUploadingImages}
          />
        </StableSectionCard>
      )}

      {/* Itinerary Section */}
      <StableSectionCard
        id="itinerary"
        expanded={expandedSections.itinerary}
        onToggle={toggleSection}
        icon={Calendar}
        title="Day-wise Itinerary"
        description="Plan activities and experiences for each day"
        gradient="from-amber-500 to-orange-600"
      >
        {!showItinerary ? (
          <div className="space-y-6">
            <ItineraryEditor
              days={localFormData.days || []}
              onDayChange={handleDayChange}
              onAddDay={handleAddDay}
              onRemoveDay={handleRemoveDay}
              destination={localFormData.destination || ''}
              packageType={localFormData.packageType || ''}
              category={localFormData.category || ''}
              hideDescription={onlyItineraryEditable}
            />

            {!hideLeadManagementButtons && (
              <div className="flex gap-3">
                <button
                  onClick={handleItinerarySubmit}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                >
                  <Eye className="w-5 h-5" />
                  Validate & Preview Itinerary
                </button>
                <button
                  onClick={handleResetItinerary}
                  className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <ItineraryDisplay days={localFormData.days || []} />
            <button
              onClick={() => setShowItinerary(false)}
              className="w-full px-5 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
            >
              Edit Itinerary
            </button>
          </div>
        )}
      </StableSectionCard>

      {/* Action Buttons */}
      {!hideLeadManagementButtons ? (
        <div className="space-y-4 pt-6 border-t border-slate-200">
          {/* Tip Box */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> You can save as draft at any time, even with incomplete itinerary data.
              Your progress will be preserved and you can continue editing later.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => handleSave('draft')}
              className="flex-1 px-6 py-3.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save as Draft
            </button>
            <button
              onClick={() => handleSave('published')}
              className="flex-1 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all font-medium flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
            >
              <Send className="w-5 h-5" />
              Publish
            </button>
            <button
              onClick={onCancel}
              className="px-6 py-3.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 pt-6 border-t border-slate-200">
          <button
            onClick={() => handleSave('published')}
            className="flex-1 px-6 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
          >
            <Save className="w-5 h-5" />
            Save Customized Package
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-3.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default NewEditPackageForm;

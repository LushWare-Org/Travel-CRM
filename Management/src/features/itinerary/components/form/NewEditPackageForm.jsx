/**
 * New/Edit Package Form Component
 * Main form component combining all package sections
 * Aligned with backend day-based structure
 */

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import BasicPackageInfo from './BasicPackageInfo';
import PackageDetails from './PackageDetails';
import ImageUpload from '../ImageUpload';
import ItineraryEditor from '../ItineraryEditor';
import ItineraryDisplay from '../ItineraryDisplay';
import { validateItinerary } from '../../utils/helpers';
import { VALIDATION_MESSAGES } from '../../utils/constants';
import { createDefaultDay } from '../../types/index.js';

const NewEditPackageForm = ({
  formData,
  setFormData,
  onSave,
  onCancel,
  onImageUpload,
  onImageRemove,
  images, // Images state from parent container
  isUploadingImages, // Upload state from parent
  hideLeadManagementButtons = false, // Hide buttons when used in lead management
  onlyItineraryEditable = false, // When true, only itinerary is editable, all other fields are read-only
}) => {
  const [localFormData, setLocalFormData] = useState(formData);
  const [showItinerary, setShowItinerary] = useState(false);

  useEffect(() => {
    // Initialize localFormData with formData
    let initialData = { ...formData };

    // If days array is empty but duration exists, create default days
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

  const handleBasicInfoChange = (data) => {
    setLocalFormData(data);
  };

  const handleDetailsChange = (data) => {
    setLocalFormData(data);
  };

  const handleDurationChange = (nights) => {
    // Allow empty string for editing
    if (nights === '' || nights === null || nights === undefined) {
      setLocalFormData((prev) => ({
        ...prev,
        duration: '',
      }));
      return;
    }

    const nightsCount = parseInt(nights, 10);
    // Only proceed if we have a valid number >= 1
    if (isNaN(nightsCount) || nightsCount < 1) {
      // If invalid, set to 1 night (2 days) as minimum
      const minNights = 1;
      const minDays = minNights + 1; // 1 night = 2 days
      let newDays = [...(localFormData.days || [])];

      // Ensure at least 2 days exist (1 night = 2 days)
      if (newDays.length === 0) {
        newDays = [createDefaultDay(1), createDefaultDay(2)];
      } else if (newDays.length < minDays) {
        for (let i = newDays.length + 1; i <= minDays; i++) {
          newDays.push(createDefaultDay(i));
        }
      }

      setLocalFormData((prev) => ({
        ...prev,
        duration: minDays, // Store days in duration field
        days: newDays,
      }));
      return;
    }

    // Convert nights to days: n nights = n+1 days
    const daysCount = nightsCount + 1;
    let newDays = [...(localFormData.days || [])];

    // Add new days if needed
    if (newDays.length < daysCount) {
      for (let i = newDays.length + 1; i <= daysCount; i++) {
        newDays.push(createDefaultDay(i));
      }
    }
    // Remove extra days if needed
    else if (newDays.length > daysCount) {
      newDays = newDays.slice(0, daysCount);
    }

    setLocalFormData((prev) => ({
      ...prev,
      duration: daysCount, // Store days in duration field (nights + 1)
      days: newDays,
    }));
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
      // Renumber remaining days
      const renumberedDays = filteredDays.map((day, index) => ({
        ...day,
        dayNumber: index + 1,
      }));
      return {
        ...prev,
        duration: renumberedDays.length,
        days: renumberedDays,
      };
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
    setLocalFormData((prev) => ({
      ...prev,
      duration: 1,
      days: [],
    }));
    setShowItinerary(false);
  };

  const handleSave = (status) => {
    // Ensure we preserve _id and id fields
    const packageId = localFormData._id || localFormData.id;

    // IMPORTANT: Always include days array, even if empty
    const dataToSave = {
      ...localFormData,
      days: localFormData.days || [], // Ensure days is always an array
      status,
      updatedDate: new Date().toISOString().split('T')[0],
    };

    // Ensure _id is explicitly included if it exists
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
    // Pass the updated data directly to onSave instead of relying on state update
    onSave?.(dataToSave);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info Section - Read-only when onlyItineraryEditable is true */}
      {!onlyItineraryEditable ? (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          <BasicPackageInfo
            formData={localFormData}
            onChange={handleBasicInfoChange}
            packageId={localFormData._id || localFormData.id || null}
          />
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Basic Information (Read-Only)</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Package Name:</span>
              <span className="ml-2 font-medium text-gray-900">{localFormData.name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500">Category:</span>
              <span className="ml-2 font-medium text-gray-900">{localFormData.category || 'N/A'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Destination:</span>
              <span className="ml-2 font-medium text-gray-900">{localFormData.destination || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Package Details Section - Read-only when onlyItineraryEditable is true */}
      {!onlyItineraryEditable ? (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Package Details</h3>
          <PackageDetails
            formData={localFormData}
            nightsInput={(() => {
              // Convert days to nights for display: nights = days - 1
              // If duration is null/undefined/0, default to 1 night
              if (localFormData.duration === null || localFormData.duration === undefined || localFormData.duration === '' || localFormData.duration === 0) {
                return '';
              }
              // Convert days to nights: if duration is days, nights = days - 1
              const nights = localFormData.duration - 1;
              return nights >= 1 ? nights : '';
            })()}
            onFormChange={handleDetailsChange}
            onNightsChange={handleDurationChange}
          />
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Package Details (Read-Only)</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Duration:</span>
              <span className="ml-2 font-medium text-gray-900">{localFormData.duration || 0} Days</span>
            </div>
            <div>
              <span className="text-gray-500">Price:</span>
              <span className="ml-2 font-medium text-gray-900">INR {localFormData.price?.toFixed(2) || '0.00'}</span>
            </div>
            {localFormData.highlights && localFormData.highlights.length > 0 && (
              <div className="col-span-2">
                <span className="text-gray-500">Highlights:</span>
                <ul className="mt-1 list-disc list-inside text-gray-700">
                  {localFormData.highlights.map((highlight, idx) => (
                    <li key={idx}>{highlight}</li>
                  ))}
                </ul>
              </div>
            )}
            {localFormData.inclusions && localFormData.inclusions.length > 0 && (
              <div className="col-span-2">
                <span className="text-gray-500">Inclusions:</span>
                <ul className="mt-1 list-disc list-inside text-gray-700">
                  {localFormData.inclusions.map((inclusion, idx) => (
                    <li key={idx}>{inclusion}</li>
                  ))}
                </ul>
              </div>
            )}
            {localFormData.exclusions && localFormData.exclusions.length > 0 && (
              <div className="col-span-2">
                <span className="text-gray-500">Exclusions:</span>
                <ul className="mt-1 list-disc list-inside text-gray-700">
                  {localFormData.exclusions.map((exclusion, idx) => (
                    <li key={idx}>{exclusion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Images Section - Hidden when onlyItineraryEditable is true */}
      {!onlyItineraryEditable && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Images</h3>
          <ImageUpload
            images={images || localFormData.images || []}
            onImageUpload={onImageUpload}
            onImageRemove={onImageRemove}
            isUploading={isUploadingImages}
          />
        </div>
      )}

      {/* Itinerary Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Itinerary</h3>
        {!showItinerary ? (
          <div className="space-y-4">
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
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium"
                >
                  Validate & Preview Itinerary
                </button>
                <button
                  onClick={handleResetItinerary}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors font-medium"
                >
                  Reset Itinerary
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <ItineraryDisplay days={localFormData.days || []} />
            <button
              onClick={() => setShowItinerary(false)}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors font-medium"
            >
              Edit Itinerary
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!hideLeadManagementButtons ? (
        <div className="space-y-3 pt-6 border-t border-gray-200">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> You can save as draft at any time, even with incomplete itinerary data.
              Your progress will be preserved and you can continue editing later.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleSave('draft')}
              className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors font-medium"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSave('published')}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium"
            >
              Publish
            </button>
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 pt-6 border-t border-gray-200">
          <button
            onClick={() => handleSave('published')}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium"
          >
            Save Customized Package
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-200 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default NewEditPackageForm;

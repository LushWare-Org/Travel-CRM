/**
 * New/Edit Package Form Component
 * Main form component combining all package sections
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

const NewEditPackageForm = ({
  formData,
  setFormData,
  onSave,
  onCancel,
  nightsInput,
  setNightsInput,
  showItinerary,
  setShowItinerary,
  isItinerarySubmitted,
  setIsItinerarySubmitted,
  onItineraryChange,
  onTitleChange,
  onImageUpload,
  onImageRemove,
}) => {
  const [localFormData, setLocalFormData] = useState(formData);

  useEffect(() => {
    setLocalFormData(formData);
  }, [formData]);

  const handleBasicInfoChange = (data) => {
    setLocalFormData(data);
  };

  const handleDetailsChange = (data) => {
    setLocalFormData(data);
  };

  const handleNightsChange = (nights) => {
    setNightsInput(nights);
    setLocalFormData((prev) => ({
      ...prev,
      duration: nights > 0 ? `${nights + 1} Days / ${nights} Nights` : '',
    }));
  };

  const handleItinerarySubmit = () => {
    const errors = validateItinerary(localFormData.itinerary);

    if (Object.keys(errors).length > 0) {
      Swal.fire('Error', VALIDATION_MESSAGES.ITINERARY_INCOMPLETE, 'error');
      return;
    }

    setShowItinerary(true);
    setIsItinerarySubmitted(true);
    Swal.fire('Success', VALIDATION_MESSAGES.ITINERARY_SUBMITTED, 'success');
  };

  const handleResetItinerary = () => {
    setLocalFormData((prev) => ({
      ...prev,
      itinerary: { first_day: '', middle_days: {}, last_day: '' },
      itineraryTitles: { first_day: '', middle_days: {}, last_day: '' },
    }));
    setNightsInput('');
    setShowItinerary(false);
    setIsItinerarySubmitted(false);
  };

  const handleSave = (status) => {
    const dataToSave = {
      ...localFormData,
      status,
      updatedDate: new Date().toISOString().split('T')[0],
    };
    setFormData(dataToSave);
    onSave?.();
  };

  return (
    <div className="space-y-6">
      {/* Basic Info Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
        <BasicPackageInfo formData={localFormData} onChange={handleBasicInfoChange} />
      </div>

      {/* Package Details Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Package Details</h3>
        <PackageDetails
          formData={localFormData}
          nightsInput={nightsInput}
          onFormChange={handleDetailsChange}
          onNightsChange={handleNightsChange}
        />
      </div>

      {/* Images Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Images</h3>
        <ImageUpload
          images={localFormData.images}
          onImageUpload={onImageUpload}
          onImageRemove={onImageRemove}
        />
      </div>

      {/* Itinerary Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Itinerary</h3>
        {!showItinerary ? (
          <div className="space-y-4">
            <ItineraryEditor
              itinerary={localFormData.itinerary}
              itineraryTitles={localFormData.itineraryTitles}
              onItineraryChange={onItineraryChange}
              onTitleChange={onTitleChange}
            />

            <div className="flex gap-3">
              <button
                onClick={handleItinerarySubmit}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium"
              >
                Submit Itinerary
              </button>
              <button
                onClick={handleResetItinerary}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors font-medium"
              >
                Reset Itinerary
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ItineraryDisplay
              itinerary={localFormData.itinerary}
              itineraryTitles={localFormData.itineraryTitles}
            />
            <button
              onClick={() => {
                setShowItinerary(false);
                setIsItinerarySubmitted(false);
              }}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors font-medium"
            >
              Edit Itinerary
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-6 border-t border-gray-200">
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
  );
};

export default NewEditPackageForm;

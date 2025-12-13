/**
 * Itinerary Editor Component
 * Allows editing of itinerary details
 * Aligned with backend day-based structure
 */

import { Trash2, Plus, Upload, X, Search, Loader } from 'lucide-react';
import { useState, useEffect } from 'react';
import { uploadItineraryImages } from '../../../services/cloudinaryService';
import Swal from 'sweetalert2';
import ActivitySelector from './ActivitySelector';
import LocationSelector from './LocationSelector';
import HotelSuggestionsModal from './HotelSuggestionsModal';

const ItineraryEditor = ({
  days = [],
  onDayChange,
  onAddDay,
  onRemoveDay,
  destination = '', // Add destination prop
  packageType = '', // Package type (Standard, Deluxe, Luxury, Premium)
  category = '', // Package category
  useLocationAutocomplete = false, // New prop to determine location input type
  LocationAutocompleteComponent = null, // Optional custom location autocomplete component
  hideTitleAndDescription = false, // Hide title and description fields (for lead management)
  hideDescription = false, // Hide only description field (for customize package mode)
}) => {
  const [uploadingDayImages, setUploadingDayImages] = useState({});
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [currentDayForHotel, setCurrentDayForHotel] = useState(null);
  const [currentDayLocations, setCurrentDayLocations] = useState([]);
  const [autoFillingHotel, setAutoFillingHotel] = useState(false);

  const handleDayImageUpload = async (dayNumber, files) => {
    if (!files || files.length === 0) return;

    setUploadingDayImages(prev => ({ ...prev, [dayNumber]: true }));

    try {
      const uploadedImages = await uploadItineraryImages(files);
      
      // Get existing images for this day
      const day = days.find(d => d.dayNumber === dayNumber);
      const existingImages = day?.images || [];
      
      // Merge with new images
      const updatedImages = [...existingImages, ...uploadedImages];
      
      onDayChange(dayNumber, { images: updatedImages });
      
      Swal.fire('Success', `${uploadedImages.length} image(s) uploaded successfully!`, 'success');
    } catch (error) {
      console.error('Day image upload error:', error);
      Swal.fire('Error', error.message || 'Failed to upload images', 'error');
    } finally {
      setUploadingDayImages(prev => ({ ...prev, [dayNumber]: false }));
    }
  };

  const handleRemoveDayImage = (dayNumber, imageIndex) => {
    const day = days.find(d => d.dayNumber === dayNumber);
    const updatedImages = (day?.images || []).filter((_, idx) => idx !== imageIndex);
    onDayChange(dayNumber, { images: updatedImages });
  };

  // Auto-fill best match hotel when locations are added/changed
  const autoFillBestMatchHotel = async (dayNumber, dayLocations) => {
    if (!dayLocations || dayLocations.length === 0) return;
    if (!destination) return; // Need destination to search

    try {
      setAutoFillingHotel(true);
      const { hotelAPI } = await import('../../../services/api');
      
      // Combine all locations into a search string
      const locationsString = dayLocations.join(', ');
      
      const response = await hotelAPI.suggest(
        destination,
        packageType,
        category,
        locationsString,
        1 // Only get the best match
      );

      if (response.success || response.status === 'success') {
        const hotels = response.data || [];
        if (hotels.length > 0) {
          const bestMatch = hotels[0];
          const day = days.find(d => d.dayNumber === dayNumber);
          
          // Auto-fill accommodation fields with best match
          onDayChange(dayNumber, {
            accommodation: {
              name: bestMatch.name,
              address: bestMatch.address,
              contactNumber: bestMatch.contactNumber || '',
              rating: bestMatch.rating !== undefined && bestMatch.rating !== null 
                ? parseFloat(bestMatch.rating) 
                : (day?.accommodation?.rating !== undefined ? day.accommodation.rating : ''),
              type: day?.accommodation?.type || 'hotel', // Keep existing type or default to hotel
            },
          });
        }
      }
    } catch (error) {
      console.error('Error auto-filling hotel:', error);
      // Silently fail - don't show error for auto-fill
    } finally {
      setAutoFillingHotel(false);
    }
  };

  // Watch for location changes and auto-fill hotel
  useEffect(() => {
    const timeouts = [];
    
    days.forEach((day) => {
      if (day.locations && day.locations.length > 0 && destination) {
        // Check if accommodation is already filled
        const hasAccommodation = day.accommodation?.name && day.accommodation?.address;
        
        // Only auto-fill if accommodation is not already set
        if (!hasAccommodation && !autoFillingHotel) {
          // Small delay to avoid too many API calls
          const timeoutId = setTimeout(() => {
            autoFillBestMatchHotel(day.dayNumber, day.locations);
          }, 1500); // Wait 1.5 seconds after location change
          
          timeouts.push(timeoutId);
        }
      }
    });

    return () => {
      timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    };
  }, [days.map(d => `${d.dayNumber}-${d.locations?.join(',')}`).join('|'), destination, packageType, category]);

  if (!days || days.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-md p-8 text-center">
        <p className="text-gray-500 mb-4">No days added to itinerary</p>
        <button
          onClick={onAddDay}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          <Plus size={18} />
          Add First Day
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {days.map((day, index) => (
        <div key={day.dayNumber} className="border border-gray-300 rounded-lg overflow-hidden">
          {/* Day Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 flex justify-between items-center">
            <h3 className="font-semibold text-lg">Day {day.dayNumber}</h3>
            <button
              onClick={() => onRemoveDay(day.dayNumber)}
              className="p-2 hover:bg-red-500 rounded transition-colors"
              title="Remove day"
            >
              <Trash2 size={18} />
            </button>
          </div>

          {/* Day Content */}
          <div className="p-6 bg-gray-50 space-y-4">
            {/* Title - Hidden when hideTitleAndDescription is true */}
            {!hideTitleAndDescription && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Day Title
              </label>
              <input
                type="text"
                value={day.title || ''}
                onChange={(e) => onDayChange(day.dayNumber, { title: e.target.value })}
                  placeholder="e.g., Arrival in Dubai (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            )}

            {/* Description - Hidden when hideTitleAndDescription or hideDescription is true */}
            {!hideTitleAndDescription && !hideDescription && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
              </label>
              <textarea
                rows="3"
                value={day.description || ''}
                onChange={(e) => onDayChange(day.dayNumber, { description: e.target.value })}
                  placeholder="Detailed description of the day's activities... (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            )}

            {/* Locations Covered */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Locations Covered
              </label>
              {useLocationAutocomplete && LocationAutocompleteComponent ? (
                <LocationAutocompleteComponent
                  locations={day.locations || []}
                  onChange={(locations) => onDayChange(day.dayNumber, { locations })}
                />
              ) : (
                <LocationSelector
                  locations={day.locations || []}
                  onChange={(locations) => onDayChange(day.dayNumber, { locations })}
                  destination={destination}
                />
              )}
            </div>

            {/* Activities */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Activities
              </label>
              <ActivitySelector
                activities={day.activities || []}
                onChange={(activities) => onDayChange(day.dayNumber, { activities })}
              />
            </div>

            {/* Meals */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Meals Included
              </label>
              <div className="flex gap-6">
                {['breakfast', 'lunch', 'dinner'].map((meal) => (
                  <label key={meal} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={day.meals?.[meal] || false}
                      onChange={(e) =>
                        onDayChange(day.dayNumber, {
                          meals: {
                            ...day.meals,
                            [meal]: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-700 capitalize">{meal}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Transport */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Transport
              </label>
              <select
                value={day.transport || ''}
                onChange={(e) => onDayChange(day.dayNumber, { transport: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select transport type</option>
                <option value="flight">Flight</option>
                <option value="train">Train</option>
                <option value="bus">Bus</option>
                <option value="car">Car</option>
                <option value="boat">Boat</option>
                <option value="walk">Walk</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Accommodation */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Accommodation
                </label>
                <div className="flex items-center gap-2">
                  {autoFillingHotel && days.find(d => d.dayNumber === day.dayNumber)?.locations?.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <Loader className="w-3 h-3 animate-spin" />
                      <span>Finding best match...</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentDayForHotel(day.dayNumber);
                      // Get all locations from the day's locations array
                      const dayLocations = day.locations && day.locations.length > 0 
                        ? day.locations 
                        : [];
                      setCurrentDayLocations(dayLocations);
                      setShowHotelModal(true);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    title="Search for hotel suggestions"
                  >
                    <Search className="w-4 h-4" />
                    Search Hotels
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <input
                  type="text"
                  value={day.accommodation?.name || ''}
                  onChange={(e) =>
                    onDayChange(day.dayNumber, {
                      accommodation: { ...day.accommodation, name: e.target.value },
                    })
                  }
                  placeholder="Hotel/Resort name"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={day.accommodation?.type || ''}
                  onChange={(e) =>
                    onDayChange(day.dayNumber, {
                      accommodation: { ...day.accommodation, type: e.target.value },
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select accommodation type</option>
                  <option value="hotel">Hotel</option>
                  <option value="resort">Resort</option>
                  <option value="guesthouse">Guesthouse</option>
                  <option value="homestay">Homestay</option>
                  <option value="camp">Camp</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="text"
                  value={day.accommodation?.address || ''}
                  onChange={(e) =>
                    onDayChange(day.dayNumber, {
                      accommodation: { ...day.accommodation, address: e.target.value },
                    })
                  }
                  placeholder="Address"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={day.accommodation?.contactNumber || ''}
                  onChange={(e) =>
                    onDayChange(day.dayNumber, {
                      accommodation: { ...day.accommodation, contactNumber: e.target.value },
                    })
                  }
                  placeholder="Contact number"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={day.accommodation?.rating || ''}
                  onChange={(e) =>
                    onDayChange(day.dayNumber, {
                      accommodation: { ...day.accommodation, rating: parseFloat(e.target.value) || 0 },
                    })
                  }
                  placeholder="Rating (0-5)"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                rows="2"
                value={day.notes || ''}
                onChange={(e) => onDayChange(day.dayNumber, { notes: e.target.value })}
                placeholder="Any additional notes or important information..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Day Images - Hidden when hideTitleAndDescription is true */}
            {!hideTitleAndDescription && (
            <div className="border-t pt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Day Images
              </label>
              
              {/* Upload Button */}
              <div className="mb-3">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={(e) => handleDayImageUpload(day.dayNumber, e.target.files)}
                  disabled={uploadingDayImages[day.dayNumber]}
                  className="hidden"
                  id={`day-${day.dayNumber}-image-upload`}
                />
                <label
                  htmlFor={`day-${day.dayNumber}-image-upload`}
                  className={`inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors ${
                    uploadingDayImages[day.dayNumber] ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {uploadingDayImages[day.dayNumber] ? 'Uploading...' : 'Upload Day Images'}
                  </span>
                </label>
              </div>

              {/* Image Grid */}
              {day.images && day.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {day.images.map((img, imgIdx) => {
                    const imageUrl = typeof img === 'string' ? img : img.url;
                    return (
                      <div key={imgIdx} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors">
                          <img
                            src={imageUrl}
                            alt={`Day ${day.dayNumber} Image ${imgIdx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50" y="50" text-anchor="middle" dominant-baseline="middle"%3EImage%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveDayImage(day.dayNumber, imgIdx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                          type="button"
                          title="Remove image"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {uploadingDayImages[day.dayNumber] && (
                <div className="flex items-center gap-2 text-sm text-blue-600 mt-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Uploading images...</span>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      ))}

      {/* Add Day Button */}
      <button
        onClick={onAddDay}
        className="w-full py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:border-blue-500 hover:text-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add Another Day
      </button>

      {/* Hotel Suggestions Modal */}
      <HotelSuggestionsModal
        isOpen={showHotelModal}
        onClose={() => {
          setShowHotelModal(false);
          setCurrentDayForHotel(null);
          setCurrentDayLocations([]);
        }}
        onSelectHotel={(hotel) => {
          if (currentDayForHotel) {
            const day = days.find(d => d.dayNumber === currentDayForHotel);
            onDayChange(currentDayForHotel, {
              accommodation: {
                name: hotel.name,
                address: hotel.address,
                contactNumber: hotel.contactNumber || '',
                rating: hotel.rating !== undefined && hotel.rating !== null 
                  ? parseFloat(hotel.rating) 
                  : (day?.accommodation?.rating !== undefined ? day.accommodation.rating : ''),
                type: day?.accommodation?.type || 'hotel',
              },
            });
          }
        }}
        destination={destination}
        packageType={packageType}
        category={category}
        locations={currentDayLocations}
      />
    </div>
  );
};

export default ItineraryEditor;

/**
 * Itinerary Editor Component - Redesigned
 * Modern card-based day editor with premium styling
 * Aligned with backend day-based structure
 */

import {
  Trash2, Plus, Upload, X, Search, Loader,
  MapPin, Activity, Utensils, Car, Building2,
  StickyNote, Image as ImageIcon, ChevronDown, ChevronUp,
  Coffee, UtensilsCrossed, Moon, Check
} from 'lucide-react';
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
  destination = '',
  packageType = '',
  category = '',
  useLocationAutocomplete = false,
  LocationAutocompleteComponent = null,
  hideTitleAndDescription = false,
  hideDescription = false,
}) => {
  const [uploadingDayImages, setUploadingDayImages] = useState({});
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [currentDayForHotel, setCurrentDayForHotel] = useState(null);
  const [currentDayLocations, setCurrentDayLocations] = useState([]);
  const [autoFillingHotel, setAutoFillingHotel] = useState(false);
  const [expandedDays, setExpandedDays] = useState({});

  // Initialize all days as expanded
  useEffect(() => {
    const expanded = {};
    days.forEach(day => {
      if (expandedDays[day.dayNumber] === undefined) {
        expanded[day.dayNumber] = true;
      }
    });
    if (Object.keys(expanded).length > 0) {
      setExpandedDays(prev => ({ ...prev, ...expanded }));
    }
  }, [days.length]);

  const toggleDayExpand = (dayNumber) => {
    setExpandedDays(prev => ({ ...prev, [dayNumber]: !prev[dayNumber] }));
  };

  const handleDayImageUpload = async (dayNumber, files) => {
    if (!files || files.length === 0) return;

    setUploadingDayImages(prev => ({ ...prev, [dayNumber]: true }));

    try {
      const uploadedImages = await uploadItineraryImages(files);
      const day = days.find(d => d.dayNumber === dayNumber);
      const existingImages = day?.images || [];
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

  const autoFillBestMatchHotel = async (dayNumber, dayLocations) => {
    if (!dayLocations || dayLocations.length === 0) return;
    if (!destination) return;

    try {
      setAutoFillingHotel(true);
      const { hotelAPI } = await import('../../../services/api');
      const locationsString = dayLocations.join(', ');

      const response = await hotelAPI.suggest(
        destination,
        packageType,
        category,
        locationsString,
        1
      );

      if (response.success || response.status === 'success') {
        const hotels = response.data || [];
        if (hotels.length > 0) {
          const bestMatch = hotels[0];
          const day = days.find(d => d.dayNumber === dayNumber);

          onDayChange(dayNumber, {
            accommodation: {
              name: bestMatch.name,
              address: bestMatch.address,
              contactNumber: bestMatch.contactNumber || '',
              rating: bestMatch.rating !== undefined && bestMatch.rating !== null
                ? parseFloat(bestMatch.rating)
                : (day?.accommodation?.rating !== undefined ? day.accommodation.rating : ''),
              type: day?.accommodation?.type || 'hotel',
            },
          });
        }
      }
    } catch (error) {
      console.error('Error auto-filling hotel:', error);
    } finally {
      setAutoFillingHotel(false);
    }
  };

  useEffect(() => {
    const timeouts = [];

    days.forEach((day) => {
      if (day.locations && day.locations.length > 0 && destination) {
        const hasAccommodation = day.accommodation?.name && day.accommodation?.address;

        if (!hasAccommodation && !autoFillingHotel) {
          const timeoutId = setTimeout(() => {
            autoFillBestMatchHotel(day.dayNumber, day.locations);
          }, 1500);

          timeouts.push(timeoutId);
        }
      }
    });

    return () => {
      timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    };
  }, [days.map(d => `${d.dayNumber}-${d.locations?.join(',')}`).join('|'), destination, packageType, category]);

  // Field Group Component
  const FieldGroup = ({ label, icon: Icon, children, className = '' }) => (
    <div className={`bg-white rounded-xl border border-slate-200 p-4 ${className}`}>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        {label}
      </label>
      {children}
    </div>
  );

  if (!days || days.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Plus className="w-8 h-8 text-amber-600" />
        </div>
        <p className="text-slate-600 font-medium mb-2">No days added to itinerary</p>
        <p className="text-sm text-slate-500 mb-6">Start building your travel itinerary</p>
        <button
          onClick={onAddDay}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all font-medium shadow-lg shadow-amber-500/25"
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
        <div key={day.dayNumber} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
          {/* Day Header */}
          <div
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-4 flex justify-between items-center cursor-pointer"
            onClick={() => toggleDayExpand(day.dayNumber)}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <span className="text-lg font-bold">{day.dayNumber}</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Day {day.dayNumber}</h3>
                {day.title && <p className="text-amber-100 text-sm">{day.title}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveDay(day.dayNumber); }}
                className="p-2 hover:bg-red-500 rounded-lg transition-colors"
                title="Remove day"
              >
                <Trash2 size={18} />
              </button>
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                {expandedDays[day.dayNumber] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>
          </div>

          {/* Day Content */}
          {expandedDays[day.dayNumber] && (
            <div className="p-6 bg-gradient-to-b from-amber-50/50 to-white space-y-4">
              {/* Row 1: Title and Description */}
              {!hideTitleAndDescription && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FieldGroup label="Day Title" icon={StickyNote}>
                    <input
                      type="text"
                      value={day.title || ''}
                      onChange={(e) => onDayChange(day.dayNumber, { title: e.target.value })}
                      placeholder="e.g., Arrival in Dubai (optional)"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                    />
                  </FieldGroup>

                  {!hideDescription && (
                    <FieldGroup label="Description" icon={StickyNote}>
                      <textarea
                        rows="2"
                        value={day.description || ''}
                        onChange={(e) => onDayChange(day.dayNumber, { description: e.target.value })}
                        placeholder="Brief description of the day's activities..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
                      />
                    </FieldGroup>
                  )}
                </div>
              )}

              {/* Row 2: Locations and Activities */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FieldGroup label="Locations Covered" icon={MapPin}>
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
                </FieldGroup>

                <FieldGroup label="Activities" icon={Activity}>
                  <ActivitySelector
                    activities={day.activities || []}
                    onChange={(activities) => onDayChange(day.dayNumber, { activities })}
                    destination={destination}
                  />
                </FieldGroup>
              </div>

              {/* Row 3: Meals and Transport */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FieldGroup label="Meals Included" icon={Utensils}>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: 'breakfast', label: 'Breakfast', icon: Coffee, color: 'amber' },
                      { key: 'lunch', label: 'Lunch', icon: UtensilsCrossed, color: 'orange' },
                      { key: 'dinner', label: 'Dinner', icon: Moon, color: 'violet' },
                    ].map((meal) => (
                      <label
                        key={meal.key}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition-all border ${day.meals?.[meal.key]
                            ? `bg-${meal.color}-100 border-${meal.color}-300 text-${meal.color}-800`
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={day.meals?.[meal.key] || false}
                          onChange={(e) =>
                            onDayChange(day.dayNumber, {
                              meals: { ...day.meals, [meal.key]: e.target.checked },
                            })
                          }
                          className="sr-only"
                        />
                        {day.meals?.[meal.key] ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <meal.icon className="w-4 h-4 opacity-50" />
                        )}
                        <span className="text-sm font-medium">{meal.label}</span>
                      </label>
                    ))}
                  </div>
                </FieldGroup>

                <FieldGroup label="Transport" icon={Car}>
                  <select
                    value={day.transport || ''}
                    onChange={(e) => onDayChange(day.dayNumber, { transport: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select transport type</option>
                    <option value="flight">✈️ Flight</option>
                    <option value="train">🚂 Train</option>
                    <option value="bus">🚌 Bus</option>
                    <option value="car">🚗 Car</option>
                    <option value="boat">⛵ Boat</option>
                    <option value="walk">🚶 Walk</option>
                    <option value="other">📦 Other</option>
                  </select>
                </FieldGroup>
              </div>

              {/* Row 4: Accommodation */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex justify-between items-center mb-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    Accommodation
                  </label>
                  <div className="flex items-center gap-2">
                    {autoFillingHotel && days.find(d => d.dayNumber === day.dayNumber)?.locations?.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                        <Loader className="w-3 h-3 animate-spin" />
                        <span>Finding best match...</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentDayForHotel(day.dayNumber);
                        const dayLocations = day.locations && day.locations.length > 0 ? day.locations : [];
                        setCurrentDayLocations(dayLocations);
                        setShowHotelModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
                      title="Search for hotel suggestions"
                    >
                      <Search className="w-4 h-4" />
                      Search Hotels
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={day.accommodation?.name || ''}
                    onChange={(e) => onDayChange(day.dayNumber, { accommodation: { ...day.accommodation, name: e.target.value } })}
                    placeholder="Hotel/Resort name"
                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                  <select
                    value={day.accommodation?.type || ''}
                    onChange={(e) => onDayChange(day.dayNumber, { accommodation: { ...day.accommodation, type: e.target.value } })}
                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select type</option>
                    <option value="hotel">🏨 Hotel</option>
                    <option value="resort">🌴 Resort</option>
                    <option value="guesthouse">🏡 Guesthouse</option>
                    <option value="homestay">🏠 Homestay</option>
                    <option value="camp">⛺ Camp</option>
                    <option value="other">📦 Other</option>
                  </select>
                  <input
                    type="text"
                    value={day.accommodation?.address || ''}
                    onChange={(e) => onDayChange(day.dayNumber, { accommodation: { ...day.accommodation, address: e.target.value } })}
                    placeholder="Address"
                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                  <input
                    type="text"
                    value={day.accommodation?.contactNumber || ''}
                    onChange={(e) => onDayChange(day.dayNumber, { accommodation: { ...day.accommodation, contactNumber: e.target.value } })}
                    placeholder="Contact number"
                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={day.accommodation?.rating || ''}
                    onChange={(e) => onDayChange(day.dayNumber, { accommodation: { ...day.accommodation, rating: parseFloat(e.target.value) || 0 } })}
                    placeholder="Rating (0-5)"
                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              {/* Row 5: Notes */}
              <FieldGroup label="Additional Notes" icon={StickyNote}>
                <textarea
                  rows="2"
                  value={day.notes || ''}
                  onChange={(e) => onDayChange(day.dayNumber, { notes: e.target.value })}
                  placeholder="Any additional notes or important information..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
                />
              </FieldGroup>

              {/* Row 6: Day Images */}
              {!hideTitleAndDescription && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                    <ImageIcon className="w-4 h-4 text-slate-400" />
                    Day Images
                  </label>

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
                      className={`inline-flex items-center gap-2 px-5 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploadingDayImages[day.dayNumber]
                          ? 'border-amber-300 bg-amber-50 opacity-50 cursor-not-allowed'
                          : 'border-slate-300 bg-slate-50 hover:border-amber-400 hover:bg-amber-50'
                        }`}
                    >
                      {uploadingDayImages[day.dayNumber] ? (
                        <Loader className="w-4 h-4 animate-spin text-amber-600" />
                      ) : (
                        <Upload className="w-4 h-4 text-slate-500" />
                      )}
                      <span className="text-sm text-slate-600">
                        {uploadingDayImages[day.dayNumber] ? 'Uploading...' : 'Upload Day Images'}
                      </span>
                    </label>
                  </div>

                  {day.images && day.images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {day.images.map((img, imgIdx) => {
                        const imageUrl = typeof img === 'string' ? img : img.url;
                        return (
                          <div key={imgIdx} className="relative group">
                            <div className="aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-amber-400 transition-colors">
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
                              className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                              type="button"
                              title="Remove image"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add Day Button */}
      <button
        onClick={onAddDay}
        className="w-full py-4 border-2 border-dashed border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl text-amber-700 hover:border-amber-400 hover:from-amber-100 hover:to-orange-100 transition-all font-medium flex items-center justify-center gap-2"
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

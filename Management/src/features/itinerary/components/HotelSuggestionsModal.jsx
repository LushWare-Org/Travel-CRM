import { useState, useEffect } from 'react';
import { X, Search, MapPin, RefreshCw, Loader } from 'lucide-react';
import { hotelAPI } from '../../../services/api';
import toast from 'react-hot-toast';

const HotelSuggestionsModal = ({
  isOpen,
  onClose,
  onSelectHotel,
  destination,
  packageType,
  category,
  locations = [], // Locations array from itinerary day
}) => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [bestMatch, setBestMatch] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!destination && (!locations || locations.length === 0)) {
      toast.error('Please provide a destination or location');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // Combine all locations into a single string
      const locationsString = locations && locations.length > 0 ? locations.join(', ') : '';
      const response = await hotelAPI.suggest(destination, packageType, category, locationsString, 5);
      
      if (response.success || response.status === 'success') {
        const hotelData = response.data || [];
        setHotels(hotelData);
        setHasSearched(true);
        setError(null);
        
        // Set the first hotel as the best match
        if (hotelData.length > 0) {
          setBestMatch(hotelData[0]);
        }
        
        if (hotelData.length === 0) {
          setError('No hotels found. Try different criteria or search again.');
        }
      } else {
        const errorMsg = response.message || 'Failed to fetch hotel suggestions';
        setError(errorMsg);
        // Don't show toast for auto-search failures, only for manual searches
        if (hasSearched) {
          toast.error(errorMsg);
        }
      }
    } catch (error) {
      console.error('Error fetching hotel suggestions:', error);
      const errorMsg = error.message || 'Failed to fetch hotel suggestions. Please check your API key configuration.';
      setError(errorMsg);
      // Don't show toast for auto-search failures, only for manual searches
      if (hasSearched) {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-search when modal opens if locations are available
  useEffect(() => {
    if (isOpen && locations && locations.length > 0 && !hasSearched) {
      handleSearch();
    }
    // Reset when modal closes
    if (!isOpen) {
      setHasSearched(false);
      setHotels([]);
      setBestMatch(null);
      setError(null);
    }
  }, [isOpen, locations?.join(',')]);

  const handleSearchAgain = () => {
    handleSearch();
  };

  const handleSelectHotel = (hotel) => {
    onSelectHotel(hotel);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Hotel Suggestions</h2>
            <p className="text-blue-100 text-sm mt-1">
              Based on: {locations && locations.length > 0 ? locations.join(', ') : (destination || 'N/A')}
              {packageType && ` • ${packageType}`}
              {category && ` • ${category}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Search Button */}
          {!hasSearched && (
            <div className="text-center py-12">
              <div className="mb-6">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Find Best Matching Hotels
                </h3>
                <p className="text-gray-500 mb-6">
                  Get AI-powered hotel suggestions based on your destination, package type, and category
                </p>
              </div>
              <button
                onClick={handleSearch}
                disabled={loading || !destination}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2 mx-auto"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Search Hotels
                  </>
                )}
              </button>
            </div>
          )}

          {/* Error State */}
          {error && !loading && hasSearched && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm font-medium mb-2">Error loading hotels</p>
              <p className="text-red-600 text-sm">{error}</p>
              <button
                onClick={handleSearch}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && hasSearched && (
            <div className="text-center py-12">
              <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Finding best hotels for you...</p>
            </div>
          )}

          {/* Hotels List */}
          {!loading && hasSearched && hotels.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-700">
                  {hotels.length} Hotel Suggestions
                </h3>
                <button
                  onClick={handleSearchAgain}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Search Again
                </button>
              </div>

              {hotels.map((hotel, index) => {
                const isBestMatch = bestMatch && hotel.name === bestMatch.name && hotel.address === bestMatch.address;
                return (
                  <div
                    key={index}
                    className={`border rounded-lg p-5 hover:shadow-lg transition-all cursor-pointer ${
                      isBestMatch 
                        ? 'border-green-500 bg-green-50 hover:border-green-600' 
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                    onClick={() => handleSelectHotel(hotel)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isBestMatch ? 'bg-green-100' : 'bg-blue-100'
                          }`}>
                            {isBestMatch ? (
                              <span className="text-green-600 font-bold text-xs">⭐</span>
                            ) : (
                              <span className={`font-bold text-lg ${isBestMatch ? 'text-green-600' : 'text-blue-600'}`}>
                                {index + 1}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900">
                              {hotel.name}
                            </h4>
                            {isBestMatch && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded">
                                Best Match
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectHotel(hotel);
                        }}
                        className={`ml-4 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                          isBestMatch
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isBestMatch ? 'Select Best' : 'Select'}
                      </button>
                    </div>
                    <div className="flex items-start gap-2 mt-3 text-gray-600">
                      <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{hotel.address}</p>
                    </div>
                    {(hotel.contactNumber || hotel.rating) && (
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        {hotel.contactNumber && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Contact:</span>
                            <span>{hotel.contactNumber}</span>
                          </span>
                        )}
                        {hotel.rating !== undefined && hotel.rating !== null && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Rating:</span>
                            <span className="flex items-center gap-1">
                              <span className="text-yellow-500">★</span>
                              <span>{parseFloat(hotel.rating).toFixed(1)}</span>
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* No Results */}
          {!loading && hasSearched && hotels.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No hotels found. Try searching again with different criteria.</p>
              <button
                onClick={handleSearchAgain}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 inline mr-2 ${loading ? 'animate-spin' : ''}`} />
                Search Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Hotel suggestions are powered by AI and may vary. Please verify details before booking.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HotelSuggestionsModal;


import { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, RefreshCw, Loader } from 'lucide-react';
import { hotelAPI } from '../../../services/api';
import toast from '@/lib/toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Hotel {
  name: string;
  address: string;
  contactNumber?: string;
  rating?: number | string | null;
  [key: string]: unknown;
}

interface HotelSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHotel: (hotel: Hotel) => void;
  destination?: string;
  packageType?: string;
  category?: string;
  locations?: string[];
}

const HotelSuggestionsModal = ({
  isOpen,
  onClose,
  onSelectHotel,
  destination,
  packageType,
  category,
  locations = [], // Locations array from itinerary day
}: HotelSuggestionsModalProps) => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [bestMatch, setBestMatch] = useState<Hotel | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
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
      const errorMsg = (error as Error).message || 'Failed to fetch hotel suggestions. Please check your API key configuration.';
      setError(errorMsg);
      // Don't show toast for auto-search failures, only for manual searches
      if (hasSearched) {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, packageType, category, locations?.join(',')]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, locations?.join(',')]);

  const handleSearchAgain = () => {
    handleSearch();
  };

  const handleSelectHotel = (hotel: Hotel) => {
    onSelectHotel(hotel);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton
        className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0"
        closeClassName="text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground dark:hover:bg-primary-foreground/20 dark:hover:text-primary-foreground"
      >
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-6 rounded-t-xl">
          <h2 className="text-2xl font-heading font-bold">Hotel Suggestions</h2>
          <p className="text-primary-foreground/80 text-sm mt-1">
            Based on: {locations && locations.length > 0 ? locations.join(', ') : (destination || 'N/A')}
            {packageType && ` • ${packageType}`}
            {category && ` • ${category}`}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Search Button */}
          {!hasSearched && (
            <div className="text-center py-12">
              <div className="mb-6">
                <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-heading font-semibold text-foreground mb-2">
                  Find Best Matching Hotels
                </h3>
                <p className="text-muted-foreground mb-6">
                  Get AI-powered hotel suggestions based on your destination, package type, and category
                </p>
              </div>
              <Button onClick={handleSearch} disabled={loading || !destination}>
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Search Hotels
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Error State */}
          {error && !loading && hasSearched && (
            <div className="mb-6 p-4 bg-destructive/5 border border-destructive/10 rounded-lg">
              <p className="text-destructive text-sm font-medium mb-2">Error loading hotels</p>
              <p className="text-destructive/80 text-sm">{error}</p>
              <Button onClick={handleSearch} variant="destructive" size="sm" className="mt-3">
                Try Again
              </Button>
            </div>
          )}

          {/* Loading State */}
          {loading && hasSearched && (
            <div className="text-center py-12">
              <Loader className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Finding best hotels for you...</p>
            </div>
          )}

          {/* Hotels List */}
          {!loading && hasSearched && hotels.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-heading font-semibold text-foreground">
                  {hotels.length} Hotel Suggestions
                </h3>
                <Button onClick={handleSearchAgain} disabled={loading} variant="outline" size="sm">
                  <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                  Search Again
                </Button>
              </div>

              {hotels.map((hotel, index) => {
                const isBestMatch = Boolean(bestMatch && hotel.name === bestMatch.name && hotel.address === bestMatch.address);
                return (
                  <div
                    key={index}
                    className={cn(
                      'border rounded-lg p-5 hover:shadow-dropdown transition-shadow cursor-pointer',
                      isBestMatch
                        ? 'border-success/40 bg-success/5 hover:border-success/60'
                        : 'border-border bg-card hover:border-primary/40'
                    )}
                    onClick={() => handleSelectHotel(hotel)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            isBestMatch ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                          )}>
                            {isBestMatch ? (
                              <span className="font-bold text-xs">⭐</span>
                            ) : (
                              <span className="font-bold text-lg font-mono">{index + 1}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-foreground">
                              {hotel.name}
                            </h4>
                            {isBestMatch && (
                              <Badge className="mt-1 bg-success text-success-foreground border-transparent">
                                Best Match
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectHotel(hotel);
                        }}
                        variant={isBestMatch ? 'default' : 'outline'}
                        size="sm"
                        className="ml-4"
                      >
                        {isBestMatch ? 'Select Best' : 'Select'}
                      </Button>
                    </div>
                    <div className="flex items-start gap-2 mt-3 text-muted-foreground">
                      <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{hotel.address}</p>
                    </div>
                    {(hotel.contactNumber || hotel.rating) && (
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {hotel.contactNumber && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Contact:</span>
                            <span>{hotel.contactNumber}</span>
                          </span>
                        )}
                        {hotel.rating !== undefined && hotel.rating !== null && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Rating:</span>
                            <span className="flex items-center gap-1 text-warning">
                              <span>★</span>
                              <span className="text-foreground">{parseFloat(String(hotel.rating)).toFixed(1)}</span>
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
              <p className="text-muted-foreground mb-4">No hotels found. Try searching again with different criteria.</p>
              <Button onClick={handleSearchAgain} disabled={loading} variant="outline">
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                Search Again
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 bg-muted rounded-b-xl">
          <p className="text-xs text-muted-foreground text-center">
            Hotel suggestions are powered by AI and may vary. Please verify details before booking.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HotelSuggestionsModal;

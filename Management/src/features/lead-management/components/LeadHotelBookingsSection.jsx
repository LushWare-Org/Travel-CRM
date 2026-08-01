import { useState, useEffect } from 'react';
import { Building2, Plus, Loader2, Ban, AlertCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import HotelService from '../../../services/hotel.service';
import { HotelSelectionModal } from '../../shared';
import { deriveItemState, ITEM_STATE_LABELS, ITEM_STATE_COLORS } from '../utils/bookingState';

function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(amount, currency) {
  if (amount == null) return '-';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount);
}

export default function LeadHotelBookingsSection({
  leadId,
  leadStatus,
  itineraryDays = [],
  travelDate,
  endDate,
  onUpdateDay,
}) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showHotelModal, setShowHotelModal] = useState(false);
  const [hotelModalDay, setHotelModalDay] = useState(null);
  const [expanded, setExpanded] = useState(true);

  const fetchBookings = async () => {
    if (!leadId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await HotelService.getByLead(leadId);
      setBookings(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) fetchBookings();
  }, [leadId]);

  const handleCancelBooking = async (bookingId, reason) => {
    try {
      await HotelService.cancelBooking(bookingId, reason || 'Cancelled by agent');
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (err) {
      toast.error(err.message || 'Cancel failed');
    }
  };

  const handleBookHotel = (bookingData) => {
    const dayNumber = hotelModalDay;
    if (dayNumber && onUpdateDay) {
      const day = itineraryDays.find(d => d.dayNumber === dayNumber);
      onUpdateDay(dayNumber, {
        accommodation: {
          ...(day?.accommodation || {}),
          bookingIds: [...((day?.accommodation?.bookingIds) || []), bookingData.id],
          checkin: bookingData.checkin,
          checkout: bookingData.checkout,
          totalAmount: bookingData.totalAmount,
          currency: bookingData.currency,
        },
      });
    }
    fetchBookings();
  };

  // Days with accommodation data (hotelId set)
  const hotelDays = itineraryDays.filter(d => d.accommodation?.name);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading hotel bookings...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg"
      >
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          <span className="font-semibold">Hotel Bookings</span>
          {bookings.length > 0 && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{bookings.length}</span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {!expanded && null}

      {expanded && (
        <div className="space-y-4 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
              <button onClick={fetchBookings} className="ml-auto text-red-600 font-medium hover:underline">Retry</button>
            </div>
          )}

          {hotelDays.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Itinerary Hotels</div>
              {hotelDays.map(day => {
                const dayBooking = bookings.find(b => b.dayNumber === day.dayNumber);
                const booked = !!dayBooking && dayBooking.status !== 'cancelled' && dayBooking.status !== 'failed';
                const failed = !!dayBooking && dayBooking.status === 'failed';
                const itemState = deriveItemState(leadStatus, booked, failed);
                const stateLabel = ITEM_STATE_LABELS[itemState];
                const stateColor = ITEM_STATE_COLORS[itemState];
                return (
                  <div key={day.dayNumber} className="bg-white rounded-xl border border-gray-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-700">Day {day.dayNumber}</span>
                        <span className="text-sm text-gray-600">{day.accommodation?.name}</span>
                        <span className={`px-1.5 py-0.5 text-xs rounded-full border ${stateColor}`}>
                          {stateLabel}
                        </span>
                      </div>
                      {itemState === 'PENDING' ? (
                        <button
                          type="button"
                          disabled
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-300 text-gray-500 text-xs rounded-lg cursor-not-allowed"
                        >
                          <Building2 className="w-3.5 h-3.5" /> Select Hotel
                        </button>
                      ) : itemState === 'READY_TO_BOOK' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setHotelModalDay(day.dayNumber);
                            setShowHotelModal(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Book Now
                        </button>
                      ) : itemState === 'BOOKED' ? (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {dayBooking.pnrCode && (
                            <span className="font-mono font-medium text-gray-900">{dayBooking.pnrCode}</span>
                          )}
                          <span className="capitalize">{dayBooking.status}</span>
                          {dayBooking.supplierPortalUrl && (
                            <a href={dayBooking.supplierPortalUrl} target="_blank" rel="noopener noreferrer"
                               className="flex items-center gap-1 text-blue-600 hover:text-blue-700">
                              <ExternalLink className="w-3 h-3" /> Portal
                            </a>
                          )}
                          {dayBooking.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => {
                                const reason = prompt('Reason for cancellation:');
                                if (reason !== null) handleCancelBooking(dayBooking.id, reason);
                              }}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700"
                            >
                              <Ban className="w-3 h-3" /> Cancel
                            </button>
                          )}
                        </div>
                      ) : itemState === 'FAILED' && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600 font-medium">Booking failed</span>
                          <button
                            type="button"
                            onClick={() => {
                              setHotelModalDay(day.dayNumber);
                              setShowHotelModal(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <AlertCircle className="w-3.5 h-3.5" /> Resolve
                          </button>
                        </div>
                      )}
                    </div>
                    {day.accommodation?.address && (
                      <div className="mt-1 text-xs text-gray-500">{day.accommodation.address}</div>
                    )}
                    {booked && (
                      <div className="mt-1 text-xs text-gray-400">
                        {fmtDate(dayBooking.checkin)} → {fmtDate(dayBooking.checkout)}{' · '}
                        {fmtMoney(dayBooking.totalAmount, dayBooking.currency)}
                      </div>
                    )}
                    {failed && (
                      <div className="mt-1 text-xs text-red-600">
                        Booking attempt failed — manual intervention required.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hotels in this itinerary</p>
              <p className="text-xs mt-1">Use the itinerary editor to search and select hotels</p>
            </div>
          )}
        </div>
      )}

      {/* Hotel Booking Modal */}
      {showHotelModal && (
        <HotelSelectionModal
          isOpen={showHotelModal}
          onClose={() => { setShowHotelModal(false); setHotelModalDay(null); }}
          mode="search"
          initialCheckin={travelDate ? itineraryDays.find(d => d.dayNumber === hotelModalDay)?.accommodation?.checkin || travelDate : undefined}
          initialCheckout={endDate || undefined}
          travelers={1}
          leadContext={leadId ? { leadId, dayNumber: hotelModalDay } : {}}
          onBookHotel={handleBookHotel}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Plane, Plus, Loader2, Ban, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { flightAPI } from '../../../services/flight.service';
import { FlightSelectionModal } from '../../shared';

function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(amount, currency) {
  if (amount == null) return '-';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount);
}

export default function LeadFlightBookingsSection({
  leadId,
  itineraryDays = [],
  travelDate,
  onUpdateDay,
}) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Flight modal state
  const [showFlightModal, setShowFlightModal] = useState(false);
  const [flightModalDay, setFlightModalDay] = useState(null);
  const [flightModalType, setFlightModalType] = useState('itinerary'); // 'itinerary' | 'optional'
  const [flightModalPrefill, setFlightModalPrefill] = useState({});
  const [expanded, setExpanded] = useState(true);

  const leadContext = leadId ? {
    leadId,
    flightType: flightModalType,
    dayNumber: flightModalDay,
  } : {};

  const fetchBookings = async () => {
    if (!leadId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await flightAPI.getByLead(leadId);
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
      await flightAPI.cancelBooking(bookingId, reason || 'Cancelled by agent');
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (err) {
      toast.error(err.message || 'Cancel failed');
    }
  };

  const handleBookFlight = (bookingData) => {
    const dayNumber = flightModalDay;
    if (dayNumber && onUpdateDay) {
      const bookingSeg = bookingData.segments?.[0] || {};
      onUpdateDay(dayNumber, {
        flight: {
          ...(itineraryDays.find(d => d.dayNumber === dayNumber)?.flight || {}),
          flightBookingId: bookingData.id,
          bookingReference: bookingData.pnr,
          flightNumber: bookingSeg.flightNumber,
          carrierName: bookingSeg.marketingCarrier,
          departureDateTime: bookingSeg.departureAt,
          arrivalDateTime: bookingSeg.arrivalAt,
          totalAmount: bookingData.totalAmount,
          currency: bookingData.currency,
          status: bookingData.status,
        },
      });
    }
    fetchBookings();
  };

  // Days that have flight transport
  const flightDays = itineraryDays.filter(d => d.transport === 'flight');
  const optionalFlights = bookings.filter(b => b.flightType === 'optional');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading flight bookings...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg"
      >
        <div className="flex items-center gap-2">
          <Plane className="w-5 h-5" />
          <span className="font-semibold">Flight Bookings</span>
          {bookings.length > 0 && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{bookings.length}</span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {!expanded && null}

      {expanded && (
        <div className="space-y-4 p-4 bg-sky-50/50 rounded-2xl border border-sky-100">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
              <button onClick={fetchBookings} className="ml-auto text-red-600 font-medium hover:underline">Retry</button>
            </div>
          )}

          {/* Itinerary flight days */}
          {flightDays.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Itinerary Flights</div>
              <div className="space-y-2">
                {flightDays.map(day => {
                  const dayBooking = bookings.find(b => b.dayNumber === day.dayNumber && b.flightType === 'itinerary');
                  const booked = !!dayBooking;
                  return (
                    <div key={day.dayNumber} className="bg-white rounded-xl border border-gray-200 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold text-gray-700">Day {day.dayNumber}</span>
                          {day.flight?.origin && (
                            <span className="ml-2 text-sm text-gray-600">
                              {day.flight.origin} → {day.flight.destination}
                            </span>
                          )}
                          {booked && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700">
                              Booked
                            </span>
                          )}
                        </div>
                        {!booked ? (
                          <button
                            type="button"
                            onClick={() => {
                              setFlightModalDay(day.dayNumber);
                              setFlightModalType('itinerary');
                              setFlightModalPrefill(day.flight || { origin: '', destination: '' });
                              setShowFlightModal(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" /> Book Now
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="font-mono font-medium text-gray-900">{dayBooking.pnr || '-'}</span>
                            <span className="capitalize">{dayBooking.status}</span>
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
                        )}
                      </div>
                      {booked && (
                        <div className="mt-1 text-xs text-gray-500">
                          {dayBooking.segments?.map((s, i) => (
                            <span key={i}>{s.origin} → {s.destination} on {fmtDate(s.departureAt)}{i < (dayBooking.segments?.length || 1) - 1 ? ' · ' : ''}</span>
                          ))}
                          {' · '}{fmtMoney(dayBooking.totalAmount, dayBooking.currency)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {flightDays.length === 0 && (
            <div className="text-center py-6 text-gray-400">
              <Plane className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No flights in this itinerary</p>
              <p className="text-xs mt-1">Set transport to "flight" on an itinerary day to book flights</p>
            </div>
          )}

          {/* Optional Flights */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2 mt-4">Optional Transfer Flights</div>
            <div className="space-y-2">
              {optionalFlights.length > 0 && optionalFlights.map(b => (
                <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        {b.segments?.[0]?.origin} → {b.segments?.[b.segments?.length - 1]?.destination}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{b.flightType?.replace('-', ' ')}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${b.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-medium text-gray-900">{b.pnr || '-'}</span>
                      {b.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => {
                            const reason = prompt('Reason for cancellation:');
                            if (reason !== null) handleCancelBooking(b.id, reason);
                          }}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        >
                          <Ban className="w-3 h-3" /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => {
                  setFlightModalDay(null);
                  setFlightModalType('to-start');
                  setFlightModalPrefill({});
                  setShowFlightModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Flight to Start
              </button>
              <button
                type="button"
                onClick={() => {
                  setFlightModalDay(null);
                  setFlightModalType('return-home');
                  setFlightModalPrefill({});
                  setShowFlightModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Return Flight Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flight Booking Modal */}
      <FlightSelectionModal
        isOpen={showFlightModal}
        onClose={() => { setShowFlightModal(false); setFlightModalDay(null); }}
        mode="booking"
        initialData={flightModalPrefill}
        travelDate={travelDate || undefined}
        leadContext={leadContext}
        onBookFlight={handleBookFlight}
      />
    </div>
  );
}

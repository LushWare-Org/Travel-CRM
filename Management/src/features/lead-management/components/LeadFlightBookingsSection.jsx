import { useState, useEffect } from 'react';
import { Plane, Loader2, Ban, AlertCircle, ChevronDown, ChevronUp, Settings2, Pencil, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { OPTIONAL_FLIGHT_TYPE } from '@travel-crm/constants';
import { flightAPI } from '../../../services/flight.service';
import { leadAPI } from '../../../services/api';
import { FlightSelectionModal, FlightPreferenceCard } from '../../shared';
import { getOutboundModalDefaults } from '../../shared/utils/flightLegDefaults';
import { deriveItemState, ITEM_STATE_LABELS, ITEM_STATE_COLORS } from '../utils/bookingState';

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
  selectionId,
  leadStatus,
  itineraryDays = [],
  travelDate,
  onUpdateDay,
  onFlightsChanged,
}) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Optional transfer flights (LeadOptionalFlight rows — separate from the
  // itinerary-day bookings above, which come from flight-service instead).
  const [optionalFlights, setOptionalFlights] = useState([]);

  // Flight modal state
  const [showFlightModal, setShowFlightModal] = useState(false);
  const [flightModalDay, setFlightModalDay] = useState(null);
  const [flightModalType, setFlightModalType] = useState('itinerary'); // 'itinerary' | 'to-start' | 'return-home'
  const [flightModalPrefill, setFlightModalPrefill] = useState({});
  const [expanded, setExpanded] = useState(true);

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

  const fetchOptionalFlights = async () => {
    if (!leadId || !selectionId) return;
    try {
      const res = await leadAPI.getSelectionFlights(leadId, selectionId);
      setOptionalFlights(res.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load transfer flights');
    }
  };

  useEffect(() => {
    if (leadId) {
      fetchBookings();
      fetchOptionalFlights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, selectionId]);

  const handleCancelBooking = async (bookingId, reason) => {
    try {
      await flightAPI.cancelBooking(bookingId, reason || 'Cancelled by agent');
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (err) {
      toast.error(err.message || 'Cancel failed');
    }
  };

  const flightModalTypeToOptionalFlightType = {
    'to-start': OPTIONAL_FLIGHT_TYPE.TO_START,
    'return-home': OPTIONAL_FLIGHT_TYPE.RETURN_HOME,
  };

  const handleFlightTemplate = async (prefs) => {
    const dayNumber = flightModalDay;
    if (dayNumber && onUpdateDay) {
      // Itinerary day flight — save preferences into the day's flights[].
      // Merge into the first flight if one exists, otherwise append a new one
      // with the editor's flight shape (id + totalAmount).
      const day = itineraryDays.find(d => d.dayNumber === dayNumber);
      const flights = Array.isArray(day?.flights) ? day.flights : [];
      const prefsPatch = {
        origin: prefs.origin,
        destination: prefs.destination,
        cabinClass: prefs.cabinClass,
        departureTime: prefs.departureTime,
        airlinePreference: prefs.airlinePreference,
        totalAmount: Number(prefs.estimatedUnitPrice) || 0,
      };
      onUpdateDay(dayNumber, {
        flights: flights.length > 0
          ? flights.map((f, i) => (i === 0 ? { ...f, ...prefsPatch } : f))
          : [{
              ...prefsPatch,
              id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : `flight-${Date.now()}`,
            }],
      });
      toast.success(`Flight preferences saved for Day ${dayNumber}`);
      fetchBookings();
      return;
    }

    // Optional transfer flight (to-start / return-home) — persisted as a
    // LeadOptionalFlight row. Backend has no update endpoint for a single
    // flight, so editing an existing direction deletes the old row first.
    const flightType = flightModalTypeToOptionalFlightType[flightModalType];
    if (!flightType || !leadId || !selectionId) return;

    try {
      const existing = optionalFlights.find(f => f.flightType === flightType);
      if (existing) {
        await leadAPI.deleteSelectionFlight(leadId, selectionId, existing.id);
      }
      await leadAPI.addSelectionFlight(leadId, selectionId, {
        flightType,
        origin: prefs.origin || undefined,
        destination: prefs.destination || undefined,
        cabinClass: prefs.cabinClass || undefined,
        departureTime: prefs.departureTime || undefined,
        airlinePreference: prefs.airlinePreference || undefined,
        estimatedUnitPrice: Number(prefs.estimatedUnitPrice) || 0,
      });
      toast.success('Flight preferences saved');
      await fetchOptionalFlights();
      onFlightsChanged?.();
    } catch (err) {
      toast.error(err.message || 'Failed to save flight preferences');
    }
  };

  const handleDeleteOptionalFlight = async (flightId) => {
    if (!leadId || !selectionId) return;
    try {
      await leadAPI.deleteSelectionFlight(leadId, selectionId, flightId);
      toast.success('Flight removed');
      fetchOptionalFlights();
      onFlightsChanged?.();
    } catch (err) {
      toast.error(err.message || 'Failed to remove flight');
    }
  };

  // Days that have flights selected in the editor
  const flightDays = itineraryDays.filter(d => Array.isArray(d.flights) && d.flights.length > 0);
  const toStartFlight = optionalFlights.find(f => f.flightType === OPTIONAL_FLIGHT_TYPE.TO_START);
  const returnHomeFlight = optionalFlights.find(f => f.flightType === OPTIONAL_FLIGHT_TYPE.RETURN_HOME);

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
                  const booked = !!dayBooking && dayBooking.status !== 'cancelled' && dayBooking.status !== 'failed';
                  const failed = !!dayBooking && dayBooking.status === 'failed';
                  const firstFlight = Array.isArray(day.flights) ? day.flights[0] : null;
                  const hasPrefs = !booked && !failed && firstFlight?.origin;
                  const itemState = deriveItemState(leadStatus, booked, failed);
                  const stateLabel = ITEM_STATE_LABELS[itemState];
                  const stateColor = ITEM_STATE_COLORS[itemState];
                  return (
                    <div key={day.dayNumber} className="bg-white rounded-xl border border-gray-200 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-700">Day {day.dayNumber}</span>
                          {(booked || hasPrefs) && (
                            <span className="text-sm text-gray-600">
                              {(dayBooking?.segments?.[0]?.origin || firstFlight?.origin)} → {(dayBooking?.segments?.[dayBooking?.segments?.length - 1]?.destination || firstFlight?.destination)}
                            </span>
                          )}
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
                            <Settings2 className="w-3.5 h-3.5" /> Set Preferences
                          </button>
                        ) : itemState === 'READY_TO_BOOK' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setFlightModalDay(day.dayNumber);
                              setFlightModalType('itinerary');
                              setFlightModalPrefill(firstFlight
                                ? { ...firstFlight, estimatedUnitPrice: firstFlight.totalAmount }
                                : { origin: '', destination: '' });
                              setShowFlightModal(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            {hasPrefs ? <Pencil className="w-3.5 h-3.5" /> : <Settings2 className="w-3.5 h-3.5" />}
                            {hasPrefs ? 'Edit' : 'Book Flight'}
                          </button>
                        ) : itemState === 'BOOKED' ? (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="font-mono font-medium text-gray-900">{dayBooking.pnr || '-'}</span>
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
                                setFlightModalDay(day.dayNumber);
                                setFlightModalType('itinerary');
                                setFlightModalPrefill(firstFlight
                                ? { ...firstFlight, estimatedUnitPrice: firstFlight.totalAmount }
                                : { origin: '', destination: '' });
                                setShowFlightModal(true);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <AlertCircle className="w-3.5 h-3.5" /> Resolve
                            </button>
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
                      {failed && (
                        <div className="mt-1 text-xs text-red-600">
                          Booking attempt failed — manual intervention required. Check with supplier or search for alternatives.
                        </div>
                      )}
                      {hasPrefs && (
                        <div className="mt-1 text-xs text-gray-500">
                          {firstFlight.cabinClass || 'Economy'}
                          {firstFlight.airlinePreference ? ` · ${firstFlight.airlinePreference}` : ''}
                          {firstFlight.departureTime ? ` · ${firstFlight.departureTime}` : ''}
                          {' · '}
                          {Number(firstFlight.totalAmount) > 0
                            ? `$${Number(firstFlight.totalAmount).toFixed(2)} per person`
                            : <span className="text-amber-600">no cost set — $0 in pricing</span>}
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
              <p className="text-xs mt-1">Add a flight in the day's Flight Booking section to set preferences</p>
            </div>
          )}

          {/* Optional Flights — inline slots: a filled card, or an add-placeholder in its place */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2 mt-4">Optional Transfer Flights</div>
            <div className="space-y-3">
              <div>
                <h5 className="text-xs font-medium text-gray-600 mb-1.5">To Start</h5>
                {toStartFlight ? (
                  <FlightPreferenceCard
                    prefs={toStartFlight}
                    onEdit={() => {
                      setFlightModalDay(null);
                      setFlightModalType('to-start');
                      setFlightModalPrefill(toStartFlight);
                      setShowFlightModal(true);
                    }}
                    onRemove={() => handleDeleteOptionalFlight(toStartFlight.id)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setFlightModalDay(null);
                      setFlightModalType('to-start');
                      setFlightModalPrefill({});
                      setShowFlightModal(true);
                    }}
                    className="w-full py-3 border-2 border-dashed border-sky-300 text-sky-700 rounded-xl hover:bg-sky-50 hover:border-sky-400 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                  >
                    <Settings2 className="w-4 h-4" />
                    Add Flight Preferences to Start
                  </button>
                )}
              </div>

              <div>
                <h5 className="text-xs font-medium text-gray-600 mb-1.5">Return Home</h5>
                {returnHomeFlight ? (
                  <FlightPreferenceCard
                    prefs={returnHomeFlight}
                    onEdit={() => {
                      setFlightModalDay(null);
                      setFlightModalType('return-home');
                      setFlightModalPrefill(returnHomeFlight);
                      setShowFlightModal(true);
                    }}
                    onRemove={() => handleDeleteOptionalFlight(returnHomeFlight.id)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setFlightModalDay(null);
                      setFlightModalType('return-home');
                      setFlightModalPrefill(getOutboundModalDefaults(toStartFlight, returnHomeFlight));
                      setShowFlightModal(true);
                    }}
                    className="w-full py-3 border-2 border-dashed border-sky-300 text-sky-700 rounded-xl hover:bg-sky-50 hover:border-sky-400 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                  >
                    <Settings2 className="w-4 h-4" />
                    Add Return Flight Preferences
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flight Preference Modal (template mode — saves preferences only, no booking) */}
      <FlightSelectionModal
        isOpen={showFlightModal}
        onClose={() => { setShowFlightModal(false); setFlightModalDay(null); }}
        mode="template"
        initialData={flightModalPrefill}
        onSelectTemplate={handleFlightTemplate}
      />
    </div>
  );
}

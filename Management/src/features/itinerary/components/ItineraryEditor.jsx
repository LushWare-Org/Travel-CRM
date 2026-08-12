/**
 * Itinerary Editor Component - Redesigned
 * Modern card-based day editor with premium styling
 * Aligned with backend day-based structure
 */

import {
  Trash2, Plus, Upload, X, Search, Loader,
  MapPin, Activity, Utensils, Car, Building2,
  StickyNote, Image as ImageIcon, ChevronDown, ChevronUp,
  Coffee, UtensilsCrossed, Moon, Check, Star, Phone, Bed,
  Receipt, Plane,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { uploadItineraryImages } from '../../../services/cloudinaryService';
import Swal from 'sweetalert2';
import ActivitySelector from './ActivitySelector';
import LocationSelector from './LocationSelector';
import TransportRowEditor from './form/TransportRowEditor';
import { FlightSelectionModal, HotelSelectionModal } from '../../shared';
import {
  calculateMealCosts,
  calculateActivityCosts,
  calculateTransportCosts,
  DEFAULTS,
} from '@travel-crm/pricing-engine';
import {
  getMealCounts,
  getDayActivities,
  getDayTransports,
  getTransportRowCost,
  getAccommodationTotal,
} from '../utils/helpers';
import {
  resolveFlightAdd,
  resolveFlightEdit,
  resolveFlightRemove,
  countUnlinkedFlightRows,
} from '../utils/flightSync';
import { createDefaultTransportRow } from '@travel-crm/constants';
import { formatCurrency } from '../../../utils/currency.js';

// ═══════════════════════════════════════════════════════════════════
//  Hotel Stay Card — shown when a hotel is selected from the API
// ═══════════════════════════════════════════════════════════════════
function HotelStayCard({ accommodation, onSearch, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const acc = accommodation || {};

  function fmtMoney(amount, currency) {
    if (amount == null) return null;
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount);
  }

  const priceStr = fmtMoney(acc.totalAmount, acc.currency);

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        {/* Image */}
        <div className="w-full sm:w-40 h-32 rounded-lg overflow-hidden bg-gray-100 shrink-0">
          {acc.hotelImage ? (
            <img src={acc.hotelImage} alt={acc.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-10 h-10 text-gray-300" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-bold text-gray-900">{acc.name}</h4>

          {/* Stars */}
          <div className="flex items-center gap-0.5 mt-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${acc.rating != null && i < Math.round(Number(acc.rating)) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
              />
            ))}
            {acc.rating != null && acc.rating > 0 && (
              <span className="ml-1 text-xs text-gray-500">{Number(acc.rating).toFixed(1)}</span>
            )}
            {(!acc.rating || acc.rating === 0) && (
              <span className="ml-1 text-xs text-gray-400">—</span>
            )}
          </div>

          {/* Address */}
          {acc.address && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1.5">
              <MapPin className="w-3 h-3 shrink-0" /> {acc.address}
            </p>
          )}

          {/* Badges row */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {acc.roomType && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                <Bed className="w-3 h-3" /> {acc.roomType}
              </span>
            )}
            {acc.boardType && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
                {acc.boardType}
              </span>
            )}
            {acc.refundable && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                Refundable
              </span>
            )}
            {priceStr && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold">
                {priceStr}{acc.cheapestRate ? '' : '/night'}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex sm:flex-col gap-2 shrink-0 items-end">
          <button
            type="button"
            onClick={onSearch}
            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            Change
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-t border-gray-100 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? 'Less details' : 'More details'}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 text-xs text-gray-600">
          {acc.contactNumber && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>{acc.contactNumber}</span>
            </div>
          )}
          {acc.address && (
            <div className="flex items-center gap-1.5 sm:col-span-2">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>{acc.address}</span>
            </div>
          )}
          {priceStr && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 shrink-0">Price:</span>
              <span className="font-semibold text-gray-800">{priceStr}</span>
            </div>
          )}
          {acc.type && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="capitalize">{acc.type}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 sm:col-span-2">
            <span className="text-gray-400 shrink-0">Hotel ID:</span>
            <span className="font-mono text-gray-400">{acc.hotelId || '—'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Best-effort flight price lookup across the shapes the flight modal and
 * loaded packages may produce (totalAmount / fareTotal / price).
 */
function getFlightPrice(flight) {
  if (!flight) return null;
  const value = flight.totalAmount ?? flight.fareTotal ?? flight.price;
  return value == null || value === '' ? null : Number(value);
}

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
  const [currentDayForHotel, setCurrentDayForHotel] = useState(null);
  const [currentDayLocations, setCurrentDayLocations] = useState([]);
  const [autoFillingHotel, setAutoFillingHotel] = useState(false);
  const [expandedDays, setExpandedDays] = useState(() => {
    // Initialize all days expanded synchronously — no post-mount flicker
    const init = {};
    days.forEach(day => { if (day && day.dayNumber != null) init[day.dayNumber] = true; });
    return init;
  });
  const [showFlightModal, setShowFlightModal] = useState(false);
  // { dayNumber, index } — index null means "add a new flight".
  const [flightModalTarget, setFlightModalTarget] = useState(null);
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [hotelModalMode, setHotelModalMode] = useState('suggest');
  const [highlightedFlightSection, setHighlightedFlightSection] = useState(null);
  // Cost subsections are collapsed by default — summary chips show totals.
  const [expandedCosts, setExpandedCosts] = useState({});

  const toggleCostsExpand = (dayNumber) => {
    setExpandedCosts(prev => ({ ...prev, [dayNumber]: !prev[dayNumber] }));
  };

  const handleMealToggle = (day, mealKey, checked) => {
    onDayChange(day.dayNumber, {
      meals: { ...(day.meals || {}), [mealKey]: checked },
      [`${mealKey}Count`]: checked ? 1 : 0,
    });
  };

  const handleMealCountChange = (day, field, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    onDayChange(day.dayNumber, {
      [field]: num,
      meals: { ...(day.meals || {}), [field.replace('Count', '')]: num > 0 },
    });
  };

  const handleActivityCostChange = (day, name, field, value) => {
    const activities = getDayActivities(day);
    const current = activities.find(a => a.name === name) || { name, defaultCost: 0, costOverride: null };
    const parsed = value === '' ? null : (parseFloat(value) || 0);
    onDayChange(day.dayNumber, {
      activityCosts: {
        ...(day.activityCosts || {}),
        [name]: {
          defaultCost: current.defaultCost,
          costOverride: field === 'costOverride' ? parsed : current.costOverride,
        },
      },
    });
  };

  const handleTransportCostChange = (day, index, patch) => {
    const current = getDayTransports(day);
    const rows = current.length > 0
      ? current
      : [createDefaultTransportRow()];
    onDayChange(day.dayNumber, {
      transports: rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  };

  const handleAddTransport = (day) => {
    const current = getDayTransports(day);
    onDayChange(day.dayNumber, {
      transports: [
        ...current,
        createDefaultTransportRow(),
      ],
    });
  };

  const handleRemoveTransport = (day, index) => {
    const current = getDayTransports(day);
    onDayChange(day.dayNumber, {
      transports: current.filter((_, i) => i !== index),
    });
  };

  const handleAddFlight = (day) => {
    setFlightModalTarget({ dayNumber: day.dayNumber, index: null });
    setShowFlightModal(true);
  };

  const handleEditFlight = (day, index) => {
    setFlightModalTarget({ dayNumber: day.dayNumber, index });
    setShowFlightModal(true);
  };

  const handleRemoveFlight = (day, index) => {
    const flights = Array.isArray(day.flights) ? day.flights : [];
    const removed = flights[index];
    if (!removed) return;
    onDayChange(day.dayNumber, resolveFlightRemove({
      flights,
      transports: getDayTransports(day),
      flightId: removed.id,
    }));
  };

  /**
   * A FLIGHT transport row exists without a linked flight — take the user to
   * the Flight Booking section so both stay in sync.
   */
  const handleJumpToFlightSection = (day) => {
    const section = document.getElementById(`day-${day.dayNumber}-flight-section`);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setHighlightedFlightSection(day.dayNumber);
    setTimeout(() => setHighlightedFlightSection(null), 1200);
    handleAddFlight(day);
  };

  const renderCostsSection = (day) => {
    const mealCounts = getMealCounts(day);
    const activityRows = getDayActivities(day);
    const transportRows = getDayTransports(day);
    const accommodationTotal = getAccommodationTotal(day);
    const isExpanded = Boolean(expandedCosts[day.dayNumber]);

    const mealTotal = calculateMealCosts([mealCounts], {
      mealCostPerPerson: DEFAULTS.mealCostPerPerson,
    }).total;
    const activityTotal = calculateActivityCosts(activityRows, { groupSize: 1 }).total;
    const transportTotal = calculateTransportCosts(transportRows, { groupSize: 1 }).total;
    const flightTotal = transportRows
      .filter((row) => row.transportMode === 'FLIGHT')
      .reduce((sum, row) => sum + getTransportRowCost(row, 1), 0);
    const unlinkedFlightCount = countUnlinkedFlightRows(transportRows);

    const chip = (label, value) => {
      const hasValue = Number(value) > 0;
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
            hasValue
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-slate-50 border-slate-200 text-slate-400'
          }`}
        >
          {label}: {hasValue ? formatCurrency(value) : '—'}
        </span>
      );
    };

    const mealUnitCost = mealCounts.mealPriceOverride ?? DEFAULTS.mealCostPerPerson;
    const mealCountSum = mealCounts.breakfastCount + mealCounts.lunchCount + mealCounts.dinnerCount;

    return (
      <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
        {/* Section header / chips row */}
        <button
          type="button"
          onClick={() => toggleCostsExpand(day.dayNumber)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white hover:from-emerald-100/70 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Receipt className="w-4 h-4 text-emerald-600" />
            Costs &amp; Pricing
            <span className="text-xs font-normal text-slate-400">
              ({isExpanded ? 'editing' : 'collapsed'})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1.5 justify-end">
              {chip('Meals', mealTotal)}
              {chip('Activities', activityTotal)}
              {chip('Transport', transportTotal)}
              {chip('Flight', flightTotal)}
              {chip('Hotel', accommodationTotal)}
            </div>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              {isExpanded ? <ChevronUp className="w-4 h-4 text-emerald-600" /> : <ChevronDown className="w-4 h-4 text-emerald-600" />}
            </div>
          </div>
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 pt-1 border-t border-emerald-100 space-y-4">
            {/* ── Meals ───────────────────────────────────────── */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                <Utensils className="w-3.5 h-3.5 text-emerald-500" /> Meals
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                {[
                  { key: 'breakfastCount', label: 'Breakfasts' },
                  { key: 'lunchCount', label: 'Lunches' },
                  { key: 'dinnerCount', label: 'Dinners' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs text-slate-500 mb-1">{field.label}</label>
                    <input
                      type="number" min="0"
                      value={mealCounts[field.key]}
                      onChange={(e) => handleMealCountChange(day, field.key, e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-slate-500 mb-1" title="Leaves blank to use the $15/person default">
                    Cost / meal
                  </label>
                  <input
                    type="number" min="0" step="0.01"
                    value={mealCounts.mealPriceOverride ?? ''}
                    placeholder="15"
                    onChange={(e) => onDayChange(day.dayNumber, {
                      mealPriceOverride: e.target.value === '' ? null : (parseFloat(e.target.value) || 0),
                    })}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {mealCountSum} meal{mealCountSum === 1 ? '' : 's'} × {formatCurrency(mealUnitCost)} ={' '}
                <span className="font-semibold text-emerald-700">{formatCurrency(mealTotal)}</span>
              </p>
            </div>

            {/* ── Activities ───────────────────────────────────── */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5 text-emerald-500" /> Activities
              </label>
              {activityRows.length === 0 ? (
                <p className="text-xs text-slate-400">No activities added to this day.</p>
              ) : (
                <div className="space-y-2">
                  {activityRows.map((activity) => {
                    const unit = activity.costOverride ?? activity.defaultCost ?? 0;
                    const total = unit;
                    return (
                      <div key={activity.name} className="flex flex-wrap items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2">
                        <span className="text-sm font-medium text-slate-700 flex-1 min-w-[120px]">{activity.name}</span>
                        <span className="text-xs text-slate-500">
                          Default: <span className="font-semibold text-slate-700">{formatCurrency(activity.defaultCost)}</span>
                        </span>
                        <label className="flex items-center gap-1.5 text-xs text-slate-500">
                          Override
                          <input
                            type="number" min="0" step="0.01"
                            value={activity.costOverride ?? ''}
                            placeholder={String(activity.defaultCost || 0)}
                            onChange={(e) => handleActivityCostChange(day, activity.name, 'costOverride', e.target.value)}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="w-24 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                          />
                        </label>
                        <span className="text-xs text-emerald-700 font-medium">
                          {formatCurrency(total)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Transport ────────────────────────────────────── */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                <Car className="w-3.5 h-3.5 text-emerald-500" /> Transport
              </label>
              {transportRows.length === 0 ? (
                <p className="text-xs text-slate-400">No transport configured for this day.</p>
              ) : (
                <div className="space-y-2">
                  {transportRows.map((row, i) => (
                    <TransportRowEditor
                      key={`${day.dayNumber}-transport-${i}`}
                      index={i}
                      transport={row}
                      onChange={(patch) => handleTransportCostChange(day, i, patch)}
                      onRemove={(idx) => handleRemoveTransport(day, idx)}
                    />
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => handleAddTransport(day)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Transport
                </button>
                <p className="text-xs text-slate-500">
                  Total = <span className="font-semibold text-emerald-700">{formatCurrency(transportTotal)}</span>
                </p>
              </div>
              {unlinkedFlightCount > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                  <Plane className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="flex-1 min-w-[160px]">
                    {unlinkedFlightCount === 1
                      ? 'A flight cost was added — add the flight details so pricing stays in sync.'
                      : `${unlinkedFlightCount} flight costs were added — add the flight details so pricing stays in sync.`}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleJumpToFlightSection(day)}
                    className="px-3 py-1.5 font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                  >
                    Add flight details
                  </button>
                </div>
              )}
            </div>

            {/* ── Accommodation ────────────────────────────────── */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-emerald-500" /> Accommodation
              </label>
              {day.accommodation?.name ? (
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm font-medium text-slate-700 flex-1 min-w-[120px]">{day.accommodation.name}</span>
                  <span className="text-xs text-slate-500">
                    Total: <span className="font-semibold text-slate-700">{formatCurrency(accommodationTotal)}</span>
                  </span>
                  {/* Tech debt: multi-day hotel stays are not yet supported. The
                      current implementation treats each day's accommodation as an
                      independent per-night booking. When multi-day stays are
                      implemented, the pricing engine should de-duplicate consecutive
                      nights at the same hotel. */}
                  <span className="text-xs text-slate-400" title="Each day books one per-night stay for now">
                    {formatCurrency(accommodationTotal)} / night
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Accommodation: —</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Ensure new days (added after initial render) are expanded
  useEffect(() => {
    const expanded = {};
    days.forEach(day => {
      if (day && day.dayNumber != null && expandedDays[day.dayNumber] === undefined) {
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
      const day = days.find(d => d && d.dayNumber === dayNumber);
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
    const day = days.find(d => d && d.dayNumber === dayNumber);
    const updatedImages = (day?.images || []).filter((_, idx) => idx !== imageIndex);
    onDayChange(dayNumber, { images: updatedImages });
  };

  const autoFillBestMatchHotel = async (dayNumber, dayLocations) => {
    if (!dayLocations || dayLocations.length === 0) return;
    if (!destination) return;

    try {
      setAutoFillingHotel(true);
      const { hotelAPI } = await import('../../../services/api');
      const locationsString = (Array.isArray(dayLocations) ? dayLocations : []).join(', ');

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
          const day = days.find(d => d && d.dayNumber === dayNumber);

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
      const dayLocations = day && Array.isArray(day.locations) ? day.locations : [];
      if (day && dayLocations.length > 0 && destination) {
        const hasAccommodation = day.accommodation?.name && day.accommodation?.address;

        if (!hasAccommodation && !autoFillingHotel) {
          const timeoutId = setTimeout(() => {
            autoFillBestMatchHotel(day.dayNumber, dayLocations);
          }, 1500);

          timeouts.push(timeoutId);
        }
      }
    });

    return () => {
      timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    };
  }, [days
    .filter(Boolean)
    .map(d => `${d.dayNumber}-${Array.isArray(d.locations) ? d.locations.join(',') : ''}`)
    .join('|'), destination, packageType, category]);

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
      {days.filter(Boolean).map((day, index) => (
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

              {/* Row 3: Meals */}
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
                        onChange={(e) => handleMealToggle(day, meal.key, e.target.checked)}
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

              {/* Flight Booking — standalone section */}
              <div
                id={`day-${day.dayNumber}-flight-section`}
                className={`bg-white rounded-xl border overflow-hidden transition-shadow ${
                  highlightedFlightSection === day.dayNumber
                    ? 'border-sky-400 ring-4 ring-sky-200'
                    : 'border-sky-200'
                }`}
              >
                <div className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-sky-50 to-white">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Plane className="w-4 h-4 text-sky-600" />
                    Flight Booking
                  </div>
                  <button
                    id={`day-${day.dayNumber}-add-flight`}
                    type="button"
                    onClick={() => handleAddFlight(day)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Flight
                  </button>
                </div>

                <div className="px-4 pb-4 pt-3 border-t border-sky-100 space-y-2">
                  {(Array.isArray(day.flights) ? day.flights : []).length === 0 ? (
                    <p className="text-xs text-slate-400">No flight selected</p>
                  ) : (
                    (day.flights || []).map((flight, index) => (
                      <div key={flight.id || index} className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <span className="text-sm font-medium text-blue-800">
                            {flight.origin ? `${flight.origin} → ${flight.destination}` : 'No flight selected'}
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditFlight(day, index)}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Edit Flight
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFlight(day, index)}
                              className="px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100 transition-colors"
                            >
                              Remove Flight
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-blue-700 space-y-0.5">
                          <p>Airline: {flight.airlinePreference || 'Any'} | Cabin: {flight.cabinClass || 'Economy'}</p>
                          {flight.departureTime && <p>Preferred: {flight.departureTime}</p>}
                          {getFlightPrice(flight) != null && (
                            <p>Price: {formatCurrency(getFlightPrice(flight))} (auto-added to transport)</p>
                          )}
                          {flight.flightNumber && (
                            <>
                              <p className="mt-1 font-medium text-green-700">Booked: {flight.flightNumber} ({flight.carrierName})</p>
                              <p>PNR: {flight.bookingReference} | Status: {flight.status}</p>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Row 4: Accommodation */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  Accommodation
                </label>

                {day.accommodation?.name ? (
                  /* ── Hotel Card (selected) ──────────────────── */
                  <HotelStayCard
                    accommodation={day.accommodation}
                    onSearch={() => {
                      setCurrentDayForHotel(day.dayNumber);
                      setCurrentDayLocations(day.locations || []);
                      setHotelModalMode('suggest');
                      setShowHotelModal(true);
                    }}
                    onRemove={() => {
                      onDayChange(day.dayNumber, {
                        accommodation: { name: '', type: '', rating: 0, address: '', contactNumber: '', hotelId: null, hotelImage: null, roomType: null, boardType: null, totalAmount: null, currency: null, refundable: null, bookingIds: [] },
                      });
                    }}
                  />
                ) : (
                  /* ── No hotel selected — search prompt ─────── */
                  <div className="text-center py-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 mb-3">No hotel selected for this day</p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentDayForHotel(day.dayNumber);
                          setCurrentDayLocations(day.locations || []);
                          setHotelModalMode('suggest');
                          setShowHotelModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
                      >
                        <Search className="w-4 h-4" />
                        Search Hotels
                      </button>
                      <span className="text-xs text-slate-400">or fill below</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 px-3">
                      <input
                        type="text"
                        value={day.accommodation?.name || ''}
                        onChange={(e) => onDayChange(day.dayNumber, { accommodation: { ...day.accommodation, name: e.target.value } })}
                        placeholder="Hotel name (manual)"
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                      <select
                        value={day.accommodation?.type || ''}
                        onChange={(e) => onDayChange(day.dayNumber, { accommodation: { ...day.accommodation, type: e.target.value } })}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      >
                        <option value="">Type</option>
                        <option value="hotel">Hotel</option>
                        <option value="resort">Resort</option>
                        <option value="guesthouse">Guesthouse</option>
                        <option value="homestay">Homestay</option>
                        <option value="camp">Camp</option>
                      </select>
                    </div>
                  </div>
                )}

                {autoFillingHotel && days.find(d => d && d.dayNumber === day.dayNumber)?.locations?.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                    <Loader className="w-3 h-3 animate-spin" />
                    <span>Finding best match...</span>
                  </div>
                )}
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

              {/* Row 6: Day Images — intentionally shown regardless of
                  hideTitleAndDescription (that flag only concerns the
                  title/description text fields above, not imagery). */}
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

              {/* Costs & Pricing — last section of the day card */}
              {renderCostsSection(day)}
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

      {/* Flight Selection Modal — template mode */}
      <FlightSelectionModal
        isOpen={showFlightModal}
        onClose={() => { setShowFlightModal(false); setFlightModalTarget(null); }}
        mode="template"
        initialData={flightModalTarget
          ? (days.find(d => d && d.dayNumber === flightModalTarget.dayNumber)?.flights || [])[flightModalTarget.index] || {}
          : {}}
        onSelectTemplate={(flightData) => {
          if (flightModalTarget) {
            const day = days.find(d => d && d.dayNumber === flightModalTarget.dayNumber);
            const result = flightModalTarget.index != null
              ? resolveFlightEdit({
                  flights: Array.isArray(day?.flights) ? day.flights : [],
                  transports: getDayTransports(day),
                  index: flightModalTarget.index,
                  patch: flightData,
                })
              : resolveFlightAdd({
                  flights: Array.isArray(day?.flights) ? day.flights : [],
                  transports: getDayTransports(day),
                  flightData,
                });
            onDayChange(flightModalTarget.dayNumber, result);
          }
          setShowFlightModal(false);
          setFlightModalTarget(null);
        }}
      />

      {/* Unified Hotel Selection Modal */}
      <HotelSelectionModal
        isOpen={showHotelModal}
        onClose={() => { setShowHotelModal(false); setCurrentDayForHotel(null); }}
        mode={hotelModalMode}
        destination={destination}
        packageType={packageType}
        category={category}
        locations={currentDayLocations}
        onSelectHotel={(hotel) => {
          if (currentDayForHotel) {
            const day = days.find(d => d && d.dayNumber === currentDayForHotel);
            onDayChange(currentDayForHotel, {
              accommodation: {
                name: hotel.name,
                address: hotel.address || '',
                contactNumber: hotel.contactNumber || '',
                rating: hotel.starRating ?? hotel.rating ?? (day?.accommodation?.rating || ''),
                type: day?.accommodation?.type || 'hotel',
                hotelId: hotel.hotelId || hotel.id || null,
                hotelImage: hotel.images?.[0] || hotel.hotelImage || null,
                roomType: hotel.cheapestRate?.roomType || hotel.roomType || null,
                boardType: hotel.cheapestRate?.boardType || hotel.boardType || null,
                totalAmount: hotel.cheapestRate?.totalAmount ?? hotel.totalAmount ?? null,
                currency: hotel.cheapestRate?.currency || hotel.currency || null,
                refundable: hotel.cheapestRate?.refundable ?? hotel.refundable ?? null,
              },
            });
          }
        }}
      />
    </div>
  );
};

export default ItineraryEditor;

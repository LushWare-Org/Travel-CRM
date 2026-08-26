/**
 * Itinerary Editor Component
 * Card-based day editor aligned with the backend day-based structure
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════
//  Hotel Stay Card — shown when a hotel is selected from the API
// ═══════════════════════════════════════════════════════════════════
function HotelStayCard({ accommodation, onSearch, onRemove }: { accommodation: any; onSearch: () => void; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const acc = accommodation || {};

  function fmtMoney(amount: number | null | undefined, currency?: string | null) {
    if (amount == null) return null;
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount);
  }

  const priceStr = fmtMoney(acc.totalAmount, acc.currency);

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        {/* Image */}
        <div className="w-full sm:w-40 h-32 rounded-lg overflow-hidden bg-muted shrink-0">
          {acc.hotelImage ? (
            <img src={acc.hotelImage} alt={acc.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-bold text-foreground">{acc.name}</h4>

          {/* Stars */}
          <div className="flex items-center gap-0.5 mt-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={cn('w-4 h-4', acc.rating != null && i < Math.round(Number(acc.rating)) ? 'fill-warning text-warning' : 'text-muted')}
              />
            ))}
            {acc.rating != null && acc.rating > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">{Number(acc.rating).toFixed(1)}</span>
            )}
            {(!acc.rating || acc.rating === 0) && (
              <span className="ml-1 text-xs text-muted-foreground">—</span>
            )}
          </div>

          {/* Address */}
          {acc.address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1.5">
              <MapPin className="w-3 h-3 shrink-0" /> {acc.address}
            </p>
          )}

          {/* Badges row */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {acc.roomType && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                <Bed className="w-3 h-3" /> {acc.roomType}
              </span>
            )}
            {acc.boardType && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                {acc.boardType}
              </span>
            )}
            {acc.refundable && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
                Refundable
              </span>
            )}
            {priceStr && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning font-semibold">
                {priceStr}{acc.cheapestRate ? '' : '/night'}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex sm:flex-col gap-2 shrink-0 items-end">
          <Button type="button" onClick={onSearch} variant="outline" size="sm">
            Change
          </Button>
          <Button type="button" onClick={onRemove} variant="destructive" size="sm">
            Remove
          </Button>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted border-t border-border transition-colors"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? 'Less details' : 'More details'}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 text-xs text-muted-foreground">
          {acc.contactNumber && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span>{acc.contactNumber}</span>
            </div>
          )}
          {acc.address && (
            <div className="flex items-center gap-1.5 sm:col-span-2">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{acc.address}</span>
            </div>
          )}
          {priceStr && (
            <div className="flex items-center gap-1.5">
              <span className="shrink-0">Price:</span>
              <span className="font-semibold text-foreground">{priceStr}</span>
            </div>
          )}
          {acc.type && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="capitalize">{acc.type}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 sm:col-span-2">
            <span className="shrink-0">Hotel ID:</span>
            <span className="font-mono">{acc.hotelId || '—'}</span>
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
function getFlightPrice(flight: any) {
  if (!flight) return null;
  const value = flight.totalAmount ?? flight.fareTotal ?? flight.price;
  return value == null || value === '' ? null : Number(value);
}

interface ItineraryEditorProps {
  days?: any[];
  onDayChange: (dayNumber: number, patch: any) => void;
  onAddDay: () => void;
  onRemoveDay: (dayNumber: number) => void;
  destination?: string;
  packageType?: string;
  category?: string;
  useLocationAutocomplete?: boolean;
  LocationAutocompleteComponent?: any;
  hideTitleAndDescription?: boolean;
  hideDescription?: boolean;
}

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', icon: Coffee },
  { key: 'lunch', label: 'Lunch', icon: UtensilsCrossed },
  { key: 'dinner', label: 'Dinner', icon: Moon },
] as const;

const ACCOMMODATION_TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  resort: 'Resort',
  guesthouse: 'Guesthouse',
  homestay: 'Homestay',
  camp: 'Camp',
};

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
}: ItineraryEditorProps) => {
  const [uploadingDayImages, setUploadingDayImages] = useState<Record<number, boolean>>({});
  const [currentDayForHotel, setCurrentDayForHotel] = useState<number | null>(null);
  const [currentDayLocations, setCurrentDayLocations] = useState<string[]>([]);
  const [autoFillingHotel, setAutoFillingHotel] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>(() => {
    // Initialize all days expanded synchronously — no post-mount flicker
    const init: Record<number, boolean> = {};
    days.forEach(day => { if (day && day.dayNumber != null) init[day.dayNumber] = true; });
    return init;
  });
  const [showFlightModal, setShowFlightModal] = useState(false);
  // { dayNumber, index } — index null means "add a new flight".
  const [flightModalTarget, setFlightModalTarget] = useState<{ dayNumber: number; index: number | null } | null>(null);
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [hotelModalMode, setHotelModalMode] = useState<'search' | 'suggest'>('suggest');
  const [highlightedFlightSection, setHighlightedFlightSection] = useState<number | null>(null);
  // Cost subsections are collapsed by default — summary chips show totals.
  const [expandedCosts, setExpandedCosts] = useState<Record<number, boolean>>({});

  const toggleCostsExpand = (dayNumber: number) => {
    setExpandedCosts(prev => ({ ...prev, [dayNumber]: !prev[dayNumber] }));
  };

  const handleMealToggle = (day: any, mealKey: string, checked: boolean) => {
    onDayChange(day.dayNumber, {
      meals: { ...(day.meals || {}), [mealKey]: checked },
      [`${mealKey}Count`]: checked ? 1 : 0,
    });
  };

  const handleMealCountChange = (day: any, field: string, value: string) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    onDayChange(day.dayNumber, {
      [field]: num,
      meals: { ...(day.meals || {}), [field.replace('Count', '')]: num > 0 },
    });
  };

  const handleActivityCostChange = (day: any, name: string, field: string, value: string) => {
    const activities = getDayActivities(day);
    const current = activities.find((a: any) => a.name === name) || { name, defaultCost: 0, costOverride: null };
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

  const handleTransportCostChange = (day: any, index: number, patch: any) => {
    const current = getDayTransports(day);
    const rows = current.length > 0
      ? current
      : [createDefaultTransportRow()];
    onDayChange(day.dayNumber, {
      transports: rows.map((row: any, i: number) => (i === index ? { ...row, ...patch } : row)),
    });
  };

  const handleAddTransport = (day: any) => {
    const current = getDayTransports(day);
    onDayChange(day.dayNumber, {
      transports: [
        ...current,
        createDefaultTransportRow(),
      ],
    });
  };

  const handleRemoveTransport = (day: any, index: number) => {
    const current = getDayTransports(day);
    onDayChange(day.dayNumber, {
      transports: current.filter((_: any, i: number) => i !== index),
    });
  };

  const handleAddFlight = (day: any) => {
    setFlightModalTarget({ dayNumber: day.dayNumber, index: null });
    setShowFlightModal(true);
  };

  const handleEditFlight = (day: any, index: number) => {
    setFlightModalTarget({ dayNumber: day.dayNumber, index });
    setShowFlightModal(true);
  };

  const handleRemoveFlight = (day: any, index: number) => {
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
  const handleJumpToFlightSection = (day: any) => {
    const section = document.getElementById(`day-${day.dayNumber}-flight-section`);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setHighlightedFlightSection(day.dayNumber);
    setTimeout(() => setHighlightedFlightSection(null), 1200);
    handleAddFlight(day);
  };

  const renderCostsSection = (day: any) => {
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
      .filter((row: any) => row.transportMode === 'FLIGHT')
      .reduce((sum: number, row: any) => sum + getTransportRowCost(row, 1), 0);
    const unlinkedFlightCount = countUnlinkedFlightRows(transportRows);

    const chip = (label: string, value: number) => {
      const hasValue = Number(value) > 0;
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border',
            hasValue
              ? 'bg-success/10 border-success/20 text-success'
              : 'bg-muted border-border text-muted-foreground'
          )}
        >
          {label}: {hasValue ? formatCurrency(value) : '—'}
        </span>
      );
    };

    const mealUnitCost = mealCounts.mealPriceOverride ?? DEFAULTS.mealCostPerPerson;
    const mealCountSum = mealCounts.breakfastCount + mealCounts.lunchCount + mealCounts.dinnerCount;

    return (
      <div className="bg-card rounded-lg border border-success/20 overflow-hidden">
        {/* Section header / chips row */}
        <button
          type="button"
          onClick={() => toggleCostsExpand(day.dayNumber)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-success/5 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Receipt className="w-4 h-4 text-success" />
            Costs &amp; Pricing
            <span className="text-xs font-normal text-muted-foreground">
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
            <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
              {isExpanded ? <ChevronUp className="w-4 h-4 text-success" /> : <ChevronDown className="w-4 h-4 text-success" />}
            </div>
          </div>
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 pt-1 border-t border-success/10 space-y-4">
            {/* ── Meals ───────────────────────────────────────── */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">
                <Utensils className="w-3.5 h-3.5 text-success" /> Meals
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                {[
                  { key: 'breakfastCount', label: 'Breakfasts' },
                  { key: 'lunchCount', label: 'Lunches' },
                  { key: 'dinnerCount', label: 'Dinners' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs text-muted-foreground mb-1">{field.label}</label>
                    <Input
                      type="number" min="0"
                      value={mealCounts[field.key as keyof typeof mealCounts]}
                      onChange={(e) => handleMealCountChange(day, field.key, e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1" title="Leaves blank to use the $15/person default">
                    Cost / meal
                  </label>
                  <Input
                    type="number" min="0" step="0.01"
                    value={mealCounts.mealPriceOverride ?? ''}
                    placeholder="15"
                    onChange={(e) => onDayChange(day.dayNumber, {
                      mealPriceOverride: e.target.value === '' ? null : (parseFloat(e.target.value) || 0),
                    })}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {mealCountSum} meal{mealCountSum === 1 ? '' : 's'} × {formatCurrency(mealUnitCost)} ={' '}
                <span className="font-semibold text-success">{formatCurrency(mealTotal)}</span>
              </p>
            </div>

            {/* ── Activities ───────────────────────────────────── */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5 text-success" /> Activities
              </label>
              {activityRows.length === 0 ? (
                <p className="text-xs text-muted-foreground">No activities added to this day.</p>
              ) : (
                <div className="space-y-2">
                  {activityRows.map((activity: any) => {
                    const unit = activity.costOverride ?? activity.defaultCost ?? 0;
                    const total = unit;
                    return (
                      <div key={activity.name} className="flex flex-wrap items-center gap-2 bg-muted rounded-lg border border-border px-3 py-2">
                        <span className="text-sm font-medium text-foreground flex-1 min-w-[120px]">{activity.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Default: <span className="font-semibold text-foreground">{formatCurrency(activity.defaultCost)}</span>
                        </span>
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          Override
                          <Input
                            type="number" min="0" step="0.01"
                            value={activity.costOverride ?? ''}
                            placeholder={String(activity.defaultCost || 0)}
                            onChange={(e) => handleActivityCostChange(day, activity.name, 'costOverride', e.target.value)}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="w-24"
                          />
                        </label>
                        <span className="text-xs text-success font-medium">
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
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">
                <Car className="w-3.5 h-3.5 text-success" /> Transport
              </label>
              {transportRows.length === 0 ? (
                <p className="text-xs text-muted-foreground">No transport configured for this day.</p>
              ) : (
                <div className="space-y-2">
                  {transportRows.map((row: any, i: number) => (
                    <TransportRowEditor
                      key={`${day.dayNumber}-transport-${i}`}
                      index={i}
                      transport={row}
                      onChange={(patch: any) => handleTransportCostChange(day, i, patch)}
                      onRemove={(idx: number) => handleRemoveTransport(day, idx)}
                    />
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <Button type="button" onClick={() => handleAddTransport(day)} variant="outline" size="sm" className="border-success/30 text-success hover:bg-success/10">
                  <Plus className="w-3.5 h-3.5" /> Add Transport
                </Button>
                <p className="text-xs text-muted-foreground">
                  Total = <span className="font-semibold text-success">{formatCurrency(transportTotal)}</span>
                </p>
              </div>
              {unlinkedFlightCount > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2 bg-warning/5 border border-warning/20 rounded-lg px-3 py-2 text-xs text-warning">
                  <Plane className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 min-w-[160px]">
                    {unlinkedFlightCount === 1
                      ? 'A flight cost was added — add the flight details so pricing stays in sync.'
                      : `${unlinkedFlightCount} flight costs were added — add the flight details so pricing stays in sync.`}
                  </span>
                  <Button type="button" onClick={() => handleJumpToFlightSection(day)} variant="outline" size="sm" className="border-warning/30 text-warning hover:bg-warning/10">
                    Add flight details
                  </Button>
                </div>
              )}
            </div>

            {/* ── Accommodation ────────────────────────────────── */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-success" /> Accommodation
              </label>
              {day.accommodation?.name ? (
                <div className="flex flex-wrap items-center gap-2 bg-muted rounded-lg border border-border px-3 py-2">
                  <span className="text-sm font-medium text-foreground flex-1 min-w-[120px]">{day.accommodation.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Total: <span className="font-semibold text-foreground">{formatCurrency(accommodationTotal)}</span>
                  </span>
                  {/* Tech debt: multi-day hotel stays are not yet supported. The
                      current implementation treats each day's accommodation as an
                      independent per-night booking. When multi-day stays are
                      implemented, the pricing engine should de-duplicate consecutive
                      nights at the same hotel. */}
                  <span className="text-xs text-muted-foreground" title="Each day books one per-night stay for now">
                    {formatCurrency(accommodationTotal)} / night
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Accommodation: —</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Ensure new days (added after initial render) are expanded
  useEffect(() => {
    const expanded: Record<number, boolean> = {};
    days.forEach(day => {
      if (day && day.dayNumber != null && expandedDays[day.dayNumber] === undefined) {
        expanded[day.dayNumber] = true;
      }
    });
    if (Object.keys(expanded).length > 0) {
      setExpandedDays(prev => ({ ...prev, ...expanded }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.length]);

  const toggleDayExpand = (dayNumber: number) => {
    setExpandedDays(prev => ({ ...prev, [dayNumber]: !prev[dayNumber] }));
  };

  const handleDayImageUpload = async (dayNumber: number, files: FileList | null) => {
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
      Swal.fire('Error', (error as Error).message || 'Failed to upload images', 'error');
    } finally {
      setUploadingDayImages(prev => ({ ...prev, [dayNumber]: false }));
    }
  };

  const handleRemoveDayImage = (dayNumber: number, imageIndex: number) => {
    const day = days.find(d => d && d.dayNumber === dayNumber);
    const updatedImages = (day?.images || []).filter((_: any, idx: number) => idx !== imageIndex);
    onDayChange(dayNumber, { images: updatedImages });
  };

  const autoFillBestMatchHotel = async (dayNumber: number, dayLocations: string[]) => {
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
        const hotels = response.data?.hotels || [];
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
    const timeouts: ReturnType<typeof setTimeout>[] = [];

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days
    .filter(Boolean)
    .map(d => `${d.dayNumber}-${Array.isArray(d.locations) ? d.locations.join(',') : ''}`)
    .join('|'), destination, packageType, category]);

  // Field Group Component
  const FieldGroup = ({ label, icon: Icon, children, className = '' }: { label: string; icon?: any; children: React.ReactNode; className?: string }) => (
    <div className={cn('bg-card rounded-lg border border-border p-4', className)}>
      <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        {label}
      </label>
      {children}
    </div>
  );

  if (!days || days.length === 0) {
    return (
      <div className="bg-muted rounded-xl border-2 border-dashed border-border p-12 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Plus className="w-8 h-8 text-primary" />
        </div>
        <p className="text-foreground font-medium mb-2">No days added to itinerary</p>
        <p className="text-sm text-muted-foreground mb-6">Start building your travel itinerary</p>
        <Button onClick={onAddDay}>
          <Plus size={16} />
          Add First Day
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {days.filter(Boolean).map((day) => (
        <div key={day.dayNumber} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          {/* Day Header */}
          <div
            className="bg-primary text-primary-foreground px-6 py-4 flex justify-between items-center cursor-pointer"
            onClick={() => toggleDayExpand(day.dayNumber)}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold font-mono">{day.dayNumber}</span>
              </div>
              <div>
                <h3 className="font-heading font-semibold text-lg">Day {day.dayNumber}</h3>
                {day.title && <p className="text-primary-foreground/80 text-sm">{day.title}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveDay(day.dayNumber); }}
                className="p-2 hover:bg-destructive/80 rounded-lg transition-colors"
                title="Remove day"
              >
                <Trash2 size={18} />
              </button>
              <div className="w-8 h-8 bg-primary-foreground/10 rounded-lg flex items-center justify-center">
                {expandedDays[day.dayNumber] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>
          </div>

          {/* Day Content */}
          {expandedDays[day.dayNumber] && (
            <div className="p-6 space-y-4">
              {/* Row 1: Title and Description */}
              {!hideTitleAndDescription && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FieldGroup label="Day Title" icon={StickyNote}>
                    <Input
                      type="text"
                      value={day.title || ''}
                      onChange={(e) => onDayChange(day.dayNumber, { title: e.target.value })}
                      placeholder="e.g., Arrival in Dubai (optional)"
                    />
                  </FieldGroup>

                  {!hideDescription && (
                    <FieldGroup label="Description" icon={StickyNote}>
                      <Textarea
                        rows={2}
                        value={day.description || ''}
                        onChange={(e) => onDayChange(day.dayNumber, { description: e.target.value })}
                        placeholder="Brief description of the day's activities..."
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
                      onChange={(locations: string[]) => onDayChange(day.dayNumber, { locations })}
                    />
                  ) : (
                    <LocationSelector
                      locations={day.locations || []}
                      onChange={(locations: string[]) => onDayChange(day.dayNumber, { locations })}
                      destination={destination}
                    />
                  )}
                </FieldGroup>

                <FieldGroup label="Activities" icon={Activity}>
                  <ActivitySelector
                    activities={day.activities || []}
                    onChange={(activities: string[]) => onDayChange(day.dayNumber, { activities })}
                    destination={destination}
                  />
                </FieldGroup>
              </div>

              {/* Row 3: Meals */}
              <FieldGroup label="Meals Included" icon={Utensils}>
                <div className="flex flex-wrap gap-3">
                  {MEALS.map((meal) => {
                    const checked = Boolean(day.meals?.[meal.key]);
                    return (
                      <label
                        key={meal.key}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer transition-colors border',
                          checked
                            ? 'bg-warning/10 border-warning/30 text-warning'
                            : 'bg-muted border-border text-muted-foreground hover:bg-accent'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => handleMealToggle(day, meal.key, e.target.checked)}
                          className="sr-only"
                        />
                        {checked ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <meal.icon className="w-4 h-4 opacity-50" />
                        )}
                        <span className="text-sm font-medium">{meal.label}</span>
                      </label>
                    );
                  })}
                </div>
              </FieldGroup>

              {/* Flight Booking — standalone section */}
              <div
                id={`day-${day.dayNumber}-flight-section`}
                className={cn(
                  'bg-card rounded-lg border overflow-hidden transition-shadow',
                  highlightedFlightSection === day.dayNumber
                    ? 'border-primary ring-4 ring-primary/20'
                    : 'border-primary/20'
                )}
              >
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Plane className="w-4 h-4 text-primary" />
                    Flight Booking
                  </div>
                  <Button
                    id={`day-${day.dayNumber}-add-flight`}
                    type="button"
                    onClick={() => handleAddFlight(day)}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Flight
                  </Button>
                </div>

                <div className="px-4 pb-4 pt-3 border-t border-primary/10 space-y-2">
                  {(Array.isArray(day.flights) ? day.flights : []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No flight selected</p>
                  ) : (
                    (day.flights || []).map((flight: any, index: number) => (
                      <div key={flight.id || index} className="bg-primary/5 rounded-lg border border-primary/20 p-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <span className="text-sm font-medium text-primary">
                            {flight.origin ? `${flight.origin} → ${flight.destination}` : 'No flight selected'}
                          </span>
                          <div className="flex gap-2">
                            <Button type="button" onClick={() => handleEditFlight(day, index)} size="sm">
                              Edit Flight
                            </Button>
                            <Button type="button" onClick={() => handleRemoveFlight(day, index)} variant="destructive" size="sm">
                              Remove Flight
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-primary/80 space-y-0.5">
                          <p>Airline: {flight.airlinePreference || 'Any'} | Cabin: {flight.cabinClass || 'Economy'}</p>
                          {flight.departureTime && <p>Preferred: {flight.departureTime}</p>}
                          {getFlightPrice(flight) != null && (
                            <p>Price: {formatCurrency(getFlightPrice(flight)!)} (auto-added to transport)</p>
                          )}
                          {flight.flightNumber && (
                            <>
                              <p className="mt-1 font-medium text-success">Booked: {flight.flightNumber} ({flight.carrierName})</p>
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
              <div className="bg-card rounded-lg border border-border p-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
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
                  <div className="text-center py-6 bg-muted rounded-lg border-2 border-dashed border-border">
                    <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">No hotel selected for this day</p>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        onClick={() => {
                          setCurrentDayForHotel(day.dayNumber);
                          setCurrentDayLocations(day.locations || []);
                          setHotelModalMode('suggest');
                          setShowHotelModal(true);
                        }}
                        size="sm"
                      >
                        <Search className="w-4 h-4" />
                        Search Hotels
                      </Button>
                      <span className="text-xs text-muted-foreground">or fill below</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 px-3">
                      <Input
                        type="text"
                        value={day.accommodation?.name || ''}
                        onChange={(e) => onDayChange(day.dayNumber, { accommodation: { ...day.accommodation, name: e.target.value } })}
                        placeholder="Hotel name (manual)"
                      />
                      <Select
                        value={day.accommodation?.type || undefined}
                        onValueChange={(value) => onDayChange(day.dayNumber, { accommodation: { ...day.accommodation, type: String(value) } })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Type">
                            {(value: string) => ACCOMMODATION_TYPE_LABELS[value] ?? value}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hotel">Hotel</SelectItem>
                          <SelectItem value="resort">Resort</SelectItem>
                          <SelectItem value="guesthouse">Guesthouse</SelectItem>
                          <SelectItem value="homestay">Homestay</SelectItem>
                          <SelectItem value="camp">Camp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {autoFillingHotel && days.find(d => d && d.dayNumber === day.dayNumber)?.locations?.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-primary bg-primary/5 px-2 py-1 rounded-lg">
                    <Loader className="w-3 h-3 animate-spin" />
                    <span>Finding best match...</span>
                  </div>
                )}
              </div>

              {/* Row 5: Notes */}
              <FieldGroup label="Additional Notes" icon={StickyNote}>
                <Textarea
                  rows={2}
                  value={day.notes || ''}
                  onChange={(e) => onDayChange(day.dayNumber, { notes: e.target.value })}
                  placeholder="Any additional notes or important information..."
                />
              </FieldGroup>

              {/* Row 6: Day Images — intentionally shown regardless of
                  hideTitleAndDescription (that flag only concerns the
                  title/description text fields above, not imagery). */}
              <div className="bg-card rounded-lg border border-border p-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
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
                    className={cn(
                      'inline-flex items-center gap-2 px-5 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                      uploadingDayImages[day.dayNumber]
                        ? 'border-primary/30 bg-primary/5 opacity-50 cursor-not-allowed'
                        : 'border-border bg-muted hover:border-primary/40 hover:bg-primary/5'
                    )}
                  >
                    {uploadingDayImages[day.dayNumber] ? (
                      <Loader className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <Upload className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {uploadingDayImages[day.dayNumber] ? 'Uploading...' : 'Upload Day Images'}
                    </span>
                  </label>
                </div>

                {day.images && day.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {day.images.map((img: any, imgIdx: number) => {
                      const imageUrl = typeof img === 'string' ? img : img.url;
                      return (
                        <div key={imgIdx} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border-2 border-border hover:border-primary/40 transition-colors">
                            <img
                              src={imageUrl}
                              alt={`Day ${day.dayNumber} Image ${imgIdx + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50" y="50" text-anchor="middle" dominant-baseline="middle"%3EImage%3C/text%3E%3C/svg%3E';
                              }}
                            />
                          </div>
                          <button
                            onClick={() => handleRemoveDayImage(day.dayNumber, imgIdx)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-dropdown opacity-0 group-hover:opacity-100"
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
        className="w-full py-4 border-2 border-dashed border-primary/30 bg-primary/5 rounded-xl text-primary hover:border-primary/50 hover:bg-primary/10 transition-colors font-medium flex items-center justify-center gap-2"
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
          ? (days.find(d => d && d.dayNumber === flightModalTarget.dayNumber)?.flights || [])[flightModalTarget.index as number] || {}
          : {}}
        onSelectTemplate={(flightData: any) => {
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
        onSelectHotel={(hotel: any) => {
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

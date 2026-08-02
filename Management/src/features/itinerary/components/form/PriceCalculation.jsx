/**
 * Price Calculation — live bill/receipt-style pricing breakdown.
 *
 * Everything is computed client-side from the itinerary cost inputs through the
 * shared pricing engine (@travel-crm/pricing-engine) in a useMemo, so there is
 * no "Calculate" button. The backend verification endpoint runs the same engine
 * on the same payload (debounced 800ms); if the two disagree a warning banner
 * offers the server value.
 */

import { useMemo, useState, useEffect, useRef } from 'react';
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  Loader,
} from 'lucide-react';
import {
  calculateBasePrice,
  computeMargin,
  DEFAULTS,
} from '@travel-crm/pricing-engine';
import ApiService from '../../services/apiService.js';
import { formatCurrency, getCurrencySymbol } from '../../../../utils/currency.js';
import {
  getMealCounts,
  getDayActivities,
  getDayTransports,
  getAccommodationTotal,
  getTransportRowCost,
} from '../../utils/helpers';

const mealLineText = (day) => {
  const parts = [];
  if (day.breakfastCount > 0) parts.push(`${day.breakfastCount} breakfast${day.breakfastCount > 1 ? 's' : ''}`);
  if (day.lunchCount > 0) parts.push(`${day.lunchCount} lunch${day.lunchCount > 1 ? 'es' : ''}`);
  if (day.dinnerCount > 0) parts.push(`${day.dinnerCount} dinner${day.dinnerCount > 1 ? 's' : ''}`);
  return parts.length > 0 ? parts.join(', ') : 'No meals';
};

const ReceiptLine = ({ label, value, muted = false }) => (
  <div className="flex items-center justify-between gap-3 text-sm py-1">
    <span className={`${muted ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
    <span className={`font-medium tabular-nums ${muted ? 'text-slate-400' : 'text-slate-800'}`}>{value}</span>
  </div>
);

const SectionTitle = ({ children }) => (
  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700 mb-1.5 mt-4 first:mt-0">
    {children}
  </p>
);

const Divider = () => (
  <div className="my-3 border-t-2 border-dashed border-slate-200" />
);

const PriceCalculation = ({ formData, onFormChange, duration }) => {
  const itineraryDays = useMemo(
    () => (Array.isArray(formData.days) ? formData.days.filter(Boolean) : []),
    [formData.days]
  );

  const effectiveGroupSize = 1;
  const marginType = formData.defaultMarginType || 'PERCENTAGE';
  const marginValue = Number(formData.defaultMarginInput) || 0;

  const [serverResult, setServerResult] = useState(null);
  const [serverPackageCost, setServerPackageCost] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const verifySeq = useRef(0);

  // ── Live breakdown (recomputed on every form state change) ──────────────
  const pricing = useMemo(() => {
    const mealDays = itineraryDays.map((day) => ({
      ...getMealCounts(day),
      dayNumber: day.dayNumber,
    }));
    const activityRows = itineraryDays.flatMap((day) =>
      getDayActivities(day).map((a) => ({ ...a, dayNumber: day.dayNumber }))
    );
    const transportRows = itineraryDays.flatMap((day) =>
      getDayTransports(day).map((t) => ({ ...t, dayNumber: day.dayNumber }))
    );
    const accommodationRows = itineraryDays
      .filter((day) => getAccommodationTotal(day) > 0)
      .map((day) => ({
        dayNumber: day.dayNumber,
        name: day.accommodation?.name || 'Accommodation',
        totalAmount: getAccommodationTotal(day),
        currency: day.accommodation?.currency || 'USD',
      }));
    const accommodationTotal = accommodationRows.reduce((sum, row) => sum + row.totalAmount, 0);

    const engine = calculateBasePrice({
      days: mealDays,
      activities: activityRows,
      transports: transportRows,
      groupSize: effectiveGroupSize,
    });

    const packageCost = Math.round((engine.basePrice + accommodationTotal) * 100) / 100;
    const margin = computeMargin(packageCost, marginType, marginValue);

    return {
      mealDays,
      activityRows,
      transportRows,
      accommodationRows,
      accommodationTotal,
      engine,
      packageCost,
      marginAmount: margin.marginAmount,
      sellPrice: margin.sellPrice,
    };
  }, [itineraryDays, effectiveGroupSize, marginType, marginValue]);

  // ── Debounced server verification (same engine, same payload) ───────────
  useEffect(() => {
    // The itinerary changed — a previously accepted server value is stale.
    setServerPackageCost(null);

    if (itineraryDays.length === 0) {
      setServerResult(null);
      return undefined;
    }

    setVerifying(true);
    const timer = setTimeout(async () => {
      const seq = ++verifySeq.current;
      try {
        const response = await ApiService.calculatePrice({
          itineraryDays: formData.days,
          defaultMarginType: marginType,
          defaultMarginInput: marginValue,
        });
        if (seq !== verifySeq.current) return;
        setServerResult(response?.data || null);
      } catch (error) {
        if (seq !== verifySeq.current) return;
        setServerResult(null);
      } finally {
        if (seq === verifySeq.current) setVerifying(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [itineraryDays, formData.days, marginType, marginValue, effectiveGroupSize]);

  const effectivePackageCost = serverPackageCost ?? pricing.packageCost;
  const effectiveMargin = computeMargin(effectivePackageCost, marginType, marginValue);
  const serverPackageCostNumber = Number(serverResult?.packageCost);
  const diverged =
    Number.isFinite(serverPackageCostNumber) &&
    serverPackageCost == null &&
    Math.abs(serverPackageCostNumber - pricing.packageCost) > 0.01;

  const handleMarginChange = (e) => {
    const { name, value } = e.target;
    onFormChange({ ...formData, [name]: value });
  };

  const handleMarginNumberChange = (e) => {
    const value = e.target.value;
    onFormChange({
      ...formData,
      defaultMarginInput: value === '' ? 0 : (parseFloat(value) || 0),
    });
  };

  const hasAnyCosts =
    pricing.packageCost > 0 ||
    pricing.accommodationTotal > 0 ||
    pricing.engine.breakdown.meals.total > 0 ||
    pricing.engine.breakdown.activities.total > 0 ||
    pricing.engine.breakdown.transports.total > 0;

  // ── Empty state ─────────────────────────────────────────────────────────
  if (itineraryDays.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
          <Calculator className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">Add itinerary days to see pricing</p>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
          <span className="text-sm font-semibold text-slate-700">Sell Price</span>
          <span className="text-xl font-bold text-slate-800 tabular-nums">
            {formatCurrency(0, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Margin controls */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          Margin
          <select
            name="defaultMarginType"
            value={marginType}
            onChange={handleMarginChange}
            className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          >
            <option value="PERCENTAGE">%</option>
            <option value="FIXED">{getCurrencySymbol()}</option>
          </select>
          <input
            type="number" name="defaultMarginInput" min="0" step="0.01"
            value={formData.defaultMarginInput ?? 20}
            onChange={handleMarginNumberChange}
            onWheel={(e) => e.currentTarget.blur()}
            className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          <span className="text-sm font-semibold text-emerald-700 tabular-nums">
            {formatCurrency(effectiveMargin.marginAmount, { minimumFractionDigits: 2 })}
          </span>
        </label>
        {verifying && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Loader className="w-3.5 h-3.5 animate-spin" />
            Verifying with server…
          </span>
        )}
      </div>

      {/* ── Receipt ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-white">Price Breakdown</p>
              <p className="text-[11px] text-slate-400">Computed live from itinerary costs · {duration} day{duration === 1 ? '' : 's'}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          {/* Meals */}
          <SectionTitle>Meals</SectionTitle>
          {pricing.mealDays
            .filter((day) => day.breakfastCount + day.lunchCount + day.dinnerCount > 0)
            .map((day) => (
              <ReceiptLine
                key={`meal-${day.dayNumber}`}
                label={`Day ${day.dayNumber}  ${mealLineText(day)}`}
                value={formatCurrency(calculateMealCostForDay(day))}
              />
            ))}
          {pricing.mealDays.every((day) => day.breakfastCount + day.lunchCount + day.dinnerCount === 0) && (
            <ReceiptLine label="No meal counts configured" value={formatCurrency(0)} muted />
          )}
          <ReceiptLine label="Meals subtotal" value={formatCurrency(pricing.engine.breakdown.meals.total)} muted />

          {/* Activities */}
          <SectionTitle>Activities</SectionTitle>
          {pricing.activityRows.map((activity) => {
            const unit = activity.costOverride ?? activity.defaultCost ?? 0;
            return (
              <ReceiptLine
                key={`act-${activity.dayNumber}-${activity.name}`}
                label={`${activity.name} (Day ${activity.dayNumber})`}
                value={formatCurrency(unit)}
              />
            );
          })}
          {pricing.activityRows.length === 0 && (
            <ReceiptLine label="No activities" value={formatCurrency(0)} muted />
          )}
          <ReceiptLine label="Activities subtotal" value={formatCurrency(pricing.engine.breakdown.activities.total)} muted />

          {/* Transport */}
          <SectionTitle>Transport</SectionTitle>
          {pricing.transportRows.map((transport, index) => {
            const cost = getTransportRowCost(transport, effectiveGroupSize);
            const model = transport.pricingModel || 'PER_VEHICLE';
            const modeLabel = transport.transportMode || 'Transport';
            const detail =
              model === 'PER_KM'
                ? `${modeLabel} — PER_KM, ${transport.distanceKm ?? 0}km`
                : `${modeLabel} — ${model}`;
            return (
              <ReceiptLine
                key={`transport-${transport.dayNumber}-${index}`}
                label={`${detail} (Day ${transport.dayNumber})`}
                value={formatCurrency(cost)}
              />
            );
          })}
          {pricing.transportRows.length === 0 && (
            <ReceiptLine label="No transport costs" value={formatCurrency(0)} muted />
          )}
          <ReceiptLine label="Transport subtotal" value={formatCurrency(pricing.engine.breakdown.transports.total)} muted />

          {/* Accommodation */}
          <SectionTitle>Accommodation</SectionTitle>
          {pricing.accommodationRows.map((row) => (
            <ReceiptLine
              key={`acc-${row.dayNumber}`}
              label={`${row.name} (Day ${row.dayNumber})`}
              value={formatCurrency(row.totalAmount)}
            />
          ))}
          {pricing.accommodationRows.length === 0 && (
            <ReceiptLine label="No hotel selected" value={formatCurrency(0)} muted />
          )}
          <ReceiptLine label="Accommodation subtotal" value={formatCurrency(pricing.accommodationTotal)} muted />

          <Divider />

          {/* Package cost */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-bold text-slate-800">PACKAGE COST</span>
            <span className="text-lg font-bold text-slate-900 tabular-nums">
              {formatCurrency(effectivePackageCost)}
            </span>
          </div>

          <Divider />

          {/* Sell price */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-bold text-slate-800">SELL PRICE</span>
            <span className="text-2xl font-extrabold text-emerald-700 tabular-nums">
              {formatCurrency(effectiveMargin.sellPrice)}
            </span>
          </div>
        </div>
      </div>

      {!hasAnyCosts && (
        <p className="text-xs text-slate-400 text-center">
          Add meal counts, activity costs, and transport details in the itinerary below
        </p>
      )}

      {/* Server verification divergence */}
      {diverged && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-wrap items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 flex-1 min-w-[220px]">
            Server recalculated Package Cost at{' '}
            <strong>{formatCurrency(serverPackageCostNumber, { minimumFractionDigits: 2 })}</strong>{' '}
            (frontend shows {formatCurrency(pricing.packageCost, { minimumFractionDigits: 2 })}).
            Costs may have changed since you opened this form.
          </p>
          <button
            type="button"
            onClick={() => setServerPackageCost(serverPackageCostNumber)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Use server value
          </button>
        </div>
      )}
    </div>
  );
};

/** Per-day meal subtotal using the same formula as the shared engine. */
function calculateMealCostForDay(day) {
  const costPerMeal = day.mealPriceOverride ?? DEFAULTS.mealCostPerPerson;
  return (day.breakfastCount + day.lunchCount + day.dinnerCount) * costPerMeal;
}

export default PriceCalculation;

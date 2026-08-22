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
import ApiService from '../../services/apiService';
import { formatCurrency, getCurrencySymbol } from '../../../../utils/currency.js';
import {
  getMealCounts,
  getDayActivities,
  getDayTransports,
  getAccommodationTotal,
  getTransportRowCost,
} from '../../utils/helpers';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PriceCalculationProps {
  formData: any;
  onFormChange: (data: any) => void;
  duration: number;
}

const mealLineText = (day: any) => {
  const parts = [];
  if (day.breakfastCount > 0) parts.push(`${day.breakfastCount} breakfast${day.breakfastCount > 1 ? 's' : ''}`);
  if (day.lunchCount > 0) parts.push(`${day.lunchCount} lunch${day.lunchCount > 1 ? 'es' : ''}`);
  if (day.dinnerCount > 0) parts.push(`${day.dinnerCount} dinner${day.dinnerCount > 1 ? 's' : ''}`);
  return parts.length > 0 ? parts.join(', ') : 'No meals';
};

const ReceiptLine = ({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) => (
  <div className="flex items-center justify-between gap-3 text-sm py-1">
    <span className={muted ? 'text-muted-foreground/70' : 'text-muted-foreground'}>{label}</span>
    <span className={`font-mono font-medium tabular-nums ${muted ? 'text-muted-foreground/70' : 'text-foreground'}`}>{value}</span>
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-bold uppercase tracking-[0.14em] text-success mb-1.5 mt-4 first:mt-0">
    {children}
  </p>
);

const Divider = () => (
  <div className="my-3 border-t-2 border-dashed border-border" />
);

const PriceCalculation = ({ formData, onFormChange, duration }: PriceCalculationProps) => {
  const itineraryDays = useMemo(
    () => (Array.isArray(formData.days) ? formData.days.filter(Boolean) : []),
    [formData.days]
  );

  const effectiveGroupSize = 1;
  const marginType = formData.defaultMarginType || 'PERCENTAGE';
  const marginValue = Number(formData.defaultMarginInput) || 0;

  const [serverResult, setServerResult] = useState<any>(null);
  const [serverPackageCost, setServerPackageCost] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);
  const verifySeq = useRef(0);

  // ── Live breakdown (recomputed on every form state change) ──────────────
  const pricing = useMemo(() => {
    const mealDays = itineraryDays.map((day: any) => ({
      ...getMealCounts(day),
      dayNumber: day.dayNumber,
    }));
    const activityRows = itineraryDays.flatMap((day: any) =>
      getDayActivities(day).map((a: any) => ({ ...a, dayNumber: day.dayNumber }))
    );
    const transportRows = itineraryDays.flatMap((day: any) =>
      getDayTransports(day).map((t: any) => ({ ...t, dayNumber: day.dayNumber }))
    );
    const accommodationRows = itineraryDays
      .filter((day: any) => getAccommodationTotal(day) > 0)
      .map((day: any) => ({
        dayNumber: day.dayNumber,
        name: day.accommodation?.name || 'Accommodation',
        totalAmount: getAccommodationTotal(day),
        currency: day.accommodation?.currency || 'USD',
      }));
    const accommodationTotal = accommodationRows.reduce((sum: number, row: any) => sum + row.totalAmount, 0);

    const engine = calculateBasePrice({
      days: mealDays,
      activities: activityRows,
      transports: transportRows,
      // Deliberately not passed here - accommodationTotal is added to
      // packageCost separately below (see accommodationTotal usage). The
      // engine's own JS default is also `[]`; passed explicitly only to
      // satisfy its @param JSDoc type (see calculateBasePrice's JSDoc in
      // Services/shared/pricing-engine/src/index.js - `accommodation` has a
      // `= []` default but lacks the `[optional]` bracket other params use,
      // so TS infers it as required despite the runtime default).
      accommodation: [],
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

  const handleMarginNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        <div className="rounded-lg border border-border bg-muted p-8 text-center">
          <Calculator className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">Add itinerary days to see pricing</p>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4">
          <span className="text-sm font-semibold text-foreground">Sell Price</span>
          <span className="text-xl font-bold font-mono tabular-nums text-foreground">
            {formatCurrency(0, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Margin controls */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-border bg-muted px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="w-4 h-4" />
          Margin
          <Select
            value={marginType}
            onValueChange={(value) => onFormChange({ ...formData, defaultMarginType: String(value) })}
          >
            <SelectTrigger className="w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">%</SelectItem>
              <SelectItem value="FIXED">{getCurrencySymbol()}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number" name="defaultMarginInput" min="0" step="0.01"
            value={formData.defaultMarginInput ?? 20}
            onChange={handleMarginNumberChange}
            onWheel={(e) => e.currentTarget.blur()}
            className="w-20 text-center"
          />
          <span className="text-sm font-semibold font-mono tabular-nums text-success">
            {formatCurrency(effectiveMargin.marginAmount, { minimumFractionDigits: 2 })}
          </span>
        </div>
        {verifying && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader className="w-3.5 h-3.5 animate-spin" />
            Verifying with server…
          </span>
        )}
      </div>

      {/* ── Receipt ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="px-5 py-4 bg-foreground flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calculator className="w-5 h-5 text-success" />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-background">Price Breakdown</p>
              <p className="text-xs text-background/60">Computed live from itinerary costs · {duration} day{duration === 1 ? '' : 's'}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          {/* Meals */}
          <SectionTitle>Meals</SectionTitle>
          {pricing.mealDays
            .filter((day: any) => day.breakfastCount + day.lunchCount + day.dinnerCount > 0)
            .map((day: any) => (
              <ReceiptLine
                key={`meal-${day.dayNumber}`}
                label={`Day ${day.dayNumber}  ${mealLineText(day)}`}
                value={formatCurrency(calculateMealCostForDay(day))}
              />
            ))}
          {pricing.mealDays.every((day: any) => day.breakfastCount + day.lunchCount + day.dinnerCount === 0) && (
            <ReceiptLine label="No meal counts configured" value={formatCurrency(0)} muted />
          )}
          <ReceiptLine label="Meals subtotal" value={formatCurrency(pricing.engine.breakdown.meals.total)} muted />

          {/* Activities */}
          <SectionTitle>Activities</SectionTitle>
          {pricing.activityRows.map((activity: any) => {
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
          {pricing.transportRows.map((transport: any, index: number) => {
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
          {pricing.accommodationRows.map((row: any) => (
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
            <span className="text-sm font-bold text-foreground">PACKAGE COST</span>
            <span className="text-lg font-bold font-mono tabular-nums text-foreground">
              {formatCurrency(effectivePackageCost)}
            </span>
          </div>

          <Divider />

          {/* Sell price */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-bold text-foreground">SELL PRICE</span>
            <span className="text-2xl font-extrabold font-mono tabular-nums text-success">
              {formatCurrency(effectiveMargin.sellPrice)}
            </span>
          </div>
        </div>
      </div>

      {!hasAnyCosts && (
        <p className="text-xs text-muted-foreground text-center">
          Add meal counts, activity costs, and transport details in the itinerary below
        </p>
      )}

      {/* Server verification divergence */}
      {diverged && (
        <div className="rounded-lg border border-warning/20 bg-warning/5 p-4 flex flex-wrap items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
          <p className="text-sm text-warning flex-1 min-w-[220px]">
            Server recalculated Package Cost at{' '}
            <strong>{formatCurrency(serverPackageCostNumber, { minimumFractionDigits: 2 })}</strong>{' '}
            (frontend shows {formatCurrency(pricing.packageCost, { minimumFractionDigits: 2 })}).
            Costs may have changed since you opened this form.
          </p>
          <Button
            type="button"
            onClick={() => setServerPackageCost(serverPackageCostNumber)}
            variant="outline"
            size="sm"
            className="border-warning/30 text-warning hover:bg-warning/10"
          >
            Use server value
          </Button>
        </div>
      )}
    </div>
  );
};

/** Per-day meal subtotal using the same formula as the shared engine. */
function calculateMealCostForDay(day: any) {
  const costPerMeal = day.mealPriceOverride ?? DEFAULTS.mealCostPerPerson;
  return (day.breakfastCount + day.lunchCount + day.dinnerCount) * costPerMeal;
}

export default PriceCalculation;

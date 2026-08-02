import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { leadAPI } from '../../../services/api';

const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Live pricing card for the lead dialog. Preview-only: every change calls the
 * backend engine via /pricing/calculate; nothing persists until the dialog's
 * Save sends { days, pricing } to /leads/:id/itinerary.
 */
export default function PricingSection({ leadId, days = [], travelers = 1, pricing = {}, onSettingsChange }) {
  const initialized = useRef(false);
  const [settings, setSettings] = useState({
    marginType: pricing.marginType || null,
    marginValue: Number(pricing.marginValue) || 0,
    depositType: pricing.depositType || 'PERCENTAGE',
    depositValue: Number(pricing.depositValue) || 30,
    discountType: pricing.discountType || 'none',
    discountValue: Number(pricing.discountValue) || 0,
    serviceChargeRate: Number(pricing.serviceChargeRate) || 0,
  });
  const [computed, setComputed] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initialize once from the loaded pricing row (never overwrite user edits).
  useEffect(() => {
    if (!initialized.current && pricing && Object.keys(pricing).length > 0) {
      initialized.current = true;
      setSettings({
        marginType: pricing.marginType || null,
        marginValue: Number(pricing.marginValue) || 0,
        depositType: pricing.depositType || 'PERCENTAGE',
        depositValue: Number(pricing.depositValue) || 30,
        discountType: pricing.discountType || 'none',
        discountValue: Number(pricing.discountValue) || 0,
        serviceChargeRate: Number(pricing.serviceChargeRate) || 0,
      });
    }
  }, [pricing]);

  const updateSettings = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    onSettingsChange?.(next);
  };

  // Debounced live preview whenever days or settings change.
  useEffect(() => {
    if (!Array.isArray(days)) return;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const payload = {
          days,
          travelers: Number(travelers) || 1,
          marginType: settings.marginType,
          marginValue: Number(settings.marginValue) || 0,
          discountType: settings.discountType,
          discountValue: Number(settings.discountValue) || 0,
          serviceChargeRate: Number(settings.serviceChargeRate) || 0,
          depositType: settings.depositType,
          depositValue: Number(settings.depositValue) || 0,
        };
        const res = leadId
          ? await leadAPI.calculatePricing(leadId, payload)
          : await leadAPI.previewPricing(payload);
        setComputed(res.data?.data?.financials || res.data?.financials);
      } catch (err) {
        // keep the last known preview on transient errors
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [leadId, days, travelers, settings]);

  const inputCls = "w-full px-2 py-1.5 border border-gray-200 rounded text-sm";
  const labelCls = "text-xs text-gray-500";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div>
          <label className={labelCls}>Margin</label>
          <div className="flex gap-1">
            <select value={settings.marginType || ''}
              onChange={(e) => updateSettings({ marginType: e.target.value || null })}
              className={inputCls}>
              <option value="">None</option>
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed</option>
            </select>
            <input type="number" min="0" step="0.01" value={settings.marginValue}
              onChange={(e) => updateSettings({ marginValue: e.target.value })}
              className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Discount</label>
          <div className="flex gap-1">
            <select value={settings.discountType}
              onChange={(e) => updateSettings({ discountType: e.target.value })}
              className={inputCls}>
              <option value="none">None</option>
              <option value="percentage">%</option>
              <option value="fixed">Fixed</option>
            </select>
            <input type="number" min="0" step="0.01" value={settings.discountValue}
              onChange={(e) => updateSettings({ discountValue: e.target.value })}
              className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Service charge %</label>
          <input type="number" min="0" step="0.01" value={settings.serviceChargeRate}
            onChange={(e) => updateSettings({ serviceChargeRate: e.target.value })}
            className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Deposit</label>
          <div className="flex gap-1">
            <select value={settings.depositType}
              onChange={(e) => updateSettings({ depositType: e.target.value })}
              className={inputCls}>
              <option value="PERCENTAGE">%</option>
              <option value="FIXED">Fixed</option>
            </select>
            <input type="number" min="0" step="0.01" value={settings.depositValue}
              onChange={(e) => updateSettings({ depositValue: e.target.value })}
              className={inputCls} />
          </div>
        </div>
      </div>

      {loading && !computed && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculating…
        </div>
      )}

      {computed && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Estimated cost:</span><span className="font-medium">{money(computed.estimatedTotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Sell subtotal:</span><span className="font-medium">{money(computed.sellSubtotal)}</span></div>
          {Number(computed.discountAmount) > 0 && (
            <div className="flex justify-between"><span className="text-gray-500">Discount:</span><span className="font-medium text-red-600">−{money(computed.discountAmount)}</span></div>
          )}
          <div className="flex justify-between"><span className="text-gray-500">Tax (18%):</span><span className="font-medium">{money(computed.taxAmount)}</span></div>
          {Number(computed.serviceChargeAmount) > 0 && (
            <div className="flex justify-between"><span className="text-gray-500">Service charge:</span><span className="font-medium">{money(computed.serviceChargeAmount)}</span></div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-1">
            <span className="text-gray-700 font-semibold">Total:</span>
            <span className="font-semibold text-blue-700">{money(computed.totalAmount)}</span>
          </div>
          <div className="flex justify-between"><span className="text-gray-500">Deposit plan:</span><span className="font-medium text-amber-700">{money(computed.depositAmount)}</span></div>
          {computed.paidAmount != null && (
            <div className="flex justify-between"><span className="text-gray-500">Paid / Balance:</span><span className="font-medium">{money(computed.paidAmount)} / {money(computed.balanceDue)}</span></div>
          )}
          {computed.profit != null && (
            <div className={`flex justify-between ${computed.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              <span>Profit:</span><span className="font-semibold">{money(computed.profit)}</span>
            </div>
          )}
        </div>
      )}
      {!computed && !loading && (
        <p className="text-xs text-gray-400">Pricing preview appears here once an itinerary exists.</p>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Calculator, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { leadAPI } from '../../../services/api';
import { PRICING_BASIS_LABELS, MARGIN_TYPE_LABELS, COST_LINE_CATEGORY_LABELS, COST_LINE_SOURCE_LABELS } from '@travel-crm/constants';

const CATEGORIES = ['accommodation', 'transportation', 'activity', 'food', 'guide', 'insurance', 'visa', 'package', 'other'];
const BASES = ['PER_PERSON', 'PER_ROOM', 'PER_VEHICLE', 'PER_KM', 'FIXED'];

const emptyLine = () => ({
  category: 'other',
  description: '',
  basis: 'PER_PERSON',
  quantity: 1,
  estimatedUnitPrice: 0,
  actualUnitPrice: null,
  marginType: null,
  marginValue: null,
  source: 'MANUAL',
});

const toEngineLine = (line) => ({
  category: line.category,
  description: line.description,
  basis: line.basis,
  quantity: Number(line.quantity) || 1,
  estimatedUnit: Number(line.estimatedUnitPrice) || 0,
  actualUnit: line.actualUnitPrice != null && line.actualUnitPrice !== '' ? Number(line.actualUnitPrice) : null,
  marginType: line.marginType || null,
  marginValue: line.marginValue != null && line.marginValue !== '' ? Number(line.marginValue) : null,
  source: line.source || 'MANUAL',
});

export default function PricingSection({ leadId, financials: initialPricing, onFinancialsUpdated, travelers = 1 }) {
  const [settings, setSettings] = useState({
    currency: 'USD',
    marginType: null,
    marginValue: 0,
    depositType: 'PERCENTAGE',
    depositValue: 30,
    discountType: 'none',
    discountValue: 0,
    serviceChargeRate: 0,
  });
  const [lines, setLines] = useState([]);
  const [computed, setComputed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadPricing = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await leadAPI.getPricing(leadId);
      const data = res.data?.data || {};
      const pricing = data.pricing || initialPricing || {};
      if (pricing) {
        setSettings({
          currency: pricing.currency || 'USD',
          marginType: pricing.marginType || null,
          marginValue: Number(pricing.marginValue) || 0,
          depositType: pricing.depositType || 'PERCENTAGE',
          depositValue: Number(pricing.depositValue) || 0,
          discountType: pricing.discountType || 'none',
          discountValue: Number(pricing.discountValue) || 0,
          serviceChargeRate: Number(pricing.serviceChargeRate) || 0,
        });
      }
      if (data.costLines && data.costLines.length) {
        setLines(data.costLines.map((l) => ({
          category: l.category,
          description: l.description,
          basis: l.basis,
          quantity: l.quantity,
          estimatedUnitPrice: Number(l.estimatedUnitPrice),
          actualUnitPrice: l.actualUnitPrice != null ? Number(l.actualUnitPrice) : null,
          marginType: l.marginType || null,
          marginValue: l.marginValue != null ? Number(l.marginValue) : null,
          source: l.source,
        })));
        setComputed(data.pricing || null);
      }
      setLoaded(true);
    } catch (err) {
      toast.error(err.message || 'Failed to load pricing');
    } finally {
      setLoading(false);
    }
  }, [leadId, initialPricing]);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  const updateLine = (idx, patch) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const payload = {
        lines: lines.map(toEngineLine),
        travelers: Number(travelers) || 1,
        ...settings,
        marginValue: Number(settings.marginValue) || 0,
        depositValue: Number(settings.depositValue) || 0,
        discountValue: Number(settings.discountValue) || 0,
        serviceChargeRate: Number(settings.serviceChargeRate) || 0,
      };
      const res = await leadAPI.calculatePricing(leadId, payload);
      setComputed(res.data?.data?.financials || res.data?.financials);
    } catch (err) {
      toast.error(err.message || 'Failed to calculate pricing');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setLoading(true);
    try {
      const payload = {
        settings,
        lines: lines.map((l) => ({
          ...l,
          quantity: Number(l.quantity) || 1,
          estimatedUnitPrice: Number(l.estimatedUnitPrice) || 0,
          actualUnitPrice: l.actualUnitPrice != null && l.actualUnitPrice !== '' ? Number(l.actualUnitPrice) : null,
          marginValue: l.marginValue != null && l.marginValue !== '' ? Number(l.marginValue) : null,
        })),
      };
      const res = await leadAPI.applyPricing(leadId, payload);
      const pricing = res.data?.data?.pricing;
      setComputed(pricing);
      onFinancialsUpdated?.(pricing);
      toast.success('Pricing applied');
    } catch (err) {
      toast.error(err.message || 'Failed to apply pricing');
    } finally {
      setLoading(false);
    }
  };

  const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      {/* Pricing settings */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <label className="text-xs text-gray-500">Currency</label>
          <input value={settings.currency} maxLength={3}
            onChange={(e) => setSettings({ ...settings, currency: e.target.value.toUpperCase() })}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Margin</label>
          <div className="flex gap-1">
            <select value={settings.marginType || ''}
              onChange={(e) => setSettings({ ...settings, marginType: e.target.value || null })}
              className="w-1/2 px-2 py-1.5 border border-gray-200 rounded text-sm">
              <option value="">None</option>
              <option value="PERCENTAGE">%</option>
              <option value="FIXED">Fixed</option>
            </select>
            <input type="number" min="0" step="0.01" value={settings.marginValue}
              onChange={(e) => setSettings({ ...settings, marginValue: e.target.value })}
              className="w-1/2 px-2 py-1.5 border border-gray-200 rounded text-sm" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500">Deposit</label>
          <div className="flex gap-1">
            <select value={settings.depositType || ''}
              onChange={(e) => setSettings({ ...settings, depositType: e.target.value || null })}
              className="w-1/2 px-2 py-1.5 border border-gray-200 rounded text-sm">
              <option value="PERCENTAGE">%</option>
              <option value="FIXED">Fixed</option>
            </select>
            <input type="number" min="0" step="0.01" value={settings.depositValue}
              onChange={(e) => setSettings({ ...settings, depositValue: e.target.value })}
              className="w-1/2 px-2 py-1.5 border border-gray-200 rounded text-sm" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500">Discount / Svc</label>
          <div className="flex gap-1">
            <select value={settings.discountType}
              onChange={(e) => setSettings({ ...settings, discountType: e.target.value })}
              className="w-1/2 px-2 py-1.5 border border-gray-200 rounded text-sm">
              <option value="none">None</option>
              <option value="percentage">%</option>
              <option value="fixed">Fixed</option>
            </select>
            <input type="number" min="0" step="0.01" value={settings.discountValue}
              onChange={(e) => setSettings({ ...settings, discountValue: e.target.value })}
              className="w-1/2 px-2 py-1.5 border border-gray-200 rounded text-sm" />
          </div>
          <input type="number" min="0" step="0.01" value={settings.serviceChargeRate}
            onChange={(e) => setSettings({ ...settings, serviceChargeRate: e.target.value })}
            className="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded text-sm"
            placeholder="Service charge %" />
        </div>
      </div>

      {/* Cost lines */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Cost Lines</h4>
          <button type="button" onClick={() => setLines((prev) => [...prev, emptyLine()])}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
            <Plus className="w-3 h-3" /> Add line
          </button>
        </div>
        {lines.length === 0 && !loaded && (
          <p className="text-xs text-gray-400">Create the draft to auto-generate cost lines.</p>
        )}
        <div className="space-y-2">
          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-1.5 items-center border border-gray-100 rounded-lg p-2">
              <select value={line.category} onChange={(e) => updateLine(idx, { category: e.target.value })}
                className="col-span-2 px-1.5 py-1 border border-gray-200 rounded text-xs">
                {CATEGORIES.map((c) => <option key={c} value={c}>{COST_LINE_CATEGORY_LABELS[c]}</option>)}
              </select>
              <input value={line.description} onChange={(e) => updateLine(idx, { description: e.target.value })}
                className="col-span-3 px-1.5 py-1 border border-gray-200 rounded text-xs" placeholder="Description" />
              <select value={line.basis} onChange={(e) => updateLine(idx, { basis: e.target.value })}
                className="col-span-2 px-1.5 py-1 border border-gray-200 rounded text-xs">
                {BASES.map((b) => <option key={b} value={b}>{PRICING_BASIS_LABELS[b]}</option>)}
              </select>
              <input type="number" min="1" value={line.quantity}
                onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                className="col-span-1 px-1.5 py-1 border border-gray-200 rounded text-xs" title="Quantity" />
              <input type="number" min="0" step="0.01" value={line.estimatedUnitPrice}
                onChange={(e) => updateLine(idx, { estimatedUnitPrice: e.target.value })}
                className="col-span-1 px-1.5 py-1 border border-gray-200 rounded text-xs" title="Est. unit" />
              <input type="number" min="0" step="0.01" value={line.actualUnitPrice ?? ''}
                onChange={(e) => updateLine(idx, { actualUnitPrice: e.target.value })}
                className="col-span-1 px-1.5 py-1 border border-gray-200 rounded text-xs" title="Actual unit" />
              <span className="col-span-1 text-[10px] font-medium text-gray-400">
                {COST_LINE_SOURCE_LABELS[line.source] || line.source}
              </span>
              <button type="button" onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                className="col-span-1 flex justify-center text-red-400 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Computed totals */}
      {computed && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Estimated total:</span><span className="font-medium">{money(computed.estimatedTotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Sell subtotal:</span><span className="font-medium">{money(computed.sellSubtotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Discount:</span><span className="font-medium text-red-600">−{money(computed.discountAmount)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Tax ({computed.taxAmount != null ? '18%' : ''}):</span><span className="font-medium">{money(computed.taxAmount)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Service charge:</span><span className="font-medium">{money(computed.serviceChargeAmount)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-1">
            <span className="text-gray-700 font-semibold">Total:</span>
            <span className="font-semibold text-blue-700">{money(computed.totalAmount)}</span>
          </div>
          {computed.depositAmount != null && (
            <div className="flex justify-between"><span className="text-gray-500">Deposit plan:</span><span className="font-medium text-amber-700">{money(computed.depositAmount)}</span></div>
          )}
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

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={handleCalculate} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
          Calculate
        </button>
        <button onClick={handleApply} disabled={loading || !leadId}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Apply
        </button>
      </div>
    </div>
  );
}

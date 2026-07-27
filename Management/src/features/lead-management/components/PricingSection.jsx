import { useState, useEffect } from 'react';
import { Calculator, Save, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { leadAPI } from '../../../services/api';

export default function PricingSection({ leadId, financials: initialFinancials, onFinancialsUpdated }) {
  const [estimated, setEstimated] = useState({ packageBaseCost: 0, estimatedFlightCost: 0, estimatedHotelCost: 0 });
  const [clientPricing, setClientPricing] = useState({ markupStrategy: 'FLAT_FEE', markupValue: 0, depositPaid: 0 });
  const [computed, setComputed] = useState(null);
  const [actual, setActual] = useState({ actualFlightCost: '', actualHotelCost: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialFinancials) {
      const est = initialFinancials.estimated || {};
      const cp = initialFinancials.clientPricing || {};
      const act = initialFinancials.actual || {};
      setEstimated({ packageBaseCost: est.packageBaseCost || 0, estimatedFlightCost: est.estimatedFlightCost || 0, estimatedHotelCost: est.estimatedHotelCost || 0 });
      setClientPricing({ markupStrategy: cp.markupStrategy || 'FLAT_FEE', markupValue: cp.markupValue || 0, depositPaid: cp.depositPaid || 0 });
      setActual({ actualFlightCost: act.actualFlightCost != null ? act.actualFlightCost : '', actualHotelCost: act.actualHotelCost != null ? act.actualHotelCost : '' });
      if (initialFinancials.clientPricing?.quotedSellingPrice != null) {
        setComputed(initialFinancials);
      }
    }
  }, [initialFinancials]);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const financials = {
        estimated: { packageBaseCost: Number(estimated.packageBaseCost) || 0, estimatedFlightCost: Number(estimated.estimatedFlightCost) || 0, estimatedHotelCost: Number(estimated.estimatedHotelCost) || 0 },
        clientPricing: { markupStrategy: clientPricing.markupStrategy, markupValue: Number(clientPricing.markupValue) || 0, depositPaid: Number(clientPricing.depositPaid) || 0 },
        actual: { actualFlightCost: actual.actualFlightCost !== '' ? Number(actual.actualFlightCost) : null, actualHotelCost: actual.actualHotelCost !== '' ? Number(actual.actualHotelCost) : null },
      };
      const res = await leadAPI.calculatePricing(leadId, financials);
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
      const financials = {
        estimated: { packageBaseCost: Number(estimated.packageBaseCost) || 0, estimatedFlightCost: Number(estimated.estimatedFlightCost) || 0, estimatedHotelCost: Number(estimated.estimatedHotelCost) || 0 },
        clientPricing: { markupStrategy: clientPricing.markupStrategy, markupValue: Number(clientPricing.markupValue) || 0, depositPaid: Number(clientPricing.depositPaid) || 0 },
        actual: { actualFlightCost: actual.actualFlightCost !== '' ? Number(actual.actualFlightCost) : null, actualHotelCost: actual.actualHotelCost !== '' ? Number(actual.actualHotelCost) : null },
      };
      const res = await leadAPI.applyPricing(leadId, financials);
      const updated = res.data?.data?.financials || res.data?.financials;
      setComputed(updated);
      onFinancialsUpdated?.(updated);
      toast.success('Pricing applied');
    } catch (err) {
      toast.error(err.message || 'Failed to apply pricing');
    } finally {
      setLoading(false);
    }
  };

  const profit = computed?.actual?.finalRealizedProfit;

  return (
    <div className="space-y-4">
      {/* Estimated Costs */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Estimated Costs</h4>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-500">Package Base</label>
            <input type="number" min="0" step="0.01" value={estimated.packageBaseCost}
              onChange={(e) => setEstimated({ ...estimated, packageBaseCost: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Flight (Est.)</label>
            <input type="number" min="0" step="0.01" value={estimated.estimatedFlightCost}
              onChange={(e) => setEstimated({ ...estimated, estimatedFlightCost: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Hotel (Est.)</label>
            <input type="number" min="0" step="0.01" value={estimated.estimatedHotelCost}
              onChange={(e) => setEstimated({ ...estimated, estimatedHotelCost: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
          </div>
        </div>
      </div>

      {/* Client Pricing */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Client Pricing</h4>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-500">Markup Strategy</label>
            <select value={clientPricing.markupStrategy}
              onChange={(e) => setClientPricing({ ...clientPricing, markupStrategy: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm">
              <option value="FLAT_FEE">Flat Fee</option>
              <option value="PERCENTAGE">Percentage</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Markup Value</label>
            <input type="number" min="0" step="0.01" value={clientPricing.markupValue}
              onChange={(e) => setClientPricing({ ...clientPricing, markupValue: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Deposit Paid</label>
            <input type="number" min="0" step="0.01" value={clientPricing.depositPaid}
              onChange={(e) => setClientPricing({ ...clientPricing, depositPaid: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
          </div>
        </div>
      </div>

      {/* Actual Costs */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Actual Costs</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500">Flight (Actual)</label>
            <input type="number" min="0" step="0.01" value={actual.actualFlightCost}
              onChange={(e) => setActual({ ...actual, actualFlightCost: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="After booking" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Hotel (Actual)</label>
            <input type="number" min="0" step="0.01" value={actual.actualHotelCost}
              onChange={(e) => setActual({ ...actual, actualHotelCost: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="After booking" />
          </div>
        </div>
      </div>

      {/* Computed Display */}
      {computed && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Total Estimated:</span><span className="font-medium">${computed.estimated?.totalEstimatedCost?.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Quoted Price:</span><span className="font-medium text-blue-700">${computed.clientPricing?.quotedSellingPrice?.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Balance Due:</span><span className="font-medium text-amber-700">${computed.clientPricing?.balanceDue?.toLocaleString()}</span></div>
          {computed.actual?.totalActualCost > 0 && (
            <div className="flex justify-between"><span className="text-gray-500">Total Actual:</span><span className="font-medium">${computed.actual.totalActualCost?.toLocaleString()}</span></div>
          )}
          {profit != null && (
            <div className={`flex justify-between ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              <span>Profit:</span><span className="font-semibold">${profit.toLocaleString()}</span>
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
        <button onClick={handleApply} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Apply
        </button>
      </div>
    </div>
  );
}

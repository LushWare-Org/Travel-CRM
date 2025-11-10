import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { leadAPI, quotationAPI } from '../../../services/api';

const ItineraryDialog = ({ isOpen, onClose, lead, onSuccess }) => {
  const [itineraryDays, setItineraryDays] = useState([]);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [createdQuotationId, setCreatedQuotationId] = useState(null);
  const [quotationForm, setQuotationForm] = useState({ price: '', discount: '', inclusions: '', exclusions: '', notes: '' });

  useEffect(() => {
    if (isOpen && lead) {
      // Fetch itinerary when dialog opens
      (async () => {
        try {
          const it = await leadAPI.getItinerary(lead._id || lead.id);
          setItineraryDays(it?.data?.days || []);
        } catch {
          setItineraryDays([]);
        }
      })();
    }
  }, [isOpen, lead]);

  const handleSaveItinerary = async () => {
    try {
      await leadAPI.setItinerary(lead._id || lead.id, itineraryDays);
      toast.success('Itinerary saved successfully');
      onSuccess?.();
      onClose();
    } catch (e) {
      alert(e.message || 'Failed to save itinerary');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      await leadAPI.downloadItineraryPDF(lead._id || lead.id);
      toast.success('Itinerary PDF downloaded');
    } catch (e) {
      alert(e.message || 'Failed to download PDF');
    }
  };

  const handleSaveQuotation = async () => {
    try {
      const payload = {
        lead: lead._id || lead.id,
        totalAmount: Number(quotationForm.price) || 0,
        discount: Number(quotationForm.discount) || 0,
        inclusions: quotationForm.inclusions ? quotationForm.inclusions.split('\n').filter(Boolean) : [],
        exclusions: quotationForm.exclusions ? quotationForm.exclusions.split('\n').filter(Boolean) : [],
        notes: quotationForm.notes || '',
      };
      const res = await quotationAPI.create(payload);
      if (res.success) {
        setCreatedQuotationId(res.data._id || res.data.id);
        toast.success('Quotation created successfully');
      }
    } catch (e) {
      alert(e.message || 'Failed to create quotation');
    }
  };

  const handleDownloadQuotationPDF = async () => {
    try {
      if (!createdQuotationId) return;
      await quotationAPI.downloadPDF(createdQuotationId);
      toast.success('Quotation PDF downloaded');
    } catch (e) {
      alert(e.message || 'Failed to download quotation PDF');
    }
  };

  const handleSendQuotation = async () => {
    try {
      if (!createdQuotationId) return;
      const res = await quotationAPI.send(createdQuotationId);
      if (res.success) toast.success('Quotation sent to customer');
    } catch (e) {
      alert(e.message || 'Failed to send quotation');
    }
  };

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Itinerary - {lead.name}</h2>
            <p className="text-sm text-gray-600 mt-1">Add day-by-day plan</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 group">
            <X className="w-5 h-5 text-gray-700 group-hover:text-red-600 transition-colors duration-200" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {itineraryDays.length === 0 && (
            <div className="text-sm text-gray-600">No days yet. Click "Add Day" to start.</div>
          )}
          {itineraryDays.map((day, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day #</label>
                  <input 
                    type="number" 
                    value={day.dayNumber || idx + 1} 
                    onChange={(e) => {
                      const copy = [...itineraryDays];
                      copy[idx] = { ...copy[idx], dayNumber: parseInt(e.target.value || (idx + 1), 10) };
                      setItineraryDays(copy);
                    }} 
                    className="w-full px-3 py-2 border border-gray-300 rounded" 
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input 
                    type="text" 
                    value={day.title || `Day ${idx + 1}`} 
                    onChange={(e) => {
                      const copy = [...itineraryDays];
                      copy[idx] = { ...copy[idx], title: e.target.value };
                      setItineraryDays(copy);
                    }} 
                    className="w-full px-3 py-2 border border-gray-300 rounded" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination(s)</label>
                <input 
                  type="text" 
                  placeholder="e.g., Paris; Versailles" 
                  value={(day.locations || []).join('; ')} 
                  onChange={(e) => {
                    const copy = [...itineraryDays];
                    copy[idx] = { ...copy[idx], locations: e.target.value.split(';').map(s => s.trim()).filter(Boolean) };
                    setItineraryDays(copy);
                  }} 
                  className="w-full px-3 py-2 border border-gray-300 rounded" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activities</label>
                <input 
                  type="text" 
                  placeholder="e.g., Eiffel Tower; River Cruise" 
                  value={(day.activities || []).join('; ')} 
                  onChange={(e) => {
                    const copy = [...itineraryDays];
                    copy[idx] = { ...copy[idx], activities: e.target.value.split(';').map(s => s.trim()).filter(Boolean) };
                    setItineraryDays(copy);
                  }} 
                  className="w-full px-3 py-2 border border-gray-300 rounded" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hotel</label>
                <input 
                  type="text" 
                  placeholder="Hotel name" 
                  value={day.accommodation?.name || ''} 
                  onChange={(e) => {
                    const copy = [...itineraryDays];
                    copy[idx] = { ...copy[idx], accommodation: { ...(day.accommodation || {}), name: e.target.value } };
                    setItineraryDays(copy);
                  }} 
                  className="w-full px-3 py-2 border border-gray-300 rounded" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea 
                  value={day.notes || ''} 
                  onChange={(e) => {
                    const copy = [...itineraryDays];
                    copy[idx] = { ...copy[idx], notes: e.target.value };
                    setItineraryDays(copy);
                  }} 
                  className="w-full px-3 py-2 border border-gray-300 rounded" 
                />
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={() => {
                    setItineraryDays(itineraryDays.filter((_, i) => i !== idx));
                  }} 
                  className="px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                >
                  Remove Day
                </button>
              </div>
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => setItineraryDays([...itineraryDays, { dayNumber: itineraryDays.length + 1, title: `Day ${itineraryDays.length + 1}`, description: '' }])} 
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
            >
              Add Day
            </button>
            <button 
              onClick={handleSaveItinerary} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Save Itinerary
            </button>
            <button 
              onClick={handleDownloadPDF} 
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded hover:from-blue-700 hover:to-purple-700 transition-colors"
            >
              Download PDF
            </button>
            <button 
              onClick={() => {
                setShowQuotationForm((v) => !v);
                setCreatedQuotationId(null);
              }} 
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
            >
              {showQuotationForm ? 'Hide Quotation' : 'Create Quotation'}
            </button>
          </div>

          {showQuotationForm && (
            <div className="mt-4 border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (total)</label>
                  <input 
                    type="number" 
                    value={quotationForm.price} 
                    onChange={(e) => setQuotationForm({ ...quotationForm, price: e.target.value })} 
                    className="w-full px-3 py-2 border border-gray-300 rounded" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                  <input 
                    type="number" 
                    value={quotationForm.discount} 
                    onChange={(e) => setQuotationForm({ ...quotationForm, discount: e.target.value })} 
                    className="w-full px-3 py-2 border border-gray-300 rounded" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inclusions (one per line)</label>
                <textarea 
                  value={quotationForm.inclusions} 
                  onChange={(e) => setQuotationForm({ ...quotationForm, inclusions: e.target.value })} 
                  className="w-full px-3 py-2 border border-gray-300 rounded" 
                  rows={3} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exclusions (one per line)</label>
                <textarea 
                  value={quotationForm.exclusions} 
                  onChange={(e) => setQuotationForm({ ...quotationForm, exclusions: e.target.value })} 
                  className="w-full px-3 py-2 border border-gray-300 rounded" 
                  rows={3} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea 
                  value={quotationForm.notes} 
                  onChange={(e) => setQuotationForm({ ...quotationForm, notes: e.target.value })} 
                  className="w-full px-3 py-2 border border-gray-300 rounded" 
                  rows={3} 
                />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleSaveQuotation} 
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Save Quotation
                </button>
                <button 
                  disabled={!createdQuotationId} 
                  onClick={handleDownloadQuotationPDF} 
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50"
                >
                  Download Quotation (PDF)
                </button>
                <button 
                  disabled={!createdQuotationId} 
                  onClick={handleSendQuotation} 
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  Send Quotation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItineraryDialog;


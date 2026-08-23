import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { leadAPI, quotationAPI } from '../../../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface ItineraryDay {
  dayNumber?: number;
  title?: string;
  description?: string;
  locations?: string[];
  activities?: string[];
  accommodation?: { name?: string };
  notes?: string;
}

interface Lead {
  _id?: string;
  id?: string;
  name: string;
}

interface ItineraryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess?: () => void;
}

// Not currently mounted anywhere in the app (confirmed via grep, zero
// consumers) - superseded by features/itinerary's ItineraryEditor, which
// EditLeadDialog uses instead. Migrated for consistency with the rest of
// this phase rather than left behind, but flagged here (and in the
// progress log) as a real candidate for deletion in a future cleanup pass.
const ItineraryDialog = ({ isOpen, onClose, lead, onSuccess }: ItineraryDialogProps) => {
  const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>([]);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [createdQuotationId, setCreatedQuotationId] = useState<string | null>(null);
  const [quotationForm, setQuotationForm] = useState({ price: '', discount: '', inclusions: '', exclusions: '', notes: '' });

  useEffect(() => {
    if (isOpen && lead) {
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
    if (!lead) return;
    try {
      await leadAPI.setItinerary(lead._id || lead.id, itineraryDays);
      toast.success('Itinerary saved successfully');
      onSuccess?.();
      onClose();
    } catch (e: any) {
      alert(e.message || 'Failed to save itinerary');
    }
  };

  const handleDownloadPDF = async () => {
    if (!lead) return;
    try {
      await leadAPI.downloadItineraryPDF(lead._id || lead.id);
      toast.success('Itinerary PDF downloaded');
    } catch (e: any) {
      alert(e.message || 'Failed to download PDF');
    }
  };

  const handleSaveQuotation = async () => {
    if (!lead) return;
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
    } catch (e: any) {
      alert(e.message || 'Failed to create quotation');
    }
  };

  const handleDownloadQuotationPDF = async () => {
    try {
      if (!createdQuotationId) return;
      await quotationAPI.downloadPDF(createdQuotationId);
      toast.success('Quotation PDF downloaded');
    } catch (e: any) {
      alert(e.message || 'Failed to download quotation PDF');
    }
  };

  const handleSendQuotation = async () => {
    try {
      if (!createdQuotationId) return;
      const res = await quotationAPI.send(createdQuotationId);
      if (res.success) toast.success('Quotation sent to customer');
    } catch (e: any) {
      alert(e.message || 'Failed to send quotation');
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Itinerary - {lead.name}</DialogTitle>
          <DialogDescription>Add day-by-day plan</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {itineraryDays.length === 0 && (
            <div className="text-sm text-muted-foreground">No days yet. Click "Add Day" to start.</div>
          )}
          {itineraryDays.map((day, idx) => (
            <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Day #</label>
                  <Input
                    type="number"
                    value={day.dayNumber || idx + 1}
                    onChange={(e) => {
                      const copy = [...itineraryDays];
                      copy[idx] = { ...copy[idx], dayNumber: parseInt(e.target.value || String(idx + 1), 10) };
                      setItineraryDays(copy);
                    }}
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-foreground mb-1">Title</label>
                  <Input
                    type="text"
                    value={day.title || `Day ${idx + 1}`}
                    onChange={(e) => {
                      const copy = [...itineraryDays];
                      copy[idx] = { ...copy[idx], title: e.target.value };
                      setItineraryDays(copy);
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Destination(s)</label>
                <Input
                  type="text"
                  placeholder="e.g., Paris; Versailles"
                  value={(day.locations || []).join('; ')}
                  onChange={(e) => {
                    const copy = [...itineraryDays];
                    copy[idx] = { ...copy[idx], locations: e.target.value.split(';').map((s) => s.trim()).filter(Boolean) };
                    setItineraryDays(copy);
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Activities</label>
                <Input
                  type="text"
                  placeholder="e.g., Eiffel Tower; River Cruise"
                  value={(day.activities || []).join('; ')}
                  onChange={(e) => {
                    const copy = [...itineraryDays];
                    copy[idx] = { ...copy[idx], activities: e.target.value.split(';').map((s) => s.trim()).filter(Boolean) };
                    setItineraryDays(copy);
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Hotel</label>
                <Input
                  type="text"
                  placeholder="Hotel name"
                  value={day.accommodation?.name || ''}
                  onChange={(e) => {
                    const copy = [...itineraryDays];
                    copy[idx] = { ...copy[idx], accommodation: { ...(day.accommodation || {}), name: e.target.value } };
                    setItineraryDays(copy);
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
                <Textarea
                  value={day.notes || ''}
                  onChange={(e) => {
                    const copy = [...itineraryDays];
                    copy[idx] = { ...copy[idx], notes: e.target.value };
                    setItineraryDays(copy);
                  }}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setItineraryDays(itineraryDays.filter((_, i) => i !== idx))}
                >
                  Remove Day
                </Button>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setItineraryDays([...itineraryDays, { dayNumber: itineraryDays.length + 1, title: `Day ${itineraryDays.length + 1}`, description: '' }])}
            >
              Add Day
            </Button>
            <Button onClick={handleSaveItinerary}>
              Save Itinerary
            </Button>
            <Button variant="secondary" onClick={handleDownloadPDF}>
              Download PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowQuotationForm((v) => !v);
                setCreatedQuotationId(null);
              }}
            >
              {showQuotationForm ? 'Hide Quotation' : 'Create Quotation'}
            </Button>
          </div>

          {showQuotationForm && (
            <div className="mt-4 border border-border rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Price (total)</label>
                  <Input type="number" value={quotationForm.price} onChange={(e) => setQuotationForm({ ...quotationForm, price: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Discount</label>
                  <Input type="number" value={quotationForm.discount} onChange={(e) => setQuotationForm({ ...quotationForm, discount: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Inclusions (one per line)</label>
                <Textarea value={quotationForm.inclusions} onChange={(e) => setQuotationForm({ ...quotationForm, inclusions: e.target.value })} rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Exclusions (one per line)</label>
                <Textarea value={quotationForm.exclusions} onChange={(e) => setQuotationForm({ ...quotationForm, exclusions: e.target.value })} rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
                <Textarea value={quotationForm.notes} onChange={(e) => setQuotationForm({ ...quotationForm, notes: e.target.value })} rows={3} />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleSaveQuotation}>
                  Save Quotation
                </Button>
                <Button variant="secondary" disabled={!createdQuotationId} onClick={handleDownloadQuotationPDF}>
                  Download Quotation (PDF)
                </Button>
                <Button disabled={!createdQuotationId} onClick={handleSendQuotation} className="bg-success text-success-foreground hover:bg-success/80">
                  Send Quotation
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ItineraryDialog;

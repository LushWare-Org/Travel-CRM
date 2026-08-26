import { useState, useEffect } from 'react';
import { Building2, Plus, Loader2, Ban, AlertCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from '@/lib/toast';
import HotelService from '../../../services/hotel.service';
import { HotelSelectionModal } from '../../shared';
import { deriveItemState, ITEM_STATE_LABELS, ITEM_STATE_COLORS } from '../utils/bookingState';
import { Button } from '@/components/ui/button';

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(amount: number | null | undefined, currency: string | undefined) {
  if (amount == null) return '-';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount);
}

interface LeadHotelBookingsSectionProps {
  leadId?: string;
  leadStatus?: string;
  itineraryDays?: any[];
  travelDate?: string;
  endDate?: string;
  onUpdateDay?: (dayNumber: number, patch: any) => void;
}

export default function LeadHotelBookingsSection({
  leadId,
  leadStatus,
  itineraryDays = [],
  travelDate,
  endDate,
  onUpdateDay,
}: LeadHotelBookingsSectionProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showHotelModal, setShowHotelModal] = useState(false);
  const [hotelModalDay, setHotelModalDay] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(true);

  const fetchBookings = async () => {
    if (!leadId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await HotelService.getByLead(leadId);
      setBookings(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const handleCancelBooking = async (bookingId: string, reason: string) => {
    try {
      await HotelService.cancelBooking(bookingId, reason || 'Cancelled by agent');
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (err: any) {
      toast.error(err.message || 'Cancel failed');
    }
  };

  const handleBookHotel = (bookingData: any) => {
    const dayNumber = hotelModalDay;
    if (dayNumber && onUpdateDay) {
      const day = itineraryDays.find((d) => d.dayNumber === dayNumber);
      onUpdateDay(dayNumber, {
        accommodation: {
          ...(day?.accommodation || {}),
          bookingIds: [...(day?.accommodation?.bookingIds || []), bookingData.id],
          checkin: bookingData.checkin,
          checkout: bookingData.checkout,
          totalAmount: bookingData.totalAmount,
          currency: bookingData.currency,
        },
      });
    }
    fetchBookings();
  };

  // Days with accommodation data (hotelId set)
  const hotelDays = itineraryDays.filter((d) => d.accommodation?.name);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading hotel bookings...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-primary text-primary-foreground"
      >
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          <span className="font-semibold">Hotel Bookings</span>
          {bookings.length > 0 && (
            <span className="text-xs bg-primary-foreground/20 px-2 py-0.5 rounded-full">{bookings.length}</span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {expanded && (
        <div className="space-y-4 p-4 bg-muted/40 rounded-2xl border border-border">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
              <button onClick={fetchBookings} className="ml-auto text-destructive font-medium hover:underline">Retry</button>
            </div>
          )}

          {hotelDays.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Itinerary Hotels</div>
              {hotelDays.map((day) => {
                const dayBooking = bookings.find((b) => b.dayNumber === day.dayNumber);
                const booked = !!dayBooking && dayBooking.status !== 'cancelled' && dayBooking.status !== 'failed';
                const failed = !!dayBooking && dayBooking.status === 'failed';
                const itemState = deriveItemState(leadStatus ?? '', booked, failed);
                const stateLabel = ITEM_STATE_LABELS[itemState];
                const stateColor = ITEM_STATE_COLORS[itemState];
                return (
                  <div key={day.dayNumber} className="bg-card rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">Day {day.dayNumber}</span>
                        <span className="text-sm text-muted-foreground">{day.accommodation?.name}</span>
                        <span className={`px-1.5 py-0.5 text-xs rounded-full border ${stateColor}`}>
                          {stateLabel}
                        </span>
                      </div>
                      {itemState === 'PENDING' ? (
                        <Button type="button" disabled variant="secondary" size="sm">
                          <Building2 className="w-3.5 h-3.5" /> Select Hotel
                        </Button>
                      ) : itemState === 'READY_TO_BOOK' ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setHotelModalDay(day.dayNumber);
                            setShowHotelModal(true);
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" /> Book Now
                        </Button>
                      ) : itemState === 'BOOKED' ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {dayBooking.pnrCode && (
                            <span className="font-mono font-medium text-foreground">{dayBooking.pnrCode}</span>
                          )}
                          <span className="capitalize">{dayBooking.status}</span>
                          {dayBooking.supplierPortalUrl && (
                            <a href={dayBooking.supplierPortalUrl} target="_blank" rel="noopener noreferrer"
                               className="flex items-center gap-1 text-primary hover:text-primary/80">
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
                              className="flex items-center gap-1 text-destructive hover:text-destructive/80"
                            >
                              <Ban className="w-3 h-3" /> Cancel
                            </button>
                          )}
                        </div>
                      ) : itemState === 'FAILED' && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-destructive font-medium">Booking failed</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setHotelModalDay(day.dayNumber);
                              setShowHotelModal(true);
                            }}
                          >
                            <AlertCircle className="w-3.5 h-3.5" /> Resolve
                          </Button>
                        </div>
                      )}
                    </div>
                    {day.accommodation?.address && (
                      <div className="mt-1 text-xs text-muted-foreground">{day.accommodation.address}</div>
                    )}
                    {booked && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {fmtDate(dayBooking.checkin)} → {fmtDate(dayBooking.checkout)}{' · '}
                        {fmtMoney(dayBooking.totalAmount, dayBooking.currency)}
                      </div>
                    )}
                    {failed && (
                      <div className="mt-1 text-xs text-destructive">
                        Booking attempt failed — manual intervention required.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hotels in this itinerary</p>
              <p className="text-xs mt-1">Use the itinerary editor to search and select hotels</p>
            </div>
          )}
        </div>
      )}

      {/* Hotel Booking Modal */}
      {showHotelModal && (
        <HotelSelectionModal
          isOpen={showHotelModal}
          onClose={() => { setShowHotelModal(false); setHotelModalDay(null); }}
          mode="search"
          initialCheckin={travelDate ? itineraryDays.find((d) => d.dayNumber === hotelModalDay)?.accommodation?.checkin || travelDate : undefined}
          initialCheckout={endDate || undefined}
          travelers={1}
          leadContext={leadId ? { leadId, dayNumber: hotelModalDay } : {}}
          onBookHotel={handleBookHotel}
        />
      )}
    </div>
  );
}

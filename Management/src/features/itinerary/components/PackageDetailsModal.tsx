/**
 * Package Details Modal Component
 * Displays comprehensive information about a package
 */

import {
  Star, MapPin, Calendar, Briefcase,
  Tag, Banknote, Check, XCircle,
  Image as ImageIcon, CalendarDays, BookOpen, TrendingUp
} from 'lucide-react';
import ItineraryDisplay from './ItineraryDisplay';
import { formatPriceINR } from '../utils/helpers';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface PackageDetailsModalProps {
  pkg: any;
  onClose: () => void;
}

// Info Card Component
const InfoCard = ({ label, value, icon: Icon }: { label: string; value?: string | null; icon: any }) => (
  <div className="bg-card rounded-lg border border-border p-4 hover:shadow-card transition-shadow">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-semibold text-foreground mt-0.5">{value || 'N/A'}</p>
      </div>
    </div>
  </div>
);

// Section Component
const Section = ({ title, icon: Icon, children, className = '' }: { title: string; icon?: any; children: React.ReactNode; className?: string }) => (
  <div className={className}>
    <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      {title}
    </h4>
    {children}
  </div>
);

const PackageDetailsModal = ({ pkg, onClose }: PackageDetailsModalProps) => {
  if (!pkg) return null;

  const displayPrice = pkg.sellPrice ?? pkg.basePrice;
  const formattedPrice = displayPrice ? formatPriceINR(displayPrice) : null;
  const rawDays = Array.isArray(pkg.itineraryDays)
    ? pkg.itineraryDays
    : (Array.isArray(pkg.days) ? pkg.days : (Array.isArray(pkg.itinerary?.days) ? pkg.itinerary.days : []));
  // Map relational itineraryDays → display-friendly format
  const days = rawDays.filter(Boolean).map((d: any) => ({
    dayNumber: d.dayNumber,
    title: d.title || '',
    description: d.description || '',
    locations: (Array.isArray(d.places) ? d.places : []).map((p: any) => p.place?.name || p.customName).filter(Boolean),
    activities: (Array.isArray(d.activities) ? d.activities : []).map((a: any) => a.activity?.name || a.name || '').filter(Boolean),
    meals: d.meals || { breakfast: (d.breakfastCount || 0) > 0, lunch: (d.lunchCount || 0) > 0, dinner: (d.dinnerCount || 0) > 0 },
    transport: (Array.isArray(d.transports) && d.transports[0]?.transportMode?.toLowerCase()) || d.transport || 'car',
    places: (Array.isArray(d.places) ? d.places : []).map((p: any) => ({ name: p.place?.name || p.customName || '' })),
  }));
  const nights = pkg.durationDays ? pkg.durationDays - 1 : 0;

  return (
    <Dialog open={!!pkg} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pr-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-heading font-bold text-foreground">{pkg.title}</h2>
              <Badge className={pkg.isActive ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                {pkg.isActive ? 'Active' : 'Draft'}
              </Badge>
            </div>
            {pkg.description && (
              <p className="text-muted-foreground text-sm line-clamp-2">{pkg.description}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <InfoCard
              label="Category"
              value={pkg.category ? pkg.category.charAt(0).toUpperCase() + pkg.category.slice(1) : 'N/A'}
              icon={Tag}
            />
            <InfoCard
              label="Destination"
              value={pkg.destination}
              icon={MapPin}
            />
            <InfoCard
              label="Duration"
              value={pkg.durationDays ? `${pkg.durationDays}D / ${nights}N` : 'N/A'}
              icon={Calendar}
            />
            <InfoCard
              label="Price"
              value={formattedPrice}
              icon={Banknote}
            />
            <InfoCard
              label="Margin"
              value={pkg.defaultMarginType === 'PERCENTAGE' ? `${pkg.defaultMarginInput}%` : `$${pkg.defaultMarginInput}`}
              icon={TrendingUp}
            />
            <InfoCard
              label="Reviews"
              value={`${pkg.rating || 0} (${pkg.numReviews || 0})`}
              icon={Star}
            />
          </div>

          {/* Inclusions & Exclusions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Inclusions */}
            {pkg.inclusions && pkg.inclusions.length > 0 && (
              <div className="bg-success/5 rounded-lg border border-success/10 p-5">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-success mb-4">
                  <Check className="w-4 h-4" />
                  Inclusions
                </h4>
                <ul className="space-y-2">
                  {pkg.inclusions.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Exclusions */}
            {pkg.exclusions && pkg.exclusions.length > 0 && (
              <div className="bg-destructive/5 rounded-lg border border-destructive/10 p-5">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-destructive mb-4">
                  <XCircle className="w-4 h-4" />
                  Exclusions
                </h4>
                <ul className="space-y-2">
                  {pkg.exclusions.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                      <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Images */}
          {pkg.images && pkg.images.length > 0 && (
            <Section title="Package Images" icon={ImageIcon}>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {pkg.images.map((image: any, index: number) => {
                  const imageUrl = typeof image === 'string' ? image : image.url;
                  return (
                    <div
                      key={index}
                      className="aspect-square rounded-lg overflow-hidden border-2 border-border hover:border-primary/40 transition-colors shadow-card"
                    >
                      <img
                        src={imageUrl}
                        alt={`Package Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Itinerary */}
          <Section title="Day-wise Itinerary" icon={CalendarDays}>
            {Array.isArray(days) && days.length > 0 ? (
              <ItineraryDisplay days={days} />
            ) : (
              <div className="bg-muted rounded-lg border border-dashed border-border p-8 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No itinerary specified</p>
              </div>
            )}
          </Section>

          {/* Rating and Reviews */}
          <div className="bg-warning/5 rounded-lg border border-warning/10 p-5">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 fill-warning text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-warning">{pkg.rating || 0}</p>
                  <p className="text-xs text-warning">out of 5</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-warning">{pkg.numReviews || 0}</p>
                  <p className="text-xs text-warning">reviews</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-warning">{pkg.bookings || 0}</p>
                  <p className="text-xs text-warning">bookings</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PackageDetailsModal;

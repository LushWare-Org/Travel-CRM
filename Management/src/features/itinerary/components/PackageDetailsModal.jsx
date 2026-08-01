/**
 * Package Details Modal Component - Redesigned
 * Modern premium modal for viewing package details
 * Displays comprehensive information about a package
 */

import {
  X, Star, MapPin, Calendar, Users, Briefcase,
  Tag, Banknote, Check, XCircle, Sparkles,
  Image as ImageIcon, CalendarDays, BookOpen, TrendingUp
} from 'lucide-react';
import ItineraryDisplay from './ItineraryDisplay';
import { formatPriceINR } from '../utils/helpers';
import { STATUS_COLORS } from '../utils/constants';

const PackageDetailsModal = ({ pkg, onClose }) => {
  if (!pkg) return null;

  const formattedPrice = pkg.basePrice ? formatPriceINR(pkg.basePrice) : null;
  const rawDays = pkg.itineraryDays || pkg.days || pkg.itinerary?.days || [];
  // Map relational itineraryDays → display-friendly format
  const days = rawDays.map(d => ({
    dayNumber: d.dayNumber,
    title: d.title || '',
    description: d.description || '',
    locations: (d.places || []).map(p => p.place?.name || p.customName).filter(Boolean),
    activities: (d.activities || []).map(a => a.activity?.name || a.name || '').filter(Boolean),
    meals: d.meals || { breakfast: (d.breakfastCount || 0) > 0, lunch: (d.lunchCount || 0) > 0, dinner: (d.dinnerCount || 0) > 0 },
    transport: (d.transports || [])[0]?.transportMode?.toLowerCase() || d.transport || 'car',
    places: (d.places || []).map(p => ({ name: p.place?.name || p.customName || '' })),
  }));
  const nights = pkg.durationDays ? pkg.durationDays - 1 : 0;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Info Card Component
  const InfoCard = ({ label, value, icon: Icon, gradient = 'from-slate-500 to-slate-600' }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="font-semibold text-slate-800 mt-0.5">{value || 'N/A'}</p>
        </div>
      </div>
    </div>
  );

  // Section Component
  const Section = ({ title, icon: Icon, children, className = '' }) => (
    <div className={className}>
      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        {title}
      </h4>
      {children}
    </div>
  );

  // Get status color and icon
  const getStatusBadge = (status) => {
    const styles = {
      published: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      draft: 'bg-amber-100 text-amber-700 border-amber-200',
      archived: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return styles[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200/50">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-8 py-6">
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full transform -translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-white">{pkg.title}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${pkg.isActive ? 'bg-green-100 text-green-800 border-green-300' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                  {pkg.isActive ? 'Active' : 'Draft'}
                </span>
              </div>
              {pkg.description && (
                <p className="text-violet-100 text-sm line-clamp-2">{pkg.description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all text-white"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(92vh-140px)] bg-gradient-to-b from-slate-50 to-white">
          <div className="p-8 space-y-6">
            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <InfoCard
                label="Category"
                value={pkg.category ? pkg.category.charAt(0).toUpperCase() + pkg.category.slice(1) : 'N/A'}
                icon={Tag}
                gradient="from-blue-500 to-indigo-600"
              />
              <InfoCard
                label="Destination"
                value={pkg.destination}
                icon={MapPin}
                gradient="from-emerald-500 to-teal-600"
              />
              <InfoCard
                label="Duration"
                value={pkg.durationDays ? `${pkg.durationDays}D / ${nights}N` : 'N/A'}
                icon={Calendar}
                gradient="from-amber-500 to-orange-600"
              />
              <InfoCard
                label="Price"
                value={formattedPrice}
                icon={Banknote}
                gradient="from-violet-500 to-purple-600"
              />
              <InfoCard
                label="Margin"
                value={pkg.defaultMarginType === 'PERCENTAGE' ? `${pkg.defaultMarginInput}%` : `$${pkg.defaultMarginInput}`}
                icon={TrendingUp}
                gradient="from-rose-500 to-pink-600"
              />
              <InfoCard
                label="Reviews"
                value={`${pkg.rating || 0} (${pkg.numReviews || 0})`}
                icon={Star}
                gradient="from-cyan-500 to-blue-600"
              />
            </div>

            {/* Inclusions & Exclusions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Inclusions */}
              {pkg.inclusions && pkg.inclusions.length > 0 && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 p-5">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-800 mb-4">
                    <Check className="w-4 h-4" />
                    Inclusions
                  </h4>
                  <ul className="space-y-2">
                    {pkg.inclusions.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-emerald-700">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Exclusions */}
              {pkg.exclusions && pkg.exclusions.length > 0 && (
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl border border-rose-100 p-5">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-rose-800 mb-4">
                    <XCircle className="w-4 h-4" />
                    Exclusions
                  </h4>
                  <ul className="space-y-2">
                    {pkg.exclusions.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-rose-700">
                        <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
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
                  {pkg.images.map((image, index) => {
                    const imageUrl = typeof image === 'string' ? image : image.url;
                    return (
                      <div
                        key={index}
                        className="aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-violet-400 transition-all shadow-sm hover:shadow-md group"
                      >
                        <img
                          src={imageUrl}
                          alt={`Package Image ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-8 text-center">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No itinerary specified</p>
                </div>
              )}
            </Section>

            {/* Rating and Reviews */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100 p-5">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-700">{pkg.rating || 0}</p>
                    <p className="text-xs text-amber-600">out of 5</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-700">{pkg.numReviews || 0}</p>
                    <p className="text-xs text-amber-600">reviews</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-700">{pkg.bookings || 0}</p>
                    <p className="text-xs text-amber-600">bookings</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageDetailsModal;

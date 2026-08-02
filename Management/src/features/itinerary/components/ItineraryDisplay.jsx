/**
 * Itinerary Display Component - Redesigned
 * Modern read-only itinerary view with premium styling
 * Aligned with backend day-based structure
 */

import {
  MapPin, Activity, Utensils, Car, Building2,
  StickyNote, Image as ImageIcon, Coffee, UtensilsCrossed,
  Moon, Star, Phone, MapPinned, Clock, Calendar
} from 'lucide-react';

const ItineraryDisplay = ({ days = [] }) => {
  if (!days || days.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center">
        <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-slate-500 font-medium">No itinerary data available</p>
      </div>
    );
  }

  // Info Badge Component
  const InfoBadge = ({ icon: Icon, children, variant = 'default' }) => {
    const variants = {
      default: 'bg-slate-100 text-slate-700 border-slate-200',
      success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      warning: 'bg-amber-50 text-amber-700 border-amber-200',
      info: 'bg-blue-50 text-blue-700 border-blue-200',
      purple: 'bg-violet-50 text-violet-700 border-violet-200',
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium ${variants[variant]}`}>
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {children}
      </span>
    );
  };

  // Section Component
  const Section = ({ label, icon: Icon, children }) => (
    <div>
      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        {label}
      </h4>
      {children}
    </div>
  );

  return (
    <div className="space-y-4">
      {(days || []).filter(Boolean).map((day) => {
        const locations = Array.isArray(day.locations) ? day.locations : [];
        const activities = Array.isArray(day.activities) ? day.activities : [];
        return (
        <div key={day.dayNumber} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Day Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold">{day.dayNumber}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  Day {day.dayNumber}{day.title ? `: ${day.title}` : ''}
                </h3>
                {locations.length > 0 && (
                  <p className="text-amber-100 text-sm flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {locations.slice(0, 3).join(' → ')}
                    {locations.length > 3 && ` +${locations.length - 3} more`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Day Content */}
          <div className="p-6 bg-gradient-to-b from-amber-50/30 to-white space-y-5">
            {/* Description */}
            {day.description && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">{day.description}</p>
              </div>
            )}

            {/* Locations Covered */}
            {locations.length > 0 && (
              <Section label="Locations Covered" icon={MapPin}>
                <div className="flex flex-wrap gap-2">
                  {locations.map((location, idx) => (
                    <InfoBadge key={idx} icon={MapPinned} variant="success">
                      {location}
                    </InfoBadge>
                  ))}
                </div>
              </Section>
            )}

            {/* Activities */}
            {activities.length > 0 && (
              <Section label="Activities" icon={Activity}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activities.map((activity, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-100">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      <span className="text-sm">{activity}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Meals and Transport Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Meals */}
              {day.meals && (day.meals.breakfast || day.meals.lunch || day.meals.dinner) && (
                <Section label="Meals Included" icon={Utensils}>
                  <div className="flex flex-wrap gap-2">
                    {day.meals.breakfast && (
                      <InfoBadge icon={Coffee} variant="warning">Breakfast</InfoBadge>
                    )}
                    {day.meals.lunch && (
                      <InfoBadge icon={UtensilsCrossed} variant="warning">Lunch</InfoBadge>
                    )}
                    {day.meals.dinner && (
                      <InfoBadge icon={Moon} variant="purple">Dinner</InfoBadge>
                    )}
                  </div>
                </Section>
              )}

              {/* Transport */}
              {day.transport && (
                <Section label="Transport" icon={Car}>
                  <InfoBadge variant="info">
                    {day.transport === 'flight' && '✈️ '}
                    {day.transport === 'train' && '🚂 '}
                    {day.transport === 'bus' && '🚌 '}
                    {day.transport === 'car' && '🚗 '}
                    {day.transport === 'boat' && '⛵ '}
                    {day.transport === 'walk' && '🚶 '}
                    {day.transport.charAt(0).toUpperCase() + day.transport.slice(1)}
                  </InfoBadge>
                </Section>
              )}
            </div>

            {/* Accommodation */}
            {day.accommodation && day.accommodation.name && (
              <Section label="Accommodation" icon={Building2}>
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <h5 className="font-semibold text-slate-800 text-base">{day.accommodation.name}</h5>
                      {day.accommodation.type && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-md capitalize">
                          {day.accommodation.type === 'hotel' && '🏨 '}
                          {day.accommodation.type === 'resort' && '🌴 '}
                          {day.accommodation.type === 'guesthouse' && '🏡 '}
                          {day.accommodation.type === 'homestay' && '🏠 '}
                          {day.accommodation.type === 'camp' && '⛺ '}
                          {day.accommodation.type}
                        </span>
                      )}
                    </div>
                    {day.accommodation.rating > 0 && (
                      <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-lg">
                        <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                        <span className="font-semibold">{day.accommodation.rating}</span>
                        <span className="text-xs text-amber-600">/5</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {day.accommodation.address && (
                      <p className="text-slate-600 text-sm flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {day.accommodation.address}
                      </p>
                    )}
                    {day.accommodation.contactNumber && (
                      <p className="text-slate-600 text-sm flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {day.accommodation.contactNumber}
                      </p>
                    )}
                  </div>
                </div>
              </Section>
            )}

            {/* Places */}
            {Array.isArray(day.places) && day.places.length > 0 && (
              <Section label="Places to Visit" icon={MapPin}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {day.places.map((place, idx) => (
                    <div key={idx} className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                      <p className="font-medium text-emerald-800">{place.name}</p>
                      {place.description && (
                        <p className="text-emerald-600 text-sm mt-1">{place.description}</p>
                      )}
                      {place.duration && (
                        <p className="text-emerald-500 text-xs mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {place.duration}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Notes */}
            {day.notes && (
              <Section label="Additional Notes" icon={StickyNote}>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <p className="text-amber-800 text-sm">{day.notes}</p>
                </div>
              </Section>
            )}

            {/* Day Images */}
            {Array.isArray(day.images) && day.images.length > 0 && (
              <Section label="Day Images" icon={ImageIcon}>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {day.images.map((img, idx) => {
                    const imageUrl = typeof img === 'string' ? img : img.url;
                    return (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-amber-400 transition-all shadow-sm hover:shadow-md group">
                        <img
                          src={imageUrl}
                          alt={`Day ${day.dayNumber} Image ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50" y="50" text-anchor="middle" dominant-baseline="middle"%3EImage%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
};

export default ItineraryDisplay;

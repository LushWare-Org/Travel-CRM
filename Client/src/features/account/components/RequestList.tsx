import { ArrowRight, Calendar, Clock, MapPin, Users } from 'lucide-react';
import { formatCurrency } from '../../../lib/currency';

export type AccountTab = 'bookings' | 'customized' | 'manual';

/**
 * A request/booking/plan card. All fields are optional because the three
 * tabs (regular bookings, customized packages, manual itineraries) render
 * different subsets of the same card layout.
 */
export interface RequestCardItem {
  _id?: string;
  id?: string;
  name?: string;
  notes?: string;
  isCustomized?: boolean;
  customizedPackageId?: string | null;
  isFromBooking?: boolean;
  package?: {
    _id?: string;
    id?: string;
    name?: string;
    destination?: string;
    images?: { url?: string }[];
  };
  packageName?: string;
  destination?: string;
  coverImage?: { url?: string };
  images?: { url?: string }[];
  travelDate?: string;
  numberOfTravelers?: number;
  paymentStatus?: string;
  bookingStatus?: string;
  totalAmount?: number;
  createdAt?: string;
  price?: number;
  duration?: number | string;
  maxGroupSize?: number | string;
  status?: string;
  days?: unknown[];
  lead?: {
    name?: string;
    destination?: string;
    numberOfTravelers?: number;
  };
}

interface RequestListProps {
  activeTab: AccountTab;
  items: RequestCardItem[];
  onExplorePackages: () => void;
  onViewDetails: (packageId?: string) => void;
}

const getStatusColor = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusBadge = (status?: string) => {
  return (
    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending'}
    </span>
  );
};

export default function RequestList({ activeTab, items, onExplorePackages, onViewDetails }: RequestListProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-16 text-center">
        <div className="mb-6">
          <Calendar className="w-20 h-20 text-gray-300 mx-auto" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          {activeTab === 'bookings' && 'No Regular Bookings'}
          {activeTab === 'customized' && 'No Customized Packages'}
          {activeTab === 'manual' && 'No Trip Plans'}
        </h3>
        <p className="text-gray-600 mb-8 text-lg">
          {activeTab === 'bookings' && "You haven't made any regular bookings yet. Start planning your next adventure!"}
          {activeTab === 'customized' && "You haven't created any customized packages yet. Create your perfect trip!"}
          {activeTab === 'manual' && "You haven't created any trip plans yet. Plan your journey with us!"}
        </p>
        <button
          onClick={onExplorePackages}
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-brand-500 to-brand-accent-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transform hover:scale-105 transition-all"
        >
          Explore Packages
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {items.map((item) => (
        <div
          key={item._id || item.id}
          className="group bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-2xl hover:border-brand-300 transition-all duration-300"
        >
          <div className="relative h-64 overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
            {item.package?.images?.[0]?.url || item.coverImage?.url || item.images?.[0]?.url ? (
              <>
                <img
                  src={item.package?.images?.[0]?.url || item.coverImage?.url || item.images?.[0]?.url}
                  alt={item.package?.name || item.name || 'Trip'}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="w-16 h-16 text-gray-400" />
              </div>
            )}
            <div className="absolute top-4 right-4">
              {getStatusBadge(activeTab === 'bookings' ? item.bookingStatus : item.status || 'pending')}
            </div>
            <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur rounded-xl px-4 py-2">
              <p className="text-xs text-gray-600 font-semibold">
                {activeTab === 'bookings' ? 'Total Amount' : activeTab === 'customized' ? 'Price per Person' : 'Duration'}
              </p>
              <p className="text-2xl font-black text-brand-600">
                {activeTab === 'bookings' && formatCurrency(item.totalAmount)}
                {activeTab === 'customized' && formatCurrency(item.price)}
                {activeTab === 'manual' && `${item.days?.length || 0} Days`}
              </p>
            </div>
          </div>
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
              {activeTab === 'bookings' && (item.package?.name || item.packageName || 'Package')}
              {activeTab === 'customized' && (item.name || 'Customized Package')}
              {activeTab === 'manual' && (item.lead?.name || 'Trip Plan')}
            </h3>
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <MapPin className="w-4 h-4 text-brand-500 flex-shrink-0" />
              <span className="line-clamp-1">
                {activeTab === 'bookings' && (item.package?.destination || item.destination || 'N/A')}
                {activeTab === 'customized' && (item.destination || 'N/A')}
                {activeTab === 'manual' && (item.lead?.destination || 'N/A')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6 py-4 border-t border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                  {activeTab === 'bookings' ? 'Travel Date' : activeTab === 'customized' ? 'Duration' : 'Days'}
                </p>
                <div className="flex items-center gap-1 text-gray-900 font-bold">
                  <Calendar className="w-4 h-4 text-brand-500" />
                  <span className="text-sm">
                    {activeTab === 'bookings' && (
                      item.travelDate
                        ? new Date(item.travelDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'N/A'
                    )}
                    {activeTab === 'customized' && `${item.duration} days`}
                    {activeTab === 'manual' && `${item.days?.length || 0} days`}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                  {activeTab === 'bookings' ? 'Travelers' : 'Group Size'}
                </p>
                <div className="flex items-center gap-1 text-gray-900 font-bold">
                  <Users className="w-4 h-4 text-brand-500" />
                  <span className="text-sm">
                    {activeTab === 'bookings' && (item.numberOfTravelers || 1)}
                    {activeTab === 'customized' && (item.maxGroupSize || 'Any')}
                    {activeTab === 'manual' && (item.lead?.numberOfTravelers || 1)}
                  </span>
                </div>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-2">
                {activeTab === 'bookings' ? 'Payment Status' : 'Request Status'}
              </p>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    activeTab === 'bookings'
                      ? item.paymentStatus === 'paid'
                        ? 'bg-green-500'
                        : item.paymentStatus === 'partial'
                        ? 'bg-brand-accent-500'
                        : 'bg-red-500'
                      : item.status === 'confirmed' || item.status === 'completed'
                      ? 'bg-green-500'
                      : item.status === 'pending'
                      ? 'bg-brand-accent-500'
                      : 'bg-gray-500'
                  }`}
                />
                <span className="font-semibold text-gray-900 text-sm capitalize">
                  {activeTab === 'bookings' && (item.paymentStatus || 'Pending')}
                  {(activeTab === 'customized' || activeTab === 'manual') && (item.status || 'Pending')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-6">
              <Clock className="w-4 h-4 text-brand-500" />
              <span>
                {activeTab === 'bookings' && 'Booked on'} {(activeTab === 'customized' || activeTab === 'manual') && 'Created on'}{' '}
                {(() => {
                  const dateValue = item.createdAt || item.travelDate;
                  return dateValue
                    ? new Date(dateValue).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'N/A';
                })()}
              </span>
            </div>
            {activeTab === 'bookings' && (
              <button
                onClick={() => {
                  onViewDetails(item.package?._id || item.package?.id);
                }}
                className="w-full px-4 py-3 bg-black text-white rounded-lg font-bold hover:shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                View Details
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

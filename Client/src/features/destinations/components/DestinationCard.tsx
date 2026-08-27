import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { formatCurrency } from '../../../lib/currency';
import { FALLBACK_IMAGE } from '../../../config/media';
import type { PreparedDestination } from '../DestinationsContainer';

interface DestinationCardProps {
  dest: PreparedDestination;
}

export default function DestinationCard({ dest }: DestinationCardProps) {
  return (
    <Link
      to={`/packages?destination=${dest.slug}`}
      className="group bg-white rounded-2xl overflow-hidden border-2 border-gray-200 transition-all duration-300 transform flex flex-col h-full"
    >
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent z-raised pointer-events-none"></div>
      <div className="relative overflow-hidden h-48">
        <picture>
          <source
            srcSet={(dest.image_url || FALLBACK_IMAGE)?.replace(/\.(jpg|jpeg|png)$/i, '.webp')}
            type="image/webp"
          />
          <img
            src={dest.image_url || FALLBACK_IMAGE}
            alt={dest.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-brand-accent-400" />
              <span className="text-sm">{dest.duration}</span>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute inset-0 p-6 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-500 text-white">
        </div>
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-2 mb-2">
          {dest.name}, {dest.country}
        </h3>
        <p className="text-gray-600 text-sm line-clamp-2 mb-3 flex-grow">{dest.description}</p>
        <div className="flex items-center justify-between py-3 border-t border-gray-200 mb-3">
          <div className="text-center flex-1">
            <div className="text-sm font-bold text-gray-900">{dest.duration}</div>
            <p className="text-xs text-gray-500">Duration</p>
          </div>
          <div className="border-l border-gray-200"></div>
          <div className="text-center flex-1">
            <div className="text-sm font-bold text-gray-900">{dest.packagesCount}</div>
            <p className="text-xs text-gray-500">Packages</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Starting from</p>
            <p className="text-lg font-bold text-brand-600">{formatCurrency(dest.price)}</p>
          </div>
          <button className="px-4 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gradient-to-r hover:from-gray-700 hover:to-gray-900 transition-all duration-300 shadow-md hover:shadow-xl text-xs whitespace-nowrap">
            View Details
          </button>
        </div>
      </div>
    </Link>
  );
}

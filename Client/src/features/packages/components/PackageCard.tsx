import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { formatCurrency } from '../../../lib/currency';
import type { EnrichedPackage } from '../PackagesContainer';

interface PackageCardProps {
  pkg: EnrichedPackage;
}

export default function PackageCard({ pkg }: PackageCardProps) {
  return (
    <Link
      to={`/package/${pkg.id}`}
      className="group bg-white rounded-2xl overflow-hidden border-2 border-gray-200 transition-all duration-300 transform flex flex-col h-full"
    >
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent z-10 pointer-events-none"></div>
      <div className="relative overflow-hidden h-48">
        <picture>
          <source
            srcSet={(pkg.images && pkg.images[0])?.replace(/\.(jpg|jpeg|png)$/i, '.webp') || (pkg.image_url?.replace(/\.(jpg|jpeg|png)$/i, '.webp') || '')}
            type="image/webp"
          />
          <img
            src={(pkg.images && pkg.images[0]) || pkg.image_url}
            alt={pkg.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-brand-accent-400" />
              <span className="text-sm">{pkg.durationLabel}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-2 mb-2">
          {pkg.title}
        </h3>
        <p className="text-gray-600 text-sm line-clamp-2 mb-3 h-10 overflow-hidden">{pkg.description}</p>
        <div className="flex items-center justify-between py-3 border-t border-gray-200 mb-3">
          <div className="text-center flex-1">
            <div className="text-sm font-bold text-gray-900">{pkg.durationLabel}</div>
            <p className="text-xs text-gray-500">Duration</p>
          </div>
          <div className="border-l border-gray-200"></div>
          <div className="text-center flex-1">
            <div className="text-sm font-bold text-gray-900">{pkg.rating || 'N/A'}</div>
            <p className="text-xs text-gray-500">Rating</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Starting from</p>
            <p className="text-lg font-bold text-brand-600">{formatCurrency(pkg.price_from)}</p>
          </div>
          <button className="px-4 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gradient-to-r hover:from-gray-700 hover:to-gray-900 transition-all duration-300 shadow-md hover:shadow-xl text-xs whitespace-nowrap">
            View Details
          </button>
        </div>
      </div>
    </Link>
  );
}

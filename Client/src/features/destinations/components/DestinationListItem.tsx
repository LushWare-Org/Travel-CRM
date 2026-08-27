import { Link, useNavigate } from 'react-router-dom';
import { Clock, Sun, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../../lib/currency';
import { pluralize } from '../../../lib/pluralize';
import { FALLBACK_IMAGE } from '../../../config/media';
import type { PreparedDestination } from '../DestinationsContainer';

interface DestinationListItemProps {
  dest: PreparedDestination;
}

export default function DestinationListItem({ dest }: DestinationListItemProps) {
  const navigate = useNavigate();
  const openDestination = () => navigate(`/packages?destination=${dest.slug}`);

  return (
    <div
      onClick={openDestination}
      onKeyDown={(e) => { if (e.key === 'Enter') openDestination(); }}
      role="button"
      tabIndex={0}
      className="group bg-white rounded-2xl overflow-hidden border-2 border-gray-100 hover:shadow-2xl hover:border-brand-accent-500 transition-all duration-300 cursor-pointer"
    >
      <div className="flex flex-col lg:flex-row">
        <div className="relative lg:w-80 h-64 lg:h-80 overflow-hidden flex-shrink-0">
          <img
            src={dest.image_url || FALLBACK_IMAGE}
            alt={dest.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
        </div>
        <div className="flex-1 p-4 lg:p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-brand-600 transition-colors">
                {dest.name}, {dest.country}
              </h3>
            </div>
          </div>
          <p className="text-gray-600 mb-5 line-clamp-2">{dest.description}</p>
          <div className="flex flex-wrap gap-6 text-sm text-gray-600 mb-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>{dest.duration || 'Flexible'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Sun className="w-4 h-4" />
              <span>{pluralize(dest.packagesCount, 'curated package')}</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div>
              <p className="text-xs text-gray-500 mb-1">Starting Price</p>
              <p className="text-3xl font-bold text-brand-600">{formatCurrency(dest.price)}</p>
            </div>
            <Link
              to={`/packages?destination=${dest.slug}`}
              onClick={(e) => e.stopPropagation()}
              className="px-8 py-3 bg-black hover:bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center space-x-2"
            >
              <span>View Packages</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

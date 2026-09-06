import { Link, useNavigate } from 'react-router-dom';
import { Clock, Sun, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../../lib/currency';
import { pluralize } from '../../../lib/pluralize';
import { FALLBACK_IMAGE } from '../../../config/media';
import type { PreparedDestination } from '../DestinationsContainer';

interface DestinationListItemProps {
  dest: PreparedDestination;
}

/**
 * List-row card for the destinations listing. The whole row opens the
 * packages listing filtered to this destination
 * (`/packages?destination=<slug>`); a destination with no packages shows a
 * "No packages yet" note instead of a misleading "0 curated packages" line
 * and still links to that page's graceful empty state. In-flow elevation is
 * the hairline border plus the photography (DESIGN.md) — hover is border/
 * color movement, never shadow.
 */
export default function DestinationListItem({ dest }: DestinationListItemProps) {
  const navigate = useNavigate();
  const openDestination = () => navigate(`/packages?destination=${dest.slug}`);
  const hasPackages = dest.packagesCount > 0;

  return (
    <div
      onClick={openDestination}
      onKeyDown={(e) => { if (e.key === 'Enter') openDestination(); }}
      role="button"
      tabIndex={0}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors duration-300 hover:border-gray-300"
    >
      <div className="flex flex-col lg:flex-row">
        <div className="relative h-64 shrink-0 overflow-hidden bg-gray-100 lg:h-auto lg:w-80">
          <img
            src={dest.image_url || FALLBACK_IMAGE}
            alt={dest.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        </div>
        <div className="flex flex-1 flex-col p-5 lg:p-6">
          <h3 className="mb-2 text-xl font-bold text-gray-900 transition-colors duration-300 group-hover:text-brand-600 lg:text-2xl">
            {dest.name}, {dest.country}
          </h3>
          <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-gray-600">{dest.description}</p>

          <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{dest.duration || 'Flexible'}</span>
            </span>
            {hasPackages ? (
              <span className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                <span>{pluralize(dest.packagesCount, 'curated package')}</span>
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                No packages yet
              </span>
            )}
          </div>

          <div className="mt-auto flex items-center border-t border-gray-200 pt-4">
            {hasPackages && dest.price > 0 ? (
              <div>
                <p className="mb-1 text-xs text-gray-500">Starting Price</p>
                <p className="font-display text-xl font-bold text-brand-600">{formatCurrency(dest.price)}</p>
              </div>
            ) : null}
            <Link
              to={`/packages?destination=${dest.slug}`}
              onClick={(e) => e.stopPropagation()}
              className={`ml-auto inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-colors duration-300 ${
                hasPackages
                  ? 'bg-brand-800 text-white group-hover:bg-brand-900'
                  : 'border border-gray-200 bg-white text-gray-700 group-hover:border-brand-300 group-hover:text-brand-600'
              }`}
            >
              <span>View Packages</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

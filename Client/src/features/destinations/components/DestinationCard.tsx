import { Link } from 'react-router-dom';
import { formatCurrency } from '../../../lib/currency';
import { FALLBACK_IMAGE } from '../../../config/media';
import type { PreparedDestination } from '../DestinationsContainer';

interface DestinationCardProps {
  dest: PreparedDestination;
}

/**
 * Grid card for the destinations listing. The whole card is a Link into the
 * packages listing filtered to this destination
 * (`/packages?destination=<slug>`) — that page renders its own empty state,
 * so a destination with no packages still lands somewhere sensible, never a
 * dead end. Elevation is the hairline border plus the photography
 * (DESIGN.md Elevation & Depth); hover feedback is border/color movement,
 * not shadow. Destinations carry region/country/package-count data rather
 * than one package price, so they stay a distinct card from the shared
 * PackageCard.
 */
export default function DestinationCard({ dest }: DestinationCardProps) {
  const hasPackages = dest.packagesCount > 0;

  return (
    <Link
      to={`/packages?destination=${dest.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors duration-300 hover:border-gray-300"
    >
      <div className="relative h-48 shrink-0 overflow-hidden bg-gray-100">
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
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        </picture>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"
        />
      </div>

      <div className="flex flex-1 flex-col p-5 lg:p-6">
        <h3 className="mb-2 line-clamp-2 text-lg font-bold text-gray-900 transition-colors duration-300 group-hover:text-brand-600">
          {dest.name}, {dest.country}
        </h3>
        <p className="mb-4 flex-1 line-clamp-2 text-sm leading-relaxed text-gray-600">{dest.description}</p>

        <div className="mb-4 flex items-stretch border-t border-gray-200 py-3">
          <div className="flex flex-1 flex-col items-center justify-center gap-0.5">
            <span className="text-sm font-bold text-gray-900">{dest.duration}</span>
            <span className="text-xs text-gray-500">Duration</span>
          </div>
          <div aria-hidden="true" className="border-l border-gray-200" />
          {hasPackages ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-0.5">
              <span className="text-sm font-bold text-gray-900">{dest.packagesCount}</span>
              <span className="text-xs text-gray-500">Packages</span>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <span className="whitespace-nowrap rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                No packages yet
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center">
          {hasPackages && dest.price > 0 ? (
            <div>
              <p className="text-xs text-gray-500">Starting from</p>
              <p className="font-display text-xl font-bold text-brand-600">{formatCurrency(dest.price)}</p>
            </div>
          ) : null}
          <span
            className={`ml-auto inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors duration-300 ${
              hasPackages
                ? 'bg-brand-800 text-white group-hover:bg-brand-900'
                : 'border border-gray-200 bg-white text-gray-700 group-hover:border-brand-300 group-hover:text-brand-600'
            }`}
          >
            View Details
          </span>
        </div>
      </div>
    </Link>
  );
}

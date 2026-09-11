"use client"
import { useNavigate } from "react-router-dom"
import type { AggregatedDestination } from "../../../services/api/packages.transform"
import { formatCurrency } from "../../../lib/currency"

const MAX_DESTINATIONS = 5;

interface InternationalGridProps {
  destinations: AggregatedDestination[]
  loading: boolean
}

export default function InternationalGrid({ destinations, loading }: InternationalGridProps) {
  const navigate = useNavigate()
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-brand-500" />
      </div>
    )
  }
  const internationalDests = destinations.filter((d) => d.type === "international").slice(0, MAX_DESTINATIONS)
  if (internationalDests.length === 0) {
    return <div className="text-center py-12 text-gray-500">No international destinations available</div>
  }
  const handleDestinationClick = (dest: AggregatedDestination) => {
    navigate(`/packages?destination=${dest.slug}`)
  }
  // Bento grid layout. On md+ the grid's fixed rows own each tile's height
  // (`md:auto-rows-[250px]`); a tile that keeps an aspect-ratio there refuses
  // the row's stretch and overflows its area — the 2x2 hero at 5+ destinations
  // rendered square (600x600 inside a 600x516 area at 1440px), hung 84px past
  // the grid and painted over the "Explore All Locations" button below it.
  // `md:aspect-auto md:h-full` hands the height back to the grid rows. Below md
  // there are no fixed rows, so one shared aspect-ratio sizes every row evenly.
  const getBentoClasses = (idx: number, total: number) => {
    if (total >= 4) {
      const stretch = 'aspect-[4/5] md:aspect-auto md:h-full';
      if (idx === 0) return `md:col-span-2 md:row-span-2 ${stretch}`;
      if (total === 4 && idx === 1) return `md:col-span-2 md:row-span-1 ${stretch}`;
      return stretch;
    }
    return 'aspect-[4/5]';
  };

  const total = internationalDests.length;

  const rowLayoutCols: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3' };
  const gridClassName = total >= 4
    ? 'grid grid-cols-2 md:grid-cols-4 gap-4 md:auto-rows-[250px]'
    : `grid ${rowLayoutCols[total] || 'grid-cols-2'} gap-4`;

  return (
    <div className={gridClassName}>
        {internationalDests.map((dest, idx) => (
          <button
            key={dest.id}
            onClick={() => handleDestinationClick(dest)}
            className={`group relative overflow-hidden rounded-2xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 w-full justify-self-center ${getBentoClasses(idx, total)}`}
          >
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent z-raised pointer-events-none"></div>
            <img
              src={dest.image_url || "/placeholder.svg"}
              alt={dest.name}
              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-3 md:p-6">
              <h3 className="text-xl font-bold text-white">{dest.name}</h3>
              <div className="text-white/90 text-sm mt-2">
                <span>Starting from</span>
                <p className="text-lg font-bold">{formatCurrency(dest.price)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
  )
}

"use client"
import { useNavigate } from "react-router-dom"
import type { AggregatedDestination } from "../../../services/api/packages.transform"
import { formatCurrency } from "../../../lib/currency"
import { isLushTheme } from "../../../config/activeTheme"

const MAX_DESTINATIONS = 6;

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
  // Lush's hero-tile layout (idx 0 spanning 2x2 in a 4-col grid) only reads
  // well once there's enough tiles to fill the remaining cells — with fewer
  // destinations it leaves an obviously empty grid. Below that count, fall
  // back to a single evenly-sized row instead.
  const useLushHeroLayout = isLushTheme && internationalDests.length >= 4
  // The hero tile occupies a 2x2 block (4 of the grid's 8 cells across two
  // rows), leaving exactly 4 cells for single tiles — a 6th tile has nowhere
  // to go and CSS grid auto-flow strands it alone on an otherwise-empty 3rd
  // row. Cap at 5 (hero + 4) so the grid always fills completely.
  const displayDests = useLushHeroLayout ? internationalDests.slice(0, 5) : internationalDests
  const lushRowLayoutCols: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3' }
  const lushGridClassName = useLushHeroLayout
    ? 'grid grid-cols-2 md:grid-cols-4 gap-4'
    : `grid ${lushRowLayoutCols[displayDests.length] || 'grid-cols-2'} gap-4`
  return (
    <div
      className={isLushTheme ? lushGridClassName : "grid gap-4"}
      style={isLushTheme ? undefined : { gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))' }}
    >
        {displayDests.map((dest, idx) => (
          <button
            key={dest.id}
            onClick={() => handleDestinationClick(dest)}
            className={`group relative overflow-hidden rounded-2xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 w-full justify-self-center ${
              isLushTheme
                ? useLushHeroLayout && idx === 0
                  ? 'aspect-[4/5] md:aspect-square md:col-span-2 md:row-span-2 max-w-none'
                  : useLushHeroLayout
                    ? 'aspect-[5/7] max-w-[300px]'
                    : 'aspect-[4/5] max-w-none'
                : 'aspect-[5/7] max-w-[300px]'
            }`}
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

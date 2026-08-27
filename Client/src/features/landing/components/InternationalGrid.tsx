"use client"
import { useNavigate } from "react-router-dom"
import type { AggregatedDestination } from "../../../services/api/packages.transform"
import { formatCurrency } from "../../../lib/currency"

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
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))' }}
    >
        {internationalDests.map((dest) => (
          <button
            key={dest.id}
            onClick={() => handleDestinationClick(dest)}
            className="group relative overflow-hidden rounded-2xl aspect-[5/7] hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 w-full max-w-[300px] justify-self-center"
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

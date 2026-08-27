"use client"
import { useNavigate } from "react-router-dom"
import type { AggregatedDestination } from "../../../services/api/packages.transform"

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
  const internationalDests = destinations.filter((d) => d.type === "international").slice(0, 12)
  if (internationalDests.length === 0) {
    return <div className="text-center py-12 text-gray-500">No international destinations available</div>
  }
  const handleDestinationClick = (dest: AggregatedDestination) => {
    navigate(`/packages?destination=${dest.slug}`)
  }
  const symbol = import.meta.env.VITE_CURRENCY_SYMBOL || '₹';
  return (
    <>
      <style>{`
        /* Tablet Destinations Grid (768px - 1024px) */
        @media (min-width: 768px) and (max-width: 1024px) {
          .grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-6 {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        /* Large Tablet Destinations Grid (1024px - 1366px) */
        @media (min-width: 1024px) and (max-width: 1366px) {
          .grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-6 {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
      `}</style>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {internationalDests.map((dest) => (
          <button
            key={dest.id}
            onClick={() => handleDestinationClick(dest)}
            className="group relative overflow-hidden rounded-2xl aspect-[5/7] hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent z-10 pointer-events-none"></div>
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
                <p className="text-lg font-bold">{symbol}{Math.round(dest.price)?.toLocaleString()}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}

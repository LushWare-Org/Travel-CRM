"use client"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react"
import { fetchPackages } from "../../services/api/packages"
import { REVIEW_VIDEOS } from "../../config/media"

const videoHeights = [
  "h-96",
  "h-80",
  "h-88",
  "h-72",
  "h-96",
  "h-80",
  "h-92",
  "h-76",
  "h-84",
  "h-96",
  "h-80",
  "h-88",
  "h-72",
]

function ReviewsVideoSlider() {
  const [currentPage, setCurrentPage] = useState(0)
  const videosPerPage = 8

  const videoData = REVIEW_VIDEOS

  const totalPages = Math.ceil(videoData.length / videosPerPage)
  const startIndex = currentPage * videosPerPage
  const currentVideos = videoData.slice(startIndex, startIndex + videosPerPage)

  const goToPrevious = () => setCurrentPage(p => Math.max(0, p - 1))
  const goToNext = () => setCurrentPage(p => Math.min(totalPages - 1, p + 1))

  return (
    <section className="relative py-16 bg-brand-dark-950 overflow-hidden">
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1); }
        }

        /* Tablet Video Columns (768px - 1024px) */
        @media (min-width: 768px) and (max-width: 1024px) {
          .columns-2.md\\:columns-3.lg\\:columns-4 {
            columns: 2;
          }
        }

        /* Large Tablet Video Columns (1024px - 1366px) */
        @media (min-width: 1024px) and (max-width: 1366px) {
          .columns-2.md\\:columns-3.lg\\:columns-4 {
            columns: 3;
          }
        }
      `}</style>
      {/* Twinkling Stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${Math.random() * 3}px`,
              height: `${Math.random() * 3}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Journeys Told by Our Happy Travelers
          </h2>
          <p className="text-lg text-white mb-8">
            True stories that show why India loves traveling with us
          </p>
        </div>

        <div className="columns-2 md:columns-3 lg:columns-4 gap-6">
          {currentVideos.map((video, index) => {
            const globalIndex = startIndex + index
            const height = videoHeights[globalIndex]

            return (
              <div key={globalIndex} className="break-inside-avoid mb-8">
                <div className={`relative overflow-hidden rounded-2xl shadow-xl ${height}`}>
                  <video
                    src={video.file}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    controlsList="nodownload"
                  />
                </div>
                <div className="mt-6 text-center">
                  <h3 className="font-semibold text-white text-lg">
                    {video.name}
                  </h3>
                </div>
              </div>
            )
          })}
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-6">
            <button
              onClick={goToPrevious}
              disabled={currentPage === 0}
              className={`p-3 rounded-full transition-all ${currentPage === 0
                ? "bg-white/20 text-white/40 cursor-not-allowed"
                : "bg-white/90 hover:bg-white text-gray-800 shadow-lg"
                }`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="text-white font-medium text-lg">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              onClick={goToNext}
              disabled={currentPage === totalPages - 1}
              className={`p-3 rounded-full transition-all ${currentPage === totalPages - 1
                ? "bg-white/20 text-white/40 cursor-not-allowed"
                : "bg-white/90 hover:bg-white text-gray-800 shadow-lg"
                }`}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}


function InternationalGrid({ destinations, loading }) {
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
  const handleDestinationClick = (dest) => {
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
              placeholderClassName="w-full h-full"
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

export default function DestinationsSection() {
  const navigate = useNavigate()
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchPackages({ limit: 100 })
      .then(({ destinations: dest }) => { if (mounted) setDestinations(dest) })
      .catch(() => { if (mounted) setDestinations([]) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white">
      <style>{`
        /* Prevent horizontal overflow on tablets */
        @media (min-width: 768px) and (max-width: 1366px) {
          * {
            overflow-x: hidden;
          }
          body {
            overflow-x: hidden;
          }
        }
      `}</style>
      {/* Destinations Section */}
      <section className="py-28 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        <div className="max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mb-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Explore the World Without Limits</h2>
            <p className="text-lg text-gray-600">Exclusive international packages made for comfort, class & unforgettable moments</p>
          </div>
          <InternationalGrid destinations={destinations} loading={loading} />
          <div className="text-center mt-8">
            <button onClick={() => navigate("/destinations-international")} className="group inline-flex items-center justify-center px-10 py-3.5 text-slate-800 font-semibold text-base tracking-wide border-2 border-slate-800 rounded-lg hover:border-brand-400 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
              <span className="group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-brand-800 group-hover:to-brand-accent-700 group-hover:bg-clip-text transition-all duration-300">
                Explore All Locations
              </span>
              <ArrowRight className="ml-2 w-5 h-5 group-hover:text-brand-500 transition-colors duration-300" />
            </button>
          </div>
        </div>
      </section>

      <ReviewsVideoSlider />
    </div>
  )
}
"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Star,
  Users,
  Globe,
  MapPin,
  Heart,
  Sparkles,
  TrendingUp,
  Award,
  CheckCircle2,
} from "lucide-react"
import { fetchPackages } from "../../utils/packageApi"

function InternationalBanner() {
  const [stats] = useState({
    destinations: "87+",
    travelers: "50K+",
    reviews: "12K+",
  })

  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="relative w-full py-24 overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0">
        <video className="w-full h-full object-cover" src="/v4.mp4" autoPlay muted loop playsInline />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/60 rounded-full animate-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          <div className="text-center px-4">

            <h3
              className={`text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 transition-all duration-700 delay-100 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ lineHeight: "1.15" }}
            >
              Experience Our{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
                  Iconic Destinations
                </span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path
                    d="M2 10C50 2 100 2 150 6C200 10 250 10 298 4"
                    stroke="url(#gradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#eab308" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              <br />
              <span className="text-white/95">Across the Globe</span>
            </h3>

            <p
              className={`text-lg md:text-xl text-white/80 max-w-3xl mx-auto mb-8 transition-all duration-700 delay-200 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              Step Beyond Borders and Discover Cultures, Adventures, and Experiences That Transform Every Trip into a
              Story You'll Cherish Forever
            </p>

            {/* Social Proof Strip */}
            <div
              className={`mt-12 flex flex-wrap items-center justify-center gap-6 md:gap-8 transition-all duration-700 delay-500 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              {/* Avatar */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-bold shadow-lg"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold text-sm">Join 11,000+</p>
                  <p className="text-white/60 text-xs">Happy Travelers</p>
                </div>
              </div>
              <div className="hidden md:block w-px h-10 bg-white/20" />

              {/* Rating  */}
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <span className="text-white font-semibold">{stats.rating}/5</span>
                <span className="text-white/60 text-sm">({stats.reviews} reviews)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(-2deg); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1); }
        }
        .animate-float-slow {
          animation: float-slow 4s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: float-medium 3s ease-in-out infinite;
        }
        .animate-float-fast {
          animation: float-fast 2.5s ease-in-out infinite;
        }
        .animate-twinkle {
          animation: twinkle 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

function InternationalGrid({ destinations, loading }) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-orange-500" />
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

  return (
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
            <h3 className="text-3xl font-bold text-white">{dest.name}</h3>
            <div className="text-white/90 text-sm mt-2">
              <span>Starting from</span>
              <p className="text-lg font-bold">₹{Math.round(dest.price)?.toLocaleString()}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

function LocalSlider({ destinations, loading }) {
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const itemsPerPage = 6

  const localDests = destinations.filter((d) => d.type === "domestic")
  const showCircular = localDests.length > itemsPerPage
  const getCurrentDestinations = () => {
    if (!showCircular) {
      return localDests.slice(0, itemsPerPage)
    }
    const items = []
    for (let i = 0; i < itemsPerPage; i++) {
      items.push(localDests[(currentIndex + i) % localDests.length])
    }
    return items
  }

  const currentDestinations = getCurrentDestinations()
  const goToPrevious = () => {
    if (showCircular) {
      setCurrentIndex((prev) => (prev - 1 + localDests.length) % localDests.length)
    } else {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
      }
    }
  }

  const goToNext = () => {
    if (showCircular) {
      setCurrentIndex((prev) => (prev + 1) % localDests.length)
    } else {
      if (currentIndex < localDests.length - itemsPerPage) {
        setCurrentIndex(currentIndex + 1)
      }
    }
  }

  const canGoLeft = showCircular || currentIndex > 0
  const canGoRight = showCircular || currentIndex < localDests.length - itemsPerPage

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-orange-500" />
      </div>
    )
  }

  if (localDests.length === 0) {
    return <div className="text-center py-12 text-gray-500">No local destinations available</div>
  }

  const handleDestinationClick = (dest) => {
    navigate(`/packages?destination=${dest.slug}`)
  }

  return (
    <div className="relative px-0 md:px-16">
      {canGoLeft && (
        <button
          onClick={goToPrevious}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg items-center justify-center hover:bg-white transition-all"
        >
          <ChevronLeft className="w-6 h-6 text-gray-800" />
        </button>
      )}

      {canGoRight && (
        <button
          onClick={goToNext}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg items-center justify-center hover:bg-white transition-all"
        >
          <ChevronRight className="w-6 h-6 text-gray-800" />
        </button>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 px-0 md:px-2 py-2">
        {currentDestinations.map((dest) => (
          <div key={dest.id} className="w-full">
            <button
              onClick={() => handleDestinationClick(dest)}
              className="w-full group relative overflow-hidden rounded-2xl aspect-[5/7] hover:shadow-2xl transition-all duration-300 cursor-pointer"
            >
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent z-10 pointer-events-none"></div>
              <img
                src={dest.image_url || "/placeholder.svg"}
                alt={dest.name}
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute top-4 left-4 right-4">
                <h3 className="text-2xl font-bold text-white drop-shadow-lg text-left">{dest.name}</h3>
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <div className="text-white/90 text-left">
                  <p className="text-sm mb-1">Starting from</p>
                  <p className="text-xl font-bold">₹{Math.round(dest.price)?.toLocaleString()}</p>
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
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
      .then(({ destinations: dest }) => {
        if (mounted) {
          setDestinations(dest)
        }
      })
      .catch((err) => {
        console.error("Failed to fetch destinations:", err)
        if (mounted) {
          setDestinations([])
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white">
      {/* International Section */}
      <section className="py-28 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mb-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Explore the World Without Limits</h2>
            <p className="text-lg text-gray-600">
              Exclusive international packages made for comfort, class & unforgettable moments
            </p>
          </div>
          <InternationalGrid destinations={destinations} loading={loading} />
          <div className="text-center mt-8">
            <button
              onClick={() => navigate("/destinations-international")}
               className="group inline-flex items-center justify-center px-10 py-3.5 text-slate-800 font-semibold text-base tracking-wide border-2 border-slate-800 rounded-lg hover:border-orange-400 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
            <span className="group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-orange-800 group-hover:to-yellow-700 group-hover:bg-clip-text transition-all duration-300">
            Explore All Locations
          </span>
          <ArrowRight className="ml-2 w-5 h-5 group-hover:text-orange-500 transition-colors duration-300" />
            </button>
          </div>
        </div>
      </section>

      <InternationalBanner />

      {/* Local Destinations  */}
      <section className="py-24 bg-white">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-4xl font-bold text-gray-900 mb-4">
              Journey Through India's Timeless Wonders
            </h2>
            <p className="text-lg text-gray-600">Explore the culture, nature & heritage that make India magical.</p>
          </div>
          <LocalSlider destinations={destinations} loading={loading} />
          <div className="text-center mt-8">
            <button
            onClick={() => navigate("/destinations-domestic")}
            className="group inline-flex items-center justify-center px-10 py-3.5 text-slate-800 font-semibold text-base tracking-wide border-2 border-slate-800 rounded-lg hover:border-orange-400 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
            <span className="group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-orange-800 group-hover:to-yellow-700 group-hover:bg-clip-text transition-all duration-300">
            Explore India
          </span>
          <ArrowRight className="ml-2 w-5 h-5 group-hover:text-orange-500 transition-colors duration-300" />
            </button>
          </div>
        </div>
      </section>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}

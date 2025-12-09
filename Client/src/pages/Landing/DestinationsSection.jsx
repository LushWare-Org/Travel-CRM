"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Star,
} from "lucide-react"
import { fetchPackages } from "../../utils/packageApi"

function ReviewsVideoSlider() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const itemsPerPage = 4
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const videoData = [
      { name: "Bali Tour", location: "Bali", file: "/reviews/bali.mp4" },
      { name: "Thailand Tour", location: "Thailand", file: "/reviews/thailand2.mp4" },
      { name: "Maldives Tour", location: "Maldives", file: "/reviews/maldives2.mp4" },
      { name: "Machachafushi Tour", location: "Machachafushi", file: "/reviews/machachafushi.mp4" },
      { name: "Maldives Tour", location: "Maldives", file: "/reviews/maldives7.mp4" },
      { name: "Maldives Tour", location: "Maldives", file: "/reviews/maldives3.mp4" },
      { name: "Dubai Tour", location: "Dubai", file: "/reviews/dubai.mp4" },
      { name: "Maldives Tour", location: "Maldives", file: "/reviews/maldives1.mp4" },
      { name: "Thailand Tour", location: "Thailand", file: "/reviews/thailand.mp4" },
      { name: "Mauritius Tour", location: "Mauritius", file: "/reviews/mauritius.mp4" },
      { name: "Maldives Tour", location: "Maldives", file: "/reviews/maldives4.mp4" },
      { name: "Maldives Tour", location: "Maldives", file: "/reviews/maldives6.mp4" },
      { name: "Maldives Tour", location: "Maldives", file: "/reviews/maldives5.mp4" },
    ]
    setVideos(videoData)
    setLoading(false)
  }, [])

  const showCircular = videos.length > itemsPerPage

  const getCurrentVideos = () => {
    if (!showCircular) {
      return videos.slice(0, itemsPerPage)
    }
    const items = []
    for (let i = 0; i < itemsPerPage; i++) {
      items.push(videos[(currentIndex + i) % videos.length])
    }
    return items
  }

  const currentVideos = getCurrentVideos()

  const goToPrevious = () => {
    if (showCircular) {
      setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length)
    } else {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
      }
    }
  }

  const goToNext = () => {
    if (showCircular) {
      setCurrentIndex((prev) => (prev + 1) % videos.length)
    } else {
      if (currentIndex < videos.length - itemsPerPage) {
        setCurrentIndex(currentIndex + 1)
      }
    }
  }

  const canGoLeft = showCircular || currentIndex > 0
  const canGoRight = showCircular || currentIndex < videos.length - itemsPerPage

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-orange-500" />
      </div>
    )
  }

  return (
    <section className="relative py-16 bg-[#051C35] overflow-hidden">
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
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Journeys told by our happy travelers</h2>
          <p className="text-lg text-white mb-6">True stories that show why India loves traveling with us</p>
          <div className="flex justify-center">
            <div className="flex bg-white items-center gap-3 rounded-full px-6 py-3 shadow-lg">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-black text-sm font-bold">4.9</span>
              <div className="flex gap-0.5">
                {[1].map((i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <span className="text-black text-sm font-medium">(250k+ reviews)</span>
            </div>
          </div>
        </div>

        <div className="relative">
          {canGoLeft && (
            <button
              onClick={goToPrevious}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg items-center justify-center hover:bg-white transition-all border border-gray-200"
            >
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </button>
          )}

          {canGoRight && (
            <button
              onClick={goToNext}
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg items-center justify-center hover:bg-white transition-all border border-gray-200"
            >
              <ChevronRight className="w-6 h-6 text-gray-800" />
            </button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-0 md:px-16">
            {currentVideos.map((video, index) => (
              <div key={`${currentIndex}-${index}`} className="flex flex-col">
                <div className="group relative overflow-hidden rounded-2xl aspect-[9/16] bg-gray-200 border-2 hover:shadow-2xl transition-all duration-300">
                  <video
                    src={video.file}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    controlsList="nodownload"
                    style={{ pointerEvents: 'auto' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
                <div className="mt-6 text-center">
                  <h3 className="font-semibold text-white text-lg">{video.name}</h3>
                  {/* <p className="text-lg text-white mt-1">{video.location}</p> */}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden justify-center gap-2 mt-8">
          <button
            onClick={goToPrevious}
            className="p-2 bg-gray-200 rounded-full hover:bg-orange-500 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>
          <button
            onClick={goToNext}
            className="p-2 bg-gray-200 rounded-full hover:bg-orange-500 transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-gray-800" />
          </button>
        </div>
      </div>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1); }
        }
        .animate-twinkle {
          animation: twinkle 4s ease-in-out infinite;
        }
      `}</style>
    </section>
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
            <h3 className="text-xl font-bold text-white">{dest.name}</h3>
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
                <h3 className="text-xl font-bold text-white drop-shadow-lg text-left">{dest.name}</h3>
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
        <div className="max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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

      <ReviewsVideoSlider />

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

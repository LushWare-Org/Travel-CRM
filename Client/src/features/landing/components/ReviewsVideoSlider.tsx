"use client"
import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { REVIEW_VIDEOS } from "../../../config/media"

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

export default function ReviewsVideoSlider() {
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

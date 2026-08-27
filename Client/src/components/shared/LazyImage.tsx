import { useState, useEffect, useRef } from 'react'

interface LazyImageProps {
  /** Image URL; the real src is only applied once the placeholder scrolls into view. */
  src?: string
  alt?: string
  className?: string
  placeholderClassName?: string
  onLoad?: (() => void) | null
  onError?: (() => void) | null
}

export default function LazyImage({
  src,
  alt,
  className = '',
  placeholderClassName = '',
  onLoad = null,
  onError = null,
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!src) {
      setError(true)
      setIsLoading(false)
      return
    }

    // Capture the node once: the div this ref points at is stable for the
    // component's lifetime, and reading `imgRef.current` in the cleanup
    // would trip the exhaustive-deps rule.
    const node = imgRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src)
            observer.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: '50px',
      }
    )

    observer.observe(node)

    return () => {
      observer.unobserve(node)
    }
  }, [src])

  const handleLoad = () => {
    setIsLoading(false)
    if (onLoad) onLoad()
  }

  const handleError = () => {
    setIsLoading(false)
    setError(true)
    if (onError) onError()
  }

  return (
    <div ref={imgRef} className={className}>
      {/* Loading Skeleton */}
      {isLoading && (
        <div
          className={`animate-pulse bg-gray-300 ${placeholderClassName}`}
          aria-busy="true"
          aria-label="Loading image"
        />
      )}

      {imageSrc && !error && (
        <img
          src={imageSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          } ${className}`}
          loading="lazy"
        />
      )}
    </div>
  )
}

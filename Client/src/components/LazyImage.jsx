import { useState, useEffect, useRef } from 'react'
export default function LazyImage({
  src,
  alt,
  className = '',
  placeholderClassName = '',
  onLoad = null,
  onError = null,
}) {
  const [imageSrc, setImageSrc] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const imgRef = useRef(null)

  useEffect(() => {
    if (!src) {
      setError(true)
      setIsLoading(false)
      return
    }

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

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current)
      }
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

import { Star } from 'lucide-react';
import { HERO_VIDEOS } from '../../../config/media';

const heroVideo = HERO_VIDEOS.find((v) => v.id === 'v3');

interface HeroSectionProps {
  isVisible: boolean;
  destinationCount: number;
}

export default function HeroSection({ isVisible, destinationCount }: HeroSectionProps) {
  return (
    <div className="relative w-full py-24 overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroVideo?.poster}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          decoding="auto"
          fetchPriority="high"
          sizes="100vw"
        />
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
        >
          <source src={heroVideo?.video} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
      </div>
      <div className="relative z-raised max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1
          className={`text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          style={{ lineHeight: '1.15' }}
        >
          Discover Your Next{' '}
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-brand-400 via-brand-accent-400 to-brand-accent-400 bg-clip-text text-transparent">
              Adventure
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
                  <stop offset="0%" stopColor="var(--brand-500)" />
                  <stop offset="100%" stopColor="var(--brand-accent-500)" />
                </linearGradient>
              </defs>
            </svg>
          </span>
        </h1>
        <p
          className={`text-lg md:text-xl text-white/80 max-w-3xl mx-auto mb-8 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
        >
          Explore {destinationCount} incredible international destinations crafted for comfort, class & unforgettable moments
        </p>
        {/* Social Proof */}
        <div
          className={`mt-8 flex flex-wrap items-center justify-center gap-6 md:gap-8 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-brand-400 to-red-500 flex items-center justify-center text-white text-xs font-bold shadow-lg"
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
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-5 h-5 text-brand-accent-400 fill-brand-accent-400" />
              ))}
            </div>
            <span className="text-white font-semibold">4.9/5</span>
            {/* <span className="text-white text-sm">(250 + Reviews)</span> */}
          </div>
        </div>
      </div>
    </div>
  );
}

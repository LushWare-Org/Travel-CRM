import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

const SCROLL_THRESHOLD_PX = 400;

/**
 * Same visual language as WhatsAppButton/CallButton — visible once the page
 * has scrolled past SCROLL_THRESHOLD_PX, scrolls smoothly to top on click.
 */
const ScrollTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > SCROLL_THRESHOLD_PX);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900 rounded-full shadow-xl p-4 flex items-center justify-center transition-all duration-300 transform ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'
      } ${isHovered ? 'scale-110 shadow-2xl' : 'scale-100 hover:scale-105'}`}
      style={{
        boxShadow: isHovered
          ? '0 20px 40px 0 rgba(55, 65, 81, 0.4), 0 0 30px 0 rgba(55, 65, 81, 0.3)'
          : '0 8px 32px 0 rgba(55, 65, 81, 0.3), 0 4px 16px 0 rgba(0, 0, 0, 0.1)',
      }}
    >
      <ArrowUp className={`w-[26px] h-[26px] text-white drop-shadow-sm transition-transform duration-300 ${isHovered ? 'scale-110' : 'scale-100'}`} />
    </button>
  );
};

export default ScrollTopButton;

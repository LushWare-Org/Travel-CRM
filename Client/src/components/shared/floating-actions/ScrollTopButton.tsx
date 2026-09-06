import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { FLOATING_ACTION_SCROLL_THRESHOLD_PX } from '../../../config/floatingActions';

/**
 * Page-scroll utility, kept separate from the contact/assistant launcher
 * (Phase 1 decision): it is not a contact channel, so it stays an
 * independent, smaller, always-present affordance that appears once the
 * page has scrolled past the shared hero threshold — never part of the
 * launcher's expandable menu. Neutral white + hairline border per the
 * DESIGN.md elevation policy (in-flow chrome elevated by border/contrast;
 * only the floating shadow marks it as chrome).
 */
const ScrollTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > FLOATING_ACTION_SCROLL_THRESHOLD_PX);
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
      className={`flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-floating transition-all duration-300 hover:border-gray-300 hover:text-brand-700 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'
      }`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
};

export default ScrollTopButton;

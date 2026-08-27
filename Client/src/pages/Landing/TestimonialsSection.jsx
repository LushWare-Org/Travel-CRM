import { Star } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import BRANDING from '../../config/branding';
import { HEADER_TITLE, HEADER_SUBTITLE } from '../../content/testimonials';

export default function TestimonialsSection() {
  if (!BRANDING.integrations.elfsightAppId) {
    return null;
  }

  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [visible, setVisible] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setVisible(width < 768 ? 1 : width < 1024 ? 2 : 3);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const elRef = useRef(null);

  useEffect(() => {
    const loadScript = () => {
      if (document.querySelector('script[src="https://elfsightcdn.com/platform.js"]')) return;
      const script = document.createElement('script');
      script.src = 'https://elfsightcdn.com/platform.js';
      script.async = true;
      document.body.appendChild(script);
      script.onload = () => {
        window.__ELFSIGHT_SCRIPT_LOADED = true;
      };
    };

    const el = elRef.current;
    if (!el) return;

    let observer;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (window.requestIdleCallback) {
              requestIdleCallback(loadScript, { timeout: 3000 });
            } else {
              setTimeout(loadScript, 2000);
            }
            observer.disconnect();
          }
        });
      });
      observer.observe(el);
    } else {
      if (window.requestIdleCallback) {
        requestIdleCallback(loadScript, { timeout: 3000 });
      } else {
        setTimeout(loadScript, 2000);
      }
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, []);


  return (
    <>
      {/* Google Reviews */}
      <section className="py-20 bg-white font-opensans">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-poppins">
              {HEADER_TITLE}
            </h2>
            <p className="text-lg text-gray-600">
              {HEADER_SUBTITLE}
            </p>
          </div>
          <div className="flex justify-center">
            <div
              ref={elRef}
              className={`elfsight-app-${BRANDING.integrations.elfsightAppId}`}
              data-elfsight-app-lazy
            ></div>
          </div>
        </div>
      </section>
    </>
  );
}
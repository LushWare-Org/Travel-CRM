import { useEffect, useRef, type RefObject } from 'react';

const ELFSIGHT_SCRIPT_SRC = 'https://elfsightcdn.com/platform.js';

declare global {
  interface Window {
    __ELFSIGHT_SCRIPT_LOADED?: boolean;
  }
}

const loadElfsightScript = (): void => {
  if (document.querySelector(`script[src="${ELFSIGHT_SCRIPT_SRC}"]`)) return;
  const script = document.createElement('script');
  script.src = ELFSIGHT_SCRIPT_SRC;
  script.async = true;
  document.body.appendChild(script);
  script.onload = () => {
    window.__ELFSIGHT_SCRIPT_LOADED = true;
  };
};

/**
 * Lazily loads the Elfsight platform script the first time the widget
 * element scrolls into view, and only once app-wide no matter how many
 * widgets are mounted (checks for an existing <script> tag before
 * appending another). Consolidates two previously-duplicated,
 * non-idempotent inline implementations (PackageDetails.jsx,
 * Landing/TestimonialsSection.jsx) into one shared hook.
 *
 * Returns a ref to attach to the widget's container element.
 */
export const useElfsightWidget = (): RefObject<HTMLDivElement | null> => {
  const elRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return undefined;

    const scheduleLoad = (): void => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(loadElfsightScript, { timeout: 3000 });
      } else {
        setTimeout(loadElfsightScript, 2000);
      }
    };

    let observer: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            scheduleLoad();
            observer?.disconnect();
          }
        });
      });
      observer.observe(el);
    } else {
      scheduleLoad();
    }

    return () => {
      observer?.disconnect();
    };
  }, []);

  return elRef;
};

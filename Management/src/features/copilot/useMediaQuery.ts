import { useEffect, useState } from "react";

/** The dock breakpoint: below this the record is fully live only at `xl` and up. */
export const XL_MEDIA_QUERY = "(min-width: 1280px)";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Environment-safe one-shot check (jsdom has no matchMedia). */
export function mediaQueryMatches(query: string): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  return mediaQueryMatches(REDUCED_MOTION_QUERY);
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => mediaQueryMatches(query));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener?.("change", update);
    return () => list.removeEventListener?.("change", update);
  }, [query]);

  return matches;
}

/** True at `xl` and wider, where the dock and the record are both live. */
export function useIsDesktopDock(): boolean {
  return useMediaQuery(XL_MEDIA_QUERY);
}

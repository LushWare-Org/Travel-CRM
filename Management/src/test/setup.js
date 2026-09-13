import '@testing-library/jest-dom/vitest';

// jsdom has no matchMedia; the copilot's responsive shell reads it. Individual
// tests override window.matchMedia to pin a breakpoint.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}
// jsdom has no ResizeObserver; recharts' <ResponsiveContainer> requires one
// to mount at all (used by every analytics/dashboard chart).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

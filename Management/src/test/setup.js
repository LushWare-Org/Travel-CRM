import '@testing-library/jest-dom/vitest';

// jsdom has no ResizeObserver; recharts' <ResponsiveContainer> requires one
// to mount at all (used by every analytics/dashboard chart).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

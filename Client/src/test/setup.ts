import '@testing-library/jest-dom/vitest';

// jsdom has no IntersectionObserver; LazyImage (rendered on nearly every
// page) requires one to mount without throwing.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}

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
// jsdom 25 has no PointerEvent. base-ui's Checkbox (used by RangeFilterGroup,
// which both filter sidebars now consume) re-dispatches a PointerEvent on its
// hidden native input when clicked, so clicking a filter checkbox without
// this polyfill throws. RangeFilterGroup.test.tsx carries a private copy with
// the same guard; this makes it available to container tests that drive the
// filter sidebars too.
if (typeof globalThis.PointerEvent === 'undefined') {
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type: string, params?: PointerEventInit) {
      super(type, params);
    }
  } as unknown as typeof PointerEvent;
}

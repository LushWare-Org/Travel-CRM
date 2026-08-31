// Build-time theme selector (browser-side source of truth).
//
// tailwind.config.js cannot import this ESM/TS module (it runs in a
// Node/CommonJS + PostCSS load context), so it independently computes the
// same value from process.env.VITE_THEME — see the comment there.
export type ThemeName = 'generic' | 'lush';

export const ACTIVE_THEME: ThemeName = import.meta.env.VITE_THEME === 'lush' ? 'lush' : 'generic';

export const isLushTheme = ACTIVE_THEME === 'lush';

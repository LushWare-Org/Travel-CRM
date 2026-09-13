import { flag } from './envFlag';

// Per-deployment page visibility. Every flag defaults to enabled when its
// VITE_FEATURE_* env var is unset, so an existing deployment's behavior is
// unchanged until someone opts a page out for a new client.
export const PAGE_CONFIG = {
  home: { enabled: true },
  packages: { enabled: true },
  packageDetails: { enabled: true },
  contact: { enabled: true },
  destinations: { enabled: flag('VITE_FEATURE_DESTINATIONS', true) },
  about: { enabled: flag('VITE_FEATURE_ABOUT', true) },
  career: { enabled: flag('VITE_FEATURE_CAREER', true) },
  // Gates /planner AND /package/:id/customize.
  planner: { enabled: flag('VITE_FEATURE_PLANNER', true) },
  // Gates /login AND /my-account.
  account: { enabled: flag('VITE_FEATURE_ACCOUNTS', true) },
} as const;

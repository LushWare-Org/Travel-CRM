/**
 * URLs the landing page hands off to. Overridable per-environment via .env
 * (VITE_ prefixed) so staging/preview deploys can point at non-production
 * portals without a code change.
 */
export const PORTALS = {
  management: {
    name: 'Management Portal',
    url: import.meta.env.VITE_MANAGEMENT_URL || 'https://app.lushtravelcloud.com',
  },
  client: {
    name: 'Client Portal',
    url: import.meta.env.VITE_CLIENT_URL || 'https://user.lushtravelcloud.com',
  },
};

export default PORTALS;

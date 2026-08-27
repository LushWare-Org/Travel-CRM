// Shared by config/pages.ts and config/floatingActions.ts: every
// VITE_FEATURE_* toggle defaults to enabled unless the env var is
// explicitly set to the string 'false'.
export const flag = (name: string, defaultValue: boolean): boolean => {
  const raw = import.meta.env[name];
  return raw === undefined ? defaultValue : raw !== 'false';
};

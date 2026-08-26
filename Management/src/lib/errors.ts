/** Error shape thrown by the legacy salesRep/vendor `.service.js` catch-and-annotate wrappers. */
export interface ApiError extends Error {
  userMessage?: string;
  validationErrors?: Record<string, string | string[]>;
}

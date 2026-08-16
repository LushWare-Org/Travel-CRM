// v1 — marketing-content-only generation from a package title (no itinerary).

export function buildGenerateFromTitlePrompt({ title, destination, duration, category }) {
  const contextParts = [
    destination ? `to ${destination}` : null,
    duration ? `(${duration} days)` : null,
    category ? `in the ${category} category` : null,
  ].filter(Boolean).join(' ');

  return `Generate marketing content for a travel package titled "${title}"${contextParts ? ' ' + contextParts : ''}.`;
}

export const generateFromTitleResponseSchema = {
  type: 'object',
  properties: {
    description: { type: 'string' },
    highlights: { type: 'array', items: { type: 'string' } },
    inclusions: { type: 'array', items: { type: 'string' } },
    exclusions: { type: 'array', items: { type: 'string' } },
    termsAndConditions: { type: 'string' },
  },
  required: ['description', 'inclusions', 'exclusions'],
};

// v1 — marketing-content (re)generation for an existing, already-saved package.

export function buildPackageMarketingContentPrompt({ title, destination, durationDays, category }) {
  return `Generate compelling marketing content for a travel package with these details:
Title: "${title || 'Travel Package'}"
Destination: ${destination || 'Exotic destination'}
Duration: ${durationDays || '?'} days
Category: ${category || 'FAMILY'}`;
}

export const packageMarketingContentResponseSchema = {
  type: 'object',
  properties: {
    description: { type: 'string' },
    inclusions: { type: 'array', items: { type: 'string' } },
    exclusions: { type: 'array', items: { type: 'string' } },
    termsAndConditions: { type: 'string' },
  },
  required: ['description', 'inclusions', 'exclusions'],
};

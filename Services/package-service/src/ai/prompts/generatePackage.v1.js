// v1 — full package + day-by-day itinerary generation, from scratch.
// Prompt and response schema change together; bump to a new versioned file
// (generatePackage.v2.js) on breaking changes rather than editing in place,
// so prior prompt behavior stays in git history and reviewable in diffs.

export function buildGeneratePackagePrompt({
  destination,
  duration,
  category,
  packageType,
  budget,
  travelers,
  preferences,
}) {
  return `You are an expert travel package designer. Generate a complete travel package for ${destination} for exactly ${duration} days.

Category: ${category}.
${packageType ? `Package tier: ${packageType}.` : ''}
Budget: ${budget || 'moderate'}.
Travelers: ${travelers || 2}.
Preferences: ${preferences || 'general sightseeing'}.

The "days" array must contain exactly ${duration} entries, one per day, numbered 1 to ${duration}. Do not stop early or summarize remaining days. Each day must include "locations" (place names) and "activities" (activity names).`;
}

export const generatePackageResponseSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    destination: { type: 'string' },
    durationDays: { type: 'integer' },
    price: { type: 'number' },
    category: { type: 'string' },
    inclusions: { type: 'array', items: { type: 'string' } },
    exclusions: { type: 'array', items: { type: 'string' } },
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dayNumber: { type: 'integer' },
          title: { type: 'string' },
          description: { type: 'string' },
          locations: { type: 'array', items: { type: 'string' } },
          activities: { type: 'array', items: { type: 'string' } },
          meals: {
            type: 'object',
            properties: {
              breakfast: { type: 'boolean' },
              lunch: { type: 'boolean' },
              dinner: { type: 'boolean' },
            },
          },
          transport: { type: 'string' },
        },
        required: ['dayNumber', 'title', 'locations', 'activities'],
      },
    },
  },
  required: ['title', 'description', 'destination', 'durationDays', 'days'],
};

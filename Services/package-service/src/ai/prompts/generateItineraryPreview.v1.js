// v1 — public, non-persisting customer itinerary preview.
// Prompt and response schema change together; bump to a new versioned file
// (generateItineraryPreview.v2.js) on breaking changes rather than editing
// in place, so prior prompt behavior stays in git history and reviewable in diffs.

export function buildGenerateItineraryPreviewPrompt({ destination, duration, travelers, budget, preferences }) {
  return `You are an expert travel itinerary planner. Generate a day-by-day travel itinerary for ${destination} for exactly ${duration} days.

Travelers: ${travelers || 2}.
Budget: ${budget || 'moderate'}.
Preferences: ${preferences || 'general sightseeing'}.

The "days" array must contain exactly ${duration} entries, one per day, numbered 1 to ${duration}. Do not stop early or summarize remaining days. Each day must include "locations" (place names) and "activities" (activity names). Only set "transport" when travel between locations that day genuinely requires it, using one of the allowed values.`;
}

export const generateItineraryPreviewResponseSchema = {
  type: 'object',
  properties: {
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
          transport: { type: 'string', enum: ['flight', 'train', 'bus', 'car', 'boat', 'walk', 'other'] },
        },
        required: ['dayNumber', 'title', 'locations', 'activities'],
      },
    },
  },
  required: ['days'],
};

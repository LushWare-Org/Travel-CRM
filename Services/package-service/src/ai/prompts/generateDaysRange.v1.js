// v1 — public, non-persisting multi-day (sub-range) itinerary preview
// (docs/designs/granular-ai-itinerary-generation.md). Generates N specific
// day numbers — not necessarily contiguous or head-anchored, e.g. filling
// gaps left by out-of-order manual deletes — given the trip's other existing
// days as context, so the model fills gaps coherently without duplicating
// already-planned content.
// Prompt and response schema change together; bump to a new versioned file
// (generateDaysRange.v2.js) on breaking changes rather than editing in
// place, so prior prompt behavior stays in git history and reviewable in diffs.

function summarizeDay(day) {
  const parts = [`Day ${day.dayNumber}: ${day.title || 'Untitled'}`];
  if (day.locations?.length) parts.push(`locations: ${day.locations.join(', ')}`);
  if (day.activities?.length) parts.push(`activities: ${day.activities.join(', ')}`);
  return `- ${parts.join(' — ')}`;
}

export function buildGenerateDaysRangePrompt({ destination, dayNumbers, totalDuration, travelers, budget, preferences, existingDays }) {
  const requested = [...dayNumbers].sort((a, b) => a - b);
  const requestedSet = new Set(requested);
  const contextDays = (existingDays || []).filter((d) => !requestedSet.has(d.dayNumber));
  const contextBlock = contextDays.length
    ? `\nAlready planned days — excluding day${requested.length > 1 ? 's' : ''} ${requested.join(', ')} (do NOT repeat these locations or activities):\n${contextDays.map(summarizeDay).join('\n')}\n`
    : '';

  return `You are an expert travel itinerary planner. Generate exactly these days of a ${totalDuration}-day trip to ${destination}: day ${requested.join(', day ')}.

Travelers: ${travelers || 2}.
Budget: ${budget || 'moderate'}.
Preferences: ${preferences || 'general sightseeing'}.
${contextBlock}
The "days" array must contain exactly ${requested.length} entries, one for each of days ${requested.join(', ')} (in that order), each with its correct "dayNumber". Do not generate any other day and do not skip any of the requested days. Each day must include "locations" (place names) and "activities" (activity names). Only set "transport" when travel between locations that day genuinely requires it, using one of the allowed values.`;
}

// Bounded to match existingDayContextSchema's input caps (package.schema.js):
// this endpoint's own output is exactly what a later per-day/range call
// sends back as existingDays context, so an unbounded response here could
// generate a day the next regeneration call rejects as invalid input.
export const generateDaysRangeResponseSchema = {
  type: 'object',
  properties: {
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dayNumber: { type: 'integer' },
          title: { type: 'string', maxLength: 100 },
          description: { type: 'string' },
          locations: { type: 'array', items: { type: 'string', maxLength: 100 }, maxItems: 15 },
          activities: { type: 'array', items: { type: 'string', maxLength: 100 }, maxItems: 15 },
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

// v1 — public, non-persisting single-day itinerary preview
// (docs/designs/granular-ai-itinerary-generation.md). Generates exactly one
// day, given the trip's other days as context so the model avoids
// duplicating locations/activities already planned elsewhere.
// Prompt and response schema change together; bump to a new versioned file
// (generateDayPreview.v2.js) on breaking changes rather than editing in
// place, so prior prompt behavior stays in git history and reviewable in diffs.

function summarizeDay(day) {
  const parts = [`Day ${day.dayNumber}: ${day.title || 'Untitled'}`];
  if (day.locations?.length) parts.push(`locations: ${day.locations.join(', ')}`);
  if (day.activities?.length) parts.push(`activities: ${day.activities.join(', ')}`);
  return `- ${parts.join(' — ')}`;
}

export function buildGenerateDayPreviewPrompt({ destination, dayNumber, totalDuration, travelers, budget, preferences, existingDays }) {
  // The target day is excluded from the context even if the caller sent it —
  // otherwise the model tends to echo the old content back instead of
  // generating something new, defeating "regenerate this day".
  const contextDays = (existingDays || []).filter((d) => d.dayNumber !== dayNumber);
  const contextBlock = contextDays.length
    ? `\nAlready planned days — excluding Day ${dayNumber} (do NOT repeat these locations or activities):\n${contextDays.map(summarizeDay).join('\n')}\n`
    : '';

  return `You are an expert travel itinerary planner. Generate Day ${dayNumber} of a ${totalDuration}-day trip to ${destination}.

Travelers: ${travelers || 2}.
Budget: ${budget || 'moderate'}.
Preferences: ${preferences || 'general sightseeing'}.
${contextBlock}
Generate a complete day ${dayNumber} that flows naturally with the surrounding days. Include "locations" (place names) and "activities" (activity names). Only set "transport" when travel between locations that day genuinely requires it, using one of the allowed values.`;
}

// Bounded to match existingDayContextSchema's input caps (package.schema.js):
// this endpoint's own output is exactly what a later per-day/range call
// sends back as existingDays context, so an unbounded response here could
// generate a day the next regeneration call rejects as invalid input.
export const generateDayPreviewResponseSchema = {
  type: 'object',
  properties: {
    day: {
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
  required: ['day'],
};

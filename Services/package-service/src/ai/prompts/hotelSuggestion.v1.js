// v1 — hotel suggestion list for a destination.

export function buildHotelSuggestionPrompt({ destination, checkIn, checkOut, guests, budget, preferences }) {
  return `Suggest 5 hotels in ${destination} for ${guests || 2} guests${checkIn ? ` from ${checkIn} to ${checkOut}` : ''}${budget ? ` with a budget of ${budget}` : ''}${preferences ? `. Preferences: ${preferences}` : ''}.`;
}

export const hotelSuggestionResponseSchema = {
  type: 'object',
  properties: {
    hotels: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          rating: { type: 'number' },
          priceRange: { type: 'string' },
          amenities: { type: 'array', items: { type: 'string' } },
          description: { type: 'string' },
          location: { type: 'string' },
        },
        required: ['name'],
      },
    },
  },
  required: ['hotels'],
};

// v1 — hotel suggestion list for a destination.

export function buildHotelSuggestionPrompt({ destination, location, checkIn, checkOut, guests, budget, preferences }) {
  return `Suggest 5 hotels in ${destination}${location ? ` near ${location}` : ''} for ${guests || 2} guests${checkIn ? ` from ${checkIn} to ${checkOut}` : ''}${budget ? ` with a budget of ${budget}` : ''}${preferences ? `. Preferences: ${preferences}` : ''}. Include each hotel's street address.`;
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
          address: { type: 'string' },
          rating: { type: 'number' },
          priceRange: { type: 'string' },
          amenities: { type: 'array', items: { type: 'string' } },
          description: { type: 'string' },
          location: { type: 'string' },
        },
        required: ['name', 'address'],
      },
    },
  },
  required: ['hotels'],
};

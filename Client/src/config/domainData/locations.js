/**
 * Popular locations/attractions by destination
 * For quick selection when creating day itineraries
 */
// Per-company reference data. Replace with this company's actual destinations/locations/activities before shipping a new deployment.

// International Destinations
export const LOCATIONS_BY_DESTINATION = {
  // Popular International
  'Almaty, Kazakhstan': [
    'Medeu Ice Skating Rink',
    'Shymbulak Ski Resort',
    'Kok Tobe Hill',
    'Zenkov Cathedral',
    'Central State Museum',
    'Big Almaty Lake',
    'Green Bazaar',
  ],
  'Bali, Indonesia': [
    'Uluwatu Temple',
    'Tanah Lot Temple',
    'Tegalalang Rice Terraces',
    'Sacred Monkey Forest',
    'Mount Batur',
    'Ubud Palace',
    'Seminyak Beach',
    'Kuta Beach',
    'Nusa Dua Beach',
    'Waterbom Bali',
  ],
  'Bangkok & Pattaya, Thailand': [
    'Grand Palace Bangkok',
    'Wat Arun',
    'Wat Pho',
    'Floating Market',
    'Chatuchak Market',
    'Khao San Road',
    'Pattaya Beach',
    'Walking Street Pattaya',
    'Coral Island',
    'Nong Nooch Garden',
    'Sanctuary of Truth',
  ],
  'Dubai, UAE': [
    'Burj Khalifa',
    'Dubai Mall',
    'Dubai Fountain',
    'Palm Jumeirah',
    'Burj Al Arab',
    'Dubai Marina',
    'Gold Souk',
    'Spice Souk',
    'Dubai Creek',
    'Atlantis Aquaventure',
    'Desert Safari',
    'Dubai Frame',
    'Global Village',
    'Mall of Emirates',
    'Ski Dubai',
  ],
  'Malaysia': [
    'Petronas Towers',
    'Batu Caves',
    'Genting Highlands',
    'Langkawi Island',
    'Penang',
    'Cameron Highlands',
    'Malacca',
    'KL Tower',
    'Aquaria KLCC',
  ],
  'Maldives': [
    'Male City',
    'Artificial Beach',
    'Grand Friday Mosque',
    'Coral Reefs',
    'Water Sports Center',
    'Local Island Tour',
    'Sandbank Visit',
  ],
  'Mauritius': [
    'Port Louis',
    'Chamarel Seven Colored Earth',
    'Black River Gorges',
    'Le Morne Beach',
    'Ile aux Cerfs',
    'Grand Baie',
    'Pamplemousses Garden',
    'Casela Nature Park',
  ],
  'Phuket & Krabi, Thailand': [
    'Phi Phi Islands',
    'James Bond Island',
    'Phang Nga Bay',
    'Patong Beach',
    'Big Buddha',
    'Old Phuket Town',
    'Railay Beach',
    'Tiger Cave Temple',
    'Emerald Pool',
    'Ao Nang Beach',
  ],
  'Seychelles': [
    'Anse Source d\'Argent',
    'Vallee de Mai',
    'Beau Vallon Beach',
    'Victoria Market',
    'Morne Seychellois',
    'Anse Lazio',
    'Cousin Island',
  ],
  'Singapore': [
    'Marina Bay Sands',
    'Gardens by the Bay',
    'Sentosa Island',
    'Universal Studios',
    'Merlion Park',
    'Orchard Road',
    'Chinatown',
    'Little India',
    'Clarke Quay',
    'Singapore Zoo',
    'Night Safari',
    'Jewel Changi',
  ],
  'Sri Lanka': [
    'Sigiriya Rock',
    'Temple of Tooth',
    'Galle Fort',
    'Yala National Park',
    'Ella',
    'Nuwara Eliya',
    'Tea Plantations',
    'Mirissa Beach',
    'Colombo City',
    'Dambulla Cave Temple',
  ],
  'Thailand': [
    'Grand Palace',
    'Wat Arun',
    'Floating Market',
    'Chiang Mai',
    'Phuket',
    'Ayutthaya',
    'Sukhothai',
    'Khao Sok National Park',
  ],
  'Vietnam': [
    'Halong Bay',
    'Hanoi Old Quarter',
    'Ho Chi Minh City',
    'Cu Chi Tunnels',
    'Hoi An Ancient Town',
    'Hue Imperial City',
    'Mekong Delta',
    'Sapa',
    'Phong Nha Cave',
  ],
};


// Get locations for a specific destination
export const getLocationsForDestination = (destination) => {
  if (!destination) return [];

  // Handle object format (from DestinationSelector)
  const destinationName = typeof destination === 'object' ? destination.label || destination.value : destination;
  if (!destinationName) return [];

  // Try exact match first
  if (LOCATIONS_BY_DESTINATION[destinationName]) {
    return LOCATIONS_BY_DESTINATION[destinationName];
  }

  // Try partial match
  const partialMatch = Object.keys(LOCATIONS_BY_DESTINATION).find(key =>
    key.toLowerCase().includes(destinationName.toLowerCase()) ||
    destinationName.toLowerCase().includes(key.toLowerCase())
  );

  if (partialMatch) {
    return LOCATIONS_BY_DESTINATION[partialMatch];
  }

  return [];
};

// Get all unique locations (for search)
export const ALL_LOCATIONS = [
  ...new Set(
    Object.values(LOCATIONS_BY_DESTINATION)
      .flat()
      .sort()
  )
];


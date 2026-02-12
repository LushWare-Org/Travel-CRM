/**
 * Destinations for travel packages
 * Organized by popular and other international destinations
 */

// Popular International Destinations
export const POPULAR_INTERNATIONAL = [
  { value: 'Almaty', label: 'Almaty, Kazakhstan' },
  { value: 'Bali', label: 'Bali, Indonesia' },
  { value: 'Bangkok & Pattaya', label: 'Bangkok & Pattaya, Thailand' },
  { value: 'Dubai', label: 'Dubai, UAE' },
  { value: 'Malaysia', label: 'Malaysia' },
  { value: 'Maldives', label: 'Maldives' },
  { value: 'Mauritius', label: 'Mauritius' },
  { value: 'Phuket & Krabi', label: 'Phuket & Krabi, Thailand' },
  { value: 'Seychelles', label: 'Seychelles' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'Sri Lanka', label: 'Sri Lanka' },
  { value: 'Thailand', label: 'Thailand' },
  { value: 'Vietnam', label: 'Vietnam' },
];

// Additional International Destinations
export const OTHER_INTERNATIONAL = [
  { value: 'Abu Dhabi', label: 'Abu Dhabi, UAE' },
  { value: 'Amsterdam', label: 'Amsterdam, Netherlands' },
  { value: 'Athens', label: 'Athens, Greece' },
  { value: 'Australia', label: 'Australia' },
  { value: 'Austria', label: 'Austria' },
  { value: 'Azerbaijan', label: 'Azerbaijan (Baku)' },
  { value: 'Barcelona', label: 'Barcelona, Spain' },
  { value: 'Bhutan', label: 'Bhutan' },
  { value: 'Cambodia', label: 'Cambodia' },
  { value: 'Canada', label: 'Canada' },
  { value: 'China', label: 'China' },
  { value: 'Croatia', label: 'Croatia' },
  { value: 'Czech Republic', label: 'Czech Republic' },
  { value: 'Egypt', label: 'Egypt' },
  { value: 'France', label: 'France' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Germany', label: 'Germany' },
  { value: 'Greece', label: 'Greece' },
  { value: 'Hong Kong', label: 'Hong Kong' },
  { value: 'Iceland', label: 'Iceland' },
  { value: 'Italy', label: 'Italy' },
  { value: 'Japan', label: 'Japan' },
  { value: 'Jordan', label: 'Jordan' },
  { value: 'Kenya', label: 'Kenya' },
  { value: 'London', label: 'London, UK' },
  { value: 'Macau', label: 'Macau' },
  { value: 'Morocco', label: 'Morocco' },
  { value: 'Nepal', label: 'Nepal' },
  { value: 'New Zealand', label: 'New Zealand' },
  { value: 'Norway', label: 'Norway' },
  { value: 'Paris', label: 'Paris, France' },
  { value: 'Portugal', label: 'Portugal' },
  { value: 'Santorini', label: 'Santorini, Greece' },
  { value: 'Saudi Arabia', label: 'Saudi Arabia' },
  { value: 'Scotland', label: 'Scotland' },
  { value: 'South Africa', label: 'South Africa' },
  { value: 'South Korea', label: 'South Korea' },
  { value: 'Spain', label: 'Spain' },
  { value: 'Switzerland', label: 'Switzerland' },
  { value: 'Taiwan', label: 'Taiwan' },
  { value: 'Tanzania', label: 'Tanzania' },
  { value: 'Turkey', label: 'Turkey' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'USA', label: 'United States' },
];

// Combined list for search functionality
export const ALL_DESTINATIONS = [
  ...POPULAR_INTERNATIONAL,
  ...OTHER_INTERNATIONAL,
].sort((a, b) => a.label.localeCompare(b.label));

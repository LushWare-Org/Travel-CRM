/**
 * Destinations for travel packages
 * Organized by popular, international, and domestic (India) destinations
 */

// Popular International Destinations (from your existing packages)
export const POPULAR_INTERNATIONAL = [
  { value: 'Almaty', label: 'Almaty, Kazakhstan' },
  { value: 'Bali', label: 'Bali, Indonesia' },
  { value: 'Bangkok & Pattaya', label: 'Bangkok & Pattaya, Thailand' },
  { value: 'Dubai', label: 'Dubai, UAE' },
  { value: 'Hongkong & Macau', label: 'Hongkong & Macau' },
  { value: 'Japan', label: 'Japan' },
  { value: 'Malaysia', label: 'Malaysia' },
  { value: 'Maldives', label: 'Maldives' },
  { value: 'Mauritius', label: 'Mauritius' },
  { value: 'Phuket & Krabi', label: 'Phuket & Krabi, Thailand' },
  { value: 'Philippines', label: 'Philippines' },
  { value: 'Seychelles', label: 'Seychelles' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'Sri Lanka', label: 'Sri Lanka' },
  { value: 'Thailand', label: 'Thailand' },
  { value: 'Turkey', label: 'Turkey' },
  { value: 'Baku', label: 'Baku, Azerbaijan' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Vietnam', label: 'Vietnam' },
];

// Popular Domestic Destinations (India)
export const POPULAR_DOMESTIC = [
  { value: 'Andaman', label: 'Andaman & Nicobar Islands' },
  { value: 'Goa', label: 'Goa' },
  { value: 'Himachal', label: 'Himachal Pradesh' },
  { value: 'Kashmir', label: 'Kashmir' },
  { value: 'Kerala', label: 'Kerala' },
  { value: 'Rajasthan', label: 'Rajasthan' },
  { value: 'Northeast', label: 'Northeast India' },
];

// Additional Domestic Destinations (India)
export const OTHER_DOMESTIC = [
  { value: 'Agra', label: 'Agra (Taj Mahal)' },
  { value: 'Amritsar', label: 'Amritsar' },
  { value: 'Assam', label: 'Assam' },
  { value: 'Bengaluru', label: 'Bengaluru' },
  { value: 'Chennai', label: 'Chennai' },
  { value: 'Darjeeling', label: 'Darjeeling' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Gujarat', label: 'Gujarat' },
  { value: 'Hampi', label: 'Hampi' },
  { value: 'Jaipur', label: 'Jaipur' },
  { value: 'Kolkata', label: 'Kolkata' },
  { value: 'Ladakh', label: 'Ladakh' },
  { value: 'Leh', label: 'Leh' },
  { value: 'Lakshadweep', label: 'Lakshadweep' },
  { value: 'Manali', label: 'Manali' },
  { value: 'Mumbai', label: 'Mumbai' },
  { value: 'Mysore', label: 'Mysore' },
  { value: 'Ooty', label: 'Ooty' },
  { value: 'Pondicherry', label: 'Pondicherry' },
  { value: 'Punjab', label: 'Punjab' },
  { value: 'Rishikesh', label: 'Rishikesh' },
  { value: 'Shimla', label: 'Shimla' },
  { value: 'Sikkim', label: 'Sikkim' },
  { value: 'Udaipur', label: 'Udaipur' },
  { value: 'Uttarakhand', label: 'Uttarakhand' },
  { value: 'Varanasi', label: 'Varanasi' },
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

// Destination categories for UI
export const DESTINATION_CATEGORIES = [
  { value: 'popular-international', label: '🌟 Popular International' },
  { value: 'popular-domestic', label: '🇮🇳 Popular Domestic (India)' },
  { value: 'other-international', label: '✈️ Other International' },
  { value: 'other-domestic', label: '🏔️ Other Domestic (India)' },
];

// Combined list for search functionality
export const ALL_DESTINATIONS = [
  ...POPULAR_INTERNATIONAL,
  ...POPULAR_DOMESTIC,
  ...OTHER_DOMESTIC,
  ...OTHER_INTERNATIONAL,
].sort((a, b) => a.label.localeCompare(b.label));

/**
 * Utility constants and configuration
 */

export const CATEGORY_COLORS = {
  honeymoon: 'bg-pink-100 text-pink-800',
  family: 'bg-green-100 text-green-800',
  adventure: 'bg-orange-100 text-orange-800',
  budget: 'bg-yellow-100 text-yellow-800',
  luxury: 'bg-purple-100 text-purple-800',
  religious: 'bg-indigo-100 text-indigo-800',
  wildlife: 'bg-lime-100 text-lime-800',
  beach: 'bg-cyan-100 text-cyan-800',
  heritage: 'bg-amber-100 text-amber-800',
  other: 'bg-gray-100 text-gray-800',
};

export const STATUS_COLORS = {
  published: 'bg-green-100 text-green-800',
  draft: 'bg-yellow-100 text-yellow-800',
  archived: 'bg-gray-100 text-gray-800',
};

export const CATEGORY_OPTIONS = [
  { value: 'honeymoon', label: 'Honeymoon' },
  { value: 'family', label: 'Family' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'budget', label: 'Budget' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'religious', label: 'Religious' },
  { value: 'wildlife', label: 'Wildlife' },
  { value: 'beach', label: 'Beach' },
  { value: 'heritage', label: 'Heritage' },
  { value: 'other', label: 'Other' },
];

export const REGION_OPTIONS = [
  { value: 'Europe', label: 'Europe' },
  { value: 'Asia', label: 'Asia' },
  { value: 'Middle East', label: 'Middle East' },
  { value: 'Americas', label: 'Americas' },
  { value: 'Africa', label: 'Africa' },
];

export const DESTINATION_OPTIONS = [
  // Europe
  { value: 'Paris', label: 'Paris, France', region: 'Europe' },
  { value: 'London', label: 'London, UK', region: 'Europe' },
  { value: 'Rome', label: 'Rome, Italy', region: 'Europe' },
  { value: 'Barcelona', label: 'Barcelona, Spain', region: 'Europe' },
  { value: 'Amsterdam', label: 'Amsterdam, Netherlands', region: 'Europe' },
  { value: 'Berlin', label: 'Berlin, Germany', region: 'Europe' },
  { value: 'Vienna', label: 'Vienna, Austria', region: 'Europe' },
  { value: 'Prague', label: 'Prague, Czech Republic', region: 'Europe' },
  { value: 'Santorini', label: 'Santorini, Greece', region: 'Europe' },
  { value: 'Venice', label: 'Venice, Italy', region: 'Europe' },
  
  // Asia
  { value: 'Tokyo', label: 'Tokyo, Japan', region: 'Asia' },
  { value: 'Bali', label: 'Bali, Indonesia', region: 'Asia' },
  { value: 'Bangkok', label: 'Bangkok, Thailand', region: 'Asia' },
  { value: 'Singapore', label: 'Singapore', region: 'Asia' },
  { value: 'Hong Kong', label: 'Hong Kong', region: 'Asia' },
  { value: 'Seoul', label: 'Seoul, South Korea', region: 'Asia' },
  { value: 'Maldives', label: 'Maldives', region: 'Asia' },
  { value: 'Colombo', label: 'Colombo, Sri Lanka', region: 'Asia' },
  { value: 'Delhi', label: 'Delhi, India', region: 'Asia' },
  { value: 'Mumbai', label: 'Mumbai, India', region: 'Asia' },
  
  // Middle East
  { value: 'Dubai', label: 'Dubai, UAE', region: 'Middle East' },
  { value: 'Abu Dhabi', label: 'Abu Dhabi, UAE', region: 'Middle East' },
  { value: 'Doha', label: 'Doha, Qatar', region: 'Middle East' },
  { value: 'Istanbul', label: 'Istanbul, Turkey', region: 'Middle East' },
  { value: 'Jerusalem', label: 'Jerusalem, Israel', region: 'Middle East' },
  
  // Americas
  { value: 'New York', label: 'New York, USA', region: 'Americas' },
  { value: 'Los Angeles', label: 'Los Angeles, USA', region: 'Americas' },
  { value: 'Las Vegas', label: 'Las Vegas, USA', region: 'Americas' },
  { value: 'Miami', label: 'Miami, USA', region: 'Americas' },
  { value: 'Toronto', label: 'Toronto, Canada', region: 'Americas' },
  { value: 'Cancun', label: 'Cancun, Mexico', region: 'Americas' },
  { value: 'Rio de Janeiro', label: 'Rio de Janeiro, Brazil', region: 'Americas' },
  { value: 'Buenos Aires', label: 'Buenos Aires, Argentina', region: 'Americas' },
  
  // Africa
  { value: 'Cairo', label: 'Cairo, Egypt', region: 'Africa' },
  { value: 'Marrakech', label: 'Marrakech, Morocco', region: 'Africa' },
  { value: 'Cape Town', label: 'Cape Town, South Africa', region: 'Africa' },
  { value: 'Nairobi', label: 'Nairobi, Kenya', region: 'Africa' },
  { value: 'Zanzibar', label: 'Zanzibar, Tanzania', region: 'Africa' },
];

export const ACTIVITY_OPTIONS = [
  // Sightseeing & Culture
  { value: 'City Tour', label: 'City Tour', category: 'Sightseeing' },
  { value: 'Historical Sites', label: 'Historical Sites Visit', category: 'Sightseeing' },
  { value: 'Museum Visit', label: 'Museum Visit', category: 'Sightseeing' },
  { value: 'Cultural Show', label: 'Cultural Show', category: 'Culture' },
  { value: 'Heritage Walk', label: 'Heritage Walk', category: 'Culture' },
  { value: 'Local Market Tour', label: 'Local Market Tour', category: 'Culture' },
  
  // Adventure
  { value: 'Hiking', label: 'Hiking/Trekking', category: 'Adventure' },
  { value: 'Safari', label: 'Safari', category: 'Adventure' },
  { value: 'Scuba Diving', label: 'Scuba Diving', category: 'Adventure' },
  { value: 'Snorkeling', label: 'Snorkeling', category: 'Adventure' },
  { value: 'Zip Lining', label: 'Zip Lining', category: 'Adventure' },
  { value: 'Rock Climbing', label: 'Rock Climbing', category: 'Adventure' },
  { value: 'Paragliding', label: 'Paragliding', category: 'Adventure' },
  { value: 'White Water Rafting', label: 'White Water Rafting', category: 'Adventure' },
  
  // Water Activities
  { value: 'Beach Activities', label: 'Beach Activities', category: 'Water' },
  { value: 'Boat Cruise', label: 'Boat Cruise', category: 'Water' },
  { value: 'Yacht Tour', label: 'Yacht Tour', category: 'Water' },
  { value: 'Jet Skiing', label: 'Jet Skiing', category: 'Water' },
  { value: 'Kayaking', label: 'Kayaking', category: 'Water' },
  
  // Entertainment
  { value: 'Theme Park', label: 'Theme Park Visit', category: 'Entertainment' },
  { value: 'Shopping', label: 'Shopping', category: 'Entertainment' },
  { value: 'Night Life', label: 'Night Life Experience', category: 'Entertainment' },
  { value: 'Food Tour', label: 'Food Tour', category: 'Entertainment' },
  { value: 'Wine Tasting', label: 'Wine Tasting', category: 'Entertainment' },
  { value: 'Spa & Wellness', label: 'Spa & Wellness', category: 'Entertainment' },
  
  // Nature
  { value: 'Wildlife Watching', label: 'Wildlife Watching', category: 'Nature' },
  { value: 'Nature Walk', label: 'Nature Walk', category: 'Nature' },
  { value: 'Photography Tour', label: 'Photography Tour', category: 'Nature' },
  { value: 'Mountain View', label: 'Mountain Viewing', category: 'Nature' },
  
  // Religious/Spiritual
  { value: 'Temple Visit', label: 'Temple Visit', category: 'Religious' },
  { value: 'Church Visit', label: 'Church Visit', category: 'Religious' },
  { value: 'Mosque Visit', label: 'Mosque Visit', category: 'Religious' },
  { value: 'Meditation', label: 'Meditation Session', category: 'Religious' },
];

export const ACCOMMODATION_OPTIONS = [
  { value: '3-Star Hotel', label: '3-Star Hotel' },
  { value: '4-Star Hotel', label: '4-Star Hotel' },
  { value: '5-Star Hotel', label: '5-Star Hotel' },
  { value: 'Luxury Resort', label: 'Luxury Resort' },
  { value: 'Beach Resort', label: 'Beach Resort' },
  { value: 'Boutique Hotel', label: 'Boutique Hotel' },
  { value: 'Villa', label: 'Private Villa' },
  { value: 'Apartment', label: 'Serviced Apartment' },
  { value: 'Hostel', label: 'Hostel' },
  { value: 'Guesthouse', label: 'Guesthouse' },
];

export const TRANSPORT_OPTIONS = [
  { value: 'Flight', label: 'Flight Only' },
  { value: 'Flight + Transfers', label: 'Flight + Airport Transfers' },
  { value: 'Flight + Car', label: 'Flight + Rental Car' },
  { value: 'Private Car', label: 'Private Car with Driver' },
  { value: 'Bus', label: 'Bus/Coach' },
  { value: 'Train', label: 'Train' },
  { value: 'Ferry', label: 'Ferry' },
  { value: 'Mixed', label: 'Mixed Transport' },
];

export const IMAGE_UPLOAD_API_KEY = '4e08e03047ee0d48610586ad270e2b39';
export const IMAGE_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

export const PDF_CONFIG = {
  pageWidth: null, // Set dynamically
  pageHeight: null, // Set dynamically
  margin: 20,
  lineHeight: 7,
  headerBgColor: [0, 0, 255],
  company: 'Trip Sky Way.',
  tagline: 'Your Ultimate Travel Partner',
  contact: 'Contact us: info@tripskyway.com | +1-800-TRAVEL',
  email: 'info@tripskyway.com',
  phone: '+1-800-TRAVEL',
  website: 'https://www.tripskyway.com',
};

export const VALIDATION_MESSAGES = {
  NIGHTS_INVALID: 'Please enter a valid number of nights',
  ITINERARY_INCOMPLETE: 'Please fill out all required itinerary fields.',
  IMAGE_UPLOAD_FAILED: 'Failed to upload image',
  PACKAGE_CREATED: 'New package created successfully.',
  PACKAGE_UPDATED: 'Package updated successfully.',
  PACKAGE_DELETED: 'has been deleted.',
  ITINERARY_SUBMITTED: 'Itinerary submitted successfully.',
};

export const ITINERARY_LABELS = {
  ARRIVAL_DAY: 'Arrival Day',
  DEPARTURE_DAY: 'Departure Day',
};

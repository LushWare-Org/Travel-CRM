/**
 * Data Adapters for Frontend ↔ Backend Transformation
 * Converts between frontend display format and backend API format
 */

/**
 * Convert frontend package/itinerary data to backend format
 */
export const toBackendFormat = {
  /**
   * Convert frontend package to backend package format
   */
  package: (frontendPackage) => {
    // Extract number from duration string: "5 Days / 4 Nights" → 5
    const durationMatch = frontendPackage.duration.match(/(\d+)\s*Days?/i);
    const duration = durationMatch ? parseInt(durationMatch[1], 10) : 1;

    // Extract number from price string: "$2,499" → 2499
    const priceMatch = frontendPackage.price.replace(/[^0-9.]/g, '');
    const price = parseFloat(priceMatch) || 0;

    // Convert category to lowercase
    const category = frontendPackage.category.toLowerCase();

    // Use first destination as main destination
    const destination = Array.isArray(frontendPackage.destinations) && frontendPackage.destinations.length > 0
      ? frontendPackage.destinations[0]
      : frontendPackage.region || 'Unknown';

    return {
      name: frontendPackage.name,
      description: frontendPackage.description || '',
      destination,
      duration,
      price,
      category,
      difficulty: 'moderate', // Default
      maxGroupSize: 10, // Default
      highlights: frontendPackage.destinations || [],
      inclusions: [`Accommodation: ${frontendPackage.accommodation}`, `Transport: ${frontendPackage.transport}`],
      exclusions: [],
      terms: [],
      isActive: frontendPackage.status === 'published',
      isFeatured: false,
    };
  },

  /**
   * Convert frontend itinerary to backend itinerary format
   */
  itinerary: (frontendPackage, packageId) => {
    const days = [];

    // Extract number of nights from duration
    const nightsMatch = frontendPackage.duration.match(/(\d+)\s*Nights?/i);
    const totalNights = nightsMatch ? parseInt(nightsMatch[1], 10) : 4;
    const totalDays = totalNights + 1;

    // Day 1: Arrival (first_day)
    if (frontendPackage.itinerary?.first_day || frontendPackage.itineraryTitles?.first_day) {
      days.push({
        dayNumber: 1,
        title: frontendPackage.itineraryTitles?.first_day || 'Arrival Day',
        description: frontendPackage.itinerary?.first_day || 'Arrival and check-in',
        activities: [],
        accommodation: {
          name: frontendPackage.accommodation || '',
          type: mapAccommodationType(frontendPackage.accommodation),
        },
        meals: {
          breakfast: false,
          lunch: false,
          dinner: true,
        },
        transport: mapTransportType(frontendPackage.transport),
      });
    }

    // Middle days
    if (frontendPackage.itinerary?.middle_days) {
      const middleDayKeys = Object.keys(frontendPackage.itinerary.middle_days).sort();
      middleDayKeys.forEach((key, index) => {
        const dayNumber = index + 2; // Start from day 2
        days.push({
          dayNumber,
          title: frontendPackage.itineraryTitles?.middle_days?.[key] || `Day ${dayNumber}`,
          description: frontendPackage.itinerary.middle_days[key] || '',
          activities: frontendPackage.activities || [],
          accommodation: {
            name: frontendPackage.accommodation || '',
            type: mapAccommodationType(frontendPackage.accommodation),
          },
          meals: {
            breakfast: true,
            lunch: true,
            dinner: true,
          },
          transport: mapTransportType(frontendPackage.transport),
          places: frontendPackage.destinations?.map((dest) => ({
            name: dest,
            description: '',
            duration: '2-3 hours',
          })) || [],
        });
      });
    }

    // Last day: Departure
    if (frontendPackage.itinerary?.last_day || frontendPackage.itineraryTitles?.last_day) {
      days.push({
        dayNumber: totalDays,
        title: frontendPackage.itineraryTitles?.last_day || 'Departure Day',
        description: frontendPackage.itinerary?.last_day || 'Check-out and departure',
        activities: [],
        accommodation: {
          name: frontendPackage.accommodation || '',
          type: mapAccommodationType(frontendPackage.accommodation),
        },
        meals: {
          breakfast: true,
          lunch: false,
          dinner: false,
        },
        transport: mapTransportType(frontendPackage.transport),
      });
    }

    return {
      package: packageId,
      days,
      status: frontendPackage.status || 'draft',
    };
  },
};

/**
 * Convert backend data to frontend format
 */
export const toFrontendFormat = {
  /**
   * Convert backend package to frontend package format
   */
  package: (backendPackage, backendItinerary = null) => {
    // Convert duration number to string: 5 → "6 Days / 5 Nights"
    const nights = backendPackage.duration - 1;
    const duration = `${backendPackage.duration} Days / ${nights} Nights`;

    // Convert price to string with currency
    const price = `$${backendPackage.price.toLocaleString()}`;

    // Capitalize category
    const category = backendPackage.category.charAt(0).toUpperCase() + backendPackage.category.slice(1);

    // Extract destinations from highlights
    const destinations = backendPackage.highlights || [backendPackage.destination];

    // Extract accommodation and transport from inclusions
    let accommodation = '4-Star Hotel';
    let transport = 'Flight + Transfers';
    
    if (backendPackage.inclusions) {
      backendPackage.inclusions.forEach((item) => {
        if (item.includes('Accommodation:')) {
          accommodation = item.replace('Accommodation:', '').trim();
        }
        if (item.includes('Transport:')) {
          transport = item.replace('Transport:', '').trim();
        }
      });
    }

    // Extract activities from itinerary if available
    let activities = [];
    if (backendItinerary?.days) {
      backendItinerary.days.forEach((day) => {
        if (day.activities) {
          activities = [...activities, ...day.activities];
        }
      });
      // Remove duplicates
      activities = [...new Set(activities)];
    }

    // Build itinerary structure
    const itinerary = {
      first_day: '',
      middle_days: {},
      last_day: '',
    };

    const itineraryTitles = {
      first_day: '',
      middle_days: {},
      last_day: '',
    };

    if (backendItinerary?.days) {
      backendItinerary.days.forEach((day) => {
        if (day.dayNumber === 1) {
          itinerary.first_day = day.description;
          itineraryTitles.first_day = day.title;
        } else if (day.dayNumber === backendItinerary.days.length) {
          itinerary.last_day = day.description;
          itineraryTitles.last_day = day.title;
        } else {
          const key = `day_${day.dayNumber - 1}`;
          itinerary.middle_days[key] = day.description;
          itineraryTitles.middle_days[key] = day.title;
        }
      });
    }

    return {
      id: backendPackage._id || backendPackage.id,
      name: backendPackage.name,
      description: backendPackage.description,
      duration,
      price,
      category,
      region: 'Asia', // Default, can be enhanced
      destinations,
      activities,
      accommodation,
      transport,
      images: backendPackage.images || [],
      status: backendPackage.isActive ? 'published' : 'draft',
      createdDate: new Date(backendPackage.createdAt).toISOString().split('T')[0],
      updatedDate: new Date(backendPackage.updatedAt).toISOString().split('T')[0],
      bookings: backendPackage.bookings || 0,
      rating: backendPackage.rating || 0,
      reviews: backendPackage.numReviews || 0,
      itinerary,
      itineraryTitles,
    };
  },
};

/**
 * Map frontend accommodation to backend enum
 */
function mapAccommodationType(accommodation) {
  if (!accommodation) return 'hotel';
  
  const lower = accommodation.toLowerCase();
  if (lower.includes('resort')) return 'resort';
  if (lower.includes('guesthouse')) return 'guesthouse';
  if (lower.includes('homestay')) return 'homestay';
  if (lower.includes('camp')) return 'camp';
  if (lower.includes('hotel')) return 'hotel';
  return 'other';
}

/**
 * Map frontend transport to backend enum
 */
function mapTransportType(transport) {
  if (!transport) return 'other';
  
  const lower = transport.toLowerCase();
  if (lower.includes('flight')) return 'flight';
  if (lower.includes('train')) return 'train';
  if (lower.includes('bus')) return 'bus';
  if (lower.includes('car')) return 'car';
  if (lower.includes('boat') || lower.includes('ferry')) return 'boat';
  if (lower.includes('walk')) return 'walk';
  return 'other';
}

/**
 * Helper to extract nights from duration string
 */
export function extractNights(durationString) {
  const match = durationString.match(/(\d+)\s*Nights?/i);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Helper to create duration string from nights
 */
export function createDurationString(nights) {
  const days = nights + 1;
  return `${days} Days / ${nights} Nights`;
}

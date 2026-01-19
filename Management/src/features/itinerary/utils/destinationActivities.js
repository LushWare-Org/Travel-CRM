/**
 * Destination-Specific Activity Database
 * Provides context-aware activity suggestions based on destination
 */

import { DEFAULT_ACTIVITIES } from './activities';
import { getRegionFromDestination } from './destinationMapping';

// Destination-specific activities (most popular destinations)
export const DESTINATION_ACTIVITIES = {
    // Middle East - Dubai/UAE
    'Dubai': [
        'Burj Khalifa Visit',
        'Desert Safari',
        'Dubai Mall Shopping',
        'Gold Souk Visit',
        'Dubai Marina Cruise',
        'Palm Jumeirah Tour',
        'Dubai Frame',
        'Miracle Garden',
        'Global Village',
        'Ski Dubai',
        'Aquaventure Waterpark',
        'Dubai Fountain Show',
        'Jumeirah Beach',
        'Dune Bashing',
        'Camel Riding',
        'Dhow Cruise',
        'Helicopter Tour',
        'Skydiving Dubai',
        'IMG Worlds of Adventure',
        'Dubai Creek',
    ],

    'Abu Dhabi': [
        'Sheikh Zayed Grand Mosque',
        'Louvre Abu Dhabi',
        'Ferrari World',
        'Yas Island',
        'Emirates Palace',
        'Corniche Beach',
        'Qasr Al Watan',
        'Warner Bros World',
        'Yas Waterworld',
        'Mangrove Kayaking',
    ],

    // Southeast Asia - Bali/Indonesia
    'Bali': [
        'Ubud Rice Terraces',
        'Tanah Lot Temple',
        'Uluwatu Temple',
        'Sacred Monkey Forest',
        'Tegallalang Rice Terrace',
        'Mount Batur Sunrise Trek',
        'Tirta Empul Temple',
        'Seminyak Beach',
        'Nusa Penida Island',
        'Kuta Beach',
        'Waterbom Bali',
        'Balinese Cooking Class',
        'Traditional Dance Show',
        'Spa & Massage',
        'Surfing Lessons',
        'Snorkeling',
        'White Water Rafting',
        'ATV Ride',
        'Tegenungan Waterfall',
        'Jatiluwih Rice Terraces',
    ],

    'Bangkok': [
        'Grand Palace',
        'Wat Pho (Reclining Buddha)',
        'Wat Arun',
        'Floating Market',
        'Chatuchak Weekend Market',
        'Khao San Road',
        'Chao Phraya River Cruise',
        'Thai Cooking Class',
        'Thai Massage',
        'Rooftop Bar Experience',
        'Chinatown Bangkok',
        'Jim Thompson House',
        'Asiatique Night Market',
        'MBK Shopping Center',
    ],

    'Singapore': [
        'Marina Bay Sands',
        'Gardens by the Bay',
        'Sentosa Island',
        'Universal Studios Singapore',
        'Singapore Zoo',
        'Night Safari',
        'Chinatown',
        'Little India',
        'Arab Street',
        'Orchard Road Shopping',
        'Singapore Flyer',
        'Clarke Quay',
        'Merlion Park',
        'Hawker Center Food Tour',
    ],

    // South Asia - Sri Lanka
    'Colombo': [
        'Sigiriya Rock Fortress',
        'Temple of the Tooth',
        'Galle Fort',
        'Yala National Park Safari',
        'Ella Nine Arch Bridge',
        'Tea Plantation Visit',
        'Mirissa Whale Watching',
        'Unawatuna Beach',
        'Dambulla Cave Temple',
        'Polonnaruwa Ancient City',
        'Horton Plains',
        'Adam\'s Peak',
        'Bentota Water Sports',
        'Colombo City Tour',
        'Pinnawala Elephant Orphanage',
        'Arugam Bay Surfing',
        'Hikkaduwa Beach',
        'Kandy Cultural Show',
    ],

    'Maldives': [
        'Snorkeling',
        'Scuba Diving',
        'Island Hopping',
        'Dolphin Watching',
        'Sunset Cruise',
        'Water Sports',
        'Spa & Wellness',
        'Beach Relaxation',
        'Underwater Restaurant',
        'Sandbank Picnic',
        'Night Fishing',
        'Submarine Tour',
    ],

    // Europe - France
    'Paris': [
        'Eiffel Tower',
        'Louvre Museum',
        'Notre-Dame Cathedral',
        'Arc de Triomphe',
        'Champs-Élysées',
        'Versailles Palace',
        'Montmartre',
        'Sacré-Cœur',
        'Seine River Cruise',
        'Disneyland Paris',
        'Latin Quarter',
        'Musée d\'Orsay',
        'Sainte-Chapelle',
        'Luxembourg Gardens',
        'Moulin Rouge',
        'Catacombs of Paris',
        'Père Lachaise Cemetery',
        'Le Marais District',
    ],

    'London': [
        'Big Ben & Parliament',
        'Tower of London',
        'British Museum',
        'Buckingham Palace',
        'London Eye',
        'Tower Bridge',
        'Westminster Abbey',
        'Trafalgar Square',
        'Covent Garden',
        'Camden Market',
        'Hyde Park',
        'St Paul\'s Cathedral',
        'Thames River Cruise',
        'West End Show',
        'Harry Potter Studio Tour',
    ],

    'Rome': [
        'Colosseum',
        'Vatican Museums',
        'Sistine Chapel',
        'St Peter\'s Basilica',
        'Trevi Fountain',
        'Spanish Steps',
        'Pantheon',
        'Roman Forum',
        'Piazza Navona',
        'Trastevere',
        'Borghese Gallery',
        'Castel Sant\'Angelo',
        'Villa Borghese',
        'Catacombs',
    ],

    // East Asia - Japan
    'Tokyo': [
        'Senso-ji Temple',
        'Tokyo Skytree',
        'Shibuya Crossing',
        'Meiji Shrine',
        'Tsukiji Fish Market',
        'Akihabara',
        'Harajuku',
        'Tokyo Disneyland',
        'Imperial Palace',
        'Shinjuku Gyoen',
        'Robot Restaurant',
        'Sumo Wrestling',
        'Karaoke',
        'Ramen Tasting',
    ],

    'Kyoto': [
        'Fushimi Inari Shrine',
        'Kinkaku-ji (Golden Pavilion)',
        'Arashiyama Bamboo Grove',
        'Kiyomizu-dera Temple',
        'Gion District',
        'Nijo Castle',
        'Philosopher\'s Path',
        'Tea Ceremony',
        'Geisha Experience',
        'Nara Day Trip',
    ],

    // Americas
    'New York': [
        'Statue of Liberty',
        'Central Park',
        'Times Square',
        'Empire State Building',
        'Brooklyn Bridge',
        'Metropolitan Museum',
        '9/11 Memorial',
        'Broadway Show',
        'Fifth Avenue Shopping',
        'High Line',
        'Rockefeller Center',
        'Wall Street',
    ],

    'Las Vegas': [
        'Las Vegas Strip',
        'Fremont Street',
        'Casino Hopping',
        'Cirque du Soleil',
        'Grand Canyon Day Trip',
        'Helicopter Tour',
        'Hoover Dam',
        'Red Rock Canyon',
        'Bellagio Fountains',
        'High Roller Observation Wheel',
    ],

    // Oceania
    'Sydney': [
        'Sydney Opera House',
        'Sydney Harbour Bridge',
        'Bondi Beach',
        'Taronga Zoo',
        'Blue Mountains',
        'Darling Harbour',
        'The Rocks',
        'Manly Beach',
        'Royal Botanic Gardens',
        'Sydney Tower Eye',
    ],
};

// Regional activities (broader categories)
export const REGIONAL_ACTIVITIES = {
    'Middle East': [
        'Desert Safari',
        'Camel Riding',
        'Dune Bashing',
        'Bedouin Camp Experience',
        'Falconry Show',
        'Arabic Coffee Ceremony',
        'Henna Painting',
        'Shisha Lounge',
        'Gold Souk Shopping',
        'Spice Souk Visit',
        'Traditional Souq',
        'Arabian Nights Dinner',
    ],

    'Southeast Asia': [
        'Temple Visits',
        'Rice Terrace Tours',
        'Traditional Dance Performance',
        'Cooking Classes',
        'Street Food Tours',
        'Floating Markets',
        'Elephant Sanctuary',
        'Monkey Forest',
        'Batik Workshop',
        'Traditional Massage',
        'Tuk-Tuk Rides',
        'Night Markets',
    ],

    'South Asia': [
        'Temple Tours',
        'Wildlife Safari',
        'Tea Plantation Visit',
        'Ayurvedic Spa',
        'Yoga Sessions',
        'Spice Garden Tour',
        'Traditional Cooking Class',
        'Cultural Dance Show',
        'Rickshaw Rides',
        'Heritage Walks',
    ],

    'Europe': [
        'Museum Visits',
        'Cathedral Tours',
        'Castle Tours',
        'Wine Tasting',
        'River Cruises',
        'Historical Walking Tours',
        'Art Gallery Visits',
        'Opera Shows',
        'Fine Dining',
        'Christmas Markets',
        'Pub Crawls',
        'Bike Tours',
    ],

    'East Asia': [
        'Temple Visits',
        'Tea Ceremony',
        'Sushi Making Class',
        'Traditional Gardens',
        'Hot Springs (Onsen)',
        'Sumo Wrestling',
        'Karaoke',
        'Street Food Tours',
        'Kimono Experience',
        'Calligraphy Class',
    ],

    'North America': [
        'National Parks',
        'City Tours',
        'Museum Visits',
        'Shopping Malls',
        'Theme Parks',
        'Sports Events',
        'Food Tours',
        'Brewery Tours',
        'Road Trips',
        'Helicopter Tours',
    ],

    'Oceania': [
        'Beach Activities',
        'Surfing Lessons',
        'Great Barrier Reef',
        'Wildlife Encounters',
        'Bush Walks',
        'Aboriginal Culture',
        'Wine Regions',
        'Coastal Drives',
        'Water Sports',
        'Island Hopping',
    ],
};

/**
 * Get activities for a specific destination
 * @param {string} destination - Destination name (e.g., "Dubai", "Bali")
 * @param {boolean} includeGeneric - Include generic activities
 * @returns {Array} - Array of activity objects sorted by priority
 */
export const getActivitiesForDestination = (destination, includeGeneric = true) => {
    if (!destination) {
        return DEFAULT_ACTIVITIES;
    }

    const activities = [];

    // 1. Add destination-specific activities (highest priority)
    if (DESTINATION_ACTIVITIES[destination]) {
        activities.push(...DESTINATION_ACTIVITIES[destination].map(label => ({
            value: label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            label,
            category: 'destination-specific',
            priority: 1,
        })));
    }

    // 2. Add regional activities (medium priority)
    const region = getRegionFromDestination(destination);
    if (region && REGIONAL_ACTIVITIES[region]) {
        activities.push(...REGIONAL_ACTIVITIES[region].map(label => ({
            value: label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            label,
            category: 'regional',
            priority: 2,
        })));
    }

    // 3. Add generic activities (low priority)
    if (includeGeneric) {
        activities.push(...DEFAULT_ACTIVITIES.map(act => ({
            ...act,
            priority: 3,
        })));
    }

    // Remove duplicates (prefer higher priority)
    const uniqueActivities = Array.from(
        new Map(activities.map(item => [item.label, item])).values()
    );

    // Sort by priority (1 = highest)
    return uniqueActivities.sort((a, b) => a.priority - b.priority);
};

export default {
    DESTINATION_ACTIVITIES,
    REGIONAL_ACTIVITIES,
    getActivitiesForDestination,
};

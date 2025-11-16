/**
 * Default list of activities for itinerary planning
 * Organized by category for better user experience
 */

export const DEFAULT_ACTIVITIES = [
  // Sightseeing & Culture
  { value: 'city-tour', label: 'City Tour', category: 'sightseeing' },
  { value: 'museum-visit', label: 'Museum Visit', category: 'sightseeing' },
  { value: 'historical-site', label: 'Historical Site Visit', category: 'sightseeing' },
  { value: 'temple-visit', label: 'Temple Visit', category: 'sightseeing' },
  { value: 'church-visit', label: 'Church Visit', category: 'sightseeing' },
  { value: 'mosque-visit', label: 'Mosque Visit', category: 'sightseeing' },
  { value: 'palace-tour', label: 'Palace Tour', category: 'sightseeing' },
  { value: 'castle-tour', label: 'Castle Tour', category: 'sightseeing' },
  { value: 'monument-visit', label: 'Monument Visit', category: 'sightseeing' },
  { value: 'architectural-tour', label: 'Architectural Tour', category: 'sightseeing' },
  { value: 'heritage-walk', label: 'Heritage Walk', category: 'sightseeing' },
  { value: 'art-gallery', label: 'Art Gallery Visit', category: 'sightseeing' },
  { value: 'cultural-show', label: 'Cultural Show', category: 'sightseeing' },
  { value: 'local-market', label: 'Local Market Visit', category: 'sightseeing' },

  // Adventure Activities
  { value: 'trekking', label: 'Trekking', category: 'adventure' },
  { value: 'hiking', label: 'Hiking', category: 'adventure' },
  { value: 'mountain-climbing', label: 'Mountain Climbing', category: 'adventure' },
  { value: 'rock-climbing', label: 'Rock Climbing', category: 'adventure' },
  { value: 'zip-lining', label: 'Zip Lining', category: 'adventure' },
  { value: 'bungee-jumping', label: 'Bungee Jumping', category: 'adventure' },
  { value: 'skydiving', label: 'Skydiving', category: 'adventure' },
  { value: 'paragliding', label: 'Paragliding', category: 'adventure' },
  { value: 'hot-air-balloon', label: 'Hot Air Balloon Ride', category: 'adventure' },
  { value: 'camping', label: 'Camping', category: 'adventure' },
  { value: 'safari', label: 'Safari', category: 'adventure' },
  { value: 'atv-ride', label: 'ATV Ride', category: 'adventure' },
  { value: 'quad-biking', label: 'Quad Biking', category: 'adventure' },
  { value: 'sandboarding', label: 'Sandboarding', category: 'adventure' },

  // Water Activities
  { value: 'scuba-diving', label: 'Scuba Diving', category: 'water' },
  { value: 'snorkeling', label: 'Snorkeling', category: 'water' },
  { value: 'swimming', label: 'Swimming', category: 'water' },
  { value: 'surfing', label: 'Surfing', category: 'water' },
  { value: 'kayaking', label: 'Kayaking', category: 'water' },
  { value: 'white-water-rafting', label: 'White Water Rafting', category: 'water' },
  { value: 'jet-skiing', label: 'Jet Skiing', category: 'water' },
  { value: 'parasailing', label: 'Parasailing', category: 'water' },
  { value: 'banana-boat', label: 'Banana Boat Ride', category: 'water' },
  { value: 'boat-cruise', label: 'Boat Cruise', category: 'water' },
  { value: 'yacht-cruise', label: 'Yacht Cruise', category: 'water' },
  { value: 'ferry-ride', label: 'Ferry Ride', category: 'water' },
  { value: 'fishing', label: 'Fishing', category: 'water' },
  { value: 'beach-day', label: 'Beach Day', category: 'water' },
  { value: 'island-hopping', label: 'Island Hopping', category: 'water' },

  // Winter Activities
  { value: 'skiing', label: 'Skiing', category: 'winter' },
  { value: 'snowboarding', label: 'Snowboarding', category: 'winter' },
  { value: 'ice-skating', label: 'Ice Skating', category: 'winter' },
  { value: 'snowmobiling', label: 'Snowmobiling', category: 'winter' },
  { value: 'dog-sledding', label: 'Dog Sledding', category: 'winter' },
  { value: 'northern-lights', label: 'Northern Lights Viewing', category: 'winter' },

  // Nature & Wildlife
  { value: 'wildlife-safari', label: 'Wildlife Safari', category: 'nature' },
  { value: 'bird-watching', label: 'Bird Watching', category: 'nature' },
  { value: 'nature-walk', label: 'Nature Walk', category: 'nature' },
  { value: 'botanical-garden', label: 'Botanical Garden Visit', category: 'nature' },
  { value: 'national-park', label: 'National Park Visit', category: 'nature' },
  { value: 'waterfall-visit', label: 'Waterfall Visit', category: 'nature' },
  { value: 'cave-exploration', label: 'Cave Exploration', category: 'nature' },
  { value: 'jungle-trek', label: 'Jungle Trek', category: 'nature' },
  { value: 'elephant-ride', label: 'Elephant Ride', category: 'nature' },
  { value: 'camel-ride', label: 'Camel Ride', category: 'nature' },
  { value: 'horse-riding', label: 'Horse Riding', category: 'nature' },

  // Food & Dining
  { value: 'food-tour', label: 'Food Tour', category: 'dining' },
  { value: 'cooking-class', label: 'Cooking Class', category: 'dining' },
  { value: 'wine-tasting', label: 'Wine Tasting', category: 'dining' },
  { value: 'brewery-tour', label: 'Brewery Tour', category: 'dining' },
  { value: 'street-food', label: 'Street Food Tour', category: 'dining' },
  { value: 'fine-dining', label: 'Fine Dining Experience', category: 'dining' },
  { value: 'local-cuisine', label: 'Local Cuisine Tasting', category: 'dining' },
  { value: 'rooftop-dining', label: 'Rooftop Dining', category: 'dining' },
  { value: 'desert-dining', label: 'Desert Dining', category: 'dining' },
  { value: 'bbq-dinner', label: 'BBQ Dinner', category: 'dining' },

  // Entertainment & Shopping
  { value: 'shopping', label: 'Shopping', category: 'entertainment' },
  { value: 'mall-visit', label: 'Mall Visit', category: 'entertainment' },
  { value: 'bazaar-shopping', label: 'Bazaar Shopping', category: 'entertainment' },
  { value: 'souvenir-shopping', label: 'Souvenir Shopping', category: 'entertainment' },
  { value: 'night-market', label: 'Night Market', category: 'entertainment' },
  { value: 'theme-park', label: 'Theme Park', category: 'entertainment' },
  { value: 'water-park', label: 'Water Park', category: 'entertainment' },
  { value: 'zoo-visit', label: 'Zoo Visit', category: 'entertainment' },
  { value: 'aquarium-visit', label: 'Aquarium Visit', category: 'entertainment' },
  { value: 'cinema', label: 'Cinema/Movie', category: 'entertainment' },
  { value: 'theatre-show', label: 'Theatre Show', category: 'entertainment' },
  { value: 'concert', label: 'Concert', category: 'entertainment' },
  { value: 'nightlife', label: 'Nightlife/Clubbing', category: 'entertainment' },
  { value: 'casino', label: 'Casino Visit', category: 'entertainment' },

  // Wellness & Relaxation
  { value: 'spa', label: 'Spa Treatment', category: 'wellness' },
  { value: 'massage', label: 'Massage', category: 'wellness' },
  { value: 'yoga', label: 'Yoga Session', category: 'wellness' },
  { value: 'meditation', label: 'Meditation', category: 'wellness' },
  { value: 'wellness-retreat', label: 'Wellness Retreat', category: 'wellness' },
  { value: 'hot-springs', label: 'Hot Springs', category: 'wellness' },
  { value: 'beach-relaxation', label: 'Beach Relaxation', category: 'wellness' },

  // Photography & Views
  { value: 'photography-tour', label: 'Photography Tour', category: 'photography' },
  { value: 'sunrise-viewing', label: 'Sunrise Viewing', category: 'photography' },
  { value: 'sunset-viewing', label: 'Sunset Viewing', category: 'photography' },
  { value: 'viewpoint-visit', label: 'Viewpoint Visit', category: 'photography' },
  { value: 'observation-deck', label: 'Observation Deck', category: 'photography' },
  { value: 'lighthouse-visit', label: 'Lighthouse Visit', category: 'photography' },

  // Sports & Fitness
  { value: 'golf', label: 'Golf', category: 'sports' },
  { value: 'tennis', label: 'Tennis', category: 'sports' },
  { value: 'cycling', label: 'Cycling', category: 'sports' },
  { value: 'running', label: 'Running/Jogging', category: 'sports' },
  { value: 'gym-workout', label: 'Gym Workout', category: 'sports' },

  // Transport & Transfer
  { value: 'airport-transfer', label: 'Airport Transfer', category: 'transport' },
  { value: 'hotel-checkin', label: 'Hotel Check-in', category: 'transport' },
  { value: 'hotel-checkout', label: 'Hotel Check-out', category: 'transport' },
  { value: 'train-journey', label: 'Train Journey', category: 'transport' },
  { value: 'cable-car-ride', label: 'Cable Car Ride', category: 'transport' },
  { value: 'helicopter-tour', label: 'Helicopter Tour', category: 'transport' },

  // Miscellaneous
  { value: 'free-time', label: 'Free Time/Leisure', category: 'misc' },
  { value: 'photo-session', label: 'Photo Session', category: 'misc' },
  { value: 'workshop', label: 'Workshop', category: 'misc' },
  { value: 'festival', label: 'Festival/Event', category: 'misc' },
  { value: 'ceremony', label: 'Ceremony', category: 'misc' },
  { value: 'volunteer-work', label: 'Volunteer Work', category: 'misc' },
];

export const ACTIVITY_CATEGORIES = [
  { value: 'all', label: 'All Activities' },
  { value: 'sightseeing', label: 'Sightseeing & Culture' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'water', label: 'Water Activities' },
  { value: 'winter', label: 'Winter Activities' },
  { value: 'nature', label: 'Nature & Wildlife' },
  { value: 'dining', label: 'Food & Dining' },
  { value: 'entertainment', label: 'Entertainment & Shopping' },
  { value: 'wellness', label: 'Wellness & Relaxation' },
  { value: 'photography', label: 'Photography & Views' },
  { value: 'sports', label: 'Sports & Fitness' },
  { value: 'transport', label: 'Transport & Transfer' },
  { value: 'misc', label: 'Miscellaneous' },
];


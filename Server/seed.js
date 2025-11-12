/**
 * Seed Script for Itinerary Analytics Testing
 * This script creates sample data for testing itinerary analytics features
 * 
 * Usage: node seed.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Package from './src/models/package.model.js';
import Itinerary from './src/models/itinerary.model.js';
import Lead from './src/models/lead.model.js';
import User from './src/models/user.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trip-sky-way';

// Sample data
const samplePackages = [
  {
    name: '7-Day Kerala Tour',
    destination: 'Kerala',
    duration: 7,
    price: 1800,
    category: 'adventure',
    difficulty: 'easy',
    highlights: ['Backwaters', 'Tea Plantations', 'Beaches'],
    description: 'Experience the beauty of Kerala with backwater cruises and tea gardens',
    inclusions: ['Accommodation', 'Meals', 'Transportation'],
    exclusions: ['Flight tickets', 'Travel insurance'],
    terms: ['Non-refundable after confirmation'],
    status: 'active',
  },
  {
    name: '14-Day India Adventure',
    destination: 'India',
    duration: 14,
    price: 2500,
    category: 'cultural',
    difficulty: 'medium',
    highlights: ['Taj Mahal', 'Jaipur Palace', 'Varanasi'],
    description: 'Discover the cultural richness of India from north to south',
    inclusions: ['Accommodation', 'Meals', 'Guided tours'],
    exclusions: ['International flights'],
    terms: ['Visa required'],
    status: 'active',
  },
  {
    name: '5-Day Maldives Escape',
    destination: 'Maldives',
    duration: 5,
    price: 3500,
    category: 'luxury',
    difficulty: 'easy',
    highlights: ['Island hopping', 'Snorkeling', 'Spa'],
    description: 'Relax in paradise with crystal clear waters and white sand beaches',
    inclusions: ['Resort accommodation', 'All meals', 'Water activities'],
    exclusions: ['Flights'],
    terms: ['Peak season surcharge applies'],
    status: 'active',
  },
  {
    name: '10-Day Nepal Experience',
    destination: 'Nepal',
    duration: 10,
    price: 1200,
    category: 'adventure',
    difficulty: 'hard',
    highlights: ['Everest trek', 'Kathmandu', 'Pokhara'],
    description: 'Trek through the Himalayas and experience Nepali culture',
    inclusions: ['Accommodation', 'Meals', 'Trekking guides'],
    exclusions: ['International flights', 'Travel insurance'],
    terms: ['Good physical fitness required'],
    status: 'active',
  },
  {
    name: '6-Day Bali Honeymoon',
    destination: 'Bali',
    duration: 6,
    price: 2500,
    category: 'romance',
    difficulty: 'easy',
    highlights: ['Beach resort', 'Temple tours', 'Romantic dinners'],
    description: 'Perfect honeymoon destination with luxury resorts and scenic beauty',
    inclusions: ['Resort accommodation', 'Meals', 'Couple spa treatments'],
    exclusions: ['Flights', 'Activities'],
    terms: ['Booking confirmation required'],
    status: 'active',
  },
];

const sampleItineraryDays = [
  [
    {
      dayNumber: 1,
      title: 'Arrival in Kochi',
      description: 'Arrive at Kochi airport and transfer to hotel',
      locations: ['Kochi', 'Hotel'],
      activities: ['Hotel check-in', 'City orientation'],
      accommodation: {
        name: 'The Malabar Hotel',
        type: 'hotel',
        rating: 4.5,
        address: 'Kochi, Kerala',
        contactNumber: '+91-484-2222222',
      },
      meals: { breakfast: false, lunch: true, dinner: true },
      transport: 'flight',
      places: [],
      images: [],
      notes: 'Late arrival expected',
    },
    {
      dayNumber: 2,
      title: 'Backwater Cruise',
      description: 'Experience the famous Kerala backwaters',
      locations: ['Alleppey', 'Backwaters'],
      activities: ['Backwater cruise', 'Houseboat ride', 'Fishing'],
      accommodation: {
        name: 'Houseboat Paradise',
        type: 'resort',
        rating: 4.7,
        address: 'Alleppey, Kerala',
        contactNumber: '+91-477-2234567',
      },
      meals: { breakfast: true, lunch: true, dinner: true },
      transport: 'car',
      places: [],
      images: [],
    },
  ],
  [
    {
      dayNumber: 1,
      title: 'Arrival in Delhi',
      description: 'International flight arrival in New Delhi',
      locations: ['Delhi', 'Hotel'],
      activities: ['Airport transfer', 'Hotel check-in', 'Rest'],
      accommodation: {
        name: 'Oberoi New Delhi',
        type: 'hotel',
        rating: 5,
        address: 'New Delhi',
        contactNumber: '+91-11-2416 4747',
      },
      meals: { breakfast: true, lunch: true, dinner: true },
      transport: 'flight',
      places: [],
      images: [],
    },
    {
      dayNumber: 2,
      title: 'Delhi Sightseeing',
      description: 'Visit Red Fort and India Gate',
      locations: ['Delhi', 'Red Fort', 'India Gate'],
      activities: ['Guided city tour', 'Museum visit', 'Heritage walk'],
      accommodation: {
        name: 'Oberoi New Delhi',
        type: 'hotel',
        rating: 5,
        address: 'New Delhi',
        contactNumber: '+91-11-2416 4747',
      },
      meals: { breakfast: true, lunch: true, dinner: true },
      transport: 'car',
      places: [],
      images: [],
    },
  ],
  [
    {
      dayNumber: 1,
      title: 'Arrival in Male',
      description: 'Arrive at Malé airport and transfer to island resort',
      locations: ['Male', 'Resort Island'],
      activities: ['Airport transfer', 'Beach orientation', 'Sunset dinner'],
      accommodation: {
        name: 'Soneva Jani',
        type: 'resort',
        rating: 5,
        address: 'Noonu Atoll, Maldives',
        contactNumber: '+960 666 0304',
      },
      meals: { breakfast: true, lunch: true, dinner: true },
      transport: 'flight',
      places: [],
      images: [],
    },
    {
      dayNumber: 2,
      title: 'Water Activities',
      description: 'Snorkeling and water sports',
      locations: ['Resort Island', 'Coral Reef'],
      activities: ['Snorkeling', 'Diving', 'Spa treatment'],
      accommodation: {
        name: 'Soneva Jani',
        type: 'resort',
        rating: 5,
        address: 'Noonu Atoll, Maldives',
        contactNumber: '+960 666 0304',
      },
      meals: { breakfast: true, lunch: true, dinner: true },
      transport: 'boat',
      places: [],
      images: [],
    },
  ],
  [
    {
      dayNumber: 1,
      title: 'Arrival in Kathmandu',
      description: 'Arrive in Kathmandu and trek preparation',
      locations: ['Kathmandu', 'Hotel'],
      activities: ['City tour', 'Acclimatization', 'Equipment check'],
      accommodation: {
        name: 'Kathmandu Guest House',
        type: 'guesthouse',
        rating: 4,
        address: 'Thamel, Kathmandu',
        contactNumber: '+977-1-4240632',
      },
      meals: { breakfast: true, lunch: true, dinner: true },
      transport: 'flight',
      places: [],
      images: [],
    },
    {
      dayNumber: 2,
      title: 'Everest Base Camp Trek',
      description: 'Start of the Everest trek',
      locations: ['Lukla', 'Phakding', 'Namche Bazaar'],
      activities: ['Trekking', 'Mountain climbing', 'Wildlife spotting'],
      accommodation: {
        name: 'Mountain Lodge',
        type: 'guesthouse',
        rating: 3.5,
        address: 'Namche Bazaar, Nepal',
        contactNumber: '+977-1-4234567',
      },
      meals: { breakfast: true, lunch: true, dinner: true },
      transport: 'walk',
      places: [],
      images: [],
    },
  ],
  [
    {
      dayNumber: 1,
      title: 'Arrival in Bali',
      description: 'Romantic arrival in Bali',
      locations: ['Denpasar', 'Ubud'],
      activities: ['Airport transfer', 'Hotel check-in', 'Romantic dinner'],
      accommodation: {
        name: 'Four Seasons Bali',
        type: 'resort',
        rating: 5,
        address: 'Ubud, Bali',
        contactNumber: '+62 361 300 3888',
      },
      meals: { breakfast: true, lunch: true, dinner: true },
      transport: 'flight',
      places: [],
      images: [],
    },
    {
      dayNumber: 2,
      title: 'Temple Tour and Spa',
      description: 'Visit temples and rejuvenating spa',
      locations: ['Ubud', 'Tanah Lot Temple'],
      activities: ['Temple visit', 'Spa treatment', 'Couples massage'],
      accommodation: {
        name: 'Four Seasons Bali',
        type: 'resort',
        rating: 5,
        address: 'Ubud, Bali',
        contactNumber: '+62 361 300 3888',
      },
      meals: { breakfast: true, lunch: true, dinner: true },
      transport: 'car',
      places: [],
      images: [],
    },
  ],
];

async function seed() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get or create admin user
    let adminUser = await User.findOne({ email: 'admin@tripskyway.com' });
    if (!adminUser) {
      console.log('📝 Creating admin user...');
      adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@tripskyway.com',
        password: 'Password123!',
        role: 'admin',
        status: 'active',
      });
      console.log('✅ Admin user created');
    }

    // Create packages and itineraries
    console.log('📦 Creating sample packages...');
    const createdPackages = [];
    for (let i = 0; i < samplePackages.length; i++) {
      const pkg = await Package.create({
        ...samplePackages[i],
      });
      createdPackages.push(pkg);
      console.log(`  ✅ Created package: ${pkg.name}`);
    }

    // Create itineraries
    console.log('📋 Creating sample itineraries...');
    const createdItineraries = [];
    for (let i = 0; i < createdPackages.length; i++) {
      const itinerary = await Itinerary.create({
        package: createdPackages[i]._id,
        packageModel: 'Package',
        days: sampleItineraryDays[i],
        createdBy: adminUser._id,
        status: 'published',
      });
      createdItineraries.push(itinerary);
      
      // Update package with itinerary reference
      await Package.findByIdAndUpdate(createdPackages[i]._id, { 
        itinerary: itinerary._id 
      });
      console.log(`  ✅ Created itinerary for: ${createdPackages[i].name}`);
    }

    // Create sample leads
    console.log('👥 Creating sample leads...');
    const leadStatuses = ['new', 'contacted', 'interested', 'quoted', 'converted'];
    const leadNames = [
      'John Smith', 'Sarah Johnson', 'Mike Brown', 'Emma Davis', 'Robert Wilson',
      'Lisa Anderson', 'James Taylor', 'Mary Martinez', 'David Garcia', 'Jennifer Lee',
      'William Rodriguez', 'Elizabeth Harris', 'Richard Clark', 'Susan Lewis', 'Joseph Walker',
    ];

    for (let i = 0; i < 30; i++) {
      const packageIndex = i % createdPackages.length;
      const statusIndex = Math.floor(Math.random() * leadStatuses.length);
      const isConverted = statusIndex === 4; // Last status is 'converted'

      const lead = await Lead.create({
        name: leadNames[i % leadNames.length],
        email: `user${i}@example.com`,
        phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        whatsapp: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        city: ['New York', 'London', 'Sydney', 'Toronto', 'Dubai'][i % 5],
        destination: createdPackages[packageIndex].destination,
        package: createdPackages[packageIndex]._id,
        currentItinerary: createdItineraries[packageIndex]._id,
        numberOfTravelers: Math.floor(Math.random() * 6) + 1,
        budget: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        message: `Interested in the ${createdPackages[packageIndex].name} package`,
        status: leadStatuses[statusIndex],
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        source: 'website',
        platform: 'Website Form',
        quoteSent: isConverted || statusIndex >= 3,
        quoteAmount: isConverted ? createdPackages[packageIndex].price : null,
        leadDateTime: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date in last 90 days
      });
      console.log(`  ✅ Created lead: ${lead.name} (${lead.status})`);
    }

    console.log('\n✨ Seed data created successfully!');
    console.log('📊 Summary:');
    console.log(`  - Packages: ${createdPackages.length}`);
    console.log(`  - Itineraries: ${createdItineraries.length}`);
    console.log(`  - Leads: 30`);
    console.log('\n🚀 Analytics data is ready for testing!');

    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed();

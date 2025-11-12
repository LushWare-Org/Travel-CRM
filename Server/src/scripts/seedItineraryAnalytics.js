/**
 * Itinerary Analytics Seed Script
 * Creates sample itineraries and leads for testing analytics features
 * 
 * Usage: node src/scripts/seedItineraryAnalytics.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Package from '../models/package.model.js';
import Itinerary from '../models/itinerary.model.js';
import Lead from '../models/lead.model.js';
import User from '../models/user.model.js';

dotenv.config();

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
    isActive: true,
  },
  {
    name: '14-Day India Adventure',
    destination: 'India',
    duration: 14,
    price: 2500,
    category: 'heritage',
    difficulty: 'moderate',
    highlights: ['Taj Mahal', 'Jaipur Palace', 'Varanasi'],
    description: 'Discover the cultural richness of India from north to south',
    inclusions: ['Accommodation', 'Meals', 'Guided tours'],
    exclusions: ['International flights'],
    terms: ['Visa required'],
    isActive: true,
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
    isActive: true,
  },
  {
    name: '10-Day Nepal Experience',
    destination: 'Nepal',
    duration: 10,
    price: 1200,
    category: 'adventure',
    difficulty: 'difficult',
    highlights: ['Everest trek', 'Kathmandu', 'Pokhara'],
    description: 'Trek through the Himalayas and experience Nepali culture',
    inclusions: ['Accommodation', 'Meals', 'Trekking guides'],
    exclusions: ['International flights', 'Travel insurance'],
    terms: ['Good physical fitness required'],
    isActive: true,
  },
  {
    name: '6-Day Bali Honeymoon',
    destination: 'Bali',
    duration: 6,
    price: 2500,
    category: 'honeymoon',
    difficulty: 'easy',
    highlights: ['Beach resort', 'Temple tours', 'Romantic dinners'],
    description: 'Perfect honeymoon destination with luxury resorts and scenic beauty',
    inclusions: ['Resort accommodation', 'Meals', 'Couple spa treatments'],
    exclusions: ['Flights', 'Activities'],
    terms: ['Booking confirmation required'],
    isActive: true,
  },
];

const sampleItineraryDays = [
  // Kerala itinerary days
  [
    {
      dayNumber: 1,
      title: 'Arrival in Kochi',
      description: 'Arrive at Kochi airport and transfer to hotel',
      locations: ['Kochi', 'Hotel'],
      activities: ['Hotel check-in', 'City orientation', 'Beach walk'],
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
    {
      dayNumber: 3,
      title: 'Tea Plantations',
      description: 'Visit famous tea gardens in Munnar',
      locations: ['Munnar', 'Tea Plantations'],
      activities: ['Tea plantation tour', 'Trekking', 'Wildlife viewing'],
      accommodation: {
        name: 'Tea Garden Resort',
        type: 'resort',
        rating: 4.6,
        address: 'Munnar, Kerala',
        contactNumber: '+91-486-2234567',
      },
      meals: { breakfast: true, lunch: true, dinner: true },
      transport: 'car',
      places: [],
      images: [],
    },
  ],
  // India itinerary days
  [
    {
      dayNumber: 1,
      title: 'Arrival in Delhi',
      description: 'International flight arrival in New Delhi',
      locations: ['Delhi', 'Hotel'],
      activities: ['Airport transfer', 'Hotel check-in', 'Rest', 'City orientation'],
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
      activities: ['Guided city tour', 'Museum visit', 'Heritage walk', 'Shopping'],
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
    {
      dayNumber: 3,
      title: 'Taj Mahal Tour',
      description: 'Iconic monument - Taj Mahal visit in Agra',
      locations: ['Agra', 'Taj Mahal'],
      activities: ['Taj Mahal visit', 'Photography', 'Local market exploration'],
      accommodation: {
        name: 'Amar Vilas Hotel',
        type: 'hotel',
        rating: 4.8,
        address: 'Agra',
        contactNumber: '+91-562-2233030',
      },
      meals: { breakfast: true, lunch: true, dinner: true },
      transport: 'train',
      places: [],
      images: [],
    },
  ],
  // Maldives itinerary days
  [
    {
      dayNumber: 1,
      title: 'Arrival in Male',
      description: 'Arrive at Malé airport and transfer to island resort',
      locations: ['Male', 'Resort Island'],
      activities: ['Airport transfer', 'Beach orientation', 'Sunset dinner', 'Spa'],
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
      activities: ['Snorkeling', 'Diving', 'Spa treatment', 'Beach volleyball'],
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
    {
      dayNumber: 3,
      title: 'Island Hopping',
      description: 'Explore nearby islands and local culture',
      locations: ['Local Islands', 'Fishing Village'],
      activities: ['Island hopping', 'Fishing experience', 'Dolphin watching'],
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
  // Nepal itinerary days
  [
    {
      dayNumber: 1,
      title: 'Arrival in Kathmandu',
      description: 'Arrive in Kathmandu and trek preparation',
      locations: ['Kathmandu', 'Hotel'],
      activities: ['City tour', 'Acclimatization', 'Equipment check', 'Temple visit'],
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
      title: 'Everest Base Camp Trek Start',
      description: 'Start of the Everest trek - high altitude preparation',
      locations: ['Lukla', 'Phakding', 'Namche Bazaar'],
      activities: ['Trekking', 'Mountain climbing', 'Wildlife spotting', 'Photography'],
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
    {
      dayNumber: 3,
      title: 'High Altitude Trek',
      description: 'Continue trek towards base camp',
      locations: ['Namche', 'Tengboche', 'Deboche'],
      activities: ['Trekking', 'Monastery visit', 'Acclimatization hikes'],
      accommodation: {
        name: 'Himalayan Lodge',
        type: 'guesthouse',
        rating: 4,
        address: 'Tengboche, Nepal',
        contactNumber: '+977-1-4234555',
      },
      meals: { breakfast: true, lunch: true, dinner: true },
      transport: 'walk',
      places: [],
      images: [],
    },
  ],
  // Bali itinerary days
  [
    {
      dayNumber: 1,
      title: 'Arrival in Bali',
      description: 'Romantic arrival in Bali',
      locations: ['Denpasar', 'Ubud'],
      activities: ['Airport transfer', 'Hotel check-in', 'Romantic dinner', 'Beach walk'],
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
      activities: ['Temple visit', 'Spa treatment', 'Couples massage', 'Traditional dance'],
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
    {
      dayNumber: 3,
      title: 'Adventure Activities',
      description: 'Water sports and adventure activities',
      locations: ['Bali Beaches', 'Volcano'],
      activities: ['Surfing lessons', 'Volcano hiking', 'Jungle trekking', 'Sunset yoga'],
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

async function seedItineraryAnalytics() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
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
        password: 'Admin@123456',
        role: 'admin',
        phone: '9876543210',
        isActive: true,
        isEmailVerified: true,
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

    // Create sample leads with itinerary references
    console.log('👥 Creating sample leads with itinerary references...');
    const leadStatuses = ['new', 'contacted', 'interested', 'quoted', 'converted'];
    const leadNames = [
      'John Smith', 'Sarah Johnson', 'Mike Brown', 'Emma Davis', 'Robert Wilson',
      'Lisa Anderson', 'James Taylor', 'Mary Martinez', 'David Garcia', 'Jennifer Lee',
      'William Rodriguez', 'Elizabeth Harris', 'Richard Clark', 'Susan Lewis', 'Joseph Walker',
      'Patricia White', 'Mark Harris', 'Angela Martin', 'Stephen Thompson', 'Margaret Davis',
      'Paul Martin', 'Nancy Robinson', 'Andrew Clark', 'Karen Lewis', 'Joshua Walker',
    ];

    const leads = [];
    for (let i = 0; i < 40; i++) {
      const packageIndex = i % createdPackages.length;
      const statusIndex = Math.floor(Math.random() * leadStatuses.length);
      const isConverted = statusIndex === 4; // Last status is 'converted'
      
      // Generate a random date in the last 90 days
      const randomDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);

      leads.push({
        name: leadNames[i % leadNames.length],
        email: `user${i}@example.com`,
        phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        whatsapp: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        city: ['New York', 'London', 'Sydney', 'Toronto', 'Dubai'][i % 5],
        destination: createdPackages[packageIndex].destination,
        package: createdPackages[packageIndex]._id,
        currentItinerary: createdItineraries[packageIndex]._id, // IMPORTANT: Link to itinerary
        numberOfTravelers: Math.floor(Math.random() * 6) + 1,
        budget: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        message: `Interested in the ${createdPackages[packageIndex].name} package`,
        status: leadStatuses[statusIndex],
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        source: 'website',
        platform: 'Website Form',
        quoteSent: isConverted || statusIndex >= 3,
        quoteAmount: isConverted ? createdPackages[packageIndex].price : null,
        createdAt: randomDate, // Use randomDate for createdAt so analytics has time spread
        leadDateTime: randomDate, // Also update leadDateTime
      });
    }

    const createdLeads = await Lead.insertMany(leads);
    console.log(`  ✅ Created ${createdLeads.length} sample leads`);

    // Generate analytics summary
    const inquiryCount = createdLeads.filter(l => l.currentItinerary).length;
    const purchaseCount = createdLeads.filter(l => l.status === 'converted').length;
    const conversionRate = inquiryCount > 0 ? ((purchaseCount / inquiryCount) * 100).toFixed(2) : 0;

    console.log('\n✨ Seed data created successfully!');
    console.log('📊 Summary:');
    console.log(`  - Packages: ${createdPackages.length}`);
    console.log(`  - Itineraries: ${createdItineraries.length}`);
    console.log(`  - Leads: ${createdLeads.length}`);
    console.log(`  - Total Inquiries: ${inquiryCount}`);
    console.log(`  - Total Conversions: ${purchaseCount}`);
    console.log(`  - Conversion Rate: ${conversionRate}%`);
    
    console.log('\n📈 Leads by Status:');
    leadStatuses.forEach(status => {
      const count = createdLeads.filter(l => l.status === status).length;
      console.log(`  - ${status}: ${count}`);
    });

    console.log('\n🚀 Analytics data is ready for testing!');
    console.log('📍 Try accessing: http://localhost:5000/api/v1/analytics/itineraries');

    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedItineraryAnalytics();

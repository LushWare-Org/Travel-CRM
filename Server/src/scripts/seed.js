import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import Settings from '../models/settings.model.js';
import Package from '../models/package.model.js';
import Itinerary from '../models/itinerary.model.js';
import { seedLeadStatuses } from './seedLeadStatus.js';
import { seedLeads } from './seedLeads.js';

dotenv.config();

// Sample data
const users = [
  {
    name: 'Admin User',
    email: 'admin@tripskyway.com',
    password: 'Admin@123456',
    role: 'admin',
    phone: '9876543210',
    isActive: true,
    isEmailVerified: true,
  },
  {
    name: 'Amal',
    email: 'amal@tripskyway.com',
    password: 'Sales@123456',
    role: 'salesRep',
    phone: '9876543211',
    isActive: true,
    isEmailVerified: true,
  },
  {
    name: 'Kamal',
    email: 'kamal@tripskyway.com',
    password: 'Sales@123456',
    role: 'salesRep',
    phone: '9876543213',
    isActive: true,
    isEmailVerified: true,
  },
  {
    name: 'Nimal',
    email: 'nimal@tripskyway.com',
    password: 'Sales@123456',
    role: 'salesRep',
    phone: '9876543214',
    isActive: true,
    isEmailVerified: true,
  },
  {
    name: 'Sunil',
    email: 'sunil@tripskyway.com',
    password: 'Sales@123456',
    role: 'salesRep',
    phone: '9876543215',
    isActive: true,
    isEmailVerified: true,
  },
  {
    name: 'John Doe',
    email: 'customer@example.com',
    password: 'Customer@123',
    role: 'customer',
    phone: '9876543212',
    isActive: true,
    isEmailVerified: true,
  },
];

const packages = [
  {
    name: 'Golden Triangle Tour - Delhi, Agra, Jaipur',
    description: 'Experience the rich heritage of India with visits to Delhi, Agra, and Jaipur. See the majestic Taj Mahal, explore historic forts, and immerse yourself in royal culture.',
    destination: 'Delhi, Agra, Jaipur',
    duration: 6,
    price: 599,
    maxGroupSize: 15,
    difficulty: 'easy',
    category: 'heritage',
    highlights: [
      'Visit the iconic Taj Mahal',
      'Explore Amber Fort and City Palace',
      'Discover Red Fort and Qutub Minar',
      'Traditional Indian cuisine experiences',
      'Local markets and shopping',
    ],
    inclusions: [
      'Accommodation for 5 nights',
      'Daily breakfast',
      'All transfers and sightseeing',
      'Professional tour guide',
      'Monument entrance fees',
    ],
    exclusions: [
      'International/domestic flights',
      'Lunch and dinner',
      'Personal expenses',
      'Travel insurance',
      'Tips and gratuities',
    ],
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Kerala Backwaters & Beaches',
    description: 'Discover God\'s Own Country with serene backwaters, lush greenery, and pristine beaches. Perfect for relaxation and rejuvenation.',
    destination: 'Kerala',
    duration: 7,
    price: 699,
    maxGroupSize: 12,
    difficulty: 'easy',
    category: 'beach',
    highlights: [
      'Houseboat stay in backwaters',
      'Beach relaxation at Kovalam',
      'Ayurvedic spa treatments',
      'Tea plantation visit',
      'Traditional Kathakali performance',
    ],
    inclusions: [
      'Accommodation for 6 nights',
      'Daily breakfast',
      'Houseboat with meals',
      'All transfers',
      'Sightseeing tours',
    ],
    exclusions: [
      'Airfare',
      'Lunch and dinner (except houseboat)',
      'Personal expenses',
      'Travel insurance',
    ],
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Himalayan Adventure - Manali & Leh',
    description: 'An adventurous journey through the mighty Himalayas. Experience breathtaking landscapes, high mountain passes, and Buddhist culture.',
    destination: 'Himachal Pradesh, Ladakh',
    duration: 10,
    price: 1299,
    maxGroupSize: 10,
    difficulty: 'difficult',
    category: 'adventure',
    highlights: [
      'Drive through Rohtang Pass',
      'Visit Pangong Lake',
      'Explore ancient monasteries',
      'River rafting in Manali',
      'Stargazing in Nubra Valley',
    ],
    inclusions: [
      'Accommodation for 9 nights',
      'Daily breakfast and dinner',
      'SUV for Leh circuit',
      'All permits',
      'Experienced driver',
    ],
    exclusions: [
      'Flights to/from Leh',
      'Lunch',
      'Adventure activities',
      'Travel insurance',
      'Oxygen cylinders',
    ],
    isActive: true,
    isFeatured: false,
  },
  {
    name: 'Goa Beach Paradise',
    description: 'Perfect beach vacation with sun, sand, and sea. Enjoy water sports, vibrant nightlife, and Portuguese heritage.',
    destination: 'Goa',
    duration: 5,
    price: 399,
    maxGroupSize: 20,
    difficulty: 'easy',
    category: 'beach',
    highlights: [
      'Beach hopping - North and South Goa',
      'Water sports activities',
      'Portuguese churches and forts',
      'Sunset cruise on Mandovi River',
      'Goan cuisine and nightlife',
    ],
    inclusions: [
      'Accommodation for 4 nights',
      'Daily breakfast',
      'Airport transfers',
      'Sightseeing tours',
    ],
    exclusions: [
      'Airfare',
      'Lunch and dinner',
      'Water sports',
      'Personal expenses',
    ],
    isActive: true,
    isFeatured: true,
  },
];

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Settings.deleteMany({});
    await Package.deleteMany({});
    await Itinerary.deleteMany({});
    console.log('✓ Cleared existing data');

    // Create users
    const createdUsers = await User.create(users);
    console.log(`✓ Created ${createdUsers.length} users`);

    // Create packages with admin as creator
    const adminUser = createdUsers.find((u) => u.role === 'admin');
    const packagesWithCreator = packages.map((pkg) => ({
      ...pkg,
      createdBy: adminUser.id,
    }));

    const createdPackages = await Package.create(packagesWithCreator);
    console.log(`✓ Created ${createdPackages.length} packages`);

    // Initialize Settings (default manual mode)
    await Settings.create({ assignmentMode: 'manual', autoStrategy: 'round_robin' });
    console.log('✓ Initialized settings');

    // Seed Lead Status Options
    console.log('\n--- Seeding Lead Status Options ---');
    await seedLeadStatuses();

    // Seed Sample Leads
    console.log('\n--- Seeding Sample Leads ---');
    await seedLeads();

    console.log('\n========================================');
    console.log('  Database Seeded Successfully! ✅');
    console.log('========================================\n');

    console.log('Test Credentials:\n');
    console.log('Admin Account:');
    console.log('  Email: admin@tripskyway.com');
    console.log('  Password: Admin@123456\n');
    console.log('Sales Rep Account:');
    console.log('  Email: sales@tripskyway.com');
    console.log('  Password: Sales@123456\n');
    console.log('Customer Account:');
    console.log('  Email: customer@example.com');
    console.log('  Password: Customer@123\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();


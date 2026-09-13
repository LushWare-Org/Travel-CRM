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
    email: 'admin@example.com',
    password: 'Admin@123456',
    role: 'admin',
    phone: '9876543210',
    isActive: true,
    isEmailVerified: true,
  },
  {
    name: 'Amal',
    email: 'amal@example.com',
    password: 'Sales@123456',
    role: 'salesRep',
    phone: '9876543211',
    isActive: true,
    isEmailVerified: true,
  },
  {
    name: 'Kamal',
    email: 'kamal@example.com',
    password: 'Sales@123456',
    role: 'salesRep',
    phone: '9876543213',
    isActive: true,
    isEmailVerified: true,
  },
  {
    name: 'Nimal',
    email: 'nimal@example.com',
    password: 'Sales@123456',
    role: 'salesRep',
    phone: '9876543214',
    isActive: true,
    isEmailVerified: true,
  },
  {
    name: 'Sunil',
    email: 'sunil@example.com',
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
    name: 'Dubai Explorer - City & Desert Experience',
    description: 'Experience the glamour and adventure of Dubai. Visit iconic landmarks, explore the desert, and enjoy world-class shopping and dining.',
    destination: 'Dubai',
    duration: 6,
    price: 899,
    maxGroupSize: 15,
    difficulty: 'easy',
    category: 'heritage',
    highlights: [
      'Visit the iconic Burj Khalifa',
      'Desert Safari with BBQ dinner',
      'Dubai Mall & Aquarium',
      'Dhow Cruise at Dubai Marina',
      'Gold & Spice Souk exploration',
    ],
    inclusions: [
      'Accommodation for 5 nights',
      'Daily breakfast',
      'All transfers and sightseeing',
      'Professional tour guide',
      'Desert safari with dinner',
    ],
    exclusions: [
      'International flights',
      'Lunch and dinner (except safari)',
      'Personal expenses',
      'Travel insurance',
      'Tips and gratuities',
    ],
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Bali Paradise Getaway',
    description: 'Discover the magic of Bali with stunning temples, lush rice terraces, pristine beaches, and vibrant culture. Perfect for relaxation and adventure.',
    destination: 'Bali',
    duration: 7,
    price: 799,
    maxGroupSize: 12,
    difficulty: 'easy',
    category: 'beach',
    highlights: [
      'Uluwatu Temple sunset visit',
      'Tegallalang Rice Terraces',
      'Ubud Monkey Forest',
      'Seminyak Beach relaxation',
      'Traditional Balinese dance show',
    ],
    inclusions: [
      'Accommodation for 6 nights',
      'Daily breakfast',
      'Private villa with pool',
      'All transfers',
      'Sightseeing tours',
    ],
    exclusions: [
      'Airfare',
      'Lunch and dinner',
      'Personal expenses',
      'Travel insurance',
    ],
    isActive: true,
    isFeatured: true,
  },
  {
    name: 'Thailand Discovery - Bangkok & Phuket',
    description: 'An exciting journey through Thailand combining the bustling energy of Bangkok with the tropical paradise of Phuket.',
    destination: 'Thailand',
    duration: 10,
    price: 1099,
    maxGroupSize: 10,
    difficulty: 'easy',
    category: 'adventure',
    highlights: [
      'Grand Palace & Wat Arun',
      'Phi Phi Island day trip',
      'Floating market experience',
      'Thai cooking class',
      'Night market food tours',
    ],
    inclusions: [
      'Accommodation for 9 nights',
      'Daily breakfast',
      'Domestic flights (Bangkok-Phuket)',
      'All transfers',
      'Island hopping tour',
    ],
    exclusions: [
      'International flights',
      'Lunch and dinner',
      'Water sports activities',
      'Travel insurance',
      'Visa fees',
    ],
    isActive: true,
    isFeatured: false,
  },
  {
    name: 'Turkey Heritage & Culture Tour',
    description: 'Explore the rich heritage of Turkey from the historic streets of Istanbul to the fairy chimneys of Cappadocia.',
    destination: 'Turkey',
    duration: 8,
    price: 1199,
    maxGroupSize: 15,
    difficulty: 'easy',
    category: 'heritage',
    highlights: [
      'Hagia Sophia & Blue Mosque',
      'Hot Air Balloon ride in Cappadocia',
      'Bosphorus Cruise',
      'Pamukkale thermal pools',
      'Grand Bazaar shopping',
    ],
    inclusions: [
      'Accommodation for 7 nights',
      'Daily breakfast and dinner',
      'Domestic flight (Istanbul-Cappadocia)',
      'Professional tour guide',
      'Monument entrance fees',
    ],
    exclusions: [
      'International flights',
      'Lunch',
      'Hot Air Balloon (optional)',
      'Travel insurance',
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
    console.log('  Email: admin@example.com');
    console.log('  Password: Admin@123456\n');
    console.log('Sales Rep Account:');
    console.log('  Email: amal@example.com');
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

/**
 * Reset Admin Password Utility
 * Use this to reset admin@example.com password back to original
 * Run with: node resetAdminPassword.js
 */
export const resetAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    const admin = await User.findOne({ email: 'admin@example.com' });

    if (!admin) {
      console.error('❌ Admin user not found');
      process.exit(1);
    }

    // Reset password and clear temporary flags
    admin.password = 'Admin@123456';
    admin.isTempPassword = false;
    admin.mustChangePassword = false;
    admin.passwordChangedAt = Date.now();

    await admin.save();

    console.log('✅ Admin password reset successfully!');
    console.log('\n✓ Email: admin@example.com');
    console.log('✓ Password: Admin@123456');
    console.log('\nYou can now log in to the admin panel.\n');

    process.exit(0);
  } catch (error) {
    console.error('Error resetting admin password:', error);
    process.exit(1);
  }
};

seedDatabase();


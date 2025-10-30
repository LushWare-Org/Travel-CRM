import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeadStatusOption from '../models/leadStatusOption.model.js';

dotenv.config();

const leadStatusOptions = [
  { statusName: 'new', displayName: 'New', color: '#60A5FA', order: 1, isActive: true, isDefault: true }, // blue-400
  { statusName: 'contacted', displayName: 'Contacted', color: '#FBBF24', order: 2, isActive: true }, // yellow-400
  { statusName: 'interested', displayName: 'Interested', color: '#A78BFA', order: 3, isActive: true }, // purple-400
  { statusName: 'quoted', displayName: 'Quoted', color: '#22D3EE', order: 4, isActive: true }, // cyan-400
  { statusName: 'converted', displayName: 'Converted', color: '#10B981', order: 5, isActive: true }, // emerald-500
  { statusName: 'lost', displayName: 'Lost', color: '#EF4444', order: 6, isActive: true }, // red-500
  { statusName: 'not-interested', displayName: 'Not Interested', color: '#9CA3AF', order: 7, isActive: true }, // gray-400
];

export const seedLeadStatuses = async () => {
  try {
    // Connect to database if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    await LeadStatusOption.deleteMany({});
    const createdStatuses = await LeadStatusOption.create(leadStatusOptions);
    console.log(`✓ Cleared existing lead status options`);
    console.log(`✓ Created ${createdStatuses.length} lead status options`);
    return createdStatuses;
  } catch (error) {
    console.error('Error seeding lead status options:', error);
    throw error;
  }
};

// If this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedLeadStatuses()
    .then(() => {
      console.log('\n✓ Lead status options seeded successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}


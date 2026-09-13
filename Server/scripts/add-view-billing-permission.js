import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function addViewBillingPermission() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trip-sky-way';
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    // Update all sales reps to add view_billing permission if they don't have it
    const result = await User.updateMany(
      { 
        role: 'salesRep',
        permissions: { $nin: ['view_billing'] }
      },
      { 
        $addToSet: { 
          permissions: 'view_billing'
        }
      }
    );

    console.log(`✓ Updated ${result.modifiedCount} sales rep(s) with view_billing permission`);

    // Verify the update
    const updatedSalesReps = await User.find({ role: 'salesRep' }).select('name email role permissions');
    console.log('\nUpdated Sales Reps:');
    updatedSalesReps.forEach(rep => {
      console.log(`  - ${rep.name} (${rep.email}): ${rep.permissions.join(', ')}`);
    });

    await mongoose.disconnect();
    console.log('\n✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  }
}

addViewBillingPermission();

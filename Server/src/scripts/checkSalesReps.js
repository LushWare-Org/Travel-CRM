import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';

dotenv.config();

const checkSalesReps = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected\n');

    // Count all sales reps
    const totalSalesReps = await User.countDocuments({ role: 'salesRep' });
    console.log(`📊 Total Sales Reps in Database: ${totalSalesReps}\n`);

    if (totalSalesReps === 0) {
      console.log('⚠️  No sales representatives found in the database.');
      console.log('\nTo create a sales rep, you can:');
      console.log('1. Use the Admin UI to create a sales rep');
      console.log('2. Create one manually with this script\n');

      // Ask if user wants to create a sample sales rep
      console.log('Creating a sample sales rep...\n');

      const sampleSalesRep = await User.create({
        name: 'John Sales Rep',
        email: 'salesrep@example.com',
        password: 'TempPass123!',
        phone: '1234567890',
        role: 'salesRep',
        isActive: true,
        isEmailVerified: true,
        isTempPassword: true,
        mustChangePassword: true,
      });

      console.log('✅ Sample sales rep created:');
      console.log(`   Name: ${sampleSalesRep.name}`);
      console.log(`   Email: ${sampleSalesRep.email}`);
      console.log('   Password: TempPass123!');
      console.log('   Status: Active\n');
    } else {
      // Show all sales reps
      const salesReps = await User.find({ role: 'salesRep' })
        .select('name email phone isActive createdAt')
        .sort({ createdAt: -1 });

      console.log('📋 Sales Representatives:\n');
      salesReps.forEach((rep, index) => {
        console.log(`${index + 1}. ${rep.name}`);
        console.log(`   Email: ${rep.email}`);
        console.log(`   Phone: ${rep.phone || 'N/A'}`);
        console.log(`   Status: ${rep.isActive ? 'Active' : 'Inactive'}`);
        console.log(`   Created: ${rep.createdAt.toLocaleDateString()}`);
        console.log('');
      });
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkSalesReps();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/user.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const testAPI = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Simulate what the API controller does
    console.log('🔍 Testing Sales Rep API Query Logic...\n');

    // Build filter object (same as controller)
    const filter = { role: 'salesRep' };

    console.log('📋 Filter being used:', JSON.stringify(filter, null, 2));

    // Query database
    const salesReps = await User.find(filter)
      .sort('-createdAt')
      .select('-__v -password')
      .limit(10)
      .lean();

    console.log(`\n📊 Results: Found ${salesReps.length} sales reps`);

    if (salesReps.length > 0) {
      console.log('\n📝 Sales Reps Data:');
      salesReps.forEach((rep, index) => {
        console.log(`\n${index + 1}. ${rep.name}`);
        console.log(`   - ID: ${rep._id}`);
        console.log(`   - Email: ${rep.email}`);
        console.log(`   - Role: ${rep.role}`);
        console.log(`   - Active: ${rep.isActive}`);
        console.log(`   - Created: ${new Date(rep.createdAt).toLocaleDateString()}`);
      });
    } else {
      console.log('\n⚠️  No sales reps found with the filter!');

      // Check if there are ANY users with role salesRep
      const totalSalesReps = await User.countDocuments({ role: 'salesRep' });
      console.log(`\n🔍 Total users with role 'salesRep': ${totalSalesReps}`);

      // Check all roles
      const allUsers = await User.find({}).select('name email role').lean();
      console.log(`\n📋 All users in database (${allUsers.length} total):`);
      allUsers.forEach((user) => {
        console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}`);
      });
    }

    console.log('\n✅ Test completed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

testAPI();

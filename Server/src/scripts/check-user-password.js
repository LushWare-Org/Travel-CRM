import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const checkAndFixUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'anuradhaherathuser@gmail.com';
    const testPassword = 'Anuradha123'; // Replace with the password you're trying to use

    // Find user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('\n=== User Information ===');
    console.log('Email:', user.email);
    console.log('Name:', user.name);
    console.log('Role:', user.role);
    console.log('Created At:', user.createdAt);
    console.log('Is Active:', user.isActive);
    console.log('Password Hash (first 20 chars):', user.password.substring(0, 20));

    // Test password
    console.log('\n=== Testing Password ===');
    console.log('Testing password:', testPassword);
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log('Password matches:', isMatch);

    if (!isMatch) {
      console.log('\n❌ Password does not match!');
      console.log('\nDo you want to reset the password? (y/n)');
      console.log('Run this script with --reset flag to reset password');
      
      // Check if --reset flag is provided
      if (process.argv.includes('--reset')) {
        console.log('\n🔄 Resetting password to:', testPassword);
        user.password = testPassword;
        await user.save();
        console.log('✅ Password reset successfully!');
        
        // Verify the new password
        const updatedUser = await User.findOne({ email }).select('+password');
        const verifyMatch = await bcrypt.compare(testPassword, updatedUser.password);
        console.log('Verification - Password matches now:', verifyMatch);
      }
    } else {
      console.log('✅ Password matches correctly!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkAndFixUser();

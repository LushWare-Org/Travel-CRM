import mongoose from 'mongoose';
import User from '../models/user.model.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const resetPassword = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get email and password from command line arguments
    const email = process.argv[2] || 'anuradhaherathuser@gmail.com';
    const newPassword = process.argv[3] || 'Password123';

    console.log('\n=== Resetting Password ===');
    console.log('Email:', email);
    console.log('New Password:', newPassword);

    // Find user
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found with email:', email);
      process.exit(1);
    }

    console.log('✅ User found:', user.name);

    // Update password
    user.password = newPassword;
    user.mustChangePassword = false;
    user.isTempPassword = false;
    await user.save();

    console.log('✅ Password reset successfully!');
    console.log('\nYou can now login with:');
    console.log('  Email:', email);
    console.log('  Password:', newPassword);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

resetPassword();

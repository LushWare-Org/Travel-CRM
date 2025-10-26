import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import logger from '../config/logger.js';

dotenv.config();

const createAdminUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('MongoDB Connected');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:');
      console.log('Email:', existingAdmin.email);
      console.log('Please use the forgot password feature to reset if needed.');
      process.exit(0);
    }

    // Create admin user
    const adminData = {
      name: process.env.ADMIN_NAME || 'System Administrator',
      email: process.env.ADMIN_EMAIL || 'admin@tripskyway.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      phone: process.env.ADMIN_PHONE || '1234567890',
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
    };

    const admin = await User.create(adminData);

    console.log('✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:', admin.email);
    console.log('Password:', adminData.password);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  IMPORTANT: Please change the admin password after first login!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    logger.error(`Error creating admin user: ${error.message}`);
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  }
};

createAdminUser();

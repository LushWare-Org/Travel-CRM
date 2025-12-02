import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import logger from '../config/logger.js';

dotenv.config();

const grantAdminPermissions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('MongoDB Connected');

    // Find admin user by email
    const adminEmail = process.argv[2] || 'admin@tripskyway.com';
    
    const admin = await User.findOne({ email: adminEmail, role: 'admin' });

    if (!admin) {
      console.error(`❌ Admin user with email '${adminEmail}' not found!`);
      console.log('\nAvailable admin users:');
      const admins = await User.find({ role: 'admin' }).select('email name');
      admins.forEach(a => console.log(`  - ${a.email} (${a.name})`));
      process.exit(1);
    }

    // All available permissions
    const allPermissions = [
      'manage_users',
      'manage_sales_reps',
      'manage_vendors',
      'manage_admins',
      'view_reports',
      'manage_billing',
      'manage_leads',
      'manage_packages',
    ];

    // Update admin permissions
    admin.permissions = allPermissions;
    await admin.save({ validateBeforeSave: false });

    console.log('✅ All permissions granted successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Name:', admin.name);
    console.log('Email:', admin.email);
    console.log('Role:', admin.role);
    console.log('\nGranted Permissions:');
    admin.permissions.forEach((perm, index) => {
      console.log(`  ${index + 1}. ${perm}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    logger.error(`Error granting admin permissions: ${error.message}`);
    console.error('❌ Error granting admin permissions:', error.message);
    process.exit(1);
  }
};

grantAdminPermissions();

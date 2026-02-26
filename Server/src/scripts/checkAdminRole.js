import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from '../models/user.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const checkAdminRole = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    const admin = await User.findOne({ email: 'admin@example.com' }).select('email role name permissions');

    if (!admin) {
      console.error('❌ Admin user not found!');
      process.exit(1);
    }

    console.log('═══════════════════════════════════════════');
    console.log('  ADMIN USER INFO');
    console.log('═══════════════════════════════════════════');
    console.log('Name:', admin.name);
    console.log('Email:', admin.email);
    console.log('Role:', admin.role);
    console.log('Permissions:', admin.permissions || 'None');
    console.log('═══════════════════════════════════════════\n');

    if (admin.role !== 'admin') {
      console.log(`⚠️  WARNING: User role is "${admin.role}" but should be "admin"`);
      console.log('   Fixing role...\n');
      admin.role = 'admin';
      await admin.save();
      console.log('✅ Role fixed! Role is now: admin\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkAdminRole();

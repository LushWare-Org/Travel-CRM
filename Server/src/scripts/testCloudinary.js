/**
 * Test Cloudinary Connection
 * Run this to verify Cloudinary credentials are working
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables FIRST
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { v2 as cloudinary } from 'cloudinary';

console.log('='.repeat(50));
console.log('Cloudinary Connection Test');
console.log('='.repeat(50));

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME || '❌ NOT SET');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? `${process.env.CLOUDINARY_API_KEY.substring(0, 6)}... ✅` : '❌ NOT SET');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ SET' : '❌ NOT SET');

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('\n❌ ERROR: Missing Cloudinary credentials!');
  console.log('\nPlease add these to your .env file:');
  console.log('CLOUDINARY_CLOUD_NAME=your_cloud_name');
  console.log('CLOUDINARY_API_KEY=your_api_key');
  console.log('CLOUDINARY_API_SECRET=your_api_secret');
  process.exit(1);
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('\n🔧 Cloudinary configured successfully');

// Test connection by pinging the API
console.log('\n🔍 Testing connection to Cloudinary...');

cloudinary.api.ping()
  .then((result) => {
    console.log('✅ Connection successful!');
    console.log('Response:', result);
    
    // Try to get account usage
    return cloudinary.api.usage();
  })
  .then((usage) => {
    console.log('\n📊 Account Usage:');
    console.log('Plan:', usage.plan);
    console.log('Storage Used:', Math.round(usage.storage.usage / 1024 / 1024), 'MB');
    console.log('Bandwidth Used:', Math.round(usage.bandwidth.usage / 1024 / 1024), 'MB');
    console.log('Resources:', usage.resources);
    
    console.log('\n✅ All tests passed! Cloudinary is ready to use.');
  })
  .catch((error) => {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    if (error.error) {
      console.error('Details:', error.error);
    }
    
    console.log('\n💡 Troubleshooting:');
    console.log('1. Check your credentials in .env file');
    console.log('2. Verify your Cloudinary account is active');
    console.log('3. Check your internet connection');
    console.log('4. Make sure API key and secret are correct');
    
    process.exit(1);
  });

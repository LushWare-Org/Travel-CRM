import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

// Log configuration status (without exposing secrets)
console.log('[Cloudinary Config] Cloud Name:', cloudinaryConfig.cloud_name || 'NOT SET');
console.log('[Cloudinary Config] API Key:', cloudinaryConfig.api_key ? `${cloudinaryConfig.api_key.substring(0, 6)}...` : 'NOT SET');
console.log('[Cloudinary Config] API Secret:', cloudinaryConfig.api_secret ? 'SET' : 'NOT SET');

if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
  console.error('[Cloudinary Config] ERROR: Missing Cloudinary credentials in environment variables!');
}

cloudinary.config(cloudinaryConfig);

export default cloudinary;

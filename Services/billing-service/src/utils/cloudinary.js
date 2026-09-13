import { v2 as cloudinary } from 'cloudinary';

let configured = false;

/** Configure Cloudinary from env once. Returns false when creds are absent. */
function ensureConfigured() {
  if (configured) return true;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return false;
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  configured = true;
  return true;
}

export const isCloudinaryConfigured = () => ensureConfigured();

/**
 * Upload a PDF buffer as a public `raw` asset and return its secure URL.
 * Used to give the WhatsApp Business API a reachable media URL.
 * @returns {Promise<string>} secure URL
 * @throws {Error} when Cloudinary is not configured
 */
export function uploadPdfBuffer(buffer, publicId) {
  if (!ensureConfigured()) {
    throw new Error('Cloudinary is not configured (set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)');
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', folder: 'quotations', public_id: publicId, format: 'pdf', overwrite: true },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

export default { isCloudinaryConfigured, uploadPdfBuffer };

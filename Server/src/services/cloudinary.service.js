/**
 * Cloudinary Image Upload Service
 * Handles all image upload operations to Cloudinary
 */

import fs from 'fs/promises';
import path from 'path';
import cloudinary from '../config/cloudinary.js';
import AppError from '../utils/appError.js';

/**
 * Upload a single image to Cloudinary
 * @param {string} filePath - Local file path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export const uploadImage = async (filePath, options = {}) => {
  try {
    const {
      folder = 'trip-sky-way',
      transformation = [],
      resourceType = 'image',
      format,
    } = options;

    const uploadOptions = {
      folder,
      resource_type: resourceType,
      transformation,
    };

    if (format) {
      uploadOptions.format = format;
    }

    console.log('[Cloudinary] Uploading file:', filePath);
    console.log('[Cloudinary] Upload options:', uploadOptions);

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    console.log('[Cloudinary] Upload successful:', result.public_id);

    // Delete local file after successful upload
    try {
      await fs.unlink(filePath);
      console.log('[Cloudinary] Deleted local file:', filePath);
    } catch (error) {
      console.error('[Cloudinary] Failed to delete local file:', error);
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
    };
  } catch (error) {
    console.error('[Cloudinary] Upload error:', error);
    console.error('[Cloudinary] Error details:', {
      message: error.message,
      stack: error.stack,
      http_code: error.http_code,
    });
    throw new AppError(`Failed to upload image to Cloudinary: ${error.message}`, 500);
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param {Array<string>} filePaths - Array of local file paths
 * @param {Object} options - Upload options
 * @returns {Promise<Array>} Array of upload results
 */
export const uploadMultipleImages = async (filePaths, options = {}) => {
  try {
    const uploadPromises = filePaths.map((filePath) => uploadImage(filePath, options));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Multiple images upload error:', error);
    throw new AppError('Failed to upload multiple images', 500);
  }
};

/**
 * Upload image from buffer (direct upload without saving to disk)
 * @param {Buffer} buffer - Image buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export const uploadImageFromBuffer = async (buffer, options = {}) => {
  try {
    const {
      folder = 'trip-sky-way',
      transformation = [],
      resourceType = 'image',
      format,
    } = options;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          transformation,
          format,
        },
        (error, result) => {
          if (error) {
            reject(new AppError('Failed to upload image', 500));
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
              format: result.format,
              size: result.bytes,
            });
          }
        },
      );

      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error('Buffer upload error:', error);
    throw new AppError('Failed to upload image from buffer', 500);
  }
};

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new AppError('Failed to delete image from Cloudinary', 500);
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param {Array<string>} publicIds - Array of Cloudinary public IDs
 * @returns {Promise<Array>} Array of deletion results
 */
export const deleteMultipleImages = async (publicIds) => {
  try {
    const deletePromises = publicIds.map((publicId) => deleteImage(publicId));
    return await Promise.all(deletePromises);
  } catch (error) {
    console.error('Multiple images delete error:', error);
    throw new AppError('Failed to delete multiple images', 500);
  }
};

/**
 * Get optimized image URL with transformations
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Transformation options
 * @returns {string} Optimized image URL
 */
export const getOptimizedImageUrl = (publicId, options = {}) => {
  const {
    width,
    height,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
  } = options;

  return cloudinary.url(publicId, {
    width,
    height,
    crop,
    quality,
    fetch_format: format,
  });
};

/**
 * Generate thumbnail URL
 * @param {string} publicId - Cloudinary public ID
 * @param {number} size - Thumbnail size (default: 200)
 * @returns {string} Thumbnail URL
 */
export const getThumbnailUrl = (publicId, size = 200) => cloudinary.url(publicId, {
  width: size,
  height: size,
  crop: 'fill',
  quality: 'auto',
  fetch_format: 'auto',
});

/**
 * Upload image with preset transformations
 * @param {string} filePath - Local file path
 * @param {string} preset - Preset name (package, itinerary, profile)
 * @returns {Promise<Object>} Upload result
 */
export const uploadWithPreset = async (filePath, preset = 'default') => {
  const presets = {
    package: {
      folder: 'trip-sky-way/packages',
      transformation: [
        {
          width: 1200, height: 800, crop: 'fill', quality: 'auto',
        },
      ],
    },
    itinerary: {
      folder: 'trip-sky-way/itineraries',
      transformation: [
        {
          width: 1000, height: 600, crop: 'fill', quality: 'auto',
        },
      ],
    },
    profile: {
      folder: 'trip-sky-way/profiles',
      transformation: [
        {
          width: 400, height: 400, crop: 'fill', quality: 'auto', gravity: 'face',
        },
      ],
    },
    thumbnail: {
      folder: 'trip-sky-way/thumbnails',
      transformation: [
        {
          width: 300, height: 200, crop: 'fill', quality: 'auto',
        },
      ],
    },
    default: {
      folder: 'trip-sky-way/general',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
      ],
    },
  };

  const options = presets[preset] || presets.default;
  return uploadImage(filePath, options);
};

export default {
  uploadImage,
  uploadMultipleImages,
  uploadImageFromBuffer,
  deleteImage,
  deleteMultipleImages,
  getOptimizedImageUrl,
  getThumbnailUrl,
  uploadWithPreset,
};

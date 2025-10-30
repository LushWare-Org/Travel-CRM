/**
 * Cloudinary Image Upload Service
 * Replaces the imgbb image upload service
 */

import Swal from 'sweetalert2';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

/**
 * Get authentication token from localStorage
 * @returns {string|null} JWT token
 */
const getAuthToken = () => {
  return localStorage.getItem('token');
};

/**
 * Upload image to Cloudinary via backend
 * @param {File} file - Image file to upload
 * @param {string} preset - Upload preset (default, package, itinerary, profile, thumbnail)
 * @returns {Promise<object>} - Uploaded image data
 */
export const uploadImage = async (file, preset = 'default') => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('preset', preset);

  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required. Please login.');
    }

    const response = await fetch(`${API_BASE_URL}/upload/single`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Image upload failed');
    }

    const data = await response.json();
    return {
      url: data.data.image.url,
      publicId: data.data.image.publicId,
      ...data.data.image,
    };
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param {FileList|Array} files - List of files to upload
 * @param {string} preset - Upload preset
 * @param {function} onProgress - Callback for progress updates
 * @returns {Promise<array>} - Array of uploaded image data
 */
export const uploadMultipleImages = async (files, preset = 'default', onProgress = () => {}) => {
  const formData = new FormData();
  
  // Add all files to FormData
  const fileArray = Array.from(files);
  fileArray.forEach((file) => {
    formData.append('images', file);
  });
  formData.append('preset', preset);

  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required. Please login.');
    }

    // Note: For progress tracking, you might want to use XMLHttpRequest
    // or a library like axios that supports upload progress
    const response = await fetch(`${API_BASE_URL}/upload/multiple`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Image upload failed');
    }

    const data = await response.json();
    
    // Call progress callback with final result
    onProgress({
      current: fileArray.length,
      total: fileArray.length,
      images: data.data.images,
    });

    return data.data.images;
  } catch (error) {
    console.error('Multiple images upload error:', error);
    Swal.fire('Error', error.message || 'Failed to upload images', 'error');
    throw error;
  }
};

/**
 * Upload package images
 * @param {FileList|Array} files - List of files to upload
 * @param {function} onProgress - Callback for progress updates
 * @returns {Promise<array>} - Array of uploaded image URLs
 */
export const uploadPackageImages = async (files, onProgress = () => {}) => {
  const formData = new FormData();
  
  const fileArray = Array.from(files);
  fileArray.forEach((file) => {
    formData.append('images', file);
  });

  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required. Please login.');
    }

    const response = await fetch(`${API_BASE_URL}/upload/package`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Image upload failed';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
        console.error('Server error response:', error);
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
      }
      console.error('Upload failed with status:', response.status, errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Return full image objects with url and public_id for MongoDB schema
    const uploadedImages = data.data.images.map(img => ({
      url: img.url,
      public_id: img.publicId, // Note: backend returns publicId, model expects public_id
    }));
    
    // Call progress callback
    onProgress({
      current: fileArray.length,
      total: fileArray.length,
      images: uploadedImages,
    });

    return uploadedImages;
  } catch (error) {
    console.error('Package images upload error:', error);
    Swal.fire('Error', error.message || 'Failed to upload package images', 'error');
    throw error;
  }
};

/**
 * Upload itinerary images
 * @param {FileList|Array} files - List of files to upload
 * @param {function} onProgress - Callback for progress updates
 * @returns {Promise<array>} - Array of uploaded image URLs
 */
export const uploadItineraryImages = async (files, onProgress = () => {}) => {
  const formData = new FormData();
  
  const fileArray = Array.from(files);
  fileArray.forEach((file) => {
    formData.append('images', file);
  });

  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required. Please login.');
    }

    const response = await fetch(`${API_BASE_URL}/upload/itinerary`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Image upload failed');
    }

    const data = await response.json();
    
    // Return full image objects with url and public_id for MongoDB schema
    const uploadedImages = data.data.images.map(img => ({
      url: img.url,
      public_id: img.publicId,
    }));
    
    // Call progress callback
    onProgress({
      current: fileArray.length,
      total: fileArray.length,
      images: uploadedImages,
    });

    return uploadedImages;
  } catch (error) {
    console.error('Itinerary images upload error:', error);
    Swal.fire('Error', error.message || 'Failed to upload itinerary images', 'error');
    throw error;
  }
};

/**
 * Upload profile image
 * @param {File} file - Image file to upload
 * @returns {Promise<object>} - Uploaded image data
 */
export const uploadProfileImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required. Please login.');
    }

    const response = await fetch(`${API_BASE_URL}/upload/profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Image upload failed');
    }

    const data = await response.json();
    return data.data.image;
  } catch (error) {
    console.error('Profile image upload error:', error);
    Swal.fire('Error', error.message || 'Failed to upload profile image', 'error');
    throw error;
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<void>}
 */
export const deleteImage = async (publicId) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required. Please login.');
    }

    const encodedPublicId = encodeURIComponent(publicId);
    const response = await fetch(`${API_BASE_URL}/upload/${encodedPublicId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Image deletion failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Image deletion error:', error);
    throw error;
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param {Array<string>} publicIds - Array of Cloudinary public IDs
 * @returns {Promise<void>}
 */
export const deleteMultipleImages = async (publicIds) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required. Please login.');
    }

    const response = await fetch(`${API_BASE_URL}/upload/delete-multiple`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicIds }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Images deletion failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Multiple images deletion error:', error);
    throw error;
  }
};

/**
 * Get optimized image URL
 * @param {string} publicId - Cloudinary public ID
 * @param {object} options - Transformation options
 * @returns {Promise<string>} - Optimized image URL
 */
export const getOptimizedImageUrl = async (publicId, options = {}) => {
  try {
    const params = new URLSearchParams({
      publicId,
      ...options,
    });

    const response = await fetch(`${API_BASE_URL}/upload/optimize?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get optimized URL');
    }

    const data = await response.json();
    return data.data.url;
  } catch (error) {
    console.error('Get optimized URL error:', error);
    throw error;
  }
};

/**
 * Validation Messages (for backward compatibility)
 */
export const VALIDATION_MESSAGES = {
  IMAGE_UPLOAD_FAILED: 'Failed to upload image. Please try again.',
  IMAGE_REQUIRED: 'Please select an image to upload.',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload an image file.',
  FILE_TOO_LARGE: 'File is too large. Maximum size is 5MB.',
};

export default {
  uploadImage,
  uploadMultipleImages,
  uploadPackageImages,
  uploadItineraryImages,
  uploadProfileImage,
  deleteImage,
  deleteMultipleImages,
  getOptimizedImageUrl,
  VALIDATION_MESSAGES,
};

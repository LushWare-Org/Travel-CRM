/**
 * Image upload service
 */

import Swal from 'sweetalert2';
import { IMAGE_UPLOAD_URL, IMAGE_UPLOAD_API_KEY, VALIDATION_MESSAGES } from '../utils/constants';

/**
 * Upload image to imgbb
 * @param {File} file - Image file to upload
 * @returns {Promise<string>} - URL of uploaded image
 */
export const uploadImage = async (file) => {
  const formDataImage = new FormData();
  formDataImage.append('image', file);

  try {
    const response = await fetch(
      `${IMAGE_UPLOAD_URL}?key=${IMAGE_UPLOAD_API_KEY}`,
      {
        method: 'POST',
        body: formDataImage,
      }
    );

    if (!response.ok) {
      throw new Error('Image upload failed');
    }

    const data = await response.json();
    return data.data.url;
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
};

/**
 * Upload multiple images
 * @param {FileList} files - List of files to upload
 * @param {function} onProgress - Callback for progress updates
 * @returns {Promise<array>} - Array of uploaded image URLs
 */
export const uploadMultipleImages = async (files, onProgress = () => {}) => {
  const uploadedUrls = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const url = await uploadImage(file);
      uploadedUrls.push(url);
      onProgress({
        current: i + 1,
        total: files.length,
        url,
      });
    } catch (error) {
      console.error(`Failed to upload file ${i}:`, error);
      Swal.fire(
        'Error',
        VALIDATION_MESSAGES.IMAGE_UPLOAD_FAILED,
        'error'
      );
    }
  }

  return uploadedUrls;
};

/**
 * Custom hook for image upload management
 * Updated to use Cloudinary
 */

import { useState, useCallback } from 'react';
import { uploadPackageImages } from '../../../services/cloudinaryService';
import Swal from 'sweetalert2';
import { VALIDATION_MESSAGES } from '../utils/constants';

export const useImageUpload = () => {
  const [images, setImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const addImage = useCallback((url) => {
    setImages((prev) => [...prev, url]);
  }, []);

  const removeImage = useCallback((index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = useCallback(
    async (files) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      setIsUploading(true);

      // Create temporary URLs for immediate feedback
      const tempUrls = fileArray.map(file => URL.createObjectURL(file));
      tempUrls.forEach(url => addImage(url));

      try {
        // Upload all images to Cloudinary
        const uploadedUrls = await uploadPackageImages(files, (progress) => {
          console.log(`Upload progress: ${progress.current}/${progress.total}`);
        });

        // Replace temporary URLs with actual Cloudinary URLs
        setImages((prev) => {
          const newImages = [...prev];
          tempUrls.forEach((tempUrl, index) => {
            const urlIndex = newImages.indexOf(tempUrl);
            if (urlIndex !== -1 && uploadedUrls[index]) {
              newImages[urlIndex] = uploadedUrls[index];
              // Clean up temporary URL
              URL.revokeObjectURL(tempUrl);
            }
          });
          return newImages;
        });

        Swal.fire('Success', `${uploadedUrls.length} image(s) uploaded successfully!`, 'success');
      } catch (error) {
        console.error('Upload error:', error);
        // Remove temporary URLs on error
        setImages((prev) => prev.filter(url => !tempUrls.includes(url)));
        tempUrls.forEach(url => URL.revokeObjectURL(url));
        
        Swal.fire(
          'Error',
          error.message || VALIDATION_MESSAGES.IMAGE_UPLOAD_FAILED,
          'error'
        );
      } finally {
        setIsUploading(false);
      }
    },
    [addImage]
  );

  const clearImages = useCallback(() => {
    setImages([]);
  }, []);

  return {
    images,
    setImages,
    addImage,
    removeImage,
    handleUpload,
    clearImages,
    isUploading,
  };
};

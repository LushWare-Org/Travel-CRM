/**
 * Custom hook for image upload management
 */

import { useState, useCallback } from 'react';
import { uploadImage } from '../services/imageService';
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
      const fileArray = Array.from(files);
      setIsUploading(true);

      for (const file of fileArray) {
        const tempUrl = URL.createObjectURL(file);
        addImage(tempUrl);

        try {
          const uploadedUrl = await uploadImage(file);
          setImages((prev) =>
            prev.map((url) => (url === tempUrl ? uploadedUrl : url))
          );
        } catch (error) {
          removeImage(images.indexOf(tempUrl));
          Swal.fire(
            'Error',
            VALIDATION_MESSAGES.IMAGE_UPLOAD_FAILED,
            'error'
          );
        }
      }

      setIsUploading(false);
    },
    [addImage, removeImage, images]
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

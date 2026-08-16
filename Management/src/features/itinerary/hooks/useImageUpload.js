/**
 * Custom hook for image upload management
 * Updated to use Cloudinary
 */

import { useState, useCallback } from 'react';
import { uploadPackageImages, deleteImage as deleteCloudinaryImage } from '../../../services/cloudinaryService';
import ApiService from '../services/apiService';
import Swal from 'sweetalert2';
import { VALIDATION_MESSAGES } from '../utils/constants';

export const useImageUpload = () => {
  const [images, setImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingIndexes, setDeletingIndexes] = useState([]);

  const addImage = useCallback((url) => {
    setImages((prev) => [...prev, url]);
  }, []);

  // Deletes the image at `index`. Persisted images (loaded from the DB, so
  // they carry an `id`) are removed via the package-image API — which also
  // cleans up the Cloudinary asset server-side — before local state changes,
  // so a delete that fails leaves the gallery untouched instead of silently
  // reappearing on the next reload. Unsaved/just-uploaded images (no `id`,
  // but a Cloudinary `publicId`) are removed directly from Cloudinary so they
  // don't leak if the user removes them before saving the package.
  const removeImage = useCallback(async (index, { packageId } = {}) => {
    const image = images[index];
    if (!image) return;

    if (image.isTemp) {
      setImages((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    const imageId = image.id;
    const publicId = image.publicId || image.public_id;

    setDeletingIndexes((prev) => [...prev, index]);
    try {
      if (imageId && packageId) {
        await ApiService.deletePackageImage(packageId, imageId);
      } else if (publicId) {
        await deleteCloudinaryImage(publicId);
      }
      setImages((prev) => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Image delete error:', error);
      Swal.fire('Error', error.message || 'Failed to delete image', 'error');
    } finally {
      setDeletingIndexes((prev) => prev.filter((i) => i !== index));
    }
  }, [images]);

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
    deletingIndexes,
  };
};

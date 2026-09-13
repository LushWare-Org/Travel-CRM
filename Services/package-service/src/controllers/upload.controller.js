import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import cloudinary, { configureCloudinary } from '../utils/cloudinary.js';

const uploadToCloudinary = async (filePath, folder, options = {}) => {
  configureCloudinary();
  return cloudinary.uploader.upload(filePath, { folder, ...options });
};

export const uploadSingle = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file provided', 400);
  const result = await uploadToCloudinary(req.file.path, 'travel-crm/general');
  res.json({ success: true, data: { publicId: result.public_id, url: result.secure_url } });
});

export const uploadMultiple = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw new AppError('No files provided', 400);
  const results = await Promise.all(
    req.files.map((f) => uploadToCloudinary(f.path, 'travel-crm/general'))
  );
  res.json({ success: true, data: results.map((r) => ({ publicId: r.public_id, url: r.secure_url })) });
});

export const uploadPackageImages = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw new AppError('No files provided', 400);
  const results = await Promise.all(
    req.files.map((f) =>
      uploadToCloudinary(f.path, 'travel-crm/packages', {
        transformation: [{ width: 1920, height: 1080, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
      })
    )
  );
  res.json({ success: true, data: results.map((r) => ({ publicId: r.public_id, url: r.secure_url })) });
});

export const uploadItineraryImages = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw new AppError('No files provided', 400);
  const results = await Promise.all(
    req.files.map((f) =>
      uploadToCloudinary(f.path, 'travel-crm/itineraries', {
        transformation: [{ width: 1200, height: 800, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
      })
    )
  );
  res.json({ success: true, data: results.map((r) => ({ publicId: r.public_id, url: r.secure_url })) });
});

export const uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file provided', 400);
  const result = await uploadToCloudinary(req.file.path, 'travel-crm/profiles', {
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' }],
  });
  res.json({ success: true, data: { publicId: result.public_id, url: result.secure_url } });
});

export const deleteImage = asyncHandler(async (req, res) => {
  const { publicId } = req.params;
  configureCloudinary();
  await cloudinary.uploader.destroy(publicId);
  res.json({ success: true, message: 'Image deleted' });
});

export const deleteMultipleImages = asyncHandler(async (req, res) => {
  const { publicIds } = req.body;
  configureCloudinary();
  await Promise.all(publicIds.map((id) => cloudinary.uploader.destroy(id)));
  res.json({ success: true, message: `${publicIds.length} images deleted` });
});

export const getOptimizedUrl = asyncHandler(async (req, res) => {
  const { publicId, width, height, quality = 'auto', format = 'auto' } = req.query;
  configureCloudinary();
  const url = cloudinary.url(publicId, {
    transformation: [
      { quality, fetch_format: format, ...(width && { width: Number(width) }), ...(height && { height: Number(height) }), ...(width && height && { crop: 'fill' }) },
    ],
    secure: true,
  });
  res.json({ success: true, data: { url } });
});

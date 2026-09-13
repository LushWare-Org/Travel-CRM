import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import cloudinary, { configureCloudinary } from '../utils/cloudinary.js';
import logger from '../config/logger.js';

export const deletePackageImage = asyncHandler(async (req, res) => {
  const { packageId, imageId } = req.params;

  const image = await prisma.packageImage.findUnique({ where: { id: imageId } });
  if (!image || image.packageId !== packageId) {
    throw new AppError('Image not found', 404);
  }

  await prisma.packageImage.delete({ where: { id: imageId } });

  if (image.publicId) {
    try {
      configureCloudinary();
      await cloudinary.uploader.destroy(image.publicId);
    } catch (err) {
      logger.warn({ err, imageId, publicId: image.publicId }, 'Failed to destroy Cloudinary asset after DB delete');
    }
  } else {
    logger.warn({ imageId, packageId }, 'Deleted PackageImage with no publicId — skipped Cloudinary cleanup');
  }

  res.json({ success: true, message: 'Image deleted' });
});

export const setPackageCover = asyncHandler(async (req, res) => {
  const { packageId } = req.params;
  const { imageId } = req.body;

  const image = await prisma.packageImage.findUnique({ where: { id: imageId } });
  if (!image || image.packageId !== packageId) {
    throw new AppError('Image not found', 404);
  }

  const pkg = await prisma.package.update({
    where: { id: packageId },
    data: { coverImage: image.url },
  });

  res.json({ success: true, data: { coverImage: pkg.coverImage } });
});

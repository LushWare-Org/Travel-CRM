import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import CustomizedPackage from '../models/customizedPackage.model.js';
import Itinerary from '../models/itinerary.model.js';

const formatCustomizedName = (baseName = '', sequence = 1) => {
  const cleanBase = `${baseName}`.replace(/\s*\(Customized(-\d+)?\)\s*$/i, '').trim();
  return sequence > 1 ? `${cleanBase} (Customized-${sequence})` : `${cleanBase} (Customized)`;
};

// @desc    Get customized package by ID
// @route   GET /api/v1/customized-packages/:id
// @access  Private (Admin, SalesRep)
export const getCustomizedPackageById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const customizedPackage = await CustomizedPackage.findById(id)
    .populate('originalPackage', 'name destination duration price')
    .populate('customizedForLead', 'name email')
    .populate('customizedBy', 'name email')
    .populate('itinerary');

  if (!customizedPackage) {
    return next(new AppError('Customized package not found', 404));
  }

  res.status(200).json({
    success: true,
    data: customizedPackage,
  });
});

// @desc    Update customized package
// @route   PUT /api/v1/customized-packages/:id
// @access  Private (Admin, SalesRep)
export const updateCustomizedPackage = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const customizedPackage = await CustomizedPackage.findById(id);

  if (!customizedPackage) {
    return next(new AppError('Customized package not found', 404));
  }

  const userId = req.user._id;
  const userRole = req.user.role;
  const isOwner = customizedPackage.customizedBy?.toString() === userId.toString();
  const isAuthorized = isOwner || ['admin', 'salesRep', 'staff', 'superAdmin'].includes(userRole);

  if (!isAuthorized) {
    return next(new AppError('Not authorized to update this customized package', 403));
  }

  const { days, ...updateData } = req.body;
  const baseNameFromPayload = updateData.baseName;
  delete updateData.baseName;

  const numericFields = ['price', 'duration', 'maxGroupSize'];
  numericFields.forEach((field) => {
    if (updateData[field] !== undefined && updateData[field] !== null && updateData[field] !== '') {
      const parsed =
        field === 'price'
          ? parseFloat(updateData[field])
          : parseInt(updateData[field], 10);
      if (!Number.isNaN(parsed)) {
        updateData[field] = parsed;
      }
    }
  });

  const allowedFields = [
    'name',
    'description',
    'destination',
    'duration',
    'price',
    'maxGroupSize',
    'difficulty',
    'category',
    'inclusions',
    'exclusions',
    'highlights',
    'terms',
    'isActive',
    'isFeatured',
    'availableFrom',
    'availableTo',
    'images',
    'coverImage',
    'customizationNotes',
    'customizationSequence',
  ];

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updateData, field)) {
      customizedPackage[field] = updateData[field];
    }
  });

  if (Array.isArray(days)) {
    if (customizedPackage.itinerary) {
      const itinerary = await Itinerary.findById(customizedPackage.itinerary);
      if (itinerary) {
        itinerary.days = days;
        if (updateData.status) {
          itinerary.status = updateData.status;
        }
        itinerary.metadata = itinerary.metadata || {};
        itinerary.metadata.lastModifiedBy = userId;
        await itinerary.save();
      }
    } else if (days.length > 0) {
      const newItinerary = await Itinerary.create({
        package: customizedPackage._id,
        packageModel: 'CustomizedPackage',
        days,
        createdBy: userId,
        status: updateData.status || 'draft',
      });
      customizedPackage.itinerary = newItinerary._id;
    }
  }

  customizedPackage.customizedBy = userId;
  const computedSequence =
    updateData.customizationSequence !== undefined && updateData.customizationSequence !== null
      ? updateData.customizationSequence
      : customizedPackage.customizationSequence || 1;
  customizedPackage.customizationSequence = computedSequence;

  const baseName =
    baseNameFromPayload ||
    updateData.name ||
    customizedPackage.baseName ||
    customizedPackage.name ||
    'Customized Package';
  customizedPackage.name = formatCustomizedName(baseName, computedSequence);

  await customizedPackage.save();

  await customizedPackage.populate('originalPackage', 'name destination');
  await customizedPackage.populate('customizedForLead', 'name email');
  await customizedPackage.populate('itinerary');

  res.status(200).json({
    success: true,
    message: 'Customized package updated successfully',
    data: customizedPackage,
  });
});


import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import CustomizedPackage from '../models/customizedPackage.model.js';

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


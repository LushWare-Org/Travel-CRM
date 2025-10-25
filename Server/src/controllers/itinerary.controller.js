import Itinerary from '../models/itinerary.model.js';
import Package from '../models/package.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

// @desc    Get itinerary for a specific package
// @route   GET /api/itineraries/:packageId
// @access  Public
export const getItineraryByPackage = asyncHandler(async (req, res, next) => {
  const { packageId } = req.params;

  // Check if package exists
  const packageDoc = await Package.findById(packageId);
  if (!packageDoc) {
    return next(new AppError('Package not found', 404));
  }

  // Get itinerary for the package
  const itinerary = await Itinerary.findOne({ package: packageId })
    .populate('package', 'name destination duration');

  if (!itinerary) {
    return next(new AppError('No itinerary found for this package', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      itinerary
    }
  });
});

export default {
  getItineraryByPackage
};

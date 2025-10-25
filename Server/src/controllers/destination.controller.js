import Destination from '../models/destination.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

// @desc    Get all destinations
// @route   GET /api/destinations
// @access  Public
export const getDestinations = asyncHandler(async (req, res, next) => {
  const { popular, country, region } = req.query;
  
  // Build query object
  let query = {};
  
  if (popular === 'true') {
    query.popular = true;
  }
  
  if (country) {
    query.country = { $regex: country, $options: 'i' };
  }
  
  if (region) {
    query.region = { $regex: region, $options: 'i' };
  }

  const destinations = await Destination.find(query).sort({ name: 1 });

  res.status(200).json({
    status: 'success',
    results: destinations.length,
    data: {
      destinations
    }
  });
});

// @desc    Get single destination
// @route   GET /api/destinations/:id
// @access  Public
export const getDestination = asyncHandler(async (req, res, next) => {
  const destination = await Destination.findById(req.params.id);

  if (!destination) {
    return next(new AppError('No destination found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      destination
    }
  });
});

export default {
  getDestinations,
  getDestination
};

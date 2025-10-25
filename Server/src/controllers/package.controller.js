import Package from '../models/package.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

// @desc    Get all available packages
// @route   GET /api/packages
// @access  Public
export const getPackages = asyncHandler(async (req, res, next) => {
  // Build query object
  const queryObj = { ...req.query };
  
  // Remove fields that are not for filtering
  const excludedFields = ['page', 'sort', 'limit', 'fields'];
  excludedFields.forEach(el => delete queryObj[el]);

  // Advanced filtering
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

  let query = Package.find(JSON.parse(queryStr)).populate('itinerary');

  // Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Field limiting
  if (req.query.fields) {
    const fields = req.query.fields.split(',').join(' ');
    query = query.select(fields);
  } else {
    query = query.select('-__v');
  }

  // Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  // Execute query
  const packages = await query;

  // Get total count for pagination
  const total = await Package.countDocuments(JSON.parse(queryStr));

  res.status(200).json({
    status: 'success',
    results: packages.length,
    total,
    data: {
      packages
    }
  });
});

// @desc    Get single package by ID
// @route   GET /api/packages/:id
// @access  Public
export const getPackage = asyncHandler(async (req, res, next) => {
  const packageId = req.params.id;

  const packageDoc = await Package.findById(packageId)
    .populate('itinerary');

  if (!packageDoc) {
    return next(new AppError('No package found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      package: packageDoc
    }
  });
});

// @desc    Get packages by category
// @route   GET /api/packages/category/:category
// @access  Public
export const getPackagesByCategory = asyncHandler(async (req, res, next) => {
  const { category } = req.params;
  
  const packages = await Package.find({ 
    category: category,
    isActive: true 
  }).populate('itinerary');

  res.status(200).json({
    status: 'success',
    results: packages.length,
    data: {
      packages
    }
  });
});

// @desc    Get featured packages
// @route   GET /api/packages/featured
// @access  Public
export const getFeaturedPackages = asyncHandler(async (req, res, next) => {
  const packages = await Package.find({ 
    isFeatured: true,
    isActive: true 
  })
  .populate('itinerary')
  .sort('-createdAt')
  .limit(6);

  res.status(200).json({
    status: 'success',
    results: packages.length,
    data: {
      packages
    }
  });
});

// @desc    Search packages
// @route   GET /api/packages/search
// @access  Public
export const searchPackages = asyncHandler(async (req, res, next) => {
  const { q, destination, minPrice, maxPrice, duration } = req.query;
  
  let query = { isActive: true };

  // Text search
  if (q) {
    query.$or = [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { destination: { $regex: q, $options: 'i' } }
    ];
  }

  // Destination filter
  if (destination) {
    query.destination = { $regex: destination, $options: 'i' };
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // Duration filter
  if (duration) {
    query.duration = { $lte: Number(duration) };
  }

  const packages = await Package.find(query)
    .populate('itinerary')
    .sort('-rating');

  res.status(200).json({
    status: 'success',
    results: packages.length,
    data: {
      packages
    }
  });
});

export default {
  getPackages,
  getPackage,
  getPackagesByCategory,
  getFeaturedPackages,
  searchPackages
};

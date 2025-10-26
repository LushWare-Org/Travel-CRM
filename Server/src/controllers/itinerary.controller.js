import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import Itinerary from '../models/itinerary.model.js';
import Package from '../models/package.model.js';
import ItineraryService from '../services/itinerary.service.js';

/**
 * @desc    Get dropdown options for itinerary form
 * @route   GET /api/v1/itineraries/dropdown-options
 * @access  Public
 */
export const getDropdownOptions = asyncHandler(async (req, res, next) => {
  const dropdownOptions = {
    accommodationTypes: [
      { value: 'hotel', label: 'Hotel' },
      { value: 'resort', label: 'Resort' },
      { value: 'guesthouse', label: 'Guesthouse' },
      { value: 'homestay', label: 'Homestay' },
      { value: 'camp', label: 'Camp' },
      { value: 'other', label: 'Other' },
    ],
    transportTypes: [
      { value: 'flight', label: 'Flight' },
      { value: 'train', label: 'Train' },
      { value: 'bus', label: 'Bus' },
      { value: 'car', label: 'Car' },
      { value: 'boat', label: 'Boat' },
      { value: 'walk', label: 'Walk' },
      { value: 'other', label: 'Other' },
    ],
    mealOptions: [
      { value: 'breakfast', label: 'Breakfast' },
      { value: 'lunch', label: 'Lunch' },
      { value: 'dinner', label: 'Dinner' },
    ],
    statusOptions: [
      { value: 'draft', label: 'Draft' },
      { value: 'published', label: 'Published' },
      { value: 'archived', label: 'Archived' },
    ],
  };

  res.status(200).json({
    success: true,
    data: dropdownOptions,
  });
});

/**
 * @desc    Get all itineraries
 * @route   GET /api/v1/itineraries
 * @access  Public
 */
export const getItineraries = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    sort = '-createdAt',
    packageId,
  } = req.query;

  const query = {};

  // Filter by package if provided
  if (packageId) {
    query.package = packageId;
  }

  const skip = (page - 1) * limit;

  const itineraries = await Itinerary.find(query)
    .populate('package', 'name destination duration price')
    .populate('createdBy', 'name email')
    .sort(sort)
    .limit(parseInt(limit, 10))
    .skip(skip);

  const total = await Itinerary.countDocuments(query);

  res.status(200).json({
    success: true,
    count: itineraries.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page, 10),
    data: itineraries,
  });

  return undefined;
});

/**
 * @desc    Get single itinerary by ID
 * @route   GET /api/v1/itineraries/:id
 * @access  Public
 */
export const getItinerary = asyncHandler(async (req, res, next) => {
  const itinerary = await Itinerary.findById(req.params.id)
    .populate('package')
    .populate('createdBy', 'name email');

  if (!itinerary) {
    return next(new AppError('Itinerary not found', 404));
  }

  res.status(200).json({
    success: true,
    data: itinerary,
  });
});

/**
 * @desc    Get itinerary by package ID
 * @route   GET /api/v1/itineraries/package/:packageId
 * @access  Public
 */
export const getItineraryByPackage = asyncHandler(async (req, res, next) => {
  const itinerary = await Itinerary.findOne({ package: req.params.packageId })
    .populate('package')
    .populate('createdBy', 'name email');

  if (!itinerary) {
    return next(new AppError('Itinerary not found for this package', 404));
  }

  res.status(200).json({
    success: true,
    data: itinerary,
  });

  return undefined;
});

/**
 * @desc    Create new itinerary
 * @route   POST /api/v1/itineraries
 * @access  Private (Admin, Staff)
 */
export const createItinerary = asyncHandler(async (req, res, next) => {
  const { package: packageId, days } = req.body;

  // Check if package exists
  const packageExists = await Package.findById(packageId);
  if (!packageExists) {
    return next(new AppError('Package not found', 404));
  }

  // Check if itinerary already exists for this package
  const existingItinerary = await Itinerary.findOne({ package: packageId });
  if (existingItinerary) {
    return next(
      new AppError('Itinerary already exists for this package', 400),
    );
  }

  // Validate day numbers are sequential
  const dayNumbers = days.map((day) => day.dayNumber).sort((a, b) => a - b);
  for (let i = 0; i < dayNumbers.length; i += 1) {
    if (dayNumbers[i] !== i + 1) {
      return next(new AppError('Day numbers must be sequential starting from 1', 400));
    }
  }

  // Create itinerary
  const itinerary = await Itinerary.create({
    package: packageId,
    days,
    createdBy: req.user.id,
  });

  // Update package with itinerary reference
  await Package.findByIdAndUpdate(packageId, { itinerary: itinerary.id });

  // Populate and return
  const populatedItinerary = await Itinerary.findById(itinerary.id)
    .populate('package')
    .populate('createdBy', 'name email');

  res.status(201).json({
    success: true,
    message: 'Itinerary created successfully',
    data: populatedItinerary,
  });

  return undefined;
});

/**
 * @desc    Update itinerary
 * @route   PUT /api/v1/itineraries/:id
 * @access  Private (Admin, Staff)
 */
export const updateItinerary = asyncHandler(async (req, res, next) => {
  let itinerary = await Itinerary.findById(req.params.id);

  if (!itinerary) {
    return next(new AppError('Itinerary not found', 404));
  }

  // Validate day numbers if days are being updated
  if (req.body.days) {
    const dayNumbers = req.body.days.map((day) => day.dayNumber).sort((a, b) => a - b);
    for (let i = 0; i < dayNumbers.length; i++) {
      if (dayNumbers[i] !== i + 1) {
        return next(new AppError('Day numbers must be sequential starting from 1', 400));
      }
    }
  }

  // Update itinerary
  itinerary = await Itinerary.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    },
  )
    .populate('package')
    .populate('createdBy', 'name email');

  res.status(200).json({
    success: true,
    message: 'Itinerary updated successfully',
    data: itinerary,
  });
});

/**
 * @desc    Add day to itinerary
 * @route   POST /api/v1/itineraries/:id/days
 * @access  Private (Admin, Staff)
 */
export const addDay = asyncHandler(async (req, res, next) => {
  const itinerary = await Itinerary.findById(req.params.id);

  if (!itinerary) {
    return next(new AppError('Itinerary not found', 404));
  }

  const {
    dayNumber, title, description, activities, accommodation, meals, transport, places,
  } = req.body;

  // Check if day number already exists
  const dayExists = itinerary.days.find((day) => day.dayNumber === dayNumber);
  if (dayExists) {
    return next(new AppError(`Day ${dayNumber} already exists`, 400));
  }

  // Add new day
  itinerary.days.push({
    dayNumber,
    title,
    description,
    activities,
    accommodation,
    meals,
    transport,
    places,
  });

  // Sort days by day number
  itinerary.days.sort((a, b) => a.dayNumber - b.dayNumber);

  await itinerary.save();

  res.status(201).json({
    success: true,
    message: 'Day added successfully',
    data: itinerary,
  });
});

/**
 * @desc    Update specific day in itinerary
 * @route   PUT /api/v1/itineraries/:id/days/:dayNumber
 * @access  Private (Admin, Staff)
 */
export const updateDay = asyncHandler(async (req, res, next) => {
  const itinerary = await Itinerary.findById(req.params.id);

  if (!itinerary) {
    return next(new AppError('Itinerary not found', 404));
  }

  const dayIndex = itinerary.days.findIndex(
    (day) => day.dayNumber === parseInt(req.params.dayNumber, 10),
  );

  if (dayIndex === -1) {
    return next(new AppError('Day not found', 404));
  }

  // Update day
  itinerary.days[dayIndex] = {
    ...itinerary.days[dayIndex].toObject(),
    ...req.body,
    dayNumber: parseInt(req.params.dayNumber, 10), // Ensure day number doesn't change
  };

  await itinerary.save();

  res.status(200).json({
    success: true,
    message: 'Day updated successfully',
    data: itinerary,
  });
});

/**
 * @desc    Delete specific day from itinerary
 * @route   DELETE /api/v1/itineraries/:id/days/:dayNumber
 * @access  Private (Admin, Staff)
 */
export const deleteDay = asyncHandler(async (req, res, next) => {
  const itinerary = await Itinerary.findById(req.params.id);

  if (!itinerary) {
    return next(new AppError('Itinerary not found', 404));
  }

  const dayIndex = itinerary.days.findIndex(
    (day) => day.dayNumber === parseInt(req.params.dayNumber, 10),
  );

  if (dayIndex === -1) {
    return next(new AppError('Day not found', 404));
  }

  // Remove day
  itinerary.days.splice(dayIndex, 1);

  await itinerary.save();

  res.status(200).json({
    success: true,
    message: 'Day deleted successfully',
    data: itinerary,
  });
});

/**
 * @desc    Delete itinerary
 * @route   DELETE /api/v1/itineraries/:id
 * @access  Private (Admin, Staff)
 */
export const deleteItinerary = asyncHandler(async (req, res, next) => {
  const itinerary = await Itinerary.findById(req.params.id);

  if (!itinerary) {
    return next(new AppError('Itinerary not found', 404));
  }

  // Remove itinerary reference from package
  await Package.findByIdAndUpdate(itinerary.package, { itinerary: null });

  // Delete itinerary
  await itinerary.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Itinerary deleted successfully',
    data: null,
  });
});

/**
 * @desc    Preview itinerary (formatted for display)
 * @route   GET /api/v1/itineraries/:id/preview
 * @access  Public
 */
export const previewItinerary = asyncHandler(async (req, res, next) => {
  const preview = await ItineraryService.generatePreview(req.params.id);

  res.status(200).json({
    success: true,
    data: preview,
  });
});

/**
 * @desc    Generate and download itinerary PDF
 * @route   GET /api/v1/itineraries/:id/pdf
 * @access  Public
 */
export const downloadItineraryPDF = asyncHandler(async (req, res, next) => {
  const filePath = await ItineraryService.generatePDF(req.params.id);

  res.download(filePath, (err) => {
    if (err) {
      return next(new AppError('Error downloading file', 500));
    }
  });
});

/**
 * @desc    Clone itinerary to another package
 * @route   POST /api/v1/itineraries/:id/clone
 * @access  Private (Admin, Staff)
 */
export const cloneItinerary = asyncHandler(async (req, res, next) => {
  const { targetPackageId } = req.body;

  if (!targetPackageId) {
    return next(new AppError('Target package ID is required', 400));
  }

  const sourceItinerary = await Itinerary.findById(req.params.id);

  if (!sourceItinerary) {
    return next(new AppError('Source itinerary not found', 404));
  }

  // Check if target package exists
  const targetPackage = await Package.findById(targetPackageId);
  if (!targetPackage) {
    return next(new AppError('Target package not found', 404));
  }

  // Check if target package already has an itinerary
  const existingItinerary = await Itinerary.findOne({ package: targetPackageId });
  if (existingItinerary) {
    return next(new AppError('Target package already has an itinerary', 400));
  }

  // Clone itinerary
  const clonedItinerary = await Itinerary.create({
    package: targetPackageId,
    days: sourceItinerary.days.map((day) => ({
      dayNumber: day.dayNumber,
      title: day.title,
      description: day.description,
      activities: day.activities,
      accommodation: day.accommodation,
      meals: day.meals,
      transport: day.transport,
      places: day.places,
    })),
    createdBy: req.user.id,
  });

  // Update target package with itinerary reference
  await Package.findByIdAndUpdate(targetPackageId, { itinerary: clonedItinerary._id });

  const populatedItinerary = await Itinerary.findById(clonedItinerary._id)
    .populate('package')
    .populate('createdBy', 'name email');

  res.status(201).json({
    success: true,
    message: 'Itinerary cloned successfully',
    data: populatedItinerary,
  });
});

import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import ManualItinerary from '../models/manualItinerary.model.js';
import Lead from '../models/lead.model.js';

// @desc    Create or update manual itinerary for a lead
// @route   POST /api/v1/manual-itineraries
// @route   PUT /api/v1/manual-itineraries/:leadId
// @access  Private (Admin, SalesRep)
export const createOrUpdateManualItinerary = asyncHandler(async (req, res, next) => {
  const { leadId } = req.params;
  const { days } = req.body;

  // Check if lead exists
  const lead = await Lead.findById(leadId);
  if (!lead) {
    return next(new AppError('Lead not found', 404));
  }

  // Check if manual itinerary already exists for this lead
  let manualItinerary = await ManualItinerary.findOne({ lead: leadId });

  if (manualItinerary) {
    // Update existing itinerary
    manualItinerary.days = days || [];
    manualItinerary.metadata.lastModifiedBy = req.user._id;
    await manualItinerary.save();

    res.status(200).json({
      success: true,
      data: manualItinerary,
      message: 'Manual itinerary updated successfully',
    });
  } else {
    // Create new itinerary
    manualItinerary = await ManualItinerary.create({
      lead: leadId,
      days: days || [],
      createdBy: req.user._id,
      metadata: {
        lastModifiedBy: req.user._id,
      },
    });

    // Link itinerary to lead
    lead.manualItinerary = manualItinerary._id;
    await lead.save();

    res.status(201).json({
      success: true,
      data: manualItinerary,
      message: 'Manual itinerary created successfully',
    });
  }
});

// @desc    Get manual itinerary by lead ID
// @route   GET /api/v1/manual-itineraries/lead/:leadId
// @access  Private (Admin, SalesRep)
export const getManualItineraryByLead = asyncHandler(async (req, res, next) => {
  const { leadId } = req.params;

  const manualItinerary = await ManualItinerary.findOne({ lead: leadId })
    .populate('createdBy', 'name email')
    .populate('metadata.lastModifiedBy', 'name email');

  if (!manualItinerary) {
    return res.status(200).json({
      success: true,
      data: null,
      message: 'No manual itinerary found for this lead',
    });
  }

  res.status(200).json({
    success: true,
    data: manualItinerary,
  });
});

// @desc    Delete manual itinerary
// @route   DELETE /api/v1/manual-itineraries/:id
// @access  Private (Admin, SalesRep)
export const deleteManualItinerary = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const manualItinerary = await ManualItinerary.findById(id);
  if (!manualItinerary) {
    return next(new AppError('Manual itinerary not found', 404));
  }

  // Remove reference from lead
  await Lead.findByIdAndUpdate(manualItinerary.lead, {
    $unset: { manualItinerary: '' },
  });

  await ManualItinerary.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Manual itinerary deleted successfully',
  });
});


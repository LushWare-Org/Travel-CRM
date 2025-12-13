import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import hotelSuggestionService from '../services/hotelSuggestion.service.js';

/**
 * @desc    Get hotel suggestions based on destination, type, and category
 * @route   POST /api/v1/hotels/suggest
 * @access  Private
 */
export const suggestHotels = asyncHandler(async (req, res) => {
  const { destination, packageType, category, location, count } = req.body;

  // Validate required fields - either destination or location must be provided
  if (!destination && !location) {
    throw new AppError('Destination or location is required', 400);
  }

  try {
    const hotels = await hotelSuggestionService.suggestHotels(
      destination,
      packageType,
      category,
      location,
      count || 5
    );

    res.status(200).json({
      success: true,
      count: hotels.length,
      data: hotels,
    });
  } catch (error) {
    console.error('Error in suggestHotels controller:', error);
    throw new AppError(
      error.message || 'Failed to generate hotel suggestions',
      500
    );
  }
});


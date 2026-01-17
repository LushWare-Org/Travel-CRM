import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import aiPackageGenerationService from '../services/aiPackageGeneration.service.js';

/**
 * @desc    Generate complete package using AI
 * @route   POST /api/v1/packages/generate-ai
 * @access  Private
 */
export const generateAIPackage = asyncHandler(async (req, res) => {
  const { destination, packageType, category, nights, description } = req.body;

  // Validate required fields
  if (!destination) {
    throw new AppError('Destination is required', 400);
  }

  if (!nights || nights < 1) {
    throw new AppError('Number of nights must be at least 1', 400);
  }

  try {
    const packageData = await aiPackageGenerationService.generatePackage(
      destination,
      description,
      packageType,
      category,
      parseInt(nights, 10)
    );

    res.status(200).json({
      success: true,
      data: packageData,
    });
  } catch (error) {
    console.error('Error in generateAIPackage controller:', error);
    throw new AppError(
      error.message || 'Failed to generate AI package',
      500
    );
  }
});


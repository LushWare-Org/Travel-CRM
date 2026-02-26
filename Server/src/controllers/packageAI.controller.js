/**
 * Package AI Controller
 * Handles AI-related API requests for packages
 */

import packageAIService from '../services/packageAI.service.js';
import packageAIPDFGenerator from '../utils/packageAIPDFGenerator.js';
import geminiRestService from '../services/geminiRest.service.js';
import geminiService from '../services/gemini.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';

/**
 * Generate AI content for a package
 * POST /api/v1/packages/:id/generate-ai-content
 */
export const generateAIContent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await packageAIService.generatePackageContent(id);

  res.status(200).json({
    success: true,
    message: 'AI content generated successfully',
    data: result,
  });
});

/**
 * Preview AI content without saving
 * GET /api/v1/packages/:id/preview-ai-content
 */
export const previewAIContent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await packageAIService.previewAIContent(id);

  res.status(200).json({
    success: true,
    message: 'AI content preview generated',
    data: result,
  });
});

/**
 * Check AI service status
 * GET /api/v1/packages/ai-status
 */
export const checkAIStatus = asyncHandler(async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === '') {
      return res.status(200).json({
        success: false,
        configured: false,
        message: 'GEMINI_API_KEY is not set in Server/.env file',
        instructions: [
          '1. Get API key from: https://makersuite.google.com/app/apikey',
          '2. Add to Server/.env: GEMINI_API_KEY=your_key_here',
          '3. Restart server',
        ],
      });
    }

    const trimmedKey = apiKey.trim();
    const keyPreview = trimmedKey.length > 10 ? `${trimmedKey.substring(0, 10)}...` : '***';
    const isValidFormat = trimmedKey.startsWith('AIza');

    return res.status(200).json({
      success: true,
      configured: true,
      keyFormat: isValidFormat ? 'valid' : 'invalid',
      keyPreview,
      message: isValidFormat
        ? 'API key is configured. Try generating content to test.'
        : 'API key format looks incorrect. Valid keys start with "AIza". Get a new key from https://makersuite.google.com/app/apikey',
    });
  } catch (error) {
    logger.error('Error in checkAIStatus:', error);
    return res.status(200).json({
      success: false,
      configured: false,
      message: 'Error checking AI status',
      error: error.message,
    });
  }
});

/**
 * Generate AI content from title only (no package ID needed)
 * POST /api/v1/packages/generate-from-title
 */
export const generateFromTitle = asyncHandler(async (req, res) => {
  // Log request for debugging
  logger.info('Generate from title request received', {
    user: req.user?.id,
    hasTitle: !!req.body.title,
  });

  const {
    title, destination, duration, category,
  } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Package title is required',
    });
  }

  // Check if API key is configured
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return res.status(503).json({
      success: false,
      message: 'AI service not configured',
      error: 'GEMINI_API_KEY is not set in Server/.env file. '
        + 'Get a free API key from: https://makersuite.google.com/app/apikey '
        + 'Then add to Server/.env: GEMINI_API_KEY=your_key_here and restart server.',
    });
  }

  try {
    const additionalInfo = {
      destination: destination || null,
      duration: duration || null,
      category: category || null,
    };

    // Try REST API approach first (more reliable), fallback to SDK
    let aiContent;
    try {
      logger.info('Attempting to generate content using REST API...');
      aiContent = await geminiRestService.generatePackageContent(
        title.trim(),
        additionalInfo,
      );
      logger.info('Successfully generated content using REST API');
    } catch (restError) {
      logger.warn('REST API approach failed, trying SDK approach:', restError.message);
      aiContent = await geminiService.generatePackageContent(
        title.trim(),
        additionalInfo,
      );
    }

    res.status(200).json({
      success: true,
      message: 'AI content generated successfully',
      data: aiContent,
    });
  } catch (error) {
    logger.error('Error generating content from title:', error);
    logger.error('API Key present:', !!apiKey);
    logger.error('API Key preview:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');

    // Provide more helpful error message
    let errorMessage = error.message || 'Unknown error occurred';
    let statusCode = 500;

    // Check if it's an API key or model access issue
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      errorMessage = 'Gemini model not found. '
        + 'SOLUTION: 1) Get NEW API key from https://makersuite.google.com/app/apikey (AI Studio keys work immediately), '
        + '2) Add to Server/.env: GEMINI_API_KEY=your_key, 3) Restart server. '
        + 'For Google Cloud keys, enable API at https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com';
      statusCode = 503;
    } else if (errorMessage.includes('Unable to initialize') || errorMessage.includes('404') || errorMessage.includes('not found')) {
      // Models not available - API key might be valid but doesn't have access
      const keyPreview = apiKey ? `${apiKey.trim().substring(0, 10)}...` : 'NOT SET';
      errorMessage = 'Gemini models are not available with this API key. '
        + 'All models returned 404 (not found). '
        + 'This usually means: 1) The API key doesn\'t have access to Gemini models, '
        + '2) The API key might be restricted, or 3) You need to enable the Generative AI API. '
        + 'SOLUTION: 1) Get a NEW API key from https://makersuite.google.com/app/apikey (make sure it\'s from AI Studio, NOT Google Cloud Console), '
        + '2) Make sure you\'re logged into the correct Google account when creating the key, '
        + '3) Copy the COMPLETE key (starts with AIza...), '
        + '4) Replace in Server/.env: GEMINI_API_KEY=your_new_complete_key (no spaces/quotes), '
        + '5) Restart server completely. '
        + `Current key preview: ${keyPreview}. `
        + 'If using Google Cloud Console, enable API at: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com';
      statusCode = 503;
    } else if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('Invalid') || errorMessage.includes('expired')) {
      const keyPreview = apiKey ? `${apiKey.trim().substring(0, 10)}...` : 'NOT SET';
      const keyLength = apiKey ? apiKey.trim().length : 0;
      errorMessage = 'Invalid or expired API key. '
        + 'SOLUTION: 1) Get a NEW key from https://makersuite.google.com/app/apikey (AI Studio keys work immediately), '
        + '2) Copy the COMPLETE key (starts with AIza..., usually 39+ characters), '
        + '3) Replace in Server/.env: GEMINI_API_KEY=your_new_complete_key (no spaces/quotes), '
        + '4) Restart server completely. '
        + `Current key preview: ${keyPreview} (length: ${keyLength} chars). `
        + 'If key is shorter than 35 chars, it may be incomplete.';
      statusCode = 401;
    } else if (errorMessage.includes('not configured') || errorMessage.includes('not set')) {
      statusCode = 503;
    }

    res.status(statusCode).json({
      success: false,
      message: 'Failed to generate AI content',
      error: errorMessage,
    });
  }
});

/**
 * Generate and download AI PDF
 * GET /api/v1/packages/:id/ai-pdf
 */
export const generateAIPDF = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const pdfBuffer = await packageAIPDFGenerator.generatePackagePDF(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="package-ai-${id}.pdf"`,
    );

    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Error generating AI PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message,
    });
  }
});

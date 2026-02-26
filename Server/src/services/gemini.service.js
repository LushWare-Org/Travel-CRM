/**
 * Gemini AI Service
 * Handles communication with Google Gemini AI API
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../config/logger.js';

class GeminiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === '') {
      logger.warn('GEMINI_API_KEY not found in environment variables. AI features will be disabled.');
      logger.warn('To enable: Get API key from https://makersuite.google.com/app/apikey and add to Server/.env');
      this.genAI = null;
      this.model = null;
    } else {
      // Validate API key format (should start with AIza)
      const trimmedKey = apiKey.trim();
      if (!trimmedKey.startsWith('AIza')) {
        logger.warn('GEMINI_API_KEY format looks incorrect. Valid keys start with "AIza".');
        logger.warn('Get a new key from: https://makersuite.google.com/app/apikey');
      }

      try {
        this.genAI = new GoogleGenerativeAI(trimmedKey);
        // Don't initialize model here - initialize it when needed to handle errors better
        this.model = null;
        logger.info('Gemini AI service initialized. API key found. Model will be loaded on first use.');
      } catch (error) {
        logger.error('Failed to initialize Gemini AI:', error);
        logger.error('Please check: 1) API key is valid, 2) Get new key from https://makersuite.google.com/app/apikey');
        this.genAI = null;
        this.model = null;
      }
    }
  }

  /**
   * Generate content from a prompt
   * @param {string} prompt - The prompt to send to Gemini
   * @param {object} options - Additional options
   * @returns {Promise<string>} Generated content
   */
  async generateContent(prompt, options = {}) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === '') {
      throw new Error(
        'GEMINI_API_KEY is not set in .env file. '
        + 'Get a free API key from: https://makersuite.google.com/app/apikey '
        + 'Then add to Server/.env: GEMINI_API_KEY=your_key_here',
      );
    }

    if (!this.genAI) {
      throw new Error(
        'Gemini AI client not initialized. '
        + 'Please check: 1) GEMINI_API_KEY is in .env, 2) API key is valid, '
        + '3) Restart server after adding the key. '
        + 'Get a new key from: https://makersuite.google.com/app/apikey',
      );
    }

    try {
      const {
        temperature = 0.7,
        maxTokens = 2000,
        topP = 0.8,
      } = options;

      const generationConfig = {
        temperature,
        topP,
        maxOutputTokens: maxTokens,
      };

      // Initialize model lazily - don't cache until we know it works
      let { model } = this;
      if (!model && this.genAI) {
        // Try models in order - use current available models (as of 2025)
        const modelsToTry = [
          'gemini-2.5-flash', // Latest stable flash model (most common)
          'gemini-2.5-pro', // Latest stable pro model
          'gemini-2.0-flash', // Alternative flash model
          'gemini-2.0-flash-001', // Stable version
          'gemini-1.5-flash', // Fallback to older models
          'gemini-1.5-pro', // Fallback to older models
          'gemini-pro', // Legacy fallback
        ];

        for (const modelName of modelsToTry) {
          try {
            // Clean model name (remove 'models/' prefix if present)
            const cleanModelName = modelName.replace(/^models\//, '');
            model = this.genAI.getGenerativeModel({ model: cleanModelName });
            logger.info(`Attempting to use Gemini model: ${cleanModelName}`);
            // Test with a simple call to verify it works
            try {
              const testResult = await model.generateContent('test');
              await testResult.response; // This will throw if model doesn't work
              // If we get here, model works - cache it
              this.model = model;
              logger.info(`✅ Successfully initialized Gemini model: ${cleanModelName}`);
              break;
            } catch (testError) {
              // If it's a 404, try next model. If it's auth error, the key is invalid.
              if (testError.message.includes('401') || testError.message.includes('403') || testError.message.includes('API key') || testError.message.includes('authentication')) {
                logger.error(`API key authentication failed with model ${cleanModelName}:`, testError.message);
                throw testError; // Re-throw auth errors - key is invalid
              }
              logger.warn(`Model ${cleanModelName} failed test:`, testError.message);
              model = null;
              continue;
            }
          } catch (modelError) {
            // If it's an auth error, the key is invalid - don't try other models
            if (modelError.message.includes('401') || modelError.message.includes('403') || modelError.message.includes('API key') || modelError.message.includes('authentication')) {
              logger.error('API key authentication failed:', modelError.message);
              throw modelError;
            }
            logger.warn(`Failed to initialize ${modelName}:`, modelError.message);
            model = null;
            continue;
          }
        }
      }

      if (!model) {
        const apiKeyPreview = process.env.GEMINI_API_KEY
          ? `${process.env.GEMINI_API_KEY.trim().substring(0, 10)}...`
          : 'NOT SET';

        throw new Error(
          'Unable to initialize any Gemini model. All models returned 404 (not found). '
          + `API Key: ${apiKeyPreview}. `
          + 'This usually means: 1) The API key doesn\'t have access to these models, '
          + '2) The API key might be restricted, or 3) You need to enable the Generative AI API. '
          + 'SOLUTION: 1) Get a NEW API key from https://makersuite.google.com/app/apikey (make sure it\'s from AI Studio, not Google Cloud), '
          + '2) Make sure the key has access to Gemini models, '
          + '3) Add to Server/.env as GEMINI_API_KEY=your_key, '
          + '4) Restart server. '
          + 'If using Google Cloud Console, enable API at: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com',
        );
      }

      // API format: pass prompt as string directly (works with @google/generative-ai SDK)
      let result;
      try {
        result = await model.generateContent(prompt, {
          generationConfig,
        });
      } catch (apiError) {
        // If the model initialization worked but generation fails, try without generationConfig
        logger.warn('Generation with config failed, trying without config:', apiError.message);
        try {
          result = await model.generateContent(prompt);
        } catch (simpleError) {
          logger.error('Simple generation also failed:', simpleError);
          throw simpleError;
        }
      }

      const response = await result.response;
      const text = response.text();

      logger.info('Gemini AI content generated successfully');
      return text;
    } catch (error) {
      logger.error('Error generating content with Gemini AI:', error);

      // Provide helpful error message
      let errorMessage = error.message || 'Unknown error';

      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        errorMessage = 'Gemini model not found. '
          + 'SOLUTION: 1) Get a NEW API key from https://makersuite.google.com/app/apikey (AI Studio keys work immediately), '
          + '2) Add to Server/.env: GEMINI_API_KEY=your_key, 3) Restart server. '
          + 'For Google Cloud keys, enable API at https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com';
      } else if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('Invalid') || errorMessage.includes('expired')) {
        const apiKeyPreview = process.env.GEMINI_API_KEY
          ? `${process.env.GEMINI_API_KEY.trim().substring(0, 10)}...`
          : 'NOT SET';
        const keyLength = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim().length : 0;

        errorMessage = 'Invalid or expired API key. '
          + 'SOLUTION: 1) Get a NEW key from https://makersuite.google.com/app/apikey (AI Studio keys work immediately), '
          + '2) Copy the COMPLETE key (starts with AIza..., usually 39+ characters), '
          + '3) Replace in Server/.env: GEMINI_API_KEY=your_new_complete_key (no spaces/quotes), '
          + '4) Restart server completely. '
          + `Current key preview: ${apiKeyPreview} (length: ${keyLength} chars). `
          + 'If key is shorter than 35 chars, it may be incomplete.';
      } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        errorMessage = 'API quota exceeded or rate limited. Please check your Gemini API usage limits or wait a few minutes.';
      } else if (errorMessage.includes('400')) {
        errorMessage = 'Bad request to Gemini API. Please check your API key format and try a new key from https://makersuite.google.com/app/apikey';
      }

      logger.error('Gemini AI error details:', {
        message: error.message,
        stack: error.stack,
      });

      throw new Error(`Failed to generate content: ${errorMessage}`);
    }
  }

  /**
   * Generate structured package content from title
   * @param {string} packageTitle - The package title
   * @param {object} additionalInfo - Additional package information (optional)
   * @returns {Promise<object>} Structured package content
   */
  async generatePackageContent(packageTitle, additionalInfo = {}) {
    const prompt = this.buildPackagePrompt(packageTitle, additionalInfo);
    const rawContent = await this.generateContent(prompt, {
      temperature: 0.8,
      maxTokens: 3000,
    });

    // Parse the structured response
    return this.parsePackageResponse(rawContent, packageTitle);
  }

  /**
   * Build prompt for package content generation
   */
  buildPackagePrompt(packageTitle, additionalInfo) {
    const { destination, duration, category } = additionalInfo;

    let prompt = `You are a professional travel content writer. Generate a comprehensive travel package description for: "${packageTitle}"

`;

    if (destination) {
      prompt += `Destination: ${destination}\n`;
    }
    if (duration) {
      prompt += `Duration: ${duration} days\n`;
    }
    if (category) {
      prompt += `Category: ${category}\n`;
    }

    prompt += `
Please provide a detailed travel package description in the following JSON format:
{
  "description": "A comprehensive 2-3 paragraph description of the package, highlighting what makes it special, the experiences included, and why travelers should choose this package.",
  "highlights": ["Highlight 1", "Highlight 2", "Highlight 3", "Highlight 4", "Highlight 5"],
  "itineraryOverview": "A brief overview of the itinerary (2-3 sentences)",
  "inclusions": ["Inclusion 1", "Inclusion 2", "Inclusion 3", "Inclusion 4", "Inclusion 5"],
  "exclusions": ["Exclusion 1", "Exclusion 2", "Exclusion 3"],
  "travelTips": ["Tip 1", "Tip 2", "Tip 3"],
  "bestTimeToVisit": "Information about the best time to visit",
  "whatToExpect": "What travelers can expect from this package"
}

Make the content engaging, informative, and suitable for a travel agency website. Use simple, clear English.`;

    return prompt;
  }

  /**
   * Parse Gemini response into structured format
   */
  parsePackageResponse(rawContent, packageTitle) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);

        // Validate and clean the parsed data
        return {
          description: parsed.description || `Experience the amazing ${packageTitle}. This carefully crafted package offers unforgettable memories and unique experiences.`,
          highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
          itineraryOverview: parsed.itineraryOverview || 'A well-planned itinerary covering the best attractions and experiences.',
          inclusions: Array.isArray(parsed.inclusions) ? parsed.inclusions : [],
          exclusions: Array.isArray(parsed.exclusions) ? parsed.exclusions : [],
          travelTips: Array.isArray(parsed.travelTips) ? parsed.travelTips : [],
          bestTimeToVisit: parsed.bestTimeToVisit || 'Year-round destination with pleasant weather.',
          whatToExpect: parsed.whatToExpect || 'An amazing travel experience with professional guidance and memorable moments.',
        };
      }
      // Fallback: parse as plain text
      return this.parsePlainTextResponse(rawContent, packageTitle);
    } catch (error) {
      logger.warn('Failed to parse JSON response, using fallback:', error);
      return this.parsePlainTextResponse(rawContent, packageTitle);
    }
  }

  /**
   * Fallback parser for plain text responses
   */
  parsePlainTextResponse(rawContent, packageTitle) {
    const lines = rawContent.split('\n').filter((line) => line.trim());

    return {
      description: rawContent.substring(0, 500) || `Experience the amazing ${packageTitle}.`,
      highlights: lines.slice(0, 5).filter((line) => line.length > 10),
      itineraryOverview: 'A well-planned itinerary covering the best attractions.',
      inclusions: ['Accommodation', 'Transportation', 'Meals', 'Guide Services'],
      exclusions: ['International flights', 'Personal expenses', 'Travel insurance'],
      travelTips: ['Pack comfortable clothing', 'Carry necessary documents', 'Stay hydrated'],
      bestTimeToVisit: 'Year-round destination',
      whatToExpect: 'An amazing travel experience.',
    };
  }
}

// Export singleton instance
export default new GeminiService();

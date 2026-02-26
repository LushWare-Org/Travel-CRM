/**
 * Package AI Service
 * Handles AI-related operations for packages
 */

import Package from '../models/package.model.js';
// Try REST API approach first, fallback to SDK
import geminiRestService from './geminiRest.service.js';
import geminiService from './gemini.service.js';
import logger from '../config/logger.js';
import AppError from '../utils/appError.js';

class PackageAIService {
  /**
   * Generate AI content for a package
   * @param {string} packageId - Package ID
   * @returns {Promise<object>} Generated content
   */
  async generatePackageContent(packageId) {
    const pkg = await Package.findById(packageId);

    if (!pkg) {
      throw new AppError('Package not found', 404);
    }

    if (!pkg.name) {
      throw new AppError('Package title is required for AI generation', 400);
    }

    try {
      // Prepare additional info for better AI generation
      const additionalInfo = {
        destination: pkg.destination,
        duration: pkg.duration,
        category: pkg.category,
      };

      // Generate content using Gemini (try REST API first, fallback to SDK)
      let aiContent;
      try {
        logger.info('Attempting to generate content using REST API...');
        aiContent = await geminiRestService.generatePackageContent(
          pkg.name,
          additionalInfo,
        );
        logger.info('Successfully generated content using REST API');
      } catch (restError) {
        logger.warn('REST API approach failed, trying SDK approach:', restError.message);
        aiContent = await geminiService.generatePackageContent(
          pkg.name,
          additionalInfo,
        );
      }

      // Update package with AI-generated content
      pkg.description = aiContent.description || pkg.description;
      pkg.highlights = aiContent.highlights || pkg.highlights;

      // Save updated package
      await pkg.save();

      logger.info(`AI content generated for package: ${pkg.name}`);

      return {
        success: true,
        content: aiContent,
        package: pkg,
      };
    } catch (error) {
      logger.error('Error generating AI content:', error);
      throw new AppError(
        `Failed to generate AI content: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Get AI-generated content without saving
   * @param {string} packageId - Package ID
   * @returns {Promise<object>} Generated content
   */
  async previewAIContent(packageId) {
    const pkg = await Package.findById(packageId);

    if (!pkg) {
      throw new AppError('Package not found', 404);
    }

    if (!pkg.name) {
      throw new AppError('Package title is required for AI generation', 400);
    }

    try {
      const additionalInfo = {
        destination: pkg.destination,
        duration: pkg.duration,
        category: pkg.category,
      };

      // Try REST API first, fallback to SDK
      let aiContent;
      try {
        logger.info('Attempting to preview content using REST API...');
        aiContent = await geminiRestService.generatePackageContent(
          pkg.name,
          additionalInfo,
        );
        logger.info('Successfully previewed content using REST API');
      } catch (restError) {
        logger.warn('REST API approach failed, trying SDK approach:', restError.message);
        aiContent = await geminiService.generatePackageContent(
          pkg.name,
          additionalInfo,
        );
      }

      return {
        success: true,
        content: aiContent,
      };
    } catch (error) {
      logger.error('Error previewing AI content:', error);
      throw new AppError(
        `Failed to preview AI content: ${error.message}`,
        500,
      );
    }
  }
}

export default new PackageAIService();

/**
 * Gemini AI Service - Direct REST API Approach
 * Uses direct HTTP calls instead of SDK to avoid API version issues
 */

import logger from '../config/logger.js';

class GeminiRestService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta';

    if (!this.apiKey || this.apiKey.trim() === '') {
      logger.warn('GEMINI_API_KEY not found. AI features will be disabled.');
      this.apiKey = null;
    } else {
      logger.info('Gemini REST service initialized with API key');
    }
  }

  /**
   * Generate content using direct REST API call
   * @param {string} prompt - The prompt to send
   * @param {object} options - Additional options
   * @returns {Promise<string>} Generated content
   */
  async generateContent(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not set. Get a key from https://makersuite.google.com/app/apikey',
      );
    }

    // Try different API versions and model names
    // Updated to use current available models (as of 2025)
    // Prioritize v1 API and working models
    const apiVersions = ['v1', 'v1beta'];
    const modelsToTry = [
      'gemini-2.0-flash', // Known working model
      'gemini-2.5-flash', // Latest stable flash model
      'gemini-2.5-pro', // Latest stable pro model
      'gemini-2.0-flash-001', // Stable version
      'gemini-1.5-flash', // Fallback to older models
      'gemini-1.5-pro', // Fallback to older models
      'gemini-pro', // Legacy fallback
    ];

    const errors = []; // Collect errors for better diagnostics

    for (const version of apiVersions) {
      for (const model of modelsToTry) {
        try {
          const cleanModel = model.replace(/^models\//, '');
          const url = `https://generativelanguage.googleapis.com/${version}/models/${cleanModel}:generateContent?key=${this.apiKey}`;

          logger.info(`Trying ${version}/${cleanModel}...`);

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt,
                }],
              }],
              generationConfig: {
                temperature: options.temperature || 0.7,
                topP: options.topP || 0.8,
                topK: 40,
                maxOutputTokens: options.maxTokens || 2000,
              },
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            const errorInfo = `${version}/${cleanModel}: ${response.status} - ${errorText.substring(0, 200)}`;
            logger.warn(`Failed: ${errorInfo}`);
            errors.push(errorInfo);

            // If it's a 401/403, the key is invalid - don't try other models
            if (response.status === 401 || response.status === 403) {
              throw new Error(
                `Invalid API key. Status: ${response.status}. `
                + 'Get a new key from https://makersuite.google.com/app/apikey',
              );
            }

            // If it's 404, try next model/version
            if (response.status === 404) {
              continue;
            }

            // If it's 429 (quota exceeded), this is a critical error - don't try other models
            if (response.status === 429) {
              try {
                const errorData = JSON.parse(errorText);
                if (errorData.error && errorData.error.message && errorData.error.message.includes('quota')) {
                  throw new Error(
                    'API quota exceeded. You have exceeded your current quota. '
                    + 'Please check your plan and billing details at https://ai.google.dev/gemini-api/pricing '
                    + 'or wait for your quota to reset.',
                  );
                }
              } catch (e) {
                // If parsing fails, still throw quota error
                if (errorText.includes('quota') || errorText.includes('Quota')) {
                  throw new Error(
                    'API quota exceeded. You have exceeded your current quota. '
                    + 'Please check your plan and billing details or wait for your quota to reset.',
                  );
                }
              }
              // If it's 429 but not quota-related, try next model
              logger.warn(`Rate limit hit for ${version}/${cleanModel}, trying next model...`);
              continue;
            }

            if (response.status === 503) {
              logger.warn(`Service unavailable for ${version}/${cleanModel}, trying next model...`);
              continue;
            }

            // Other errors - try next model
            continue;
          }

          const data = await response.json();

          if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const { content } = data.candidates[0];

            // Handle different response formats
            let text = null;

            // Format 1: content.parts[0].text (standard format)
            if (content.parts && Array.isArray(content.parts) && content.parts[0] && content.parts[0].text) {
              text = content.parts[0].text;
            }
            // Format 2: content.text (alternative format)
            else if (content.text) {
              text = content.text;
            }
            // Format 3: Check if parts exist but might be empty (newer models sometimes have different structure)
            else if (content.parts && content.parts.length > 0) {
              // Try to find text in any part
              for (const part of content.parts) {
                if (part.text) {
                  text = part.text;
                  break;
                }
              }
            }

            if (text) {
              logger.info(`✅ Successfully generated content using ${version}/${cleanModel}`);
              return text;
            }
            logger.warn(`Unexpected response format from ${version}/${cleanModel}:`, JSON.stringify(data.candidates[0].content).substring(0, 200));
            continue;
          } else {
            logger.warn(`Unexpected response format from ${version}/${cleanModel}`);
            continue;
          }
        } catch (error) {
          // If it's a network error or auth error, throw it immediately
          if (error.message.includes('Invalid API key') || error.message.includes('401') || error.message.includes('403')) {
            throw error;
          }

          // For 404 or other errors, try next model/version
          if (error.message.includes('404') || error.message.includes('not found')) {
            errors.push(`${version}/${model}: ${error.message}`);
            continue;
          }

          // Log and continue for other errors
          const errorInfo = `${version}/${model}: ${error.message}`;
          logger.warn(`Error: ${errorInfo}`);
          errors.push(errorInfo);
          continue;
        }
      }
    }

    // Check if all errors are quota-related
    const quotaErrors = errors.filter((e) => e.includes('429') || e.toLowerCase().includes('quota'));
    if (quotaErrors.length > 0 && quotaErrors.length === errors.length) {
      throw new Error(
        'API quota exceeded. You have exceeded your current quota for all models. '
        + 'Please check your plan and billing details at https://ai.google.dev/gemini-api/pricing '
        + 'or wait for your quota to reset. '
        + 'Free tier quotas typically reset daily or monthly.',
      );
    }

    // If we get here, all models/versions failed
    const errorSummary = errors.length > 0
      ? `\n\nErrors encountered:\n${errors.slice(0, 5).map((e, i) => `${i + 1}. ${e}`).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : ''}`
      : '';

    throw new Error(
      'Unable to generate content. All models and API versions returned errors. '
      + 'Please check: 1) API key is valid, 2) Generative AI API is enabled, '
      + `3) Get a new key from https://makersuite.google.com/app/apikey${
        errorSummary}`,
    );
  }

  /**
   * Generate package content
   * @param {string} title - Package title
   * @param {object} additionalInfo - Additional package info
   * @returns {Promise<object>} Generated content
   */
  async generatePackageContent(title, additionalInfo = {}) {
    const { destination, duration, category } = additionalInfo;

    let prompt = `Generate a comprehensive travel package description for: "${title}"\n\n`;

    if (destination) {
      prompt += `Destination: ${destination}\n`;
    }
    if (duration) {
      prompt += `Duration: ${duration}\n`;
    }
    if (category) {
      prompt += `Category: ${category}\n`;
    }

    prompt += `\nPlease provide a JSON response with the following structure:
{
  "description": "A detailed 2-3 paragraph description of the package",
  "highlights": ["Highlight 1", "Highlight 2", "Highlight 3", "Highlight 4", "Highlight 5"],
  "inclusions": ["Inclusion 1", "Inclusion 2", "Inclusion 3", "Inclusion 4", "Inclusion 5"],
  "exclusions": ["Exclusion 1", "Exclusion 2", "Exclusion 3"]
}

Make the content engaging, professional, and suitable for a travel agency website.`;

    try {
      const response = await this.generateContent(prompt, {
        temperature: 0.8,
        maxTokens: 2000,
      });

      // Try to parse JSON from response
      let content;
      try {
        // Extract JSON from response if it's wrapped in markdown code blocks
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/```\s*([\s\S]*?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : response;
        content = JSON.parse(jsonString);
      } catch (parseError) {
        // If JSON parsing fails, create structured content from text
        logger.warn('Failed to parse JSON response, creating structured content from text');
        const lines = response.split('\n').filter((line) => line.trim());

        content = {
          description: lines.slice(0, 3).join(' ').substring(0, 500) || 'A wonderful travel package experience.',
          highlights: lines.slice(3, 8).filter((l) => l.trim().length > 0).map((l) => l.replace(/^[-*•]\s*/, '').trim()) || [
            'Expertly curated itinerary',
            'Comfortable accommodations',
            'Professional tour guides',
            'Memorable experiences',
            'Great value for money',
          ],
          inclusions: [
            'Accommodation',
            'Transportation',
            'Meals as specified',
            'Tour guide services',
            'Entrance fees',
          ],
          exclusions: [
            'International flights',
            'Personal expenses',
            'Travel insurance',
            'Visa fees',
          ],
        };
      }

      return content;
    } catch (error) {
      logger.error('Error generating package content:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new GeminiRestService();

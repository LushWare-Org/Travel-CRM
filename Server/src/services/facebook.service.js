import axios from 'axios';
import crypto from 'crypto';
import logger from '../config/logger.js';

/**
 * Facebook Service
 * Handles Facebook Graph API calls and webhook verification
 */
class FacebookService {
  /**
   * Verify webhook signature from Facebook
   * @param {string} signature - X-Hub-Signature-256 header value
   * @param {string} payload - Raw request body
   * @param {string} appSecret - Facebook App Secret
   * @returns {boolean} - True if signature is valid
   */
  static verifyWebhookSignature(signature, payload, appSecret) {
    if (!signature || !appSecret) {
      return false;
    }

    try {
      // Remove 'sha256=' prefix if present
      const receivedSignature = signature.replace('sha256=', '');
      
      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', appSecret)
        .update(payload)
        .digest('hex');

      // Compare signatures using constant-time comparison
      return crypto.timingSafeEqual(
        Buffer.from(receivedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Fetch lead data from Facebook Graph API
   * @param {string} leadgenId - Facebook leadgen ID
   * @param {string} accessToken - Facebook Page Access Token
   * @returns {Promise<Object>} - Lead data from Facebook
   */
  static async getLeadData(leadgenId, accessToken) {
    try {
      const graphApiUrl = `https://graph.facebook.com/v18.0/${leadgenId}`;
      
      const response = await axios.get(graphApiUrl, {
        params: {
          access_token: accessToken,
          fields: 'id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,form_name,field_data',
        },
        timeout: 10000, // 10 seconds timeout
      });

      if (response.data && response.data.error) {
        throw new Error(`Facebook API Error: ${response.data.error.message}`);
      }

      return response.data;
    } catch (error) {
      logger.error('Error fetching lead data from Facebook:', error);
      
      if (error.response) {
        throw new Error(
          `Facebook API Error: ${error.response.data?.error?.message || error.message}`
        );
      }
      
      throw new Error(`Failed to fetch lead data: ${error.message}`);
    }
  }

  /**
   * Extract field value from Facebook field_data array
   * @param {Array} fieldData - Facebook field_data array
   * @param {string} fieldName - Field name to extract
   * @returns {string|null} - Field value or null
   */
  static extractFieldValue(fieldData, fieldName) {
    if (!Array.isArray(fieldData)) {
      return null;
    }

    const field = fieldData.find((f) => f.name === fieldName);
    if (field && field.values && field.values.length > 0) {
      return field.values[0]; // Return first value
    }

    return null;
  }

  /**
   * Format phone number (remove special characters, keep digits and +)
   * @param {string} phone - Raw phone number
   * @returns {string|null} - Formatted phone number
   */
  static formatPhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove all characters except digits, +, and spaces
    const cleaned = phone.replace(/[^\d+\s]/g, '');
    
    // Remove extra spaces
    return cleaned.trim() || null;
  }
}

export default FacebookService;



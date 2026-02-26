import FacebookService from '../services/facebook.service.js';
import logger from '../config/logger.js';

/**
 * Maps Facebook Lead Ad data to Lead model format
 * @param {Object} facebookLeadData - Lead data from Facebook Graph API
 * @param {Object} options - Additional options (assignedTo, createdBy, etc.)
 * @returns {Object} - Mapped lead data for Lead model
 */
export const mapFacebookLeadToLeadModel = (facebookLeadData, options = {}) => {
  try {
    const { field_data } = facebookLeadData;

    // Extract common fields
    const fullName = FacebookService.extractFieldValue(field_data, 'full_name')
                     || `${FacebookService.extractFieldValue(field_data, 'first_name')} ${
                       FacebookService.extractFieldValue(field_data, 'last_name')}` || null;

    const email = FacebookService.extractFieldValue(field_data, 'email')
                  || FacebookService.extractFieldValue(field_data, 'email_address') || null;

    const phone = FacebookService.formatPhoneNumber(
      FacebookService.extractFieldValue(field_data, 'phone_number')
      || FacebookService.extractFieldValue(field_data, 'phone')
      || FacebookService.extractFieldValue(field_data, 'mobile_number'),
    );

    // Extract custom fields (these depend on your Facebook form setup)
    const destination = FacebookService.extractFieldValue(field_data, 'destination')
                       || FacebookService.extractFieldValue(field_data, 'travel_destination')
                       || FacebookService.extractFieldValue(field_data, 'where_do_you_want_to_go') || null;

    const travelDate = FacebookService.extractFieldValue(field_data, 'travel_date')
                       || FacebookService.extractFieldValue(field_data, 'departure_date')
                       || FacebookService.extractFieldValue(field_data, 'when_do_you_want_to_travel') || null;

    const numberOfTravelers = FacebookService.extractFieldValue(field_data, 'number_of_travelers')
                              || FacebookService.extractFieldValue(field_data, 'travelers')
                              || FacebookService.extractFieldValue(field_data, 'how_many_people') || null;

    const budget = FacebookService.extractFieldValue(field_data, 'budget')
                   || FacebookService.extractFieldValue(field_data, 'budget_range')
                   || FacebookService.extractFieldValue(field_data, 'what_is_your_budget') || null;

    const message = FacebookService.extractFieldValue(field_data, 'message')
                    || FacebookService.extractFieldValue(field_data, 'comments')
                    || FacebookService.extractFieldValue(field_data, 'additional_information')
                    || FacebookService.extractFieldValue(field_data, 'tell_us_more') || null;

    const city = FacebookService.extractFieldValue(field_data, 'city')
                 || FacebookService.extractFieldValue(field_data, 'location') || null;

    // Build lead object
    const leadData = {
      name: fullName?.trim() || null,
      email: email?.toLowerCase().trim() || null,
      phone: phone || null,
      whatsapp: phone || null, // Use same phone for WhatsApp
      city: city?.trim() || null,
      source: 'social-media',
      platform: 'Social Media',
      destination: destination?.trim() || null,
      message: message?.trim() || null,
      budget: budget?.trim() || null,
      leadDateTime: facebookLeadData.created_time
        ? new Date(facebookLeadData.created_time)
        : new Date(),
      status: 'new',
      priority: 'medium',
      assignmentMode: 'auto',
    };

    // Parse travel date if provided
    if (travelDate) {
      try {
        const parsedDate = new Date(travelDate);
        if (!isNaN(parsedDate.getTime())) {
          leadData.travelDate = parsedDate;
        }
      } catch (error) {
        logger.warn('Failed to parse travel date:', travelDate);
      }
    }

    // Parse number of travelers if provided
    if (numberOfTravelers) {
      const parsed = parseInt(numberOfTravelers, 10);
      if (!isNaN(parsed) && parsed > 0) {
        leadData.numberOfTravelers = parsed;
      }
    }

    // Add metadata from Facebook
    if (facebookLeadData.ad_name) {
      leadData.tags = [`Facebook Ad: ${facebookLeadData.ad_name}`];
    }

    // Add campaign information to remarks
    if (facebookLeadData.campaign_name || facebookLeadData.ad_name) {
      leadData.remarks = [{
        text: `Facebook Lead Ad - Campaign: ${facebookLeadData.campaign_name || 'N/A'}, Ad: ${facebookLeadData.ad_name || 'N/A'}`,
        date: new Date(),
        addedBy: options.createdBy || null,
      }];
    }

    // Add assigned user if provided
    if (options.assignedTo) {
      leadData.assignedTo = options.assignedTo;
      leadData.assignedBy = options.createdBy || null;
    }

    // Add created by user if provided
    if (options.createdBy) {
      leadData.createdBy = options.createdBy;
    }

    // Add Facebook lead ID for tracking (store in remarks or custom field)
    if (facebookLeadData.id) {
      if (!leadData.remarks) {
        leadData.remarks = [];
      }
      leadData.remarks.push({
        text: `Facebook Lead ID: ${facebookLeadData.id}`,
        date: new Date(),
        addedBy: options.createdBy || null,
      });
    }

    return leadData;
  } catch (error) {
    logger.error('Error mapping Facebook lead to Lead model:', error);
    throw new Error(`Failed to map Facebook lead data: ${error.message}`);
  }
};

/**
 * Check if lead already exists (duplicate detection)
 * @param {string} email - Lead email
 * @param {string} phone - Lead phone
 * @param {Date} createdTime - Facebook lead creation time
 * @param {Object} LeadModel - Lead mongoose model
 * @returns {Promise<Object|null>} - Existing lead or null
 */
export const checkDuplicateLead = async (email, phone, createdTime, LeadModel) => {
  try {
    // Check for duplicate within last 24 hours
    const twentyFourHoursAgo = new Date(createdTime.getTime() - 24 * 60 * 60 * 1000);

    const query = {
      $or: [],
      leadDateTime: { $gte: twentyFourHoursAgo },
    };

    if (email) {
      query.$or.push({ email: email.toLowerCase().trim() });
    }

    if (phone) {
      const formattedPhone = FacebookService.formatPhoneNumber(phone);
      if (formattedPhone) {
        query.$or.push({ phone: formattedPhone });
        query.$or.push({ whatsapp: formattedPhone });
      }
    }

    if (query.$or.length === 0) {
      return null;
    }

    const existingLead = await LeadModel.findOne(query)
      .sort({ leadDateTime: -1 })
      .limit(1);

    return existingLead;
  } catch (error) {
    logger.error('Error checking for duplicate lead:', error);
    return null;
  }
};

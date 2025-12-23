import FacebookService from "../services/facebook.service.js";
import logger from "../config/logger.js";

/**
 * Maps Facebook Lead Ad data to Lead model format
 * @param {Object} facebookLeadData - Lead data from Facebook Graph API
 * @param {Object} options - Additional options (assignedTo, createdBy, etc.)
 * @returns {Object} - Mapped lead data for Lead model
 */
export const mapFacebookLeadToLeadModel = (facebookLeadData, options = {}) => {
  const customAfield = FacebookService.extractFieldValue(field_data, "aaaa");
  if (customAfield) {
    leadData.remarks.push({
      text: `Custom field aaaa: ${customAfield}`,
      date: new Date(),
    });
  }
  try {
    const { field_data } = facebookLeadData;

    // 1. Extract common fields using your FacebookService helper
    const fullName =
      FacebookService.extractFieldValue(field_data, "full_name") ||
      FacebookService.extractFieldValue(field_data, "first_name") +
        " " +
        FacebookService.extractFieldValue(field_data, "last_name") ||
      null;

    const email =
      FacebookService.extractFieldValue(field_data, "email") ||
      FacebookService.extractFieldValue(field_data, "email_address") ||
      null;

    const phone = FacebookService.formatPhoneNumber(
      FacebookService.extractFieldValue(field_data, "phone_number") ||
        FacebookService.extractFieldValue(field_data, "phone") ||
        FacebookService.extractFieldValue(field_data, "mobile_number")
    );

    // 2. Extract custom travel-specific fields
    const destination =
      FacebookService.extractFieldValue(field_data, "destination") ||
      FacebookService.extractFieldValue(field_data, "travel_destination") ||
      FacebookService.extractFieldValue(
        field_data,
        "where_do_you_want_to_go"
      ) ||
      null;

    const travelDate =
      FacebookService.extractFieldValue(field_data, "travel_date") ||
      FacebookService.extractFieldValue(field_data, "departure_date") ||
      FacebookService.extractFieldValue(
        field_data,
        "when_do_you_want_to_travel"
      ) ||
      null;

    const numberOfTravelers =
      FacebookService.extractFieldValue(field_data, "number_of_travelers") ||
      FacebookService.extractFieldValue(field_data, "travelers") ||
      FacebookService.extractFieldValue(field_data, "how_many_people") ||
      null;

    const budget =
      FacebookService.extractFieldValue(field_data, "budget") ||
      FacebookService.extractFieldValue(field_data, "budget_range") ||
      FacebookService.extractFieldValue(field_data, "what_is_your_budget") ||
      null;

    const message =
      FacebookService.extractFieldValue(field_data, "message") ||
      FacebookService.extractFieldValue(field_data, "comments") ||
      FacebookService.extractFieldValue(field_data, "additional_information") ||
      FacebookService.extractFieldValue(field_data, "tell_us_more") ||
      null;

    const city =
      FacebookService.extractFieldValue(field_data, "city") ||
      FacebookService.extractFieldValue(field_data, "location") ||
      null;

    // 3. Build lead object - EXACT MATCH for your Mongoose Enum/Schema
    const leadData = {
      name: fullName?.trim() || "Facebook Lead",
      email: email?.toLowerCase().trim() || null,
      phone: phone || null,
      whatsapp: phone || null,
      city: city?.trim() || null,
      source: "social-media", // Exact match for Model Enum
      platform: "Social Media", // Exact match for Model Enum
      destination: destination?.trim() || null,
      message: message?.trim() || null,
      budget: budget?.trim() || null,
      leadDateTime: facebookLeadData.created_time
        ? new Date(facebookLeadData.created_time)
        : new Date(),
      status: "new", // Exact match for Model Enum
      priority: "medium", // Exact match for Model Enum
      assignmentMode: "auto", // Exact match for Model Enum
      tags: ["Facebook Ads"], // Clean array for your Model tags field
    };

    // 4. Handle Travel Date parsing
    if (travelDate) {
      try {
        const parsedDate = new Date(travelDate);
        if (!isNaN(parsedDate.getTime())) {
          leadData.travelDate = parsedDate;
        }
      } catch (error) {
        logger.warn("Failed to parse travel date:", travelDate);
      }
    }

    // 5. Handle Number of Travelers parsing
    if (numberOfTravelers) {
      const parsed = parseInt(numberOfTravelers, 10);
      if (!isNaN(parsed) && parsed > 0) {
        leadData.numberOfTravelers = parsed;
      }
    }

    // 6. Add Facebook Ad metadata to tags if available
    if (facebookLeadData.ad_name) {
      leadData.tags.push(`Ad: ${facebookLeadData.ad_name}`);
    }

    // 7. Initialize remarks with Campaign/Lead ID info
    leadData.remarks = [
      {
        text: `Facebook Lead Ad - Campaign: ${
          facebookLeadData.campaign_name || "N/A"
        }, Ad: ${facebookLeadData.ad_name || "N/A"}, Lead ID: ${
          facebookLeadData.id || "N/A"
        }`,
        date: new Date(),
        addedBy: options.createdBy || null,
      },
    ];

    // 8. Assign User if provided in options
    if (options.assignedTo) {
      leadData.assignedTo = options.assignedTo;
      leadData.assignedBy = options.createdBy || null;
    }

    if (options.createdBy) {
      leadData.createdBy = options.createdBy;
    }

    return leadData;
  } catch (error) {
    logger.error("Error mapping Facebook lead to Lead model:", error);
    throw new Error(`Failed to map Facebook lead data: ${error.message}`);
  }
};

/**
 * Check if lead already exists (duplicate detection)
 * No changes needed here, your current logic is solid.
 */
export const checkDuplicateLead = async (
  email,
  phone,
  createdTime,
  LeadModel
) => {
  try {
    const twentyFourHoursAgo = new Date(
      createdTime.getTime() - 24 * 60 * 60 * 1000
    );

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

    if (query.$or.length === 0) return null;

    return await LeadModel.findOne(query).sort({ leadDateTime: -1 });
  } catch (error) {
    logger.error("Error checking for duplicate lead:", error);
    return null;
  }
};

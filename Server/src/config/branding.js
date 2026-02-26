/**
 * Centralized Branding Configuration
 *
 * This file contains all company-specific branding information.
 * All values are read from environment variables with sensible defaults.
 *
 * To customize for a new customer, update the corresponding environment variables.
 */

export const BRANDING = {
  // ==========================================
  // Company Information
  // ==========================================
  company: {
    name: process.env.COMPANY_NAME || 'Travel CRM',
    shortName: process.env.COMPANY_SHORT_NAME || 'CRM',
    tagline: process.env.COMPANY_TAGLINE || 'Your Travel Partner',
    legalName: process.env.COMPANY_LEGAL_NAME || 'Travel CRM Solutions Pvt. Ltd.',
  },

  // ==========================================
  // Contact Information
  // ==========================================
  contact: {
    email: process.env.COMPANY_EMAIL || 'info@example.com',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
    salesEmail: process.env.SALES_EMAIL || 'sales@example.com',
    phone: process.env.COMPANY_PHONE || '+1-800-000-0000',
    whatsapp: process.env.COMPANY_WHATSAPP || '',
  },

  // ==========================================
  // Web & URLs
  // ==========================================
  urls: {
    website: process.env.COMPANY_WEBSITE || 'https://www.example.com',
    clientPortal: process.env.CLIENT_URL || 'http://localhost:5173',
    managementPortal: process.env.MANAGEMENT_URL || 'http://localhost:5174',
  },

  // ==========================================
  // Address Information
  // ==========================================
  address: {
    street: process.env.COMPANY_ADDRESS_STREET || '',
    city: process.env.COMPANY_CITY || '',
    state: process.env.COMPANY_STATE || '',
    postalCode: process.env.COMPANY_POSTAL_CODE || '',
    country: process.env.COMPANY_COUNTRY || '',
    full: process.env.COMPANY_FULL_ADDRESS || '',
  },

  // ==========================================
  // Bank/Payment Details
  // ==========================================
  payment: {
    bankName: process.env.BANK_NAME || '',
    accountName: process.env.BANK_ACCOUNT_NAME || '',
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || '',
    ifscCode: process.env.BANK_IFSC_CODE || '',
    swiftCode: process.env.BANK_SWIFT_CODE || '',
    branch: process.env.BANK_BRANCH || '',
    accountType: process.env.BANK_ACCOUNT_TYPE || 'Current Account',
    upiId: process.env.UPI_ID || '',
    paymentPhone: process.env.PAYMENT_PHONE || '',
  },

  // ==========================================
  // Social Media Links
  // ==========================================
  social: {
    facebook: process.env.FACEBOOK_URL || '',
    instagram: process.env.INSTAGRAM_URL || '',
    twitter: process.env.TWITTER_URL || '',
    linkedin: process.env.LINKEDIN_URL || '',
    youtube: process.env.YOUTUBE_URL || '',
  },

  // ==========================================
  // Legal Information
  // ==========================================
  legal: {
    jurisdiction: process.env.LEGAL_JURISDICTION || 'India',
    courtLocation: process.env.LEGAL_COURT_LOCATION || '',
    registrationNumber: process.env.COMPANY_REGISTRATION_NO || '',
    gstNumber: process.env.GST_NUMBER || '',
    panNumber: process.env.PAN_NUMBER || '',
  },

  // ==========================================
  // Email Configuration
  // ==========================================
  email: {
    fromName: process.env.EMAIL_FROM_NAME || 'Travel CRM',
    fromEmail: process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com',
    replyTo: process.env.EMAIL_REPLY_TO || '',
  },

  // ==========================================
  // Admin Default Credentials
  // ==========================================
  admin: {
    name: process.env.ADMIN_NAME || 'System Administrator',
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    phone: process.env.ADMIN_PHONE || '',
  },
};

/**
 * Helper function to get the full company contact info string
 */
export const getContactInfo = () => {
  const { contact, urls } = BRANDING;
  return `Contact us: ${contact.email} | ${contact.phone}`;
};

/**
 * Helper function to get the email "from" string
 */
export const getEmailFrom = () => {
  const { email, company } = BRANDING;
  return `${email.fromName || company.name} <${email.fromEmail}>`;
};

/**
 * Helper function to get formatted bank details for display
 */
export const getBankDetails = () => {
  const { payment } = BRANDING;
  return {
    bankName: payment.bankName,
    accountName: payment.accountName,
    accountNumber: payment.accountNumber,
    ifscCode: payment.ifscCode,
    branch: payment.branch,
    accountType: payment.accountType,
    upiId: payment.upiId,
    phone: payment.paymentPhone,
  };
};

/**
 * Helper function to get social media links (only non-empty ones)
 */
export const getSocialLinks = () => {
  const { social } = BRANDING;
  return Object.entries(social)
    .filter(([, value]) => value)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
};

/**
 * Get copyright text
 */
export const getCopyrightText = (year = new Date().getFullYear()) => `© ${year} ${BRANDING.company.name}. All rights reserved.`;

export default BRANDING;

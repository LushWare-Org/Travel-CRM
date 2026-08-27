/**
 * Centralized Branding Configuration for Client App
 *
 * This file contains all company-specific branding information.
 * All values are read from Vite environment variables with sensible defaults.
 *
 * To customize for a new customer, update the corresponding environment variables
 * in your .env or .env.local file (prefixed with VITE_).
 */

const BRANDING = {
  company: {
    name: import.meta.env.VITE_COMPANY_NAME || 'Your Company',
    shortName: import.meta.env.VITE_COMPANY_SHORT_NAME || 'YC',
    tagline: import.meta.env.VITE_COMPANY_TAGLINE || 'Your Travel Partner',
    legalName: import.meta.env.VITE_COMPANY_LEGAL_NAME || 'Your Company',
    foundedYear: Number(import.meta.env.VITE_COMPANY_FOUNDED_YEAR) || new Date().getFullYear(),
  },
  contact: {
    email: import.meta.env.VITE_COMPANY_EMAIL || 'info@example.com',
    supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@example.com',
    phone: import.meta.env.VITE_COMPANY_PHONE || '+1-800-000-0000',
    whatsapp: (import.meta.env.VITE_COMPANY_WHATSAPP || '+1-800-000-0000').replace(/[^\d+]/g, ''),
    address: import.meta.env.VITE_COMPANY_ADDRESS || '',
    officeHours: import.meta.env.VITE_COMPANY_OFFICE_HOURS || 'Mon-Fri, 9AM - 6PM',
  },
  urls: {
    website: import.meta.env.VITE_COMPANY_WEBSITE || 'https://www.example.com',
  },
  social: {
    facebook: import.meta.env.VITE_SOCIAL_FACEBOOK || '',
    instagram: import.meta.env.VITE_SOCIAL_INSTAGRAM || '',
    twitter: import.meta.env.VITE_SOCIAL_TWITTER || '',
    youtube: import.meta.env.VITE_SOCIAL_YOUTUBE || '',
  },
  legal: {
    privacyUrl: import.meta.env.VITE_LEGAL_PRIVACY_URL || '',
    termsUrl: import.meta.env.VITE_LEGAL_TERMS_URL || '',
    cancellationUrl: import.meta.env.VITE_LEGAL_CANCELLATION_URL || '',
  },
  integrations: {
    elfsightAppId: import.meta.env.VITE_ELFSIGHT_APP_ID || '',
    imgbbApiKey: import.meta.env.VITE_IMGBB_API_KEY || '',
    imgbbUploadUrl: 'https://api.imgbb.com/1/upload',
  },
  pdf: {
    company: import.meta.env.VITE_COMPANY_NAME || 'Your Company',
    tagline: import.meta.env.VITE_COMPANY_TAGLINE || 'Your Travel Partner',
    email: import.meta.env.VITE_COMPANY_EMAIL || 'info@example.com',
    phone: import.meta.env.VITE_COMPANY_PHONE || '+1-800-000-0000',
    website: import.meta.env.VITE_COMPANY_WEBSITE || 'https://www.example.com',
    logoPath: '/logo.png',
  },
};

export const getWhatsAppUrl = (message) => {
  const text = encodeURIComponent(message || `Hello! I'm interested in your holiday packages.`);
  return `https://wa.me/${BRANDING.contact.whatsapp.replace(/^\+/, '')}?text=${text}`;
};

export const getCopyrightText = (year = new Date().getFullYear()) =>
  `© ${year} ${BRANDING.company.name}. All rights reserved.`;

export default BRANDING;

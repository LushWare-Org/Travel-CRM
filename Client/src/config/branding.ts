/**
 * Centralized Branding Configuration for Client App
 *
 * This file contains all company-specific branding information.
 * All values are read from Vite environment variables with sensible defaults.
 *
 * To customize for a new customer, update the corresponding environment variables
 * in your .env or .env.local file (prefixed with VITE_).
 */

export interface Branding {
  company: {
    name: string;
    shortName: string;
    tagline: string;
    legalName: string;
    foundedYear: number;
    logoPath: string;
  };
  contact: {
    email: string;
    supportEmail: string;
    phone: string;
    whatsapp: string;
    address: string;
    officeHours: string;
  };
  urls: {
    website: string;
  };
  social: {
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  };
  legal: {
    privacyUrl: string;
    termsUrl: string;
    cancellationUrl: string;
  };
  integrations: {
    elfsightAppId: string;
    imgbbApiKey: string;
    imgbbUploadUrl: string;
  };
  pdf: {
    company: string;
    tagline: string;
    email: string;
    phone: string;
    website: string;
    logoPath: string;
  };
}

const logoPath = import.meta.env.VITE_LOGO_PATH || '/logo.png';

const BRANDING: Branding = {
  company: {
    name: import.meta.env.VITE_COMPANY_NAME || 'Your Company',
    shortName: import.meta.env.VITE_COMPANY_SHORT_NAME || 'YC',
    tagline: import.meta.env.VITE_COMPANY_TAGLINE || 'Your Travel Partner',
    legalName: import.meta.env.VITE_COMPANY_LEGAL_NAME || 'Your Company',
    foundedYear: Number(import.meta.env.VITE_COMPANY_FOUNDED_YEAR) || new Date().getFullYear(),
    logoPath,
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
    logoPath,
  },
};

export const getWhatsAppUrl = (message?: string): string => {
  const text = encodeURIComponent(message || `Hello! I'm interested in your holiday packages.`);
  return `https://wa.me/${BRANDING.contact.whatsapp.replace(/^\+/, '')}?text=${text}`;
};

export const getCopyrightText = (year: number = new Date().getFullYear()): string =>
  `© ${year} ${BRANDING.company.name}. All rights reserved.`;

/**
 * Default SEO description, used as the runtime fallback for the <meta
 * name="description"> tag applied by `applyBranding()` below.
 */
export const META_DESCRIPTION =
  import.meta.env.VITE_META_DESCRIPTION ||
  `${BRANDING.company.name} — sustainable, expertly curated journeys around the world.`;

/**
 * Sets the document title, meta description, and favicon from `BRANDING`
 * at runtime, in JS, instead of relying on Vite's `index.html` %VITE_X%
 * placeholder substitution.
 *
 * Why: Vite only resolves `%VITE_X%` in index.html when the matching env
 * var is actually defined at build time, with NO fallback for a missing
 * one — it ships the literal, unresolved `%VITE_X%` string into the built
 * HTML instead (confirmed: a production build run without `VITE_COMPANY_NAME`
 * set produced `<title>%VITE_COMPANY_NAME%</title>` verbatim). Every other
 * branding value above already guards against this with `|| 'fallback'`;
 * the HTML placeholders had no equivalent guard. Call this once, before
 * first paint, so head tags always resolve to a real value.
 */
export const applyBranding = (): void => {
  document.title = BRANDING.company.name;

  let descriptionTag = document.querySelector('meta[name="description"]');
  if (!descriptionTag) {
    descriptionTag = document.createElement('meta');
    descriptionTag.setAttribute('name', 'description');
    document.head.appendChild(descriptionTag);
  }
  descriptionTag.setAttribute('content', META_DESCRIPTION);

  const faviconTag = document.querySelector('link[rel="icon"]');
  if (faviconTag) {
    faviconTag.setAttribute('href', BRANDING.company.logoPath);
  }
};


export default BRANDING;

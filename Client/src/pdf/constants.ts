/**
 * Utility constants and configuration
 */
import BRANDING from '../config/branding';

export const PDF_CONFIG = {
  pageWidth: null, // Set dynamically
  pageHeight: null, // Set dynamically
  margin: 20,
  lineHeight: 7,
  company: BRANDING.pdf.company,
  tagline: BRANDING.pdf.tagline,
  contact: `Contact us: ${BRANDING.pdf.email} | ${BRANDING.pdf.phone}`,
  email: BRANDING.pdf.email,
  phone: BRANDING.pdf.phone,
  website: BRANDING.pdf.website,
};

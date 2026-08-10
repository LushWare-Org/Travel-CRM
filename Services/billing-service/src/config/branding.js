/**
 * Branding configuration for billing documents (quotation PDFs, emails).
 * All values come from environment variables with safe defaults so the
 * service runs without deployment-specific config.
 */

export const BRANDING = {
  company: {
    name: process.env.COMPANY_NAME || 'Travel CRM',
    shortName: process.env.COMPANY_SHORT_NAME || 'CRM',
    tagline: process.env.COMPANY_TAGLINE || 'Your Travel Partner',
    legalName: process.env.COMPANY_LEGAL_NAME || 'Travel CRM Solutions',
  },
  contact: {
    email: process.env.COMPANY_EMAIL || 'info@example.com',
    salesEmail: process.env.SALES_EMAIL || 'sales@example.com',
    phone: process.env.COMPANY_PHONE || '+1-800-000-0000',
    whatsapp: process.env.COMPANY_WHATSAPP || '',
  },
  urls: {
    website: process.env.COMPANY_WEBSITE || 'https://www.example.com',
    logo: process.env.COMPANY_LOGO || '', // local path or absolute file path; empty → text wordmark
  },

  // Visual theme for the quotation PDF. Neutral placeholder palette — override
  // per deployment. Kept here so the generator imports a single source of truth.
  theme: {
    ink: process.env.BRAND_INK || '#1F2937',
    muted: process.env.BRAND_MUTED || '#64748B',
    brand: process.env.BRAND_ACCENT || '#F5A623', // primary accent (rules, headers, footer band)
    brandDark: process.env.BRAND_ACCENT_DARK || '#D98A0B',
    slate50: '#F8FAFC',
    slate200: '#E2E8F0',
    cream: '#FDF3D8', // bank-details card background
    white: '#FFFFFF',
    // Rotating avatar/chip accents for review cards.
    accents: ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'],
  },

  // Static, brand-level marketing content shown on the PDF. Generic defaults —
  // replace with real copy per deployment. Not part of the quotation snapshot.
  content: {
    ratingTagline:
      process.env.QUOTATION_RATING_TAGLINE || 'Rated 4.9  |  10k+ Travellers  |  30+ Destinations',
    signatoryName: process.env.QUOTATION_SIGNATORY || process.env.COMPANY_NAME || 'Travel CRM',
    paymentMethods: ['Bank Transfer', 'UPI', 'Visa', 'Mastercard', 'Cards', 'Wallets'],
    reviews: [
      { name: 'A. Traveller', rating: 5, text: 'Excellent service — the whole trip was planned exactly as we wanted.' },
      { name: 'B. Explorer', rating: 5, text: 'Great value for money and the support team was available whenever we needed.' },
      { name: 'C. Wanderer', rating: 5, text: 'Well-planned itinerary and comfortable stays throughout. Highly recommended.' },
    ],
    defaultTerms: process.env.QUOTATION_DEFAULT_TERMS ||
      'This is a quotation only; no reservation has been made at the time of this request. ' +
      'Rates are subject to availability and verification at the time of confirmed booking, and ' +
      'may be revised if package requirements change. Images are for representation only.',
    cancellationPolicy: process.env.QUOTATION_CANCELLATION_POLICY ||
      'Cancellation charges apply from the date we receive written notice. Booking amounts may be ' +
      'non-refundable once a package is confirmed. Rooms and flights are subject to availability.',
  },

  payment: {
    bankName: process.env.BANK_NAME || '',
    accountName: process.env.BANK_ACCOUNT_NAME || '',
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || '',
    ifscCode: process.env.BANK_IFSC_CODE || '',
    swiftCode: process.env.BANK_SWIFT_CODE || '',
    branch: process.env.BANK_BRANCH || '',
    accountType: process.env.BANK_ACCOUNT_TYPE || 'Current Account',
    upiId: process.env.UPI_ID || '',
  },
};

export const getBankDetails = () => {
  const { payment, company } = BRANDING;
  return {
    bankName: payment.bankName,
    accountName: payment.accountName || company.name,
    accountNumber: payment.accountNumber,
    ifscCode: payment.ifscCode,
    swiftCode: payment.swiftCode,
    branch: payment.branch,
    accountType: payment.accountType,
    upiId: payment.upiId,
  };
};

/** True when at least a bank name + account number are configured. */
export const hasBankDetails = () => Boolean(BRANDING.payment.bankName && BRANDING.payment.accountNumber);

export const getEmailFrom = () =>
  process.env.EMAIL_FROM || `${BRANDING.company.name} <${BRANDING.contact.email}>`;

export default BRANDING;

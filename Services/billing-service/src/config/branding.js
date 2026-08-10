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

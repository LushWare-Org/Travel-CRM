# CRM Generalization Implementation Plan

## Objective
Remove all "Trip Sky Way" branding and create a centralized configuration system that allows easy customization for different customers.

## Phase 1: Create Centralized Branding Configuration

### 1.1 Server Configuration (`Server/src/config/branding.js`)
Create a new configuration file that reads from environment variables:

```javascript
export const BRANDING = {
  // Company Information
  companyName: process.env.COMPANY_NAME || 'Your Company',
  companyShortName: process.env.COMPANY_SHORT_NAME || 'Company',
  tagline: process.env.COMPANY_TAGLINE || 'Your Travel Partner',
  
  // Contact Information
  email: process.env.COMPANY_EMAIL || 'info@yourcompany.com',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@yourcompany.com',
  phone: process.env.COMPANY_PHONE || '+1-800-000-0000',
  website: process.env.COMPANY_WEBSITE || 'https://www.yourcompany.com',
  
  // Address
  address: process.env.COMPANY_ADDRESS || 'Your Address',
  city: process.env.COMPANY_CITY || 'Your City',
  country: process.env.COMPANY_COUNTRY || 'Your Country',
  
  // Bank/Payment Details
  bankName: process.env.BANK_NAME || 'Your Bank',
  accountName: process.env.BANK_ACCOUNT_NAME || 'Your Account',
  accountNumber: process.env.BANK_ACCOUNT_NUMBER || '0000000000',
  ifscCode: process.env.BANK_IFSC_CODE || 'XXXX0000000',
  branch: process.env.BANK_BRANCH || 'Main Branch',
  upiId: process.env.UPI_ID || 'yourcompany@upi',
  
  // Social Media
  facebookUrl: process.env.FACEBOOK_URL || '',
  instagramUrl: process.env.INSTAGRAM_URL || '',
  twitterUrl: process.env.TWITTER_URL || '',
  linkedinUrl: process.env.LINKEDIN_URL || '',
  
  // Legal
  jurisdiction: process.env.LEGAL_JURISDICTION || 'Your Jurisdiction',
};
```

### 1.2 Frontend Configuration (`Management/src/config/branding.js`)
Create a matching frontend configuration:

```javascript
export const BRANDING = {
  companyName: import.meta.env.VITE_COMPANY_NAME || 'Your Company',
  companyShortName: import.meta.env.VITE_COMPANY_SHORT_NAME || 'Company',
  tagline: import.meta.env.VITE_COMPANY_TAGLINE || 'Your Travel Partner',
  email: import.meta.env.VITE_COMPANY_EMAIL || 'info@yourcompany.com',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@yourcompany.com',
  phone: import.meta.env.VITE_COMPANY_PHONE || '+1-800-000-0000',
  website: import.meta.env.VITE_COMPANY_WEBSITE || 'https://www.yourcompany.com',
};
```

---

## Phase 2: Update Server Files

### Files to Update:

| File | Changes Required |
|------|------------------|
| `Server/package.json` | Update description & author |
| `Server/.env.example` | Add branding variables, update defaults |
| `Server/src/utils/emailService.js` | Replace all hardcoded branding with config |
| `Server/src/utils/billingPDFGenerator.js` | Replace company info, payment details, terms |
| `Server/src/utils/voucherPDFGenerator.js` | Replace company name & contact |
| `Server/src/utils/pdfGenerator.js` | Replace company branding |
| `Server/src/utils/analyticsPDFGenerator.js` | Replace company name |
| `Server/src/utils/paymentHistoryPDFGenerator.js` | Replace company branding |
| `Server/src/services/itinerary.service.js` | Replace company info & social links |
| `Server/src/scripts/seed.js` | Make emails configurable |
| `Server/src/scripts/createAdmin.js` | Use env variable for admin email |

---

## Phase 3: Update Management Frontend Files

### Files to Update:

| File | Changes Required |
|------|------------------|
| `Management/index.html` | Dynamic title (or generic) |
| `Management/.env.example` | Add branding variables |
| `Management/src/pages/Sidebar.jsx` | Use branding config |
| `Management/src/pages/Login.jsx` | Remove test credentials, use config |
| `Management/src/pages/SalesRepLogin.jsx` | Use branding config |
| `Management/src/pages/SalesRepLoginOTP.jsx` | Use branding config |
| `Management/src/features/itinerary/utils/constants.js` | Use branding config for PDF_CONFIG |
| `Management/src/features/lead-management/components/*Dialog.jsx` | Use branding for messages |
| `Management/src/features/user-management/components/*/` | Update email content |

---

## Phase 4: Update Environment Templates

### Server `.env.example` additions:
```env
# Company Branding
COMPANY_NAME=Your Company Name
COMPANY_SHORT_NAME=YCN
COMPANY_TAGLINE=Your Travel Partner
COMPANY_EMAIL=info@yourcompany.com
SUPPORT_EMAIL=support@yourcompany.com
COMPANY_PHONE=+1-800-000-0000
COMPANY_WEBSITE=https://www.yourcompany.com
COMPANY_ADDRESS=Your Address
COMPANY_CITY=Your City
COMPANY_COUNTRY=Your Country

# Bank Details
BANK_NAME=Your Bank
BANK_ACCOUNT_NAME=Your Company
BANK_ACCOUNT_NUMBER=0000000000
BANK_IFSC_CODE=XXXX0000000
BANK_BRANCH=Main Branch
UPI_ID=yourcompany@upi

# Social Media (optional)
FACEBOOK_URL=
INSTAGRAM_URL=
TWITTER_URL=
LINKEDIN_URL=

# Legal
LEGAL_JURISDICTION=Your Jurisdiction
```

### Management `.env.example` additions:
```env
# Company Branding
VITE_COMPANY_NAME=Your Company Name
VITE_COMPANY_SHORT_NAME=YCN
VITE_COMPANY_TAGLINE=Your Travel Partner
VITE_COMPANY_EMAIL=info@yourcompany.com
VITE_SUPPORT_EMAIL=support@yourcompany.com
VITE_COMPANY_PHONE=+1-800-000-0000
VITE_COMPANY_WEBSITE=https://www.yourcompany.com
```

---

## Phase 5: Remove/Generalize Specific Content

### Items to Remove or Make Generic:
1. **Test credentials display** in Login.jsx (remove or make env-controlled)
2. **Hardcoded customer reviews** in billingPDFGenerator.js (make configurable or remove)
3. **Specific bank details** (move to env)
4. **Specific employee names** in seed.js (make generic)
5. **Logo files** - ensure logo paths are configurable

---

## Implementation Order

1. ✅ Create branding config files (Server & Management)
2. ✅ Update .env.example files with new variables
3. ✅ Update emailService.js (highest usage)
4. ✅ Update billingPDFGenerator.js (complex, has payment info)
5. ✅ Update voucherPDFGenerator.js
6. ✅ Update other PDF generators
7. ✅ Update itinerary.service.js
8. ✅ Update Management frontend components
9. ✅ Update seed scripts
10. ✅ Test all changes
11. ✅ Update documentation

---

## Testing Checklist

- [ ] Login page displays correct company name
- [ ] Sidebar shows correct branding
- [ ] Emails sent have correct company info in header/footer
- [ ] Quotation PDFs show correct company details
- [ ] Invoice PDFs show correct payment information
- [ ] Voucher PDFs show correct branding
- [ ] Analytics reports have correct copyright
- [ ] All social media links are configurable
- [ ] Terms & conditions reference correct company

---

## Notes

- **Logo handling**: The logo file should be replaceable. Consider making the logo path configurable or creating an upload mechanism.
- **Color scheme**: Consider adding primary/secondary color configuration for complete customization.
- **Documentation**: Update README files to explain the configuration process.

---

Created: $(date)
Last Updated: $(date)

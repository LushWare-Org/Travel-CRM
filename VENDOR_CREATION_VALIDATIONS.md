# Vendor Creation Form - Validation Requirements

## Overview
When creating a new vendor, the following fields and validations are required. The validation happens in multiple layers:
1. **Frontend (Client-side)** - User feedback
2. **Service layer** - Data validation
3. **Backend (Server-side)** - Final validation with Joi schemas

---

## Required Fields and Validations

### 1. **Basic Information**

#### Name (Contact Person Name)
- **Required**: ✅ Yes
- **Type**: String
- **Frontend Validation**:
  - Must not be empty
  - Minimum 2 characters
  - Maximum 100 characters
- **Backend Validation** (Joi):
  - min(2), max(50)
  - Must be trimmed

#### Email
- **Required**: ✅ Yes
- **Type**: String (Email format)
- **Frontend Validation**:
  - Must be a valid email format (regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- **Backend Validation** (Joi):
  - `.email()` - Must be valid email
  - `.lowercase()` - Converts to lowercase
  - Must not be empty

#### Phone
- **Required**: ✅ Yes
- **Type**: String
- **Frontend Validation**:
  - Extract digits only
  - Must have 7-15 digits (can include +, spaces, (), or - separators)
- **Backend Validation** (Joi):
  - Pattern: `/^[\+]?[\s()\-]*[0-9][\s()\-0-9]*$/`
  - Custom validation: digits count must be 7-15
  - Accepts: +1 (555) 123-4567 format

#### Business Name
- **Required**: ✅ Yes
- **Type**: String
- **Frontend Validation**:
  - Must not be empty
  - Minimum 2 characters
- **Backend Validation** (Joi):
  - min(2), max(100)
  - Must be trimmed

#### Service Type
- **Required**: ✅ Yes
- **Type**: Select dropdown
- **Valid Options**:
  - `hotel` - Hotel
  - `transport` - Transportation
  - `activity` - Activity
  - `restaurant` - Restaurant
  - `guide` - Tour Guide
  - `other` - Other
- **Backend Validation** (Joi):
  - Must be one of the above values

#### Business Registration Number
- **Required**: ✅ Yes
- **Type**: String
- **Frontend Validation**:
  - Must not be empty
- **Backend Validation** (Joi):
  - Must be a string
  - Required field

#### Tax Identification Number
- **Required**: ✅ Yes
- **Type**: String
- **Frontend Validation**:
  - Must not be empty
- **Backend Validation** (Joi):
  - Must be a string
  - Required field

---

### 2. **Address Information** (Optional but section is required)

#### Street Address
- **Required**: ❌ No
- **Type**: String
- **Backend Validation** (Joi):
  - Optional, trimmed if provided

#### City
- **Required**: ❌ No
- **Type**: String
- **Backend Validation** (Joi):
  - Optional, trimmed if provided

#### State
- **Required**: ❌ No
- **Type**: String
- **Backend Validation** (Joi):
  - Optional, trimmed if provided

#### ZIP Code
- **Required**: ❌ No
- **Type**: String
- **Backend Validation** (Joi):
  - Optional, trimmed if provided

#### Country
- **Required**: ❌ No
- **Type**: String
- **Backend Validation** (Joi):
  - Optional, trimmed if provided

---

### 3. **Contact Person Details** (Section required, fields optional)

#### Contact Person Name
- **Required**: ❌ No
- **Type**: String
- **Backend Validation** (Joi):
  - Optional, trimmed if provided

#### Contact Person Phone
- **Required**: ❌ No
- **Type**: String
- **Backend Validation** (Joi):
  - Pattern: `/^[\+]?[\s()\-]*[0-9][\s()\-0-9]*$/`
  - Custom validation: digits count must be 7-15 (if provided)
  - Accepts formatted phone numbers

#### Contact Person Email
- **Required**: ❌ No
- **Type**: String (Email format)
- **Backend Validation** (Joi):
  - `.email()` - Must be valid email if provided
  - `.lowercase()` - Converts to lowercase

#### Contact Person Designation
- **Required**: ❌ No
- **Type**: String
- **Backend Validation** (Joi):
  - Optional, trimmed if provided

---

### 4. **Bank Details** (Section required, fields optional)

#### Account Name
- **Required**: ❌ No
- **Type**: String
- **Backend Validation** (Joi):
  - Optional, trimmed if provided

#### Account Number
- **Required**: ❌ No
- **Type**: String
- **Backend Validation** (Joi):
  - Optional, trimmed if provided

#### Bank Name
- **Required**: ❌ No
- **Type**: String
- **Backend Validation** (Joi):
  - Optional, trimmed if provided

#### Branch Name
- **Required**: ❌ No
- **Type**: String
- **Backend Validation** (Joi):
  - Optional, trimmed if provided

#### IFSC Code
- **Required**: ❌ No
- **Type**: String
- **Backend Validation** (Joi):
  - Optional, trimmed if provided

#### SWIFT Code (International)
- **Required**: ❌ No
- **Type**: String
- **Backend Validation** (Joi):
  - Optional, trimmed if provided

---

## Summary of Required Fields for Vendor Creation

| Field | Required | Type | Min Length | Max Length |
|-------|----------|------|-----------|-----------|
| Name | ✅ | String | 2 | 50 |
| Email | ✅ | Email | - | - |
| Phone | ✅ | String | 7 digits | 15 digits |
| Business Name | ✅ | String | 2 | 100 |
| Service Type | ✅ | Select | - | - |
| Registration Number | ✅ | String | - | - |
| Tax ID | ✅ | String | - | - |
| Address Object | ✅ | Object | - | - |
| Contact Person Object | ✅ | Object | - | - |
| Bank Details Object | ✅ | Object | - | - |

---

## Validation Error Handling

### Frontend Validation
- Checked in `vendorService.validateVendorData(formData)` method
- Returns error object with field-specific error messages
- Shows inline error messages in the form

### Backend Validation
- Performed by Joi schema in `vendor.validator.js`
- If validation fails, returns HTTP 400 with detailed error information
- Error response format:
  ```json
  {
    "status": "fail",
    "message": "Validation failed",
    "details": {
      "validation": {
        "name": ["Name must be at least 2 characters"],
        "email": ["Please provide a valid email address"]
      }
    }
  }
  ```

---

## Common Validation Errors and Solutions

### Phone Number Validation Failures
**Error**: "Phone number must be between 7-15 digits"

**Solutions**:
- ✅ Use formats like: `+1 (555) 123-4567`
- ✅ Use formats like: `555-123-4567`
- ✅ Use formats like: `5551234567`
- ❌ Don't use: `555-123` (only 5 digits)
- ❌ Don't use: `call me at 555` (letters and spaces only)

### Email Validation Failures
**Error**: "Please provide a valid email address"

**Solutions**:
- ✅ Use format: `vendor@company.com`
- ✅ Use format: `contact.name@business.co.uk`
- ❌ Don't use: `vendor@company` (missing domain extension)
- ❌ Don't use: `vendor company.com` (missing @)

### Required Field Failures
**Error**: "[Field name] is required"

**Solution**:
- Fill in all required fields marked with red asterisk (*)
- Required fields: Name, Email, Phone, Business Name, Service Type, Registration Number, Tax ID

---

## Backend Schema Definition

Location: `Server/src/validators/vendor.validator.js`

### Create Vendor Schema Structure
```javascript
{
  name: String (2-50 chars, required),
  email: String (valid email, required),
  phone: String (7-15 digits with separators, required),
  businessName: String (2-100 chars, required),
  serviceType: String (enum: hotel|transport|activity|restaurant|guide|other, required),
  businessRegistrationNumber: String (required),
  taxIdentificationNumber: String (required),
  address: Object {
    street: String (optional),
    city: String (optional),
    state: String (optional),
    zipCode: String (optional),
    country: String (optional)
  } (required),
  contactPerson: Object {
    name: String (optional),
    phone: String (7-15 digits if provided, optional),
    email: String (valid email if provided, optional),
    designation: String (optional)
  } (required),
  bankDetails: Object {
    accountName: String (optional),
    accountNumber: String (optional),
    bankName: String (optional),
    branchName: String (optional),
    ifscCode: String (optional),
    swiftCode: String (optional)
  } (required)
}
```

---

## Next Steps After Successful Creation

1. ✅ Vendor account is created in the system
2. 🔐 Temporary password is generated automatically (12 chars, secure)
3. 📧 Invitation email is sent to their address
4. 🔑 They must set permanent password on first login
5. ✓ Admin must verify business details before full activation


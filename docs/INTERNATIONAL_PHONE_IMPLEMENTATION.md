# International Phone Number Implementation - Admin Side

## Overview

This document describes the implementation of industry-standard international phone number handling with country codes for the admin website user management system. This matches the client-side implementation and supports customers from different countries.

## What Changed

### 1. **Frontend - Admin Management (Management Portal)**

#### New Phone Utility Module
**File**: `Management/src/features/user-management/utils/phoneUtils.js`

Provides:
- **Country list** with flags and codes (40+ countries)
- **Phone validation** using `libphonenumber-js`
- **E.164 formatting** for API communication
- **Country code parsing** from phone numbers
- **Placeholder examples** for each country

Key functions:
```javascript
// Validates phone number for a country
validatePhone(phone, countryCode) -> boolean

// Formats to E.164 (e.g., +94768952480)
formatPhoneToE164(phone, countryCode) -> { e164, countryCode, formatted }

// Get country name or flag
getCountryName(countryCode) -> string
getCountryFlag(countryCode) -> string emoji

// Get placeholder for country
getPhonePlaceholder(countryCode) -> string
```

#### Updated Admin Form UI

**File**: `Management/src/features/user-management/components/WebsiteUsersManagement/WebsiteUsersManagement.jsx`

Changes:
- **Phone field** now includes country code selector dropdown
- **Form state** includes `phoneCountry` (defaults to 'US')
- **Dynamic placeholders** based on selected country
- **Phone validation** before submission using `validatePhone()`
- **E.164 formatting** before sending to API

**Form Structure**:
```jsx
<select>
  {COUNTRIES.map(country => (
    <option>🇺🇸 US</option>
    <option>🇱🇰 LK</option>
    // ... more countries
  ))}
</select>
<input placeholder="+1 (234) 567-8900" />
```

#### Updated Admin Service

**File**: `Management/src/services/websiteUser.service.js`

Changes:
- `createUser()` now expects `phone` (E.164 format) and `phoneCountry`
- `updateUser()` handles both `phone` and `phoneCountry`
- Phone is formatted before sending to API

### 2. **Backend - API (Server)**

#### Updated User Validator

**File**: `Server/src/validators/user.validator.js`

Changes:
- **createUserSchema**:
  - `phone` is now **required** (not optional)
  - Accepts flexible format: with/without country code
  - Pattern: `/^\+?[1-9]\d{1,14}$/` (E.164 compatible)
  - `phoneCountry` added as optional ISO country code
  - Better error message: "Please provide a valid international phone number"

- **updateUserSchema**:
  - Same phone validation as create
  - Supports updating both `phone` and `phoneCountry`

```javascript
// Before: Phone was 7-15 digits and optional
phone: Joi.string().pattern(/^[\+]?[0-9]{7,15}$/).optional()

// Now: Phone is required and uses E.164 format
phone: Joi.string()
  .pattern(/^\+?[1-9]\d{1,14}$/)
  .required()

phoneCountry: Joi.string()
  .length(2)
  .uppercase()
  .optional()
```

#### Updated User Model

**File**: `Server/src/models/user.model.js`

Changes:
- `phoneCountry` field now has a **default value** of 'US'
- Validates country code is uppercase 2 characters
- Both fields remain sparse (unique constraint on phoneE164)

```javascript
phoneCountry: {
  type: String,
  match: [/^[A-Z]{2}$/, 'Please provide a valid country code'],
  sparse: true,
  default: 'US', // NEW: Default to US
}
```

## How It Works - End to End

### Creating a User (Admin Side)

1. **Admin selects country** from dropdown (e.g., Sri Lanka 🇱🇰)
2. **Admin enters phone** in natural format (e.g., "0768952480" or "+94768952480")
3. **Frontend validates** using `validatePhone(phone, 'LK')`
4. **Frontend formats** using `formatPhoneToE164()` → `+94768952480`
5. **API receives**:
   ```json
   {
     "name": "John Doe",
     "email": "john@example.com",
     "phone": "+94768952480",
     "phoneCountry": "LK",
     "password": "secure123"
   }
   ```
6. **Server validates** using Joi schema (checks E.164 format)
7. **Database stores** both `phone` (E.164) and `phoneCountry` (ISO code)

### Updating a User (Admin Side)

1. **Form loads** with user's existing phone and country
2. **Admin can change** either phone or country
3. **Same validation & formatting** as creation
4. **Server updates** both fields

## Data Flow Comparison

### Before (Strict 10-digit requirement)
```
Admin Input: "7688952480"
Validation: ❌ FAILS - expects exactly 10 digits or format like "+1-555-0000"
User created: ❌ NO
```

### After (Industry Standard E.164)
```
Admin Input: "0768952480" (Sri Lanka)
+ Country: "LK"
Validation: ✅ PASSES - valid for Sri Lanka
Formatting: +94768952480 (E.164)
Storage: 
  - phone: "+94768952480"
  - phoneCountry: "LK"
User created: ✅ YES
```

## Supported Countries

The system supports 40+ countries including:
- **South Asia**: India, Sri Lanka, Pakistan, Bangladesh, Nepal
- **Southeast Asia**: Singapore, Malaysia, Thailand, Indonesia, Philippines, Vietnam
- **East Asia**: Japan, China, South Korea
- **Europe**: UK, Germany, France, Spain, etc.
- **Americas**: USA, Canada, Mexico, Brazil
- **Middle East**: UAE, Saudi Arabia
- **Oceania**: Australia, New Zealand

Complete list in `phoneUtils.js` - COUNTRIES array

## Error Messages

Users now see helpful error messages:

**Before**:
```
"Validation error: Please provide a valid international phone number 
(E.164 format)"
```

**After**:
```
"Please provide a valid phone number for the selected country"
```

## API Contract

### Create User Request
```http
POST /api/v1/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+94768952480",        // E.164 format (required)
  "phoneCountry": "LK",            // ISO country code (optional, defaults to US)
  "password": "password123",
  "role": "customer"
}
```

### User Response
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+94768952480",
  "phoneCountry": "LK",
  "status": "active",
  "createdAt": "2024-11-15T10:30:00Z"
}
```

## Testing

### Test Cases

1. **Valid Sri Lankan number**
   - Input: "0768952480" + "LK"
   - Expected: ✅ Formatted to "+94768952480"

2. **Valid US number**
   - Input: "(234) 567-8900" + "US"
   - Expected: ✅ Formatted to "+12345678900"

3. **Valid with country code**
   - Input: "+94768952480" + "LK"
   - Expected: ✅ Accepted as-is

4. **Invalid format**
   - Input: "123" + "US"
   - Expected: ❌ Error message shown

5. **Wrong country for number**
   - Input: "+94768952480" (Sri Lanka number) + "US"
   - Expected: ⚠️ Validation may pass (frontend validates for format, not country match)

## Compatibility

This implementation is **fully backward compatible**:
- Existing database records with phone numbers continue to work
- `phoneCountry` defaults to 'US' for existing records
- No migration required for existing data

## Next Steps

1. **Install dependency** (if not already present):
   ```bash
   npm install libphonenumber-js
   ```

2. **Restart backend** server to load new validation schemas

3. **Test the flow**:
   - Create a user from admin panel
   - Select different countries
   - Verify E.164 formatting in API calls
   - Check database storage

4. **Update documentation** for customer support about phone format changes

## Benefits

✅ **User-friendly**: Users don't need to know E.164 format  
✅ **International**: Supports 40+ countries  
✅ **Flexible**: Accepts various input formats  
✅ **Secure**: Strict validation at API level  
✅ **Consistent**: Matches client-side implementation  
✅ **Standard**: Uses industry-standard E.164 format  
✅ **Maintainable**: Centralized phone utilities  

## Files Modified

1. `Management/src/features/user-management/utils/phoneUtils.js` - NEW
2. `Management/src/features/user-management/components/WebsiteUsersManagement/WebsiteUsersManagement.jsx`
3. `Management/src/services/websiteUser.service.js`
4. `Server/src/validators/user.validator.js`
5. `Server/src/models/user.model.js`

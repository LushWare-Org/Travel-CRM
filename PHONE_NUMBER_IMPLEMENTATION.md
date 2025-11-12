# Phone Number Implementation - Industry Standards

## Overview
This document outlines the industry-standard approach for handling international phone numbers in the TripSkyWay travel application.

## Industry Standards Used

### 1. **E.164 Format**
The international standard for phone numbers (ITU-T E.164) is used for storage and API communication:
- Format: `+[country code][national number]`
- Examples: `+12125552368` (US), `+551140410888` (Brazil), `+94112345678` (Sri Lanka)
- Advantages:
  - Unambiguous global format
  - Supports all countries
  - Machine-readable
  - Database-friendly

### 2. **ISO 3166-1 Alpha-2 Country Codes**
For country selection and phone number parsing:
- 2-letter country codes (e.g., US, GB, CA, LK, SG, MV)
- Standard international format
- Enables proper phone number validation per country

### 3. **libphonenumber-js Library**
Professional phone number handling library:
- Validates phone numbers correctly for each country
- Formats numbers according to country conventions
- Parses partial numbers and user input
- Converts to E.164 format for storage
- Developed by Google's libphonenumber project

## Frontend Implementation

### UI Components

#### 1. **Country Selector**
```jsx
<select name="phoneCountry" value={formData.phoneCountry}>
  <option value="US">🇺🇸 United States</option>
  <option value="GB">🇬🇧 United Kingdom</option>
  <option value="CA">🇨🇦 Canada</option>
  <option value="AU">🇦🇺 Australia</option>
  <option value="IN">🇮🇳 India</option>
  <option value="LK">🇱🇰 Sri Lanka</option>
  <option value="SG">🇸🇬 Singapore</option>
  <option value="MY">🇲🇾 Malaysia</option>
  <option value="TH">🇹🇭 Thailand</option>
  <option value="JP">🇯🇵 Japan</option>
  <option value="AE">🇦🇪 UAE</option>
  <option value="FR">🇫🇷 France</option>
  <option value="DE">🇩🇪 Germany</option>
  <option value="IT">🇮🇹 Italy</option>
  <option value="ES">🇪🇸 Spain</option>
  <option value="MV">🇲🇻 Maldives</option>
  <option value="NZ">🇳🇿 New Zealand</option>
  <option value="ZA">🇿🇦 South Africa</option>
</select>
```

#### 2. **Phone Input Field**
- Accepts local format (e.g., "123-456-7890" for US)
- Real-time validation with visual feedback
- Shows formatted number and validity status

#### 3. **Real-time Validation**
```jsx
validatePhone(phone, countryCode) // Returns true/false
getPhoneE164(phone, countryCode) // Returns formatted phone object
```

### User Experience Features

1. **Smart Input Guidance**
   - Shows country flag emoji in selector
   - Displays formatted phone number as user types
   - Shows green checkmark for valid numbers
   - Shows red error message for invalid numbers

2. **Automatic Formatting**
   - Converts local format to E.164 before API call
   - Stores country code separately for reference
   - Prevents invalid phone numbers from being saved

3. **Flexible Input**
   - Accepts user's local phone format (e.g., "(123) 456-7890")
   - Handles phone numbers with or without country code
   - Works with dashes, spaces, and parentheses

## Backend Implementation

### Database Schema

```javascript
phone: {
  type: String,
  // Accepts E.164 format: +1234567890
  match: [/^\+?[1-9]\d{1,14}$/, 'Valid international phone number required'],
  sparse: true,
}

phoneCountry: {
  type: String,
  // ISO 3166-1 alpha-2 country code
  match: [/^[A-Z]{2}$/, 'Valid country code required'],
  sparse: true,
}

phoneE164: {
  type: String,
  // Normalized E.164 format for consistent lookups
  sparse: true,
  unique: true,
}
```

### Validation Rules

1. **Phone Format**: Must match E.164 format (with optional + prefix)
2. **Country Code**: Must be valid ISO 3166-1 alpha-2 code
3. **Uniqueness**: E.164 format is unique in database
4. **Optional**: Phone is optional for customer registration

## API Communication

### Register Endpoint
```javascript
POST /auth/register
{
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
  phone: string (E.164 format, e.g., "+12125552368"),
  phoneCountry: string (ISO code, e.g., "US")
}
```

### Data Flow

1. **User Input** → Local format (e.g., "212-555-2368")
2. **Validation** → Parse with libphonenumber-js
3. **Conversion** → Convert to E.164 (+12125552368)
4. **API Send** → Send E.164 format + country code
5. **Database** → Store E.164 format, country code, and normalized version

## Security Considerations

1. **Format Validation**: Server re-validates E.164 format
2. **Country Code Verification**: Backend verifies country code matches phone
3. **Input Sanitization**: Regex validation prevents injection
4. **Unique Constraint**: E.164 field is unique to prevent duplicates

## Benefits of This Implementation

### For Users
- Intuitive country selection with flags
- Accept familiar local phone formats
- Real-time validation feedback
- Clear error messages

### For Developers
- Standardized format (E.164) across codebase
- Reduced bugs from inconsistent formats
- Easy international expansion
- Third-party API integration ready

### For Business
- Supports 195+ countries automatically
- Follows global telecommunications standards
- SMS/call integration ready (Twilio, etc.)
- Compliant with international regulations

## Supported Countries

Currently configured countries include:

- 🇺🇸 United States (+1)
- 🇬🇧 United Kingdom (+44)
- 🇨🇦 Canada (+1)
- 🇦🇺 Australia (+61)
- 🇮🇳 India (+91)
- 🇱🇰 Sri Lanka (+94)
- 🇸🇬 Singapore (+65)
- 🇲🇾 Malaysia (+60)
- 🇹🇭 Thailand (+66)
- 🇯🇵 Japan (+81)
- 🇦🇪 UAE (+971)
- 🇫🇷 France (+33)
- 🇩🇪 Germany (+49)
- 🇮🇹 Italy (+39)
- 🇪🇸 Spain (+34)
- 🇲🇻 Maldives (+960)
- 🇳🇿 New Zealand (+64)
- 🇿🇦 South Africa (+27)

## How to Add More Countries

1. Add new option to country selector in Login.jsx:
```jsx
<option value="XX">🇦🇹 Austria</option>
```

2. The libphonenumber-js library automatically supports all 195+ countries
3. No backend changes needed - validation works for any ISO country code

## Example Usage

### Registration with Phone Number
```javascript
// User inputs:
// Country: "LK" (Sri Lanka)
// Phone: "0768952480"

// System processes:
// 1. Parse with libphonenumber-js
// 2. Convert to E.164: "+94768952480"
// 3. Send to API with phoneCountry: "LK"
// 4. Backend stores both E.164 and country code
// 5. Normalize and store in phoneE164 field
```

## Future Enhancements

1. **Phone Number Lookup**: Reverse lookup to auto-select country
2. **SMS Verification**: Send verification code to phone
3. **WhatsApp Integration**: Send notifications via WhatsApp
4. **Multiple Phone Numbers**: Support primary/secondary numbers
5. **Phone Number Formatting**: Different format options per user preference

## References

- [ITU-T E.164 Standard](https://www.itu.int/rec/T-REC-E.164/en)
- [ISO 3166-1 Alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)
- [libphonenumber](https://github.com/googlei18n/libphonenumber)
- [libphonenumber-js](https://www.npmjs.com/package/libphonenumber-js)

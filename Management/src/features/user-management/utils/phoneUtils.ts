/**
 * Phone Number Utility Functions
 * Handles international phone number validation and formatting
 * Uses E.164 format for API communication (e.g., +94768952480)
 */

import { parsePhoneNumber, type CountryCode } from 'libphonenumber-js';
import { COUNTRIES as ALL_COUNTRIES } from '../../../data/countries';

export interface Country {
  code: string;
  name: string;
  flag: string;
  callingCode: string;
}

/**
 * List of supported countries with their codes.
 * Derived from centralized data/countries.js — single source of truth.
 */
export const COUNTRIES: Country[] = ALL_COUNTRIES.map(
  (c: { code: string; name: string; flag: string; phoneCode: string }) => ({
    code: c.code,
    name: c.name,
    flag: c.flag,
    callingCode: c.phoneCode,
  })
);

export interface FormattedPhone {
  e164: string;
  countryCode?: string;
  formatted: string;
  national: string;
}

/**
 * Validate phone number for given country
 */
export const validatePhone = (phone: string, countryCode: string): boolean => {
  if (!phone || !countryCode) return false;

  try {
    const parsed = parsePhoneNumber(phone, countryCode as CountryCode);
    return Boolean(parsed && parsed.isValid());
  } catch (err) {
    return false;
  }
};

/**
 * Format phone number to E.164 format for API
 */
export const formatPhoneToE164 = (phone: string, countryCode: string): FormattedPhone | null => {
  if (!phone || !countryCode) return null;

  try {
    const parsed = parsePhoneNumber(phone, countryCode as CountryCode);
    if (!parsed || !parsed.isValid()) {
      return null;
    }

    return {
      e164: parsed.format('E.164'),
      countryCode: parsed.country,
      formatted: parsed.formatInternational(),
      national: parsed.formatNational(),
    };
  } catch (err) {
    return null;
  }
};

/**
 * Get country name by code
 */
export const getCountryName = (countryCode: string): string => {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  return country ? country.name : countryCode;
};

/**
 * Get country flag by code
 */
export const getCountryFlag = (countryCode: string): string => {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  return country ? country.flag : '🌍';
};

/**
 * Parse E.164 formatted phone to get country code
 */
export const parseE164 = (
  e164?: string | null
): { countryCode?: string; e164: string; formatted: string } | null => {
  if (!e164) return null;

  try {
    const parsed = parsePhoneNumber(e164);
    if (!parsed || !parsed.isValid()) {
      return null;
    }

    return {
      countryCode: parsed.country,
      e164: parsed.format('E.164'),
      formatted: parsed.formatInternational(),
    };
  } catch (err) {
    return null;
  }
};

/**
 * Get phone input placeholder for country
 */
export const getPhonePlaceholder = (countryCode: string): string => {
  const examples: Record<string, string> = {
    US: '+1 (234) 567-8900',
    GB: '+44 20 7946 0958',
    CA: '+1 (416) 555-0123',
    AU: '+61 2 1234 5678',
    IN: '+91 98765 43210',
    LK: '+94 76 895 2480',
    PK: '+92 42 1234 5678',
    BD: '+880 1234 567890',
    NP: '+977 1 4123 456',
    DE: '+49 30 12345678',
    FR: '+33 1 42 68 53 00',
    IT: '+39 06 6982 0000',
    ES: '+34 91 123 4567',
    NL: '+31 20 123 4567',
    BE: '+32 2 123 4567',
    CH: '+41 44 123 4567',
    SE: '+46 8 123 4567',
    NO: '+47 23 12 3456',
    DK: '+45 33 12 3456',
    FI: '+358 9 123 4567',
    PL: '+48 12 123 4567',
    CZ: '+420 2 123 4567',
    RU: '+7 495 123 4567',
    JP: '+81 3 1234 5678',
    CN: '+86 10 1234 5678',
    SG: '+65 6123 4567',
    MY: '+60 3 1234 5678',
    TH: '+66 2 123 4567',
    ID: '+62 21 123 4567',
    PH: '+63 2 123 4567',
    VN: '+84 4 123 4567',
    KR: '+82 2 123 4567',
    BR: '+55 11 98765 4321',
    MX: '+52 55 1234 5678',
    ZA: '+27 11 123 4567',
    AE: '+971 4 123 4567',
    SA: '+966 11 123 4567',
    NZ: '+64 9 123 4567',
    IE: '+353 1 123 4567',
    AT: '+43 1 123 4567',
  };

  return examples[countryCode] || `+${countryCode} phone number`;
};

export default {
  validatePhone,
  formatPhoneToE164,
  getCountryName,
  getCountryFlag,
  parseE164,
  getPhonePlaceholder,
  COUNTRIES,
};

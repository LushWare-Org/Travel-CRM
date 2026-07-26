/**
 * Single source of truth for country data used across the Management frontend.
 *
 * Each entry provides: ISO alpha-2 code, display name, flag emoji,
 * phone dial code, region, and ISO 4217 currency code.
 *
 * Import from anywhere as: import { COUNTRIES, COUNTRY_BY_CODE } from '<path>/data/countries';
 */

const COUNTRY_DATA = [
  // ── South Asia ──────────────────────────────────────────────
  { code: 'AF', name: 'Afghanistan',     flag: '🇦🇫', phoneCode: '+93',  region: 'Asia',         currency: 'AFN' },
  { code: 'BD', name: 'Bangladesh',      flag: '🇧🇩', phoneCode: '+880', region: 'Asia',         currency: 'BDT' },
  { code: 'BT', name: 'Bhutan',          flag: '🇧🇹', phoneCode: '+975', region: 'Asia',         currency: 'BTN' },
  { code: 'IN', name: 'India',           flag: '🇮🇳', phoneCode: '+91',  region: 'Asia',         currency: 'INR' },
  { code: 'MV', name: 'Maldives',        flag: '🇲🇻', phoneCode: '+960', region: 'Asia',         currency: 'MVR' },
  { code: 'NP', name: 'Nepal',           flag: '🇳🇵', phoneCode: '+977', region: 'Asia',         currency: 'NPR' },
  { code: 'PK', name: 'Pakistan',        flag: '🇵🇰', phoneCode: '+92',  region: 'Asia',         currency: 'PKR' },
  { code: 'LK', name: 'Sri Lanka',       flag: '🇱🇰', phoneCode: '+94',  region: 'Asia',         currency: 'LKR' },

  // ── Middle East ─────────────────────────────────────────────
  { code: 'BH', name: 'Bahrain',         flag: '🇧🇭', phoneCode: '+973', region: 'Middle East',  currency: 'BHD' },
  { code: 'IR', name: 'Iran',            flag: '🇮🇷', phoneCode: '+98',  region: 'Middle East',  currency: 'IRR' },
  { code: 'IQ', name: 'Iraq',            flag: '🇮🇶', phoneCode: '+964', region: 'Middle East',  currency: 'IQD' },
  { code: 'IL', name: 'Israel',          flag: '🇮🇱', phoneCode: '+972', region: 'Middle East',  currency: 'ILS' },
  { code: 'JO', name: 'Jordan',          flag: '🇯🇴', phoneCode: '+962', region: 'Middle East',  currency: 'JOD' },
  { code: 'KW', name: 'Kuwait',          flag: '🇰🇼', phoneCode: '+965', region: 'Middle East',  currency: 'KWD' },
  { code: 'LB', name: 'Lebanon',         flag: '🇱🇧', phoneCode: '+961', region: 'Middle East',  currency: 'LBP' },
  { code: 'OM', name: 'Oman',            flag: '🇴🇲', phoneCode: '+968', region: 'Middle East',  currency: 'OMR' },
  { code: 'QA', name: 'Qatar',           flag: '🇶🇦', phoneCode: '+974', region: 'Middle East',  currency: 'QAR' },
  { code: 'SA', name: 'Saudi Arabia',    flag: '🇸🇦', phoneCode: '+966', region: 'Middle East',  currency: 'SAR' },
  { code: 'SY', name: 'Syria',           flag: '🇸🇾', phoneCode: '+963', region: 'Middle East',  currency: 'SYP' },
  { code: 'TR', name: 'Turkey',          flag: '🇹🇷', phoneCode: '+90',  region: 'Middle East',  currency: 'TRY' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', phoneCode: '+971', region: 'Middle East', currency: 'AED' },
  { code: 'YE', name: 'Yemen',           flag: '🇾🇪', phoneCode: '+967', region: 'Middle East',  currency: 'YER' },

  // ── Southeast Asia ──────────────────────────────────────────
  { code: 'BN', name: 'Brunei',          flag: '🇧🇳', phoneCode: '+673', region: 'Asia',         currency: 'BND' },
  { code: 'KH', name: 'Cambodia',        flag: '🇰🇭', phoneCode: '+855', region: 'Asia',         currency: 'KHR' },
  { code: 'ID', name: 'Indonesia',       flag: '🇮🇩', phoneCode: '+62',  region: 'Asia',         currency: 'IDR' },
  { code: 'LA', name: 'Laos',            flag: '🇱🇦', phoneCode: '+856', region: 'Asia',         currency: 'LAK' },
  { code: 'MY', name: 'Malaysia',        flag: '🇲🇾', phoneCode: '+60',  region: 'Asia',         currency: 'MYR' },
  { code: 'MM', name: 'Myanmar',         flag: '🇲🇲', phoneCode: '+95',  region: 'Asia',         currency: 'MMK' },
  { code: 'PH', name: 'Philippines',     flag: '🇵🇭', phoneCode: '+63',  region: 'Asia',         currency: 'PHP' },
  { code: 'SG', name: 'Singapore',       flag: '🇸🇬', phoneCode: '+65',  region: 'Asia',         currency: 'SGD' },
  { code: 'TH', name: 'Thailand',        flag: '🇹🇭', phoneCode: '+66',  region: 'Asia',         currency: 'THB' },
  { code: 'TL', name: 'Timor-Leste',     flag: '🇹🇱', phoneCode: '+670', region: 'Asia',         currency: 'USD' },
  { code: 'VN', name: 'Vietnam',         flag: '🇻🇳', phoneCode: '+84',  region: 'Asia',         currency: 'VND' },

  // ── East Asia ───────────────────────────────────────────────
  { code: 'CN', name: 'China',           flag: '🇨🇳', phoneCode: '+86',  region: 'Asia',         currency: 'CNY' },
  { code: 'HK', name: 'Hong Kong',       flag: '🇭🇰', phoneCode: '+852', region: 'Asia',         currency: 'HKD' },
  { code: 'JP', name: 'Japan',           flag: '🇯🇵', phoneCode: '+81',  region: 'Asia',         currency: 'JPY' },
  { code: 'MO', name: 'Macau',           flag: '🇲🇴', phoneCode: '+853', region: 'Asia',         currency: 'MOP' },
  { code: 'MN', name: 'Mongolia',        flag: '🇲🇳', phoneCode: '+976', region: 'Asia',         currency: 'MNT' },
  { code: 'KP', name: 'North Korea',     flag: '🇰🇵', phoneCode: '+850', region: 'Asia',         currency: 'KPW' },
  { code: 'KR', name: 'South Korea',     flag: '🇰🇷', phoneCode: '+82',  region: 'Asia',         currency: 'KRW' },
  { code: 'TW', name: 'Taiwan',          flag: '🇹🇼', phoneCode: '+886', region: 'Asia',         currency: 'TWD' },

  // ── Central Asia & Caucasus ─────────────────────────────────
  { code: 'AM', name: 'Armenia',         flag: '🇦🇲', phoneCode: '+374', region: 'Asia',         currency: 'AMD' },
  { code: 'AZ', name: 'Azerbaijan',      flag: '🇦🇿', phoneCode: '+994', region: 'Asia',         currency: 'AZN' },
  { code: 'GE', name: 'Georgia',         flag: '🇬🇪', phoneCode: '+995', region: 'Asia',         currency: 'GEL' },
  { code: 'KZ', name: 'Kazakhstan',      flag: '🇰🇿', phoneCode: '+7',   region: 'Asia',         currency: 'KZT' },
  { code: 'KG', name: 'Kyrgyzstan',      flag: '🇰🇬', phoneCode: '+996', region: 'Asia',         currency: 'KGS' },
  { code: 'TJ', name: 'Tajikistan',      flag: '🇹🇯', phoneCode: '+992', region: 'Asia',         currency: 'TJS' },
  { code: 'TM', name: 'Turkmenistan',    flag: '🇹🇲', phoneCode: '+993', region: 'Asia',         currency: 'TMT' },
  { code: 'UZ', name: 'Uzbekistan',      flag: '🇺🇿', phoneCode: '+998', region: 'Asia',         currency: 'UZS' },

  // ── Europe ──────────────────────────────────────────────────
  { code: 'AL', name: 'Albania',         flag: '🇦🇱', phoneCode: '+355', region: 'Europe',       currency: 'ALL' },
  { code: 'AD', name: 'Andorra',         flag: '🇦🇩', phoneCode: '+376', region: 'Europe',       currency: 'EUR' },
  { code: 'AT', name: 'Austria',         flag: '🇦🇹', phoneCode: '+43',  region: 'Europe',       currency: 'EUR' },
  { code: 'BY', name: 'Belarus',         flag: '🇧🇾', phoneCode: '+375', region: 'Europe',       currency: 'BYN' },
  { code: 'BE', name: 'Belgium',         flag: '🇧🇪', phoneCode: '+32',  region: 'Europe',       currency: 'EUR' },
  { code: 'BA', name: 'Bosnia',          flag: '🇧🇦', phoneCode: '+387', region: 'Europe',       currency: 'BAM' },
  { code: 'BG', name: 'Bulgaria',        flag: '🇧🇬', phoneCode: '+359', region: 'Europe',       currency: 'BGN' },
  { code: 'HR', name: 'Croatia',         flag: '🇭🇷', phoneCode: '+385', region: 'Europe',       currency: 'EUR' },
  { code: 'CY', name: 'Cyprus',          flag: '🇨🇾', phoneCode: '+357', region: 'Europe',       currency: 'EUR' },
  { code: 'CZ', name: 'Czech Republic',  flag: '🇨🇿', phoneCode: '+420', region: 'Europe',       currency: 'CZK' },
  { code: 'DK', name: 'Denmark',         flag: '🇩🇰', phoneCode: '+45',  region: 'Europe',       currency: 'DKK' },
  { code: 'EE', name: 'Estonia',         flag: '🇪🇪', phoneCode: '+372', region: 'Europe',       currency: 'EUR' },
  { code: 'FI', name: 'Finland',         flag: '🇫🇮', phoneCode: '+358', region: 'Europe',       currency: 'EUR' },
  { code: 'FR', name: 'France',          flag: '🇫🇷', phoneCode: '+33',  region: 'Europe',       currency: 'EUR' },
  { code: 'DE', name: 'Germany',         flag: '🇩🇪', phoneCode: '+49',  region: 'Europe',       currency: 'EUR' },
  { code: 'GR', name: 'Greece',          flag: '🇬🇷', phoneCode: '+30',  region: 'Europe',       currency: 'EUR' },
  { code: 'HU', name: 'Hungary',         flag: '🇭🇺', phoneCode: '+36',  region: 'Europe',       currency: 'HUF' },
  { code: 'IS', name: 'Iceland',         flag: '🇮🇸', phoneCode: '+354', region: 'Europe',       currency: 'ISK' },
  { code: 'IE', name: 'Ireland',         flag: '🇮🇪', phoneCode: '+353', region: 'Europe',       currency: 'EUR' },
  { code: 'IT', name: 'Italy',           flag: '🇮🇹', phoneCode: '+39',  region: 'Europe',       currency: 'EUR' },
  { code: 'LV', name: 'Latvia',          flag: '🇱🇻', phoneCode: '+371', region: 'Europe',       currency: 'EUR' },
  { code: 'LI', name: 'Liechtenstein',   flag: '🇱🇮', phoneCode: '+423', region: 'Europe',       currency: 'CHF' },
  { code: 'LT', name: 'Lithuania',       flag: '🇱🇹', phoneCode: '+370', region: 'Europe',       currency: 'EUR' },
  { code: 'LU', name: 'Luxembourg',      flag: '🇱🇺', phoneCode: '+352', region: 'Europe',       currency: 'EUR' },
  { code: 'MT', name: 'Malta',           flag: '🇲🇹', phoneCode: '+356', region: 'Europe',       currency: 'EUR' },
  { code: 'MD', name: 'Moldova',         flag: '🇲🇩', phoneCode: '+373', region: 'Europe',       currency: 'MDL' },
  { code: 'MC', name: 'Monaco',          flag: '🇲🇨', phoneCode: '+377', region: 'Europe',       currency: 'EUR' },
  { code: 'ME', name: 'Montenegro',      flag: '🇲🇪', phoneCode: '+382', region: 'Europe',       currency: 'EUR' },
  { code: 'NL', name: 'Netherlands',     flag: '🇳🇱', phoneCode: '+31',  region: 'Europe',       currency: 'EUR' },
  { code: 'NO', name: 'Norway',          flag: '🇳🇴', phoneCode: '+47',  region: 'Europe',       currency: 'NOK' },
  { code: 'PL', name: 'Poland',          flag: '🇵🇱', phoneCode: '+48',  region: 'Europe',       currency: 'PLN' },
  { code: 'PT', name: 'Portugal',        flag: '🇵🇹', phoneCode: '+351', region: 'Europe',       currency: 'EUR' },
  { code: 'RO', name: 'Romania',         flag: '🇷🇴', phoneCode: '+40',  region: 'Europe',       currency: 'RON' },
  { code: 'RU', name: 'Russia',          flag: '🇷🇺', phoneCode: '+7',   region: 'Europe',       currency: 'RUB' },
  { code: 'SM', name: 'San Marino',      flag: '🇸🇲', phoneCode: '+378', region: 'Europe',       currency: 'EUR' },
  { code: 'RS', name: 'Serbia',          flag: '🇷🇸', phoneCode: '+381', region: 'Europe',       currency: 'RSD' },
  { code: 'SK', name: 'Slovakia',        flag: '🇸🇰', phoneCode: '+421', region: 'Europe',       currency: 'EUR' },
  { code: 'SI', name: 'Slovenia',        flag: '🇸🇮', phoneCode: '+386', region: 'Europe',       currency: 'EUR' },
  { code: 'ES', name: 'Spain',           flag: '🇪🇸', phoneCode: '+34',  region: 'Europe',       currency: 'EUR' },
  { code: 'SE', name: 'Sweden',          flag: '🇸🇪', phoneCode: '+46',  region: 'Europe',       currency: 'SEK' },
  { code: 'CH', name: 'Switzerland',     flag: '🇨🇭', phoneCode: '+41',  region: 'Europe',       currency: 'CHF' },
  { code: 'UA', name: 'Ukraine',         flag: '🇺🇦', phoneCode: '+380', region: 'Europe',       currency: 'UAH' },
  { code: 'GB', name: 'United Kingdom',  flag: '🇬🇧', phoneCode: '+44',  region: 'Europe',       currency: 'GBP' },
  { code: 'VA', name: 'Vatican City',    flag: '🇻🇦', phoneCode: '+379', region: 'Europe',       currency: 'EUR' },

  // ── North America ───────────────────────────────────────────
  { code: 'AG', name: 'Antigua',         flag: '🇦🇬', phoneCode: '+1268', region: 'Americas',   currency: 'XCD' },
  { code: 'BS', name: 'Bahamas',         flag: '🇧🇸', phoneCode: '+1242', region: 'Americas',   currency: 'BSD' },
  { code: 'BB', name: 'Barbados',        flag: '🇧🇧', phoneCode: '+1246', region: 'Americas',   currency: 'BBD' },
  { code: 'BZ', name: 'Belize',          flag: '🇧🇿', phoneCode: '+501',  region: 'Americas',   currency: 'BZD' },
  { code: 'CA', name: 'Canada',          flag: '🇨🇦', phoneCode: '+1',    region: 'Americas',   currency: 'CAD' },
  { code: 'CR', name: 'Costa Rica',      flag: '🇨🇷', phoneCode: '+506',  region: 'Americas',   currency: 'CRC' },
  { code: 'CU', name: 'Cuba',            flag: '🇨🇺', phoneCode: '+53',   region: 'Americas',   currency: 'CUP' },
  { code: 'DM', name: 'Dominica',        flag: '🇩🇲', phoneCode: '+1767', region: 'Americas',   currency: 'XCD' },
  { code: 'DO', name: 'Dominican Rep.',  flag: '🇩🇴', phoneCode: '+1809', region: 'Americas',   currency: 'DOP' },
  { code: 'SV', name: 'El Salvador',     flag: '🇸🇻', phoneCode: '+503',  region: 'Americas',   currency: 'USD' },
  { code: 'GT', name: 'Guatemala',       flag: '🇬🇹', phoneCode: '+502',  region: 'Americas',   currency: 'GTQ' },
  { code: 'HT', name: 'Haiti',           flag: '🇭🇹', phoneCode: '+509',  region: 'Americas',   currency: 'HTG' },
  { code: 'HN', name: 'Honduras',        flag: '🇭🇳', phoneCode: '+504',  region: 'Americas',   currency: 'HNL' },
  { code: 'JM', name: 'Jamaica',         flag: '🇯🇲', phoneCode: '+1876', region: 'Americas',   currency: 'JMD' },
  { code: 'MX', name: 'Mexico',          flag: '🇲🇽', phoneCode: '+52',   region: 'Americas',   currency: 'MXN' },
  { code: 'NI', name: 'Nicaragua',       flag: '🇳🇮', phoneCode: '+505',  region: 'Americas',   currency: 'NIO' },
  { code: 'PA', name: 'Panama',          flag: '🇵🇦', phoneCode: '+507',  region: 'Americas',   currency: 'PAB' },
  { code: 'US', name: 'United States',   flag: '🇺🇸', phoneCode: '+1',    region: 'Americas',   currency: 'USD' },

  // ── South America ───────────────────────────────────────────
  { code: 'AR', name: 'Argentina',       flag: '🇦🇷', phoneCode: '+54',   region: 'Americas',   currency: 'ARS' },
  { code: 'BO', name: 'Bolivia',         flag: '🇧🇴', phoneCode: '+591',  region: 'Americas',   currency: 'BOB' },
  { code: 'BR', name: 'Brazil',          flag: '🇧🇷', phoneCode: '+55',   region: 'Americas',   currency: 'BRL' },
  { code: 'CL', name: 'Chile',           flag: '🇨🇱', phoneCode: '+56',   region: 'Americas',   currency: 'CLP' },
  { code: 'CO', name: 'Colombia',        flag: '🇨🇴', phoneCode: '+57',   region: 'Americas',   currency: 'COP' },
  { code: 'EC', name: 'Ecuador',         flag: '🇪🇨', phoneCode: '+593',  region: 'Americas',   currency: 'USD' },
  { code: 'GY', name: 'Guyana',          flag: '🇬🇾', phoneCode: '+592',  region: 'Americas',   currency: 'GYD' },
  { code: 'PY', name: 'Paraguay',        flag: '🇵🇾', phoneCode: '+595',  region: 'Americas',   currency: 'PYG' },
  { code: 'PE', name: 'Peru',            flag: '🇵🇪', phoneCode: '+51',   region: 'Americas',   currency: 'PEN' },
  { code: 'SR', name: 'Suriname',        flag: '🇸🇷', phoneCode: '+597',  region: 'Americas',   currency: 'SRD' },
  { code: 'UY', name: 'Uruguay',         flag: '🇺🇾', phoneCode: '+598',  region: 'Americas',   currency: 'UYU' },
  { code: 'VE', name: 'Venezuela',       flag: '🇻🇪', phoneCode: '+58',   region: 'Americas',   currency: 'VES' },

  // ── Africa ──────────────────────────────────────────────────
  { code: 'DZ', name: 'Algeria',         flag: '🇩🇿', phoneCode: '+213', region: 'Africa',       currency: 'DZD' },
  { code: 'AO', name: 'Angola',          flag: '🇦🇴', phoneCode: '+244', region: 'Africa',       currency: 'AOA' },
  { code: 'BW', name: 'Botswana',        flag: '🇧🇼', phoneCode: '+267', region: 'Africa',       currency: 'BWP' },
  { code: 'CM', name: 'Cameroon',        flag: '🇨🇲', phoneCode: '+237', region: 'Africa',       currency: 'XAF' },
  { code: 'EG', name: 'Egypt',           flag: '🇪🇬', phoneCode: '+20',  region: 'Africa',       currency: 'EGP' },
  { code: 'ET', name: 'Ethiopia',        flag: '🇪🇹', phoneCode: '+251', region: 'Africa',       currency: 'ETB' },
  { code: 'GH', name: 'Ghana',           flag: '🇬🇭', phoneCode: '+233', region: 'Africa',       currency: 'GHS' },
  { code: 'KE', name: 'Kenya',           flag: '🇰🇪', phoneCode: '+254', region: 'Africa',       currency: 'KES' },
  { code: 'LY', name: 'Libya',           flag: '🇱🇾', phoneCode: '+218', region: 'Africa',       currency: 'LYD' },
  { code: 'MG', name: 'Madagascar',      flag: '🇲🇬', phoneCode: '+261', region: 'Africa',       currency: 'MGA' },
  { code: 'MW', name: 'Malawi',          flag: '🇲🇼', phoneCode: '+265', region: 'Africa',       currency: 'MWK' },
  { code: 'MU', name: 'Mauritius',       flag: '🇲🇺', phoneCode: '+230', region: 'Africa',       currency: 'MUR' },
  { code: 'MA', name: 'Morocco',         flag: '🇲🇦', phoneCode: '+212', region: 'Africa',       currency: 'MAD' },
  { code: 'MZ', name: 'Mozambique',      flag: '🇲🇿', phoneCode: '+258', region: 'Africa',       currency: 'MZN' },
  { code: 'NA', name: 'Namibia',         flag: '🇳🇦', phoneCode: '+264', region: 'Africa',       currency: 'NAD' },
  { code: 'NG', name: 'Nigeria',         flag: '🇳🇬', phoneCode: '+234', region: 'Africa',       currency: 'NGN' },
  { code: 'RW', name: 'Rwanda',          flag: '🇷🇼', phoneCode: '+250', region: 'Africa',       currency: 'RWF' },
  { code: 'SN', name: 'Senegal',         flag: '🇸🇳', phoneCode: '+221', region: 'Africa',       currency: 'XOF' },
  { code: 'SC', name: 'Seychelles',      flag: '🇸🇨', phoneCode: '+248', region: 'Africa',       currency: 'SCR' },
  { code: 'ZA', name: 'South Africa',    flag: '🇿🇦', phoneCode: '+27',  region: 'Africa',       currency: 'ZAR' },
  { code: 'SD', name: 'Sudan',           flag: '🇸🇩', phoneCode: '+249', region: 'Africa',       currency: 'SDG' },
  { code: 'TZ', name: 'Tanzania',        flag: '🇹🇿', phoneCode: '+255', region: 'Africa',       currency: 'TZS' },
  { code: 'TN', name: 'Tunisia',         flag: '🇹🇳', phoneCode: '+216', region: 'Africa',       currency: 'TND' },
  { code: 'UG', name: 'Uganda',          flag: '🇺🇬', phoneCode: '+256', region: 'Africa',       currency: 'UGX' },
  { code: 'ZM', name: 'Zambia',          flag: '🇿🇲', phoneCode: '+260', region: 'Africa',       currency: 'ZMW' },
  { code: 'ZW', name: 'Zimbabwe',        flag: '🇿🇼', phoneCode: '+263', region: 'Africa',       currency: 'ZWL' },

  // ── Oceania ─────────────────────────────────────────────────
  { code: 'AU', name: 'Australia',       flag: '🇦🇺', phoneCode: '+61',  region: 'Oceania',     currency: 'AUD' },
  { code: 'FJ', name: 'Fiji',            flag: '🇫🇯', phoneCode: '+679', region: 'Oceania',     currency: 'FJD' },
  { code: 'NZ', name: 'New Zealand',     flag: '🇳🇿', phoneCode: '+64',  region: 'Oceania',     currency: 'NZD' },
  { code: 'PG', name: 'Papua New Guinea',flag: '🇵🇬', phoneCode: '+675', region: 'Oceania',     currency: 'PGK' },
  { code: 'WS', name: 'Samoa',           flag: '🇼🇸', phoneCode: '+685', region: 'Oceania',     currency: 'WST' },
];

// ── Derived exports ──────────────────────────────────────────────

/** Full array sorted by name */
export const COUNTRIES = [...COUNTRY_DATA].sort((a, b) => a.name.localeCompare(b.name));

/** Lookup by ISO alpha-2 code */
export const COUNTRY_BY_CODE = Object.fromEntries(COUNTRY_DATA.map((c) => [c.code, c]));

/** Country codes in priority order for travel CRM (South Asia + Middle East first, then rest) */
const PRIORITY_ORDER = [
  'LK', 'IN', 'MV', 'NP', 'BD', 'PK', 'BT', 'AF',
  'AE', 'SA', 'QA', 'OM', 'KW', 'BH', 'JO', 'TR',
  'TH', 'SG', 'MY', 'ID', 'VN', 'PH', 'KH', 'MM',
  'GB', 'FR', 'DE', 'IT', 'ES', 'CH', 'NL', 'GR',
  'US', 'CA', 'MX',
  'AU', 'NZ',
  'ZA', 'EG', 'KE', 'MU', 'SC',
  'CN', 'JP', 'KR',
];

/**
 * Countries sorted in business-priority order (South Asia → Middle East → SE Asia → Europe → Americas → Oceania → Africa → East Asia).
 * Use this for dropdowns that benefit from common origins appearing first.
 */
export const COUNTRIES_PRIORITY = [
  ...PRIORITY_ORDER.map((code) => COUNTRY_BY_CODE[code]).filter(Boolean),
  ...COUNTRY_DATA.filter((c) => !PRIORITY_ORDER.includes(c.code)).sort((a, b) => a.name.localeCompare(b.name)),
];

/** Flat list of country codes used in hotel/country dropdowns */
export const COUNTRY_CODES = COUNTRIES_PRIORITY.map((c) => c.code);

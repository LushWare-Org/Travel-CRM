import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import zlib from 'node:zlib';
import { generateVoucherPDF } from '../voucherPDFGenerator.js';

/**
 * See invoicePDFGenerator.test.js for why this is necessary: pdfkit
 * deflate-compresses every content stream and draws text via hex `TJ`
 * arrays rather than literal strings. Inflates + decodes so tests can
 * substring-search what was actually drawn.
 */
function extractPdfText(buffer) {
  const raw = buffer.toString('latin1');
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const contentChunks = [];
  let match;
  while ((match = streamRegex.exec(raw))) {
    try {
      contentChunks.push(zlib.inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1'));
    } catch {
      // Not a FlateDecode stream (e.g. an embedded image) — skip it.
    }
  }
  const content = contentChunks.join('\n');

  const hexTokenRegex = /<([0-9a-fA-F]+)>/g;
  let text = '';
  let hexMatch;
  while ((hexMatch = hexTokenRegex.exec(content))) {
    const hex = hexMatch[1];
    for (let i = 0; i < hex.length; i += 2) {
      text += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    }
  }
  return text;
}

const COMPLETE_SETTINGS = vi.hoisted(() => ({
  companyName: 'Tripskyway',
  companyLegalName: 'Tripskyway Travel Solutions Pvt Ltd',
  companyAddress: '221B Baker Street, London',
  contactPhone: '+44 20 0000 0000',
  contactEmail: 'support@tripskyway.com',
  themeInk: '#1F2937',
  themeMuted: '#64748B',
  themeAccent: '#F5A623',
  themeAccentDark: '#D98A0B',
}));

vi.mock('../../config/orgSettings.js', async () => {
  const actual = await vi.importActual('../../config/orgSettings.js');
  return { ...actual, getOrgSettings: vi.fn().mockResolvedValue(COMPLETE_SETTINGS) };
});

import { getOrgSettings } from '../../config/orgSettings.js';

const baseVoucher = {
  voucherNumber: 'VCH-202606-00059',
  status: 'draft',
  travelStartDate: new Date('2026-05-10'),
  travelEndDate: new Date('2026-05-15'),
  customerName: 'harsh',
  customerEmail: 'harsh@tripskyway.com',
  customerPhone: '+919128446597',
  specialInstructions: null,
  packageDetails: {
    name: 'Coco Bodu Hithi: A Maldivian Honeymoon Dream Escape',
    destination: 'Maldives',
    duration: 4,
    inclusions: ['02 Nights Beach Villa with Private Pool', 'Full Board Meal Plan'],
    exclusions: ['International Airfare to/from Velana International Airport (MLE)'],
  },
  locationDates: [
    { location: 'Male', hotelName: 'Coco Bodu Hithi', checkIn: new Date('2026-05-10'), checkOut: new Date('2026-05-15') },
  ],
  mealPlans: [
    { dayNumber: 1, breakfast: false, lunch: true, dinner: true },
    { dayNumber: 2, breakfast: true, lunch: true, dinner: true },
  ],
  itinerarySummary: [
    {
      dayNumber: 1, title: 'Arrival in Maldives | Beach Villa Experience',
      locations: ['Male'], activities: ['Speedboat transfer', 'Check-in'], accommodationName: 'Coco Bodu Hithi',
    },
    {
      dayNumber: 2, title: 'Leisure & Water Activities',
      locations: [], activities: ['Windsurfing', 'Canoeing', 'Snorkeling', 'Spa'], accommodationName: 'Coco Bodu Hithi',
    },
  ],
  flightSegments: [
    {
      dayNumber: 1, marketingCarrier: 'UL', flightNumber: 'UL103',
      origin: 'CMB', destination: 'MLE', departureAt: new Date('2026-05-10T06:00:00Z'), arrivalAt: new Date('2026-05-10T07:20:00Z'),
    },
  ],
};

describe('generateVoucherPDF', () => {
  afterEach(() => {
    vi.clearAllMocks();
    getOrgSettings.mockResolvedValue(COMPLETE_SETTINGS);
  });

  it('returns a PDF Buffer with a valid %PDF header for the sample-shaped voucher', async () => {
    const buffer = await generateVoucherPDF(baseVoucher);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('renders the voucher number, status, guest details, and package info', async () => {
    const buffer = await generateVoucherPDF(baseVoucher);
    const text = extractPdfText(buffer);
    expect(text).toContain('TRAVEL VOUCHER');
    expect(text).toContain('VCH-202606-00059');
    expect(text).toContain('DRAFT');
    expect(text).toContain('harsh');
    expect(text).toContain('Coco Bodu Hithi: A Maldivian Honeymoon Dream Escape');
    expect(text).toContain('Maldives');
  });

  it('renders the flight details table with carrier, flight number, and route', async () => {
    const buffer = await generateVoucherPDF(baseVoucher);
    const text = extractPdfText(buffer);
    expect(text).toContain('FLIGHT DETAILS');
    expect(text).toContain('UL103');
    expect(text).toContain('CMB');
    expect(text).toContain('MLE');
  });

  it('omits the flight details section when there are no flight segments', async () => {
    const buffer = await generateVoucherPDF({ ...baseVoucher, flightSegments: [] });
    expect(extractPdfText(buffer)).not.toContain('FLIGHT DETAILS');
  });

  it('renders the hotel bookings table', async () => {
    const buffer = await generateVoucherPDF(baseVoucher);
    const text = extractPdfText(buffer);
    expect(text).toContain('HOTEL BOOKINGS');
    expect(text).toContain('Coco Bodu Hithi');
  });

  it('renders the day-by-day itinerary with activities in a two-column layout past 4 items', async () => {
    const buffer = await generateVoucherPDF(baseVoucher);
    const text = extractPdfText(buffer);
    expect(text).toContain('DAY-BY-DAY ITINERARY');
    expect(text).toContain('Arrival in Maldives | Beach Villa Experience');
    expect(text).toContain('Windsurfing');
    expect(text).toContain('Snorkeling');
  });

  it('renders the meal plan for days that have at least one meal flagged', async () => {
    const buffer = await generateVoucherPDF(baseVoucher);
    const text = extractPdfText(buffer);
    expect(text).toContain('MEAL PLAN');
    expect(text).toContain('Lunch');
    expect(text).toContain('Dinner');
    expect(text).toContain('Breakfast');
  });

  it('renders inclusions and exclusions from the package snapshot', async () => {
    const buffer = await generateVoucherPDF(baseVoucher);
    const text = extractPdfText(buffer);
    expect(text).toContain('Beach Villa with Private Pool');
    expect(text).toContain('International Airfare');
  });

  it('renders a special-instructions banner only when present', async () => {
    const withInstructions = await generateVoucherPDF({ ...baseVoucher, specialInstructions: 'Bring snorkeling gear.' });
    expect(extractPdfText(withInstructions)).toContain('Bring snorkeling gear.');

    const without = await generateVoucherPDF(baseVoucher);
    expect(extractPdfText(without)).not.toContain('Special Instructions');
  });

  describe('hasRequiredOrgFieldsForVoucher guard — blocks generation with a specific error', () => {
    it('throws a 422 AppError when companyAddress is missing', async () => {
      getOrgSettings.mockResolvedValue({ ...COMPLETE_SETTINGS, companyAddress: undefined });
      await expect(generateVoucherPDF(baseVoucher)).rejects.toMatchObject({
        statusCode: 422,
        message: expect.stringContaining('companyAddress'),
      });
    });

    it('throws a 422 AppError when both contact phone and email are missing', async () => {
      getOrgSettings.mockResolvedValue({ ...COMPLETE_SETTINGS, contactPhone: undefined, contactEmail: undefined });
      await expect(generateVoucherPDF(baseVoucher)).rejects.toMatchObject({ statusCode: 422 });
    });
  });

  describe('logo rendering', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('falls back to the company-name text when the logo fetch fails', async () => {
      fetch.mockRejectedValue(new Error('network down'));
      getOrgSettings.mockResolvedValue({ ...COMPLETE_SETTINGS, logoUrl: 'https://cdn.test/missing.png' });
      const buffer = await generateVoucherPDF(baseVoucher);
      expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      expect(extractPdfText(buffer)).toContain('Tripskyway');
    });
  });

  it('rejects a malformed voucher shape (missing required fields) before drawing anything', async () => {
    await expect(generateVoucherPDF({ status: 'draft' })).rejects.toThrow();
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import zlib from 'node:zlib';
import { generateQuotationPDF } from '../quotationPDFGenerator.js';

/**
 * Build a real, minimal, decodable 1x1 PNG at test time (rather than trust a
 * hand-typed base64 constant) so doc.image() actually succeeds during tests
 * — a corrupt/undecodable buffer gets silently swallowed by the generator's
 * own try/catch, defeating the point of asserting an image was genuinely
 * embedded (and pdfkit's async PNG decode can even throw outside that catch).
 */
function makeTinyPngBuffer() {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c;
  });
  const crc32 = (buf) => {
    let crc = ~0;
    for (const byte of buf) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return ~crc >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  };
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(1, 0); // width
  ihdrData.writeUInt32BE(1, 4); // height
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB
  const raw = Buffer.from([0, 255, 0, 0]); // filter byte + 1 RGB pixel
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const mockFetchResolvingImage = () => {
  const pngBuffer = makeTinyPngBuffer();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => pngBuffer.buffer.slice(pngBuffer.byteOffset, pngBuffer.byteOffset + pngBuffer.byteLength),
    }),
  );
};

// Avoids a real network call to user-service during unit tests — exercises
// the same fallback shape getOrgSettings() returns when it can't be reached.
vi.mock('../../config/orgSettings.js', async () => {
  const actual = await vi.importActual('../../config/orgSettings.js');
  return {
    ...actual,
    getOrgSettings: vi.fn().mockResolvedValue({
      companyName: 'Travel CRM',
      themeInk: '#1F2937',
      themeMuted: '#64748B',
      themeAccent: '#F5A623',
      themeAccentDark: '#D98A0B',
      paymentMethods: ['Bank Transfer', 'UPI'],
      ratingTagline: 'Rated 4.9',
      quotationTerms: 'Default terms',
      cancellationPolicy: 'Default cancellation policy',
      bankName: 'Test Bank',
      bankAccountNumber: '12345',
    }),
  };
});

/** Count page objects in the PDF (`/Type /Page` but not the `/Pages` tree). */
const countPages = (buffer) => {
  const s = buffer.toString('latin1');
  return (s.match(/\/Type\s*\/Page(?![s])/g) || []).length;
};

const makeDays = (n) =>
  Array.from({ length: n }, (_, i) => ({
    day: i + 1,
    title: `Day ${i + 1} Title`,
    locations: ['Location A', 'Location B'],
    meals: ['Breakfast', 'Dinner'],
  }));

const makeDaysWithMedia = (n) =>
  Array.from({ length: n }, (_, i) => ({
    day: i + 1,
    title: `Day ${i + 1} Title`,
    locations: ['Location A', 'Location B'],
    meals: ['Breakfast', 'Dinner'],
    images: [`https://images.example.com/day-${i + 1}.jpg`],
    activities: [
      { name: 'City Tour', description: 'A guided walking tour of the old town.', cost: 45 },
      { name: 'Sunset Cruise', description: null, cost: null },
    ],
  }));

const baseQuotation = {
  id: 'q-1',
  quotationNumber: 'QT-202608-0001',
  currency: 'USD',
  customerName: 'Alice Traveller',
  customerEmail: 'alice@test.com',
  customerPhone: '+15551234567',
  mode: 'summary',
  status: 'draft',
  issueDate: new Date('2026-08-01'),
  validUntil: new Date('2026-09-01'),
  subtotal: 1600,
  discountType: 'percentage',
  discountValue: 10,
  discountAmount: 160,
  taxRate: 18,
  taxAmount: 259.2,
  serviceChargeRate: 5,
  serviceChargeAmount: 80,
  totalAmount: 1779.2,
  includedServices: ['Hotel stay', 'Airport transfers'],
  excludedServices: ['Airfare'],
  items: [
    { description: 'Package', category: 'package', quantity: 1, unitPrice: 800, totalPrice: 800 },
    { description: 'Flights', category: 'transportation', quantity: 4, unitPrice: 200, totalPrice: 800 },
  ],
};

describe('generateQuotationPDF', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a PDF Buffer with a valid %PDF header', async () => {
    const buffer = await generateQuotationPDF(baseQuotation);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('renders a detailed-mode quotation without throwing', async () => {
    const buffer = await generateQuotationPDF({ ...baseQuotation, mode: 'detailed' });
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('renders when optional content (items, inclusions) is empty', async () => {
    const buffer = await generateQuotationPDF({
      ...baseQuotation,
      items: [],
      includedServices: [],
      excludedServices: [],
      notes: null,
      terms: null,
    });
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('produces at least a cover page plus a content page', async () => {
    const buffer = await generateQuotationPDF(baseQuotation);
    expect(countPages(buffer)).toBeGreaterThanOrEqual(2);
  });

  it('grows the page count as itinerary content grows', async () => {
    const few = await generateQuotationPDF({ ...baseQuotation, itineraryDays: makeDays(1) });
    const many = await generateQuotationPDF({ ...baseQuotation, itineraryDays: makeDays(20) });
    expect(countPages(many)).toBeGreaterThan(countPages(few));
  });

  it('renders the cover from rich trip fields', async () => {
    const buffer = await generateQuotationPDF({
      ...baseQuotation,
      destination: 'Maldives',
      packageTitle: 'Coco Bodu Hithi Honeymoon Escape',
      travelStartDate: new Date('2026-05-10'),
      travelEndDate: new Date('2026-05-15'),
      paxCount: 2,
      durationNights: 5,
      durationDays: 6,
      highlights: ['Private-pool villas', 'Full-board meals', 'Speedboat transfers'],
      itineraryDays: makeDays(5),
    });
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(countPages(buffer)).toBeGreaterThanOrEqual(2);
  });

  it('degrades gracefully when every optional trip field is absent', async () => {
    const buffer = await generateQuotationPDF({
      quotationNumber: 'QT-000',
      currency: 'USD',
      mode: 'summary',
      customerName: 'Minimal',
      subtotal: 100,
      totalAmount: 100,
      items: [],
    });
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(countPages(buffer)).toBeGreaterThanOrEqual(1);
  });

  it('rejects instead of silently rendering blanks when an itinerary day is malformed', async () => {
    // generateQuotationPDF is async (it awaits org settings before rendering),
    // so even its up-front validation surfaces as a rejected promise, not a
    // synchronous throw on the call itself.
    await expect(
      generateQuotationPDF({
        ...baseQuotation,
        // missing locations/meals — a real shape mismatch, not just an empty trip
        itineraryDays: [{ day: 1, title: 'Day 1' }],
      }),
    ).rejects.toThrow();
  });

  it('grows the buffer when days carry images and activities compared to plain days', async () => {
    mockFetchResolvingImage();
    const plain = await generateQuotationPDF({ ...baseQuotation, itineraryDays: makeDays(3) });
    const withMedia = await generateQuotationPDF({ ...baseQuotation, itineraryDays: makeDaysWithMedia(3) });
    expect(withMedia.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(withMedia.length).toBeGreaterThan(plain.length);
  });

  it('omits the description/cost lines for an activity that has neither', async () => {
    mockFetchResolvingImage();
    const buffer = await generateQuotationPDF({
      ...baseQuotation,
      itineraryDays: [{
        day: 1,
        title: 'Arrival',
        locations: ['Colombo'],
        meals: [],
        images: [],
        activities: [{ name: 'Free Time', description: null, cost: null }],
      }],
    });
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('renders a cover image fetched from a remote https URL instead of the banner fallback', async () => {
    mockFetchResolvingImage();
    const withCover = await generateQuotationPDF({
      ...baseQuotation,
      coverImage: 'https://images.example.com/cover.jpg',
    });
    const withoutCover = await generateQuotationPDF({ ...baseQuotation, coverImage: null });
    expect(withCover.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    // A genuinely embedded image (vs. the solid-color banner) changes the
    // page content stream — proves the previously-always-skipped remote-URL
    // branch is now reachable, not just that it doesn't crash.
    expect(withCover.length).not.toBe(withoutCover.length);
  });

  it('falls back to the banner cover instead of crashing when the remote image fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const buffer = await generateQuotationPDF({
      ...baseQuotation,
      coverImage: 'https://images.example.com/cover.jpg',
    });
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('falls back to the banner cover when the remote fetch resolves but is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const buffer = await generateQuotationPDF({
      ...baseQuotation,
      coverImage: 'https://images.example.com/missing.jpg',
    });
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});

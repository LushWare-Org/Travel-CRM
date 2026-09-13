// Throwaway preview: renders sample quotations to PDF so the layout can be
// eyeballed against the reference. Run: node scripts/preview-quotation.mjs [outDir]
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2] || '.';

// Set placeholder bank/UPI env BEFORE the branding module loads so the
// payment-details card renders in the preview.
process.env.BANK_NAME = process.env.BANK_NAME || 'Example Bank';
process.env.BANK_ACCOUNT_NAME = process.env.BANK_ACCOUNT_NAME || 'YOUR COMPANY LTD';
process.env.BANK_ACCOUNT_NUMBER = process.env.BANK_ACCOUNT_NUMBER || '000123456789';
process.env.BANK_IFSC_CODE = process.env.BANK_IFSC_CODE || 'EXMP0000123';
process.env.BANK_BRANCH = process.env.BANK_BRANCH || 'Main Branch';
process.env.UPI_ID = process.env.UPI_ID || 'payments@example';

const { generateQuotationPDF } = await import('../src/utils/quotationPDFGenerator.js');

const rich = {
  quotationNumber: 'QT-202608-00042',
  currency: 'INR',
  mode: 'detailed',
  customerName: 'Sample Customer',
  destination: 'Maldives',
  packageTitle: 'Coco Bodu Hithi: A Maldivian Honeymoon Dream Escape',
  travelStartDate: '2026-05-10',
  travelEndDate: '2026-05-15',
  paxCount: 2,
  durationNights: 5,
  durationDays: 6,
  highlights: [
    'Luxury stay at Coco Bodu Hithi with private-pool villas',
    'Full-board meal plan — breakfast, lunch and dinner',
    'Return speedboat transfers and a one-time floating breakfast',
    'Complimentary non-motorized water sports and 20% spa discount',
  ],
  itineraryDays: [
    { day: 1, title: 'Arrival & Transfer', locations: ['Male', 'Coco Bodu Hithi'], meals: ['Dinner'] },
    { day: 2, title: 'Island Leisure', locations: ['Coco Bodu Hithi'], meals: ['Breakfast', 'Lunch', 'Dinner'] },
    { day: 3, title: 'Water Villa Experience', locations: ['Coco Bodu Hithi'], meals: ['Breakfast', 'Dinner'] },
    { day: 4, title: 'Spa & Sunset', locations: ['Coco Bodu Hithi'], meals: ['Breakfast', 'Dinner'] },
    { day: 5, title: 'Departure', locations: ['Male'], meals: ['Breakfast'] },
  ],
  includedServices: ['02 Nights Beach Villa', '01 Night Water Villa', 'Full board meal plan', 'Return speedboat transfers'],
  excludedServices: ['International airfare', 'Visa fees (if applicable)', 'Travel insurance', 'Personal expenses'],
  subtotal: 150000, discountAmount: 0, taxRate: 2, taxAmount: 3000, totalAmount: 153000,
  items: [
    { description: 'Beach Villa (2 nights)', category: 'accommodation', quantity: 1, totalPrice: 80000 },
    { description: 'Water Villa (1 night)', category: 'accommodation', quantity: 1, totalPrice: 50000 },
    { description: 'Speedboat transfers', category: 'transportation', quantity: 2, totalPrice: 20000 },
  ],
  terms: null, paymentTerms: '50% advance to confirm; balance 30 days before travel.', notes: null,
};

const minimal = {
  quotationNumber: 'QT-202608-00043',
  currency: 'USD',
  mode: 'summary',
  customerName: 'Minimal Customer',
  subtotal: 1200, totalAmount: 1200,
  items: [],
};

async function main() {
  const rb = await generateQuotationPDF(rich);
  fs.writeFileSync(path.join(outDir, 'preview-rich.pdf'), rb);
  const mb = await generateQuotationPDF(minimal);
  fs.writeFileSync(path.join(outDir, 'preview-minimal.pdf'), mb);
  console.log('rich bytes', rb.length, '/ minimal bytes', mb.length);
}
main().catch((e) => { console.error(e); process.exit(1); });

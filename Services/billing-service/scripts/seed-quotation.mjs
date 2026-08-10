// Seeds a sample branded quotation (Sri Lanka Heritage Explorer) with the trip
// snapshot fields the new PDF renders, then verifies it round-trips through the
// DB and generates a valid PDF. Idempotent (upsert). Run from billing-service:
//   node scripts/seed-quotation.mjs
import { PrismaClient } from '@prisma/client';
import { generateQuotationPDF } from '../src/utils/quotationPDFGenerator.js';

const prisma = new PrismaClient();

const ID = {
  quotation1: 'f0000000-0000-0000-0000-000000000003',
  lead2: 'd0000000-0000-0000-0000-000000000002',
  salesRep2: 'a0000000-0000-0000-0000-000000000004',
  pkg1: 'b0000000-0000-0000-0000-000000000001',
  invoice2: 'f0000000-0000-0000-0000-000000000002',
};

const trip = {
  destination: 'Sri Lanka',
  packageTitle: 'Sri Lanka Heritage Explorer',
  travelStartDate: new Date('2025-01-10'),
  travelEndDate: new Date('2025-01-13'),
  paxCount: 4,
  durationNights: 3,
  durationDays: 4,
  highlights: [
    'UNESCO heritage sites including Sigiriya Rock Fortress',
    'Temple of the Tooth & Kandy tea estates',
    'Relaxing beach day at Bentota',
    'Private guided tours with daily breakfast',
  ],
  itineraryDays: [
    { day: 1, title: 'Arrival in Colombo', locations: ['Colombo'], meals: ['Dinner'] },
    { day: 2, title: 'Sigiriya Rock Fortress', locations: ['Sigiriya'], meals: ['Breakfast', 'Lunch', 'Dinner'] },
    { day: 3, title: 'Kandy & Tea Estates', locations: ['Kandy'], meals: ['Breakfast', 'Dinner'] },
    { day: 4, title: 'Beach Day at Bentota', locations: ['Bentota'], meals: ['Breakfast', 'Lunch', 'Dinner'] },
  ],
};

async function main() {
  await prisma.quotation.upsert({
    where: { id: ID.quotation1 },
    update: trip,
    create: {
      ...trip,
      id: ID.quotation1,
      quotationNumber: 'QT-202412-00001',
      leadId: ID.lead2,
      createdById: ID.salesRep2,
      packageId: ID.pkg1,
      customerName: 'Rajesh Nair',
      customerEmail: 'rajesh.nair@outlook.com',
      customerPhone: '+919876543210',
      type: 'package_based',
      mode: 'detailed',
      subtotal: 4800, taxRate: 5, taxAmount: 214,
      discountType: 'fixed', discountValue: 200, discountAmount: 200,
      totalAmount: 4814, status: 'accepted',
      issueDate: new Date('2024-12-18'), validUntil: new Date('2025-01-18'),
      version: 1,
      includedServices: ['Airport transfers', 'Accommodation', 'Daily breakfast', 'Guided tours', 'Entry tickets'],
      excludedServices: ['International flights', 'Travel insurance', 'Lunch & dinner (except included days)', 'Personal expenses'],
      convertedToInvoiceId: ID.invoice2,
      items: {
        create: [
          { description: 'Sri Lanka Heritage Explorer — 4 persons', category: 'package', quantity: 4, unitPrice: 1100, totalPrice: 4400, order: 0 },
          { description: 'Child Activity Supplement', category: 'activity', quantity: 2, unitPrice: 200, totalPrice: 400, order: 1 },
        ],
      },
    },
  });

  // Verify it round-trips and renders.
  const row = await prisma.quotation.findUnique({
    where: { id: ID.quotation1 },
    include: { items: { orderBy: { order: 'asc' } } },
  });
  const pdf = await generateQuotationPDF(row);
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page(?![s])/g) || []).length;
  console.log('seeded quotation', row.quotationNumber,
    '| destination:', row.destination,
    '| itineraryDays:', Array.isArray(row.itineraryDays) ? row.itineraryDays.length : 0,
    '| PDF bytes:', pdf.length, '| pages:', pages);
  if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error('PDF invalid');
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());

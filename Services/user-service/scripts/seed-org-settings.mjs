// Seeds the OrganizationSettings singleton with realistic TEST data covering
// every field the invoice PDF's strict org-completeness guard
// (hasRequiredOrgFieldsForInvoice in billing-service/src/config/orgSettings.js)
// requires: company address, contact phone/email, and bank details. Also
// fills company legal name/GST and the invoice payment terms/instructions
// defaults so a generated invoice PDF looks complete end to end.
//
// All values below are clearly-labeled placeholders for this test-stage
// environment — not real business/banking credentials. Idempotent (upsert
// against the existing singleton row via getOrCreateSingleton()'s own
// convention: at most one row, created if missing, updated if present).
// Run from user-service:
//   node scripts/seed-org-settings.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_ORG_SETTINGS = {
  companyName: 'Travel CRM',
  companyShortName: 'TCRM',
  companyLegalName: 'Travel CRM Test Solutions Pvt Ltd',
  companyAddress: '42 Test Avenue, Sample District, Colombo 00700, Sri Lanka',
  companyGstNumber: '29TESTG1234A1Z5',
  tagline: 'Your Test-Stage Travel Partner',

  contactEmail: 'support@test.travelcrm.example',
  salesEmail: 'sales@test.travelcrm.example',
  contactPhone: '+1-555-010-0100',
  whatsappNumber: '+1-555-010-0100',
  website: 'https://test.travelcrm.example',

  bankName: 'Test National Bank',
  bankAccountName: 'TRAVEL CRM TEST SOLUTIONS',
  bankAccountNumber: '000123456789',
  bankIfscCode: 'TEST0001234',
  bankSwiftCode: 'TESTUS33XXX',
  bankBranch: 'Colombo Test Branch',
  bankAccountType: 'Current Account',
  upiId: 'travelcrmtest@upi',

  invoicePaymentTerms:
    'A non-refundable booking amount is required to confirm the package.\n' +
    'The remaining balance must be cleared prior to the departure date.\n' +
    'All bookings are subject to availability at the time of confirmation.\n' +
    'Cancellation charges will be applicable as per the cancellation policy.',
  invoicePaymentInstructions:
    'Please share the payment screenshot or UTR number after completing the transfer.\n' +
    'Booking will be processed only after the booking amount is received.',
};

async function main() {
  const existing = await prisma.organizationSettings.findFirst();
  const settings = existing
    ? await prisma.organizationSettings.update({ where: { id: existing.id }, data: TEST_ORG_SETTINGS })
    : await prisma.organizationSettings.create({ data: TEST_ORG_SETTINGS });

  console.log(existing ? 'Updated existing OrganizationSettings row:' : 'Created OrganizationSettings row:', settings.id);
  console.log('  companyAddress:', settings.companyAddress);
  console.log('  companyGstNumber:', settings.companyGstNumber);
  console.log('  bankName / bankAccountNumber:', settings.bankName, '/', settings.bankAccountNumber);
  console.log('  contactPhone / contactEmail:', settings.contactPhone, '/', settings.contactEmail);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

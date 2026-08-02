import prisma from '../db/client.js';
import { nextQuotationNumber } from '../utils/docNumber.js';
import { computeQuote } from '../../../shared/lead-pricing-engine/src/index.js';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const toItemsCreate = (items) =>
  (items || []).map((item, idx) => ({
    description: item.description,
    category: item.category || 'other',
    quantity: Number(item.quantity) || 1,
    unitPrice: Number(item.unitPrice) || 0,
    totalPrice: round2(Number(item.unitPrice) * (Number(item.quantity) || 1)),
    taxRate: item.taxRate != null ? Number(item.taxRate) : 0,
    notes: item.notes ?? null,
    order: item.order ?? idx,
  }));

/**
 * Document-level totals using the shared engine so billing and lead-service
 * always agree. Corrected order: discount applies before tax.
 * When `submitted` totals are provided they must match the engine exactly.
 */
export function quotationTotals(
  items = [],
  { taxRate = 0, serviceChargeRate = 0, discountType = 'none', discountValue = 0, submitted = {} } = {},
) {
  const quote = computeQuote({
    lines: (items || []).map((i) => ({
      basis: 'FIXED',
      estimatedUnit: Number(i.unitPrice) || 0,
      quantity: Number(i.quantity) || 1,
      description: i.description,
      category: i.category || 'other',
    })),
    travelers: 1,
    taxRate: Number(taxRate) || 0,
    discountType: discountType || 'none',
    discountValue: Number(discountValue) || 0,
    serviceChargeRate: Number(serviceChargeRate) || 0,
  });

  const totals = {
    subtotal: quote.sellSubtotal,
    discountAmount: quote.discountAmount,
    taxableSubtotal: quote.taxableSubtotal,
    taxAmount: quote.taxAmount,
    serviceChargeAmount: quote.serviceChargeAmount,
    totalAmount: quote.totalAmount,
  };

  if (submitted && typeof submitted.subtotal === 'number') {
    const matches =
      round2(submitted.subtotal) === totals.subtotal &&
      (submitted.totalAmount == null || round2(submitted.totalAmount) === totals.totalAmount);
    if (!matches) {
      throw new Error('Submitted quotation totals do not match computed totals');
    }
  }

  return totals;
}

/**
 * One versioned quotation per lead. Creates version 1 on first snapshot;
 * later snapshots bump the version, record revision history and replace items.
 */
export async function createOrVersionQuotation({
  leadId,
  packageId = null,
  currency = 'USD',
  customer = {},
  items = [],
  taxRate = 0,
  discountType = 'none',
  discountValue = 0,
  serviceChargeRate = 0,
  validUntil,
  notes = null,
  terms = null,
  paymentTerms = null,
  includedServices = [],
  excludedServices = [],
  createdById,
}) {
  const totals = quotationTotals(items, { taxRate, discountType, discountValue, serviceChargeRate });
  const existing = await prisma.quotation.findFirst({
    where: { leadId },
    orderBy: { version: 'desc' },
  });

  const baseData = {
    leadId,
    packageId,
    currency,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone ?? null,
    customerAddress: customer.address ?? null,
    ...totals,
    taxRate: Number(taxRate) || 0,
    discountType,
    discountValue: Number(discountValue) || 0,
    serviceChargeRate: Number(serviceChargeRate) || 0,
    validUntil: validUntil ?? new Date(Date.now() + 30 * 86400000),
    notes,
    terms,
    paymentTerms,
    includedServices,
    excludedServices,
  };

  if (!existing) {
    const quotationNumber = await nextQuotationNumber();
    return prisma.quotation.create({
      data: {
        ...baseData,
        quotationNumber,
        version: 1,
        createdById,
        items: { create: toItemsCreate(items) },
      },
    });
  }

  await prisma.quotationItem.deleteMany({ where: { quotationId: existing.id } });
  return prisma.quotation.update({
    where: { id: existing.id },
    data: {
      ...baseData,
      version: { increment: 1 },
      lastModifiedById: createdById,
      revisionHistory: {
        create: {
          version: existing.version,
          modifiedById: createdById,
          changes: JSON.stringify({ items, ...totals }),
        },
      },
      items: { create: toItemsCreate(items) },
    },
  });
}

import { describe, it, expect } from 'vitest';
import { InvoiceForPdf } from '../src/invoicePdf.js';

describe('InvoiceForPdf', () => {
  it('accepts the minimal shape the sample invoice needs (single item, no tax/discount)', () => {
    const row = {
      invoiceNumber: 'INV-202606-00062',
      customerName: 'harsh',
      items: [{ description: 'Travel Services', totalPrice: 143000 }],
      totalAmount: 143000,
    };
    expect(() => InvoiceForPdf.parse(row)).not.toThrow();
  });

  it('tolerates extra Invoice fields not modeled by the schema (status, timestamps, relation ids)', () => {
    const row = {
      invoiceNumber: 'INV-1',
      customerName: 'Alice',
      status: 'draft',
      leadId: 'lead-1',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    expect(() => InvoiceForPdf.parse(row)).not.toThrow();
  });

  it('coerces a Decimal-as-string item totalPrice', () => {
    const row = { invoiceNumber: 'INV-1', customerName: 'Alice', items: [{ description: 'Package', totalPrice: '450.00' }] };
    expect(InvoiceForPdf.parse(row).items[0].totalPrice).toBe(450);
  });

  it('requires invoiceNumber and customerName', () => {
    expect(() => InvoiceForPdf.parse({})).toThrow();
    expect(() => InvoiceForPdf.parse({ invoiceNumber: 'INV-1' })).toThrow();
  });

  it('accepts a full bank-details snapshot including bankUpiId', () => {
    const row = {
      invoiceNumber: 'INV-1',
      customerName: 'Alice',
      bankName: 'ICICI Bank',
      bankAccountName: 'TRIPSKYWAY',
      bankAccountNumber: '663705600957',
      bankIfscCode: 'ICIC0006637',
      bankUpiId: 'harsh8412@icici',
    };
    expect(() => InvoiceForPdf.parse(row)).not.toThrow();
  });
});

import { describe, it, expect } from 'vitest';
import { ReceiptForPdf } from '../src/paymentReceiptPdf.js';

describe('ReceiptForPdf', () => {
  it('accepts the minimal shape the sample receipt needs', () => {
    const row = {
      receiptNumber: 'REC-202606-00092',
      customerName: 'harsh',
      amount: 10000,
      invoice: { invoiceNumber: 'INV-202606-00062', totalAmount: 143000 },
    };
    expect(() => ReceiptForPdf.parse(row)).not.toThrow();
  });

  it('tolerates extra PaymentReceipt fields not modeled by the schema (receiptStatus, timestamps, relation ids)', () => {
    const row = {
      receiptNumber: 'REC-1',
      customerName: 'Alice',
      amount: 500,
      receiptStatus: 'partial_payment',
      leadId: 'lead-1',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    expect(() => ReceiptForPdf.parse(row)).not.toThrow();
  });

  it('coerces Decimal-as-string money fields', () => {
    const row = { receiptNumber: 'REC-1', customerName: 'Alice', amount: '450.00', previousBalance: '1000.00', outstandingBalance: '550.00' };
    const parsed = ReceiptForPdf.parse(row);
    expect(parsed.amount).toBe(450);
    expect(parsed.previousBalance).toBe(1000);
    expect(parsed.outstandingBalance).toBe(550);
  });

  it('requires receiptNumber, customerName and amount', () => {
    expect(() => ReceiptForPdf.parse({})).toThrow();
    expect(() => ReceiptForPdf.parse({ receiptNumber: 'REC-1', customerName: 'Alice' })).toThrow();
  });

  it('accepts a receipt with no linked invoice', () => {
    const row = { receiptNumber: 'REC-1', customerName: 'Alice', amount: 100, invoice: null };
    expect(() => ReceiptForPdf.parse(row)).not.toThrow();
  });

  it('tolerates extra fields on the nested invoice relation', () => {
    const row = {
      receiptNumber: 'REC-1',
      customerName: 'Alice',
      amount: 100,
      invoice: { invoiceNumber: 'INV-1', totalAmount: 500, status: 'sent', bookingId: 'BK-1' },
    };
    expect(() => ReceiptForPdf.parse(row)).not.toThrow();
  });
});

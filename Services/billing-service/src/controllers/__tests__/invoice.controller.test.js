import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFindUnique, mockGeneratePDF } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockGeneratePDF: vi.fn(),
}));

vi.mock('../../db/client.js', () => ({
  default: { invoice: { findUnique: mockFindUnique } },
}));
vi.mock('../../utils/invoicePDFGenerator.js', () => ({ generateInvoicePDF: mockGeneratePDF }));

import { downloadInvoicePDF } from '../invoice.controller.js';
import AppError from '../../utils/appError.js';

const invoice = { id: 'inv-1', invoiceNumber: 'INV-202608-00001', items: [] };

function mockRes() {
  return { json: vi.fn(), setHeader: vi.fn(), send: vi.fn(), status: vi.fn().mockReturnThis() };
}

async function run(req) {
  const res = mockRes();
  let nextErr;
  await downloadInvoicePDF(req, res, (err) => { nextErr = err; });
  return { res, nextErr };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFindUnique.mockResolvedValue(invoice);
});

describe('downloadInvoicePDF', () => {
  it('streams the generated PDF with the correct headers and status', async () => {
    mockGeneratePDF.mockResolvedValue(Buffer.from('%PDF-1.4 fake'));
    const { res, nextErr } = await run({ params: { id: 'inv-1' } });

    expect(nextErr).toBeUndefined();
    expect(mockGeneratePDF).toHaveBeenCalledWith(invoice);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('invoice-INV-202608-00001.pdf'));
    expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it('404s when the invoice does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);
    const { nextErr } = await run({ params: { id: 'missing' } });
    expect(nextErr).toBeDefined();
    expect(nextErr.statusCode).toBe(404);
    expect(mockGeneratePDF).not.toHaveBeenCalled();
  });

  it('propagates a 422 with a descriptive message when org settings are incomplete', async () => {
    mockGeneratePDF.mockRejectedValue(new AppError('Cannot generate invoice: organization settings are incomplete (missing: companyAddress).', 422));
    const { nextErr } = await run({ params: { id: 'inv-1' } });
    expect(nextErr).toBeDefined();
    expect(nextErr.statusCode).toBe(422);
    expect(nextErr.message).toMatch(/organization settings are incomplete/i);
  });
});

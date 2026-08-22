import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetOrgSettings, mockToBrandingShape, mockSendWhatsappTemplate } = vi.hoisted(() => ({
  mockGetOrgSettings: vi.fn(),
  mockToBrandingShape: vi.fn(),
  mockSendWhatsappTemplate: vi.fn(),
}));

vi.mock('../../config/orgSettings.js', () => ({
  getOrgSettings: mockGetOrgSettings,
  toBrandingShape: mockToBrandingShape,
}));
vi.mock('../../services/whatsapp.client.js', () => ({ sendWhatsappTemplate: mockSendWhatsappTemplate }));

const {
  sendQuotationWhatsapp, sendInvoiceWhatsapp, sendReceiptWhatsapp, sendVoucherWhatsapp,
} = await import('../whatsappService.js');

beforeEach(() => {
  mockGetOrgSettings.mockReset().mockResolvedValue({});
  mockToBrandingShape.mockReset().mockReturnValue({ company: { name: 'Acme Travel' } });
  mockSendWhatsappTemplate.mockReset().mockResolvedValue({ success: true });
});

describe('sendQuotationWhatsapp', () => {
  it('sends the quotation_ready template with the Document header and positional body params', async () => {
    await sendQuotationWhatsapp({
      quotation: {
        customerName: 'Jane', quotationNumber: 'QT-1', totalAmount: 100, currency: 'USD',
        validUntil: '2026-09-01',
      },
      phone: '+15551234567',
      mediaUrl: 'https://cdn.test/q.pdf',
    });

    expect(mockSendWhatsappTemplate).toHaveBeenCalledWith(expect.objectContaining({
      to: '+15551234567',
      templateName: 'quotation_ready',
      headerDocumentUrl: 'https://cdn.test/q.pdf',
      headerDocumentFilename: 'quotation-QT-1.pdf',
      bodyParams: ['Jane', 'Acme Travel', 'QT-1', '$100.00', expect.stringMatching(/2026|9\/1/)],
    }));
  });

  it('falls back to "there" and "N/A" when the customer name and valid-until date are missing', async () => {
    await sendQuotationWhatsapp({
      quotation: { quotationNumber: 'QT-2', totalAmount: 50, currency: 'USD' },
      phone: '+15551234567',
      mediaUrl: 'https://cdn.test/q.pdf',
    });

    const { bodyParams } = mockSendWhatsappTemplate.mock.calls[0][0];
    expect(bodyParams[0]).toBe('there');
    expect(bodyParams[4]).toBe('N/A');
  });
});

describe('sendInvoiceWhatsapp', () => {
  it('sends the invoice_ready template', async () => {
    await sendInvoiceWhatsapp({
      invoice: { customerName: 'Jane', invoiceNumber: 'INV-1', totalAmount: 200, currency: 'USD', dueDate: '2026-09-15' },
      phone: '+15551234567',
      mediaUrl: 'https://cdn.test/inv.pdf',
    });

    expect(mockSendWhatsappTemplate).toHaveBeenCalledWith(expect.objectContaining({
      templateName: 'invoice_ready',
      headerDocumentFilename: 'invoice-INV-1.pdf',
      bodyParams: expect.arrayContaining(['Jane', 'Acme Travel', 'INV-1', '$200.00']),
    }));
  });
});

describe('sendReceiptWhatsapp', () => {
  it('sends the payment_receipt_ready template, falling back to N/A when no linked invoice number', async () => {
    await sendReceiptWhatsapp({
      receipt: { customerName: 'Jane', receiptNumber: 'REC-1', amount: 75, currency: 'USD' },
      phone: '+15551234567',
      mediaUrl: 'https://cdn.test/rec.pdf',
    });

    expect(mockSendWhatsappTemplate).toHaveBeenCalledWith(expect.objectContaining({
      templateName: 'payment_receipt_ready',
      bodyParams: ['Jane', 'Acme Travel', 'REC-1', '$75.00', 'N/A'],
    }));
  });

  it('includes the linked invoice number when present', async () => {
    await sendReceiptWhatsapp({
      receipt: { customerName: 'Jane', receiptNumber: 'REC-2', amount: 75, currency: 'USD', invoice: { invoiceNumber: 'INV-9' } },
      phone: '+15551234567',
      mediaUrl: 'https://cdn.test/rec.pdf',
    });

    const { bodyParams } = mockSendWhatsappTemplate.mock.calls[0][0];
    expect(bodyParams[4]).toBe('INV-9');
  });
});

describe('sendVoucherWhatsapp', () => {
  it('sends the travel_voucher_ready template with a formatted travel date range', async () => {
    await sendVoucherWhatsapp({
      voucher: {
        customerName: 'Jane', voucherNumber: 'VOU-1',
        travelStartDate: '2026-05-10', travelEndDate: '2026-05-15',
      },
      phone: '+15551234567',
      mediaUrl: 'https://cdn.test/vou.pdf',
    });

    expect(mockSendWhatsappTemplate).toHaveBeenCalledWith(expect.objectContaining({
      templateName: 'travel_voucher_ready',
      headerDocumentFilename: 'voucher-VOU-1.pdf',
    }));
    const { bodyParams } = mockSendWhatsappTemplate.mock.calls[0][0];
    expect(bodyParams[3]).toContain('-');
  });

  it('uses N/A for travel dates when no start date is set', async () => {
    await sendVoucherWhatsapp({
      voucher: { customerName: 'Jane', voucherNumber: 'VOU-2' },
      phone: '+15551234567',
      mediaUrl: 'https://cdn.test/vou.pdf',
    });

    const { bodyParams } = mockSendWhatsappTemplate.mock.calls[0][0];
    expect(bodyParams[3]).toBe('N/A');
  });
});

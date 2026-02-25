import fs from 'fs';
import Lead from '../../../models/lead.model.js';
import Quotation from '../../../models/quotation.model.js';
import Invoice from '../../../models/invoice.model.js';
import PaymentReceipt from '../../../models/paymentReceipt.model.js';
import Voucher from '../../../models/voucher.model.js';
import BillingService from '../../billing.service.js';
import emailService from '../../../utils/emailService.js';
import { generateQuotationPDF, generateInvoicePDF, generateReceiptPDF } from '../../../utils/billingPDFGenerator.js';
import { generateVoucherPDF } from '../../../utils/voucherPDFGenerator.js';
import AIMemoryService from '../aiMemory.service.js';
import BaseAgent from './baseAgent.js';

class DocumentGenerationAgentService extends BaseAgent {
  constructor() {
    super('document-generation-agent');
  }

  shouldHandle(eventType) {
    return [
      'quotation.sent',
      'invoice.sent',
      'receipt.created',
      'booking.confirmed',
      'document.generate.requested',
    ].includes(eventType);
  }

  buildQuotationItems(lead) {
    const parsedBudget = Number(String(lead.budget || '').replace(/[^\d.]/g, ''));
    const unit = Number.isFinite(parsedBudget) && parsedBudget > 0 ? parsedBudget : 1000;
    return [
      {
        description: `${lead.destination || 'Travel'} package`,
        category: 'package',
        quantity: Math.max(1, Number(lead.numberOfTravelers || 1)),
        unitPrice: unit,
        totalPrice: unit * Math.max(1, Number(lead.numberOfTravelers || 1)),
      },
    ];
  }

  async createVoucherFromLead(lead, userId) {
    const voucher = await Voucher.create({
      lead: lead._id,
      package: lead.package || undefined,
      customizedPackage: lead.customizedPackage || undefined,
      customer: {
        name: lead.name || 'Guest',
        email: lead.email || 'guest@example.com',
        phone: lead.phone || '',
      },
      packageDetails: {
        name: lead.packageName || lead.destination || 'Travel Package',
        destination: lead.destination || lead.destinationCountry || '',
        duration: 0,
      },
      travelStartDate: lead.travelDate,
      travelEndDate: lead.endDate,
      status: 'draft',
      createdBy: userId,
    });
    return voucher;
  }

  async generateDocumentBundle({
    leadId,
    userId,
    types = ['quotation', 'invoice', 'voucher'],
    autoSend = false,
  }) {
    const lead = await Lead.findById(leadId).populate('package');
    if (!lead) {
      throw new Error('Lead not found');
    }

    const outputs = {};
    let quotation = null;
    let invoice = null;

    if (types.includes('quotation')) {
      quotation = await BillingService.createQuotation({
        lead: lead._id,
        customer: {
          name: lead.name || 'Guest',
          email: lead.email || 'guest@example.com',
          phone: lead.phone || '',
        },
        items: this.buildQuotationItems(lead),
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      }, userId);
      outputs.quotation = quotation;
    }

    if (types.includes('invoice')) {
      if (!quotation) {
        quotation = await Quotation.findOne({ lead: lead._id }).sort({ createdAt: -1 });
      }
      if (quotation) {
        invoice = await BillingService.convertQuotationToInvoice(quotation._id, userId, {
          type: 'proforma',
        });
        outputs.invoice = invoice;
      }
    }

    if (types.includes('receipt') && invoice) {
      const amount = Number(invoice.totalAmount || 0) > 0 ? Number(invoice.totalAmount) : 1;
      const receipt = await PaymentReceipt.create({
        lead: lead._id,
        invoice: invoice._id,
        customer: invoice.customer,
        amount,
        paymentMethod: 'online',
        paymentType: 'full-payment',
        createdBy: userId,
      });
      outputs.receipt = receipt;
    }

    if (types.includes('voucher')) {
      const voucher = await this.createVoucherFromLead(lead, userId);
      outputs.voucher = voucher;
    }

    if (autoSend) {
      await this.autoSend(outputs, lead);
    }

    await AIMemoryService.upsertMemory({
      scopeType: 'lead',
      scopeId: lead._id,
      memoryType: 'document',
      summary: `Generated documents: ${Object.keys(outputs).join(', ')}`,
      content: outputs,
      lastAgent: this.name,
      confidence: 0.76,
      tags: ['documents', 'automation'],
    });

    return outputs;
  }

  async autoSend(outputs, lead) {
    if (outputs.quotation && lead.email) {
      const pdfPath = await generateQuotationPDF(outputs.quotation, lead);
      await emailService.sendQuotationEmail({
        quotation: outputs.quotation,
        recipientEmail: lead.email,
        pdfPath,
      });
      await fs.promises.unlink(pdfPath).catch(() => null);
    }

    if (outputs.invoice && lead.email) {
      const pdfPath = await generateInvoicePDF(outputs.invoice, lead);
      await emailService.sendInvoiceEmail({
        invoice: outputs.invoice,
        recipientEmail: lead.email,
        pdfPath,
      });
      await fs.promises.unlink(pdfPath).catch(() => null);
    }

    if (outputs.receipt && lead.email) {
      const invoice = outputs.invoice || await Invoice.findById(outputs.receipt.invoice);
      const pdfPath = await generateReceiptPDF(outputs.receipt, invoice, lead);
      await emailService.sendReceiptEmail({
        receipt: outputs.receipt,
        invoice,
        recipientEmail: lead.email,
        pdfPath,
      });
      await fs.promises.unlink(pdfPath).catch(() => null);
    }

    if (outputs.voucher && lead.email) {
      const pdfBuffer = await generateVoucherPDF(outputs.voucher, lead);
      await emailService.sendVoucherEmail({
        to: lead.email,
        voucherNumber: outputs.voucher.voucherNumber,
        customerName: outputs.voucher.customer?.name || lead.name,
        packageName: outputs.voucher.packageDetails?.name || lead.packageName || 'Travel Package',
        pdfBuffer,
      });
    }
  }

  async execute(event) {
    if (event.type === 'document.generate.requested') {
      const result = await this.generateDocumentBundle({
        leadId: event.payload.leadId,
        userId: event.payload.userId,
        types: event.payload.types,
        autoSend: Boolean(event.payload.autoSend),
      });
      return { generated: Object.keys(result) };
    }

    if (event.type === 'booking.confirmed' && event.payload?.leadId && event.payload?.userId) {
      const result = await this.generateDocumentBundle({
        leadId: event.payload.leadId,
        userId: event.payload.userId,
        types: ['voucher'],
        autoSend: true,
      });
      return { generated: Object.keys(result) };
    }

    return { skipped: true, reason: `No action for ${event.type}` };
  }
}

export default new DocumentGenerationAgentService();

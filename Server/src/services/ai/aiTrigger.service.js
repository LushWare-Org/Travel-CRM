import aiEventBusService from './aiEventBus.service.js';

class AITriggerService {
  async publishLeadCreated(lead, source = 'lead.controller') {
    return aiEventBusService.publish({
      type: 'lead.created',
      source,
      payload: { leadId: String(lead._id) },
    });
  }

  async publishLeadUpdated(lead, source = 'lead.controller', metadata = {}) {
    return aiEventBusService.publish({
      type: 'lead.updated',
      source,
      payload: {
        leadId: String(lead._id),
        changedFields: Array.isArray(metadata.changedFields) ? metadata.changedFields : undefined,
      },
    });
  }

  async publishLeadStatusChanged(lead, previousStatus, source = 'lead.controller') {
    return aiEventBusService.publish({
      type: 'lead.status.changed',
      source,
      payload: {
        leadId: String(lead._id),
        previousStatus,
        newStatus: lead.status,
      },
    });
  }

  async publishQuotationSent(quotation, source = 'quotation.controller') {
    return aiEventBusService.publish({
      type: 'quotation.sent',
      source,
      payload: {
        leadId: String(quotation.lead),
        quotationId: String(quotation._id),
      },
    });
  }

  async publishInvoiceSent(invoice, source = 'invoice.controller') {
    return aiEventBusService.publish({
      type: 'invoice.sent',
      source,
      payload: {
        leadId: String(invoice.lead),
        invoiceId: String(invoice._id),
      },
    });
  }

  async publishBookingConfirmed({ bookingId, leadId, userId }, source = 'booking.controller') {
    return aiEventBusService.publish({
      type: 'booking.confirmed',
      source,
      payload: {
        bookingId: String(bookingId),
        leadId: String(leadId),
        userId: String(userId),
      },
    });
  }
}

export default new AITriggerService();

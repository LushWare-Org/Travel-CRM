import { describe, it, expect, afterAll } from 'vitest';
import { apiClient } from '../helpers/api-client.js';
import { getUserId } from '../helpers/auth-helper.js';
import { trackForCleanup, cleanupAll } from '../helpers/test-data-cleanup.js';

// One continuous, stateful business journey: create lead -> assign -> manual
// package selection -> pricing -> quotation -> send -> accept -> convert to
// invoice -> send -> payment receipt -> verify -> reconcile -> send.
//
// Every stage depends on the previous one's output (leadId, selectionId,
// quotationId, invoiceId, receiptId), so this is ONE describe.sequential
// block with shared state, not independent specs — vitest doesn't guarantee
// cross-file ordering, and these flows are inherently sequential anyway.
//
// A manual (non-package) selection is used throughout so this doesn't
// depend on any specific seeded Package row existing in package-service —
// pricing is supplied as an explicit cost-line array, which
// applySelectionPricing accepts directly (see
// Services/lead-service/src/controllers/lead-package-selection.controller.js).
describe.sequential('lead -> quotation -> invoice -> payment lifecycle', () => {
  const runId = process.env.E2E_RUN_ID || 'local';
  const leadEmail = `e2e-${runId}+lead@travelcrm.test`;

  let leadId;
  let selectionId;
  let quotationId;
  let invoiceId;
  let receiptId;

  it('creates a lead as a salesRep (auto-assigns to self)', async () => {
    const salesRepId = await getUserId('salesRep');

    const res = await apiClient.post('/leads', {
      role: 'salesRep',
      body: {
        name: `[E2E-${runId}] Test Lead`,
        email: leadEmail,
        phone: '+10000000001',
        destination: 'Paris',
        numberOfTravelers: 2,
        message: `Automated E2E lead (run ${runId})`,
      },
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(`[E2E-${runId}] Test Lead`);
    // createLead auto-assigns a salesRep-created lead to itself (see
    // lead.controller.js:createLead) — no separate assignment call needed
    // to get an assigned lead, but the next test exercises PATCH /:id/assign
    // explicitly anyway since it's a distinct, real endpoint.
    expect(res.body.data.assignedToId).toBe(salesRepId);

    leadId = res.body.data.id;
    trackForCleanup('lead', leadId);
  });

  it('re-assigns the lead via the dedicated assign endpoint (admin)', async () => {
    const salesRepId = await getUserId('salesRep');

    const res = await apiClient.patch(`/leads/${leadId}/assign`, {
      role: 'admin',
      body: { assignedTo: salesRepId },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.assignedToId).toBe(salesRepId);
  });

  it('creates a manual package selection on the lead', async () => {
    const res = await apiClient.post(`/leads/${leadId}/packages`, {
      role: 'salesRep',
      body: { isManual: true },
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isManual).toBe(true);
    selectionId = res.body.data.id;
  });

  it('saves an (empty) itinerary, which provisions the pricing row', async () => {
    const res = await apiClient.put(`/leads/${leadId}/packages/${selectionId}/itinerary`, {
      role: 'salesRep',
      body: { days: [] },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('applies explicit cost-line pricing to the selection', async () => {
    const res = await apiClient.post(`/leads/${leadId}/packages/${selectionId}/pricing/apply`, {
      role: 'salesRep',
      body: {
        lines: [
          {
            category: 'package',
            description: `[E2E-${runId}] Package price`,
            basis: 'FIXED',
            quantity: 1,
            estimatedUnitPrice: 1000,
          },
        ],
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.pricing.sellSubtotal)).toBeGreaterThan(0);
  });

  it('quotes the selection, creating a billing-service quotation', async () => {
    const res = await apiClient.post(`/leads/${leadId}/packages/${selectionId}/quote`, {
      role: 'salesRep',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.lead.lifecycleStatus).toBe('QUOTED');
    quotationId = res.body.data.quotation.id;
    expect(quotationId).toBeTruthy();
    trackForCleanup('quotation', quotationId);
  });

  it('sends the quotation by email', async () => {
    const res = await apiClient.post(`/billing/quotations/${quotationId}/send`, {
      role: 'salesRep',
      body: { channel: 'email', email: leadEmail },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('sent');
  });

  it('accepts the quotation', async () => {
    const res = await apiClient.post(`/billing/quotations/${quotationId}/accept`, {
      role: 'salesRep',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('accepted');
  });

  it('converts the accepted quotation to an invoice', async () => {
    const res = await apiClient.post(`/billing/quotations/${quotationId}/convert`, {
      role: 'salesRep',
      body: {},
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quotationId).toBe(quotationId);
    invoiceId = res.body.data.id;
    trackForCleanup('invoice', invoiceId);
  });

  it('sends the invoice by email', async () => {
    const res = await apiClient.post(`/billing/invoices/${invoiceId}/send`, {
      role: 'salesRep',
      body: { channel: 'email', email: leadEmail },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('sent');
  });

  it('records a full payment receipt against the invoice', async () => {
    // Fetch the invoice fresh rather than trusting a value captured before
    // "send" — send() doesn't change amounts, but this keeps the receipt
    // amount honest against whatever outstandingAmount actually is.
    const invoiceRes = await apiClient.get(`/billing/invoices/${invoiceId}`, { role: 'salesRep' });
    expect(invoiceRes.status).toBe(200);
    const outstanding = Number(invoiceRes.body.data.outstandingAmount);
    expect(outstanding).toBeGreaterThan(0);

    const res = await apiClient.post('/billing/receipts', {
      role: 'salesRep',
      body: {
        invoiceId,
        amount: outstanding,
        paymentMethod: 'cash',
        paymentType: 'full-payment',
        notes: `Automated E2E payment (run ${runId})`,
      },
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.amount)).toBe(outstanding);
    receiptId = res.body.data.id;
    trackForCleanup('receipt', receiptId);
  });

  it('lets an admin verify the payment receipt', async () => {
    const res = await apiClient.put(`/billing/receipts/${receiptId}/verify`, { role: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verified).toBe(true);
  });

  it('lets an admin reconcile the payment receipt', async () => {
    const res = await apiClient.put(`/billing/receipts/${receiptId}/reconcile`, { role: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reconciled).toBe(true);
  });

  it('sends the payment receipt by email', async () => {
    const res = await apiClient.post(`/billing/receipts/${receiptId}/send`, {
      role: 'salesRep',
      body: { channel: 'email', email: leadEmail },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  afterAll(async () => {
    await cleanupAll();
  });
});

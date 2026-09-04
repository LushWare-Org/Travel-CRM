import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const { mockGenerateStructured, mockPrisma, mockFetchPolicyDocuments, mockGetOrgSettings } = vi.hoisted(() => ({
  mockGenerateStructured: vi.fn(),
  mockPrisma: {
    package: { findMany: vi.fn(), findUnique: vi.fn() },
  },
  mockFetchPolicyDocuments: vi.fn(),
  mockGetOrgSettings: vi.fn(),
}));

vi.mock('../../ai/geminiClient.js', () => ({
  generateStructured: mockGenerateStructured,
  isAIConfigured: vi.fn(() => true),
}));

// app.js pulls in package.routes.js → db/client.js, which constructs a real
// PrismaClient at import time; mock it so this suite doesn't need DATABASE_URL.
vi.mock('../../db/client.js', () => ({ default: mockPrisma }));
vi.mock('../../config/policyDocuments.js', () => ({ fetchPolicyDocuments: mockFetchPolicyDocuments }));
vi.mock('../../config/orgSettings.js', () => ({ getOrgSettings: mockGetOrgSettings }));

const { default: app } = await import('../../app.js');

function basePackageRow(overrides = {}) {
  return {
    id: 'pkg-1',
    title: 'Bali Beach Escape',
    slug: 'bali-beach-escape',
    description: 'A relaxing beach getaway.',
    destination: 'Bali',
    durationDays: 5,
    category: 'FAMILY',
    coverImage: null,
    basePrice: 800,
    defaultMarginType: 'PERCENTAGE',
    defaultMarginInput: 20,
    currency: 'USD',
    isActive: true,
    isFeatured: false,
    rating: 4.5,
    numReviews: 3,
    views: 10,
    bookings: 2,
    images: [],
    itineraryDays: [],
    reviews: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchPolicyDocuments.mockResolvedValue([]);
  mockGetOrgSettings.mockResolvedValue({ supportEmail: 'support@lushtravel.example', whatsappNumber: '+960 555 0200' });
});

describe('POST /api/v1/packages/wizard-turn', () => {
  it('set_slot: merges slots and returns updatedWizardState, with no Authorization header (genuinely public)', async () => {
    mockGenerateStructured.mockResolvedValue({
      tool: 'set_slot',
      args: { slots: { destination: 'Bali', duration: 5 }, message: 'Great, 5 days in Bali!' },
    });

    const res = await request(app)
      .post('/api/v1/packages/wizard-turn')
      .send({ messages: [{ role: 'user', content: '5 days in Bali' }] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.toolCall.tool).toBe('set_slot');
    expect(res.body.data.updatedWizardState.slots).toEqual({ destination: 'Bali', duration: 5 });
    expect(res.body.data.uiComponent).toBe('slotPrompt');
    expect(res.body.data.message).toBe('Great, 5 days in Bali!');
  });

  it('propose_packages: queries real inventory and returns DB-validated packages', async () => {
    mockGenerateStructured.mockResolvedValue({
      tool: 'propose_packages',
      args: { criteria: { destination: 'Bali', maxPrice: 1000 }, message: 'Here are some options!' },
    });
    mockPrisma.package.findMany.mockResolvedValue([basePackageRow()]);

    const res = await request(app)
      .post('/api/v1/packages/wizard-turn')
      .send({ wizardState: { slots: { destination: 'Bali', duration: 5 } }, messages: [{ role: 'user', content: 'Show me options' }] });

    expect(res.status).toBe(200);
    expect(mockPrisma.package.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ isActive: true, basePrice: { lte: 1000 } }),
      take: 5,
    }));
    expect(res.body.data.serverResult.packages).toHaveLength(1);
    expect(res.body.data.serverResult.packages[0].id).toBe('pkg-1');
    expect(res.body.data.uiComponent).toBe('packageCards');
  });

  it('propose_packages: empty result never invents a package', async () => {
    mockGenerateStructured.mockResolvedValue({ tool: 'propose_packages', args: { criteria: { destination: 'Nowhere' } } });
    mockPrisma.package.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/v1/packages/wizard-turn')
      .send({ messages: [{ role: 'user', content: 'Show me options' }] });

    expect(res.body.data.serverResult.packages).toEqual([]);
  });

  it('propose_packages: a DB failure surfaces as a 500 rather than a fabricated package list', async () => {
    mockGenerateStructured.mockResolvedValue({ tool: 'propose_packages', args: { criteria: { destination: 'Bali' } } });
    mockPrisma.package.findMany.mockRejectedValue(new Error('connection reset'));

    const res = await request(app)
      .post('/api/v1/packages/wizard-turn')
      .send({ messages: [{ role: 'user', content: 'Show me options' }] });

    expect(res.status).toBe(500);
  });

  it('answer_policy_question: quotes the server-retrieved snippet verbatim when the model selects it', async () => {
    mockFetchPolicyDocuments.mockResolvedValue([
      { id: 'doc-1', title: 'Refund Policy', body: 'Cancellations within 30 days of departure are non-refundable except for medical emergencies with documentation.' },
    ]);
    mockGenerateStructured.mockResolvedValue({
      tool: 'answer_policy_question',
      args: { selectedSnippetIds: ['snippet-0'], message: "Here's what our policy says:" },
    });

    const res = await request(app)
      .post('/api/v1/packages/wizard-turn')
      .send({ messages: [{ role: 'user', content: 'Is my trip refundable if I cancel within 30 days?' }] });

    expect(res.body.data.serverResult.answered).toBe(true);
    expect(res.body.data.serverResult.snippets[0].quote).toBe(
      'Cancellations within 30 days of departure are non-refundable except for medical emergencies with documentation.',
    );
    expect(res.body.data.serverResult.snippets[0].docId).toBe('doc-1');
  });

  it('answer_policy_question: no matching snippet returns the fixed fallback, ignoring the model', async () => {
    mockFetchPolicyDocuments.mockResolvedValue([]);
    mockGenerateStructured.mockResolvedValue({
      tool: 'answer_policy_question',
      args: { selectedSnippetIds: ['snippet-0'], message: 'Made up policy text the model tried to author.' },
    });

    const res = await request(app)
      .post('/api/v1/packages/wizard-turn')
      .send({ messages: [{ role: 'user', content: 'What is your refund policy?' }] });

    expect(res.body.data.serverResult.answered).toBe(false);
    expect(res.body.data.serverResult.fallbackMessage).toMatch(/don't have a confirmed answer/);
    expect(res.body.data.serverResult.supportEmail).toBe('support@lushtravel.example');
  });

  it('answer_policy_question: model-authored-quote is discarded even if it selects a valid snippet id and also writes its own quote text', async () => {
    mockFetchPolicyDocuments.mockResolvedValue([
      { id: 'doc-1', title: 'Refund Policy', body: 'Full refunds are issued for cancellations made more than 30 days before departure.' },
    ]);
    mockGenerateStructured.mockResolvedValue({
      tool: 'answer_policy_question',
      args: { selectedSnippetIds: ['snippet-0'], message: 'We always offer bereavement fare refunds.', quote: 'A fabricated quote the model wrote.' },
    });

    const res = await request(app)
      .post('/api/v1/packages/wizard-turn')
      .send({ messages: [{ role: 'user', content: 'What is your refund policy for cancellations?' }] });

    expect(res.body.data.serverResult.snippets[0].quote).toBe(
      'Full refunds are issued for cancellations made more than 30 days before departure.',
    );
    expect(JSON.stringify(res.body.data.serverResult)).not.toContain('fabricated quote');
    expect(JSON.stringify(res.body.data.serverResult)).not.toContain('bereavement');
  });

  it('complete_wizard: valid package re-validated against the DB', async () => {
    mockGenerateStructured.mockResolvedValue({
      tool: 'complete_wizard',
      args: { selectedPackageId: 'pkg-1', message: 'Great choice!' },
    });
    mockPrisma.package.findUnique.mockResolvedValue(basePackageRow());

    const res = await request(app)
      .post('/api/v1/packages/wizard-turn')
      .send({ wizardState: { selectedPackageId: 'pkg-1' }, messages: [{ role: 'user', content: "I'll take it" }] });

    expect(res.body.data.uiComponent).toBe('complete');
    expect(res.body.data.serverResult.package.id).toBe('pkg-1');
  });

  it('complete_wizard: removed package returns an error uiComponent instead of throwing', async () => {
    mockGenerateStructured.mockResolvedValue({ tool: 'complete_wizard', args: { selectedPackageId: 'gone' } });
    mockPrisma.package.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/packages/wizard-turn')
      .send({ wizardState: { selectedPackageId: 'gone' }, messages: [{ role: 'user', content: "I'll take it" }] });

    expect(res.status).toBe(200);
    expect(res.body.data.uiComponent).toBe('error');
    expect(res.body.data.serverResult.error).toBe('PACKAGE_NOT_FOUND');
  });

  it('returns 502 when the model returns an unrecognized tool', async () => {
    mockGenerateStructured.mockResolvedValue({ tool: 'delete_everything', args: {} });

    const res = await request(app)
      .post('/api/v1/packages/wizard-turn')
      .send({ messages: [{ role: 'user', content: 'hi' }] });

    expect(res.status).toBe(502);
  });

  it('returns 400 when messages: []', async () => {
    const res = await request(app)
      .post('/api/v1/packages/wizard-turn')
      .send({ messages: [] });

    expect(res.status).toBe(400);
    expect(mockGenerateStructured).not.toHaveBeenCalled();
  });

  it('returns 503 when the AI client reports it is not configured', async () => {
    mockGenerateStructured.mockRejectedValue(Object.assign(new Error('AI generation is not configured'), { statusCode: 503 }));

    const res = await request(app)
      .post('/api/v1/packages/wizard-turn')
      .send({ messages: [{ role: 'user', content: 'hi' }] });

    expect(res.status).toBe(503);
  });
});

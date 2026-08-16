import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const { mockGenerateStructured, mockPrisma } = vi.hoisted(() => ({
  mockGenerateStructured: vi.fn(),
  mockPrisma: {
    package: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    activityCatalog: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('../../ai/geminiClient.js', () => ({
  generateStructured: mockGenerateStructured,
  isAIConfigured: vi.fn(() => true),
}));

// app.js pulls in package.routes.js → db/client.js, which constructs a real
// PrismaClient at import time; mock it so this suite doesn't need DATABASE_URL.
vi.mock('../../db/client.js', () => ({ default: mockPrisma }));

const { default: app } = await import('../../app.js');

function authHeaders() {
  return {
    'x-user-id': 'agent-1',
    'x-user-role': 'admin',
    'x-user-email': 'agent@test.com',
    'x-user-name': 'Test Agent',
    'x-user-permissions': '[]',
    'x-user-is-super-admin': 'false',
  };
}

const generatedPackage = {
  title: 'Bali Beach Escape',
  description: 'A relaxing beach getaway.',
  destination: 'Bali',
  durationDays: 2,
  price: 800,
  category: 'FAMILY',
  inclusions: ['Hotel'],
  exclusions: ['Flights'],
  days: [
    { dayNumber: 1, title: 'Arrival', locations: ['Denpasar'], activities: ['Beach Walk'], meals: { dinner: true }, transport: 'car' },
    { dayNumber: 2, title: 'Snorkeling', locations: ['Nusa Dua'], activities: ['Snorkeling Tour'], meals: { breakfast: true }, transport: 'boat' },
  ],
};

function mockedCreatedPackage(overrides = {}) {
  return {
    id: 'pkg-ai-1',
    title: generatedPackage.title,
    slug: 'bali-beach-escape-123',
    description: generatedPackage.description,
    destination: 'Bali',
    durationDays: 2,
    category: 'FAMILY',
    coverImage: null,
    inclusions: ['Hotel'],
    exclusions: ['Flights'],
    termsAndConditions: '',
    basePrice: 800,
    defaultMarginType: 'PERCENTAGE',
    defaultMarginInput: 20,
    currency: 'USD',
    isActive: false,
    isFeatured: false,
    rating: 0,
    numReviews: 0,
    views: 0,
    bookings: 0,
    createdBy: 'agent-1',
    images: [],
    itineraryDays: [
      {
        dayNumber: 1,
        title: 'Arrival',
        breakfastCount: 0,
        lunchCount: 0,
        dinnerCount: 1,
        places: [{ id: 'dp-1', placeId: null, customName: 'Denpasar', orderIndex: 0 }],
        activities: [{ id: 'da-1', activityId: 'act-1', activity: { id: 'act-1', name: 'Beach Walk', description: null, defaultCost: 0 }, costOverride: null, orderIndex: 0 }],
        transports: [{ id: 'dt-1', routeType: 'DAILY_ROUTING', transportMode: 'CAR', pricingModel: 'PER_VEHICLE', unitCost: 0, distanceKm: null, originPlaceId: null, destinationPlaceId: null }],
      },
    ],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('POST /api/v1/packages/generate-ai', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.activityCatalog.findUnique.mockResolvedValue(null);
    mockPrisma.activityCatalog.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: `act-${data.name}`, name: data.name, defaultCost: data.defaultCost ?? 0 })
    );
  });

  it('persists the AI-generated package with activity names resolved, not dropped', async () => {
    mockGenerateStructured.mockResolvedValue(generatedPackage);
    mockPrisma.package.create.mockResolvedValue(mockedCreatedPackage());

    const res = await request(app)
      .post('/api/v1/packages/generate-ai')
      .set(authHeaders())
      .send({ destination: 'Bali', duration: 2, category: 'family', packageType: 'Deluxe', description: 'water sports please' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.itineraryDays[0].activities[0].activity.name).toBe('Beach Walk');

    // Verify the free-text "description" field from the dialog actually reached the prompt.
    const promptArg = mockGenerateStructured.mock.calls[0][0].prompt;
    expect(promptArg).toContain('water sports please');
    expect(promptArg).toContain('Deluxe');

    // Verify the create payload routed activities through catalog resolution (activityId), not a bare `name`.
    const createArg = mockPrisma.package.create.mock.calls[0][0];
    const day1Activities = createArg.data.itineraryDays.create[0].activities.create;
    expect(day1Activities[0]).toEqual({ activityId: 'act-Beach Walk', costOverride: null, orderIndex: 0 });
  });

  it('scales the token budget with duration instead of using a fixed cap that truncates long itineraries', async () => {
    mockGenerateStructured.mockResolvedValue({ ...generatedPackage, durationDays: 20, days: generatedPackage.days });
    mockPrisma.package.create.mockResolvedValue(mockedCreatedPackage());

    await request(app)
      .post('/api/v1/packages/generate-ai')
      .set(authHeaders())
      .send({ destination: 'Bali', duration: 20 });

    const { maxOutputTokens } = mockGenerateStructured.mock.calls[0][0];
    expect(maxOutputTokens).toBe(1500 + 20 * 700);
    expect(maxOutputTokens).toBeGreaterThan(8192); // the old fixed cap that caused the truncation bug
  });

  it('pads the itinerary to exactly the requested duration when the model returns fewer days', async () => {
    mockGenerateStructured.mockResolvedValue({ ...generatedPackage, days: [generatedPackage.days[0]] });
    mockPrisma.package.create.mockResolvedValue(mockedCreatedPackage());

    await request(app)
      .post('/api/v1/packages/generate-ai')
      .set(authHeaders())
      .send({ destination: 'Bali', duration: 2 });

    const createArg = mockPrisma.package.create.mock.calls[0][0];
    expect(createArg.data.itineraryDays.create).toHaveLength(2);
  });

  it('returns 400 when destination is missing', async () => {
    const res = await request(app)
      .post('/api/v1/packages/generate-ai')
      .set(authHeaders())
      .send({ duration: 3 });

    expect(res.status).toBe(400);
    expect(mockGenerateStructured).not.toHaveBeenCalled();
  });

  it('returns 400 when duration exceeds the sanity cap', async () => {
    const res = await request(app)
      .post('/api/v1/packages/generate-ai')
      .set(authHeaders())
      .send({ destination: 'Bali', duration: 400 });

    expect(res.status).toBe(400);
    expect(mockGenerateStructured).not.toHaveBeenCalled();
  });

  it('returns 503 when the AI client reports it is not configured', async () => {
    mockGenerateStructured.mockRejectedValue(Object.assign(new Error('AI generation is not configured'), { statusCode: 503 }));

    const res = await request(app)
      .post('/api/v1/packages/generate-ai')
      .set(authHeaders())
      .send({ destination: 'Bali', duration: 2 });

    expect(res.status).toBe(503);
    expect(mockPrisma.package.create).not.toHaveBeenCalled();
  });

  it('returns 502 and never touches the database when the model output fails schema/JSON validation', async () => {
    mockGenerateStructured.mockRejectedValue(Object.assign(new Error('AI did not return valid JSON'), { statusCode: 502 }));

    const res = await request(app)
      .post('/api/v1/packages/generate-ai')
      .set(authHeaders())
      .send({ destination: 'Bali', duration: 2 });

    expect(res.status).toBe(502);
    expect(mockPrisma.package.create).not.toHaveBeenCalled();
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/packages/generate-ai')
      .send({ destination: 'Bali', duration: 2 });

    expect(res.status).toBe(401);
    expect(mockGenerateStructured).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/packages/generate-from-title', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns AI-generated marketing content without touching the database', async () => {
    mockGenerateStructured.mockResolvedValue({
      description: 'Great trip', highlights: ['Sunsets'], inclusions: ['Hotel'], exclusions: ['Flights'], termsAndConditions: 'Pay in full',
    });

    const res = await request(app)
      .post('/api/v1/packages/generate-from-title')
      .set(authHeaders())
      .send({ title: 'Sunset Getaway', destination: 'Bali', duration: 3, category: 'family' });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('Great trip');
    expect(mockPrisma.package.create).not.toHaveBeenCalled();
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/v1/packages/generate-from-title')
      .set(authHeaders())
      .send({ destination: 'Bali' });

    expect(res.status).toBe(400);
    expect(mockGenerateStructured).not.toHaveBeenCalled();
  });
});

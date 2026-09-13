import { describe, it, expect, afterAll } from 'vitest';
import { z } from 'zod';
import { WebsiteManualItineraryRequest, WebsiteManualItineraryResult, ManualItinerarySummary } from '@travel-crm/contracts';
import { apiClient } from '../helpers/api-client.js';
import { trackForCleanup, cleanupAll } from '../helpers/test-data-cleanup.js';

// Regression guard for the lead-service port (Phase 3), mirroring
// customized-packages.spec.js's approach: GET .../my-requests filters by
// the JWT's email, so the POST must use the same seeded "customer" account.
describe.sequential('client contract: manual itineraries', () => {
  const runId = process.env.E2E_RUN_ID || 'local';
  const CUSTOMER_EMAIL = 'david.kumar@gmail.com';
  let leadId;
  let manualItineraryId;

  it('POST /manual-itineraries/website accepts real-shaped days (string places, accommodation.rating)', async () => {
    const payload = WebsiteManualItineraryRequest.parse({
      name: `[E2E-${runId}] Manual Itinerary Test`,
      email: CUSTOMER_EMAIL,
      destination: 'Sri Lanka',
      destinationCountry: 'LK',
      travelDate: '2027-06-01',
      endDate: '2027-06-08',
      numberOfTravelers: 2,
      days: [
        {
          dayNumber: 1,
          title: 'Arrival',
          locations: ['Colombo'],
          activities: ['City tour'],
          accommodation: { name: 'Cinnamon Grand', type: 'hotel', rating: 4, address: '', contactNumber: '' },
          meals: { breakfast: true, lunch: false, dinner: true },
          places: ['Galle Face Green'],
          notes: 'Automated E2E contract test',
        },
      ],
    });

    const res = await apiClient.post('/manual-itineraries/website', { body: payload });
    expect(res.status).toBe(201);
    const parsed = WebsiteManualItineraryResult.safeParse(res.body?.data);
    if (!parsed.success) throw new Error(`WebsiteManualItineraryResult mismatch: ${JSON.stringify(parsed.error.issues)}`);
    expect(parsed.data.manualItineraryId).toBeTruthy();
    expect(parsed.data.leadId).toBeTruthy();
    leadId = parsed.data.leadId;
    manualItineraryId = parsed.data.manualItineraryId;
    trackForCleanup('lead', leadId);
  });

  it('GET /manual-itineraries/my-requests (authenticated as the same email) returns the just-created item', async () => {
    expect(manualItineraryId).toBeTruthy();
    const res = await apiClient.get('/manual-itineraries/my-requests', { role: 'customer' });
    expect(res.status).toBe(200);
    const parsed = z.array(ManualItinerarySummary).safeParse(res.body?.data);
    if (!parsed.success) throw new Error(`ManualItinerarySummary[] mismatch: ${JSON.stringify(parsed.error.issues)}`);
    const found = parsed.data.find((item) => item.id === manualItineraryId);
    expect(found).toBeTruthy();
  });

  afterAll(async () => {
    await cleanupAll();
  });
});

import { describe, it, expect, afterAll } from 'vitest';
import { z } from 'zod';
import { Vacancy, CareerApplicationRequest } from '@travel-crm/contracts';
import { apiClient } from '../helpers/api-client.js';
import { trackForCleanup, cleanupAll } from '../helpers/test-data-cleanup.js';

describe.sequential('client contract: careers', () => {
  const runId = process.env.E2E_RUN_ID || 'local';
  let vacancy;

  it('GET /vacancies returns an envelope whose data matches Vacancy[] (bare array, not { vacancies })', async () => {
    const res = await apiClient.get('/vacancies');
    expect(res.status).toBe(200);
    const parsed = z.array(Vacancy).safeParse(res.body?.data);
    if (!parsed.success) throw new Error(`Vacancy[] mismatch: ${JSON.stringify(parsed.error.issues)}`);
    expect(parsed.data.length).toBeGreaterThan(0);
    vacancy = parsed.data[0];
  });

  it('POST /careers/apply accepts a CareerApplicationRequest-shaped payload', async () => {
    expect(vacancy).toBeTruthy();
    const payload = CareerApplicationRequest.parse({
      fullName: `[E2E-${runId}] Applicant`,
      email: `e2e-${runId}+applicant@travelcrm.test`,
      phone: '+10000000000',
      position: vacancy.position,
      coverLetter: 'Automated E2E contract test application.',
      agreeTerms: true,
      resumeUrl: 'https://example.com/e2e-fixtures/resume.pdf',
      resumeFileName: 'resume.pdf',
    });

    const res = await apiClient.post('/careers/apply', { body: payload });
    expect(res.status).toBe(201);
    expect(res.body?.data?.application?.id).toBeTruthy();
    trackForCleanup('career-application', res.body.data.application.id);
  });

  afterAll(async () => {
    await cleanupAll();
  });
});

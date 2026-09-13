import { describe, it, expect, afterAll } from 'vitest';
import { apiClient } from '../helpers/api-client.js';
import { trackForCleanup, cleanupAll } from '../helpers/test-data-cleanup.js';

// Public apply -> staff review -> status update. No lead/billing entanglement,
// so this is the cheapest flow to get green and doubles as the smoke test for
// the whole harness (health-wait, real JWT auth, cleanup wiring).
describe.sequential('career application funnel', () => {
  const runId = process.env.E2E_RUN_ID || 'local';
  const applicantEmail = `e2e-${runId}+applicant@travelcrm.test`;
  let vacancyPosition;
  let applicationId;

  it('finds an active vacancy via the public endpoint', async () => {
    const res = await apiClient.get('/vacancies');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    vacancyPosition = res.body.data[0].position;
    expect(typeof vacancyPosition).toBe('string');
  });

  it('submits an application for that position (public, unauthenticated)', async () => {
    const res = await apiClient.post('/careers/apply', {
      body: {
        fullName: `[E2E-${runId}] Applicant`,
        email: applicantEmail,
        phone: '+10000000000',
        position: vacancyPosition,
        coverLetter: `Automated E2E test application (run ${runId}).`,
        agreeTerms: true,
        resumeUrl: 'https://example.com/e2e-fixtures/resume.pdf',
        resumeFileName: 'resume.pdf',
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.application.email).toBe(applicantEmail);
    expect(res.body.data.application.status).toBe('pending');
    applicationId = res.body.data.application.id;
    trackForCleanup('career-application', applicationId);
  });

  it('rejects a second application for the same position/email', async () => {
    const res = await apiClient.post('/careers/apply', {
      body: {
        fullName: `[E2E-${runId}] Applicant`,
        email: applicantEmail,
        phone: '+10000000000',
        position: vacancyPosition,
        coverLetter: 'Duplicate attempt.',
        agreeTerms: true,
        resumeUrl: 'https://example.com/e2e-fixtures/resume.pdf',
      },
    });
    expect(res.status).toBe(400);
  });

  it('lets staff see the application in the submissions list', async () => {
    // Default listing is paginated (limit=10) oldest-first — with 50+ real
    // seed applications already in the shared DB, our just-created row would
    // be off the end of page 1. Sort newest-first instead of guessing a page
    // size large enough to cover however much seed data exists.
    const res = await apiClient.get('/careers/submissions?sortBy=-createdAt&limit=5', { role: 'admin' });
    expect(res.status).toBe(200);
    const found = res.body.data.applications.find((a) => a.id === applicationId);
    expect(found).toBeTruthy();
    expect(found.email).toBe(applicantEmail);
  });

  it('lets staff move the application to under-review', async () => {
    const res = await apiClient.patch(`/careers/submissions/${applicationId}`, {
      role: 'admin',
      body: { status: 'under-review', adminNotes: 'Reviewed by E2E suite' },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.application.status).toBe('under-review');
    expect(res.body.data.application.adminNotes).toBe('Reviewed by E2E suite');
  });

  afterAll(async () => {
    await cleanupAll();
  });
});

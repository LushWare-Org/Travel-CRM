import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockVacancyFindFirst, mockVacancyUpdate,
  mockCareerFindFirst, mockCareerCreate, mockCareerFindUnique, mockCareerUpdate,
  mockSendApplicantConfirmation, mockSendAdminApplicationNotice, mockSendApplicationStatusUpdate,
} = vi.hoisted(() => ({
  mockVacancyFindFirst: vi.fn(),
  mockVacancyUpdate: vi.fn(),
  mockCareerFindFirst: vi.fn(),
  mockCareerCreate: vi.fn(),
  mockCareerFindUnique: vi.fn(),
  mockCareerUpdate: vi.fn(),
  mockSendApplicantConfirmation: vi.fn(),
  mockSendAdminApplicationNotice: vi.fn(),
  mockSendApplicationStatusUpdate: vi.fn(),
}));

vi.mock('../../db/client.js', () => ({
  default: {
    vacancy: { findFirst: mockVacancyFindFirst, update: mockVacancyUpdate },
    career: { findFirst: mockCareerFindFirst, create: mockCareerCreate, findUnique: mockCareerFindUnique, update: mockCareerUpdate },
  },
}));

vi.mock('../../utils/email.js', () => ({
  sendApplicantConfirmation: mockSendApplicantConfirmation,
  sendAdminApplicationNotice: mockSendAdminApplicationNotice,
  sendApplicationStatusUpdate: mockSendApplicationStatusUpdate,
}));

const { applyForPosition, updateApplicationStatus } = await import('../career.controller.js');

function buildReqRes(body = {}, { user, params = {} } = {}) {
  const req = { body, params, user, log: { error: vi.fn(), warn: vi.fn() } };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return { req, res };
}

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('applyForPosition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_EMAILS = 'admin@test.com';
  });

  it('creates the application and returns 201 even when sending the confirmation email fails', async () => {
    mockVacancyFindFirst.mockResolvedValue({ id: 'vac-1', position: 'Travel Consultant' });
    mockCareerFindFirst.mockResolvedValue(null);
    mockCareerCreate.mockResolvedValue({ id: 'app-1', fullName: 'Jane Doe', email: 'jane@test.com' });
    mockVacancyUpdate.mockResolvedValue({});
    mockSendApplicantConfirmation.mockRejectedValue(new Error('SMTP down'));
    mockSendAdminApplicationNotice.mockResolvedValue({ success: true });

    const { req, res } = buildReqRes({
      fullName: 'Jane Doe', email: 'jane@test.com', phone: '555-0100', position: 'Travel Consultant',
      coverLetter: 'I love travel', agreeTerms: true, resumeUrl: 'https://cdn.test/resume.pdf',
    });

    await applyForPosition(req, res, vi.fn());
    await flush();

    expect(res.status).toHaveBeenCalledWith(201);
    expect(req.log.error).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jane@test.com' }),
      'Failed to send applicant confirmation email',
    );
  });

  it('sends the admin notice with phone and resumeUrl when ADMIN_EMAILS is configured', async () => {
    mockVacancyFindFirst.mockResolvedValue({ id: 'vac-1', position: 'Travel Consultant' });
    mockCareerFindFirst.mockResolvedValue(null);
    mockCareerCreate.mockResolvedValue({ id: 'app-1' });
    mockVacancyUpdate.mockResolvedValue({});
    mockSendApplicantConfirmation.mockResolvedValue({ success: true });
    mockSendAdminApplicationNotice.mockResolvedValue({ success: true });

    const { req, res } = buildReqRes({
      fullName: 'Jane Doe', email: 'jane@test.com', phone: '555-0100', position: 'Travel Consultant',
      coverLetter: 'I love travel', agreeTerms: true, resumeUrl: 'https://cdn.test/resume.pdf',
    });

    await applyForPosition(req, res, vi.fn());
    await flush();

    expect(mockSendAdminApplicationNotice).toHaveBeenCalledWith(expect.objectContaining({
      to: ['admin@test.com'], phone: '555-0100', resumeUrl: 'https://cdn.test/resume.pdf',
    }));
  });

  it('skips the admin notice and logs a warning when ADMIN_EMAILS is not configured', async () => {
    delete process.env.ADMIN_EMAILS;
    mockVacancyFindFirst.mockResolvedValue({ id: 'vac-1', position: 'Travel Consultant' });
    mockCareerFindFirst.mockResolvedValue(null);
    mockCareerCreate.mockResolvedValue({ id: 'app-1' });
    mockVacancyUpdate.mockResolvedValue({});
    mockSendApplicantConfirmation.mockResolvedValue({ success: true });

    const { req, res } = buildReqRes({
      fullName: 'Jane Doe', email: 'jane@test.com', phone: '555-0100', position: 'Travel Consultant',
      coverLetter: 'I love travel', agreeTerms: true, resumeUrl: 'https://cdn.test/resume.pdf',
    });

    await applyForPosition(req, res, vi.fn());
    await flush();

    expect(mockSendAdminApplicationNotice).not.toHaveBeenCalled();
    expect(req.log.warn).toHaveBeenCalledWith('ADMIN_EMAILS is not configured — skipping admin notification email');
  });
});

describe('updateApplicationStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a status-update email when transitioning to under-review', async () => {
    mockCareerFindUnique.mockResolvedValue({ id: 'app-1', email: 'jane@test.com', fullName: 'Jane Doe', position: 'Travel Consultant', status: 'pending' });
    mockCareerUpdate.mockResolvedValue({ id: 'app-1', status: 'under-review' });
    mockSendApplicationStatusUpdate.mockResolvedValue({ success: true });

    const { req, res } = buildReqRes({ status: 'under-review' }, { user: { id: 'admin-1' }, params: { id: 'app-1' } });

    await updateApplicationStatus(req, res, vi.fn());
    await flush();

    expect(mockSendApplicationStatusUpdate).toHaveBeenCalledWith(expect.objectContaining({
      to: 'jane@test.com', status: 'under-review',
    }));
  });

  it('does not send a status-update email when the status is left as pending', async () => {
    mockCareerFindUnique.mockResolvedValue({ id: 'app-1', email: 'jane@test.com', fullName: 'Jane Doe', position: 'Sales', status: 'pending' });
    mockCareerUpdate.mockResolvedValue({ id: 'app-1', status: 'pending' });

    const { req, res } = buildReqRes({ adminNotes: 'reviewing' }, { user: { id: 'admin-1' }, params: { id: 'app-1' } });

    await updateApplicationStatus(req, res, vi.fn());
    await flush();

    expect(mockSendApplicationStatusUpdate).not.toHaveBeenCalled();
  });

  it('does not fail the request when the status-update email fails to send', async () => {
    mockCareerFindUnique.mockResolvedValue({ id: 'app-1', email: 'jane@test.com', fullName: 'Jane Doe', position: 'Sales', status: 'pending' });
    mockCareerUpdate.mockResolvedValue({ id: 'app-1', status: 'rejected' });
    mockSendApplicationStatusUpdate.mockRejectedValue(new Error('SMTP down'));

    const { req, res } = buildReqRes({ status: 'rejected' }, { user: { id: 'admin-1' }, params: { id: 'app-1' } });

    await updateApplicationStatus(req, res, vi.fn());
    await flush();

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    expect(req.log.error).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSendViaNotificationService } = vi.hoisted(() => ({ mockSendViaNotificationService: vi.fn() }));

vi.mock('../../services/email.client.js', () => ({ sendEmail: mockSendViaNotificationService }));

const { sendApplicantConfirmation, sendAdminApplicationNotice, sendApplicationStatusUpdate, getStatusMessage } = await import('../email.js');

describe('career-service email templates', () => {
  beforeEach(() => {
    mockSendViaNotificationService.mockReset();
    mockSendViaNotificationService.mockResolvedValue({ success: true });
  });

  it('sendApplicantConfirmation renders a full HTML document with a preheader and a non-empty text alternative', async () => {
    await sendApplicantConfirmation({ to: 'jane@test.com', fullName: 'Jane Doe', position: 'Travel Consultant' });

    const call = mockSendViaNotificationService.mock.calls[0][0];
    expect(call.html).toContain('<!DOCTYPE html>');
    expect(call.html).toContain('mso-hide:all');
    expect(call.html).toContain('Jane Doe');
    expect(call.text.length).toBeGreaterThan(0);
    expect(call.text).toContain('Jane Doe');
  });

  it('escapes HTML-significant characters in the applicant name so markup cannot be injected', async () => {
    await sendApplicantConfirmation({ to: 'x@test.com', fullName: '<script>alert(1)</script>', position: 'Sales' });

    const call = mockSendViaNotificationService.mock.calls[0][0];
    expect(call.html).not.toContain('<script>alert(1)</script>');
    expect(call.html).toContain('&lt;script&gt;');
  });

  it('sendAdminApplicationNotice includes phone and a resume link when provided', async () => {
    await sendAdminApplicationNotice({
      to: ['admin@test.com'],
      fullName: 'Jane Doe',
      position: 'Travel Consultant',
      email: 'jane@test.com',
      phone: '+1-555-0100',
      resumeUrl: 'https://cdn.test/resume.pdf',
    });

    const call = mockSendViaNotificationService.mock.calls[0][0];
    expect(call.html).toContain('+1-555-0100');
    expect(call.html).toContain('https://cdn.test/resume.pdf');
    expect(call.text).toContain('+1-555-0100');
  });

  it('sendAdminApplicationNotice omits the phone row when phone is not provided', async () => {
    await sendAdminApplicationNotice({ to: ['admin@test.com'], fullName: 'Jane', position: 'Sales', email: 'jane@test.com' });

    const call = mockSendViaNotificationService.mock.calls[0][0];
    expect(call.html).not.toContain('>Phone<');
  });

  it('getStatusMessage returns the specific "under review" copy for the hyphenated status value', () => {
    // Regression test: validStatuses in career.controller.js uses 'under-review' (hyphenated).
    // The old messages lookup used 'under_review' (underscore) and never matched, silently
    // falling back to the generic message instead.
    expect(getStatusMessage('under-review')).toBe('Your application is under review.');
  });

  it('getStatusMessage falls back to a generic message for an unrecognized status', () => {
    expect(getStatusMessage('some-unknown-status')).toBe('Your application status has been updated.');
  });

  it('sendApplicationStatusUpdate renders the correct message for status "under-review"', async () => {
    await sendApplicationStatusUpdate({ to: 'jane@test.com', fullName: 'Jane Doe', position: 'Sales', status: 'under-review' });

    const call = mockSendViaNotificationService.mock.calls[0][0];
    expect(call.html).toContain('Your application is under review.');
    expect(call.text).toContain('Your application is under review.');
  });

  it('sendApplicationStatusUpdate includes feedback when provided', async () => {
    await sendApplicationStatusUpdate({ to: 'jane@test.com', fullName: 'Jane', position: 'Sales', status: 'rejected', feedback: 'Not enough experience.' });

    const call = mockSendViaNotificationService.mock.calls[0][0];
    expect(call.html).toContain('Not enough experience.');
    expect(call.text).toContain('Not enough experience.');
  });
});

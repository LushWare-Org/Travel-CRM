import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSendViaNotificationService } = vi.hoisted(() => ({ mockSendViaNotificationService: vi.fn() }));

vi.mock('../../services/email.client.js', () => ({ sendEmail: mockSendViaNotificationService }));

const { sendLeadAssignmentEmail } = await import('../email.js');

describe('sendLeadAssignmentEmail', () => {
  beforeEach(() => {
    mockSendViaNotificationService.mockReset();
    mockSendViaNotificationService.mockResolvedValue({ success: true });
  });

  it('renders a full HTML document with a preheader and a non-empty text alternative', async () => {
    await sendLeadAssignmentEmail({
      salesRep: { name: 'Sam Rep', email: 'sam@test.com' },
      lead: { id: 'lead-1', name: 'Jane Doe', email: 'jane@test.com', phone: '555-0100', destination: 'Bali' },
      assignmentMode: 'auto',
    });

    const call = mockSendViaNotificationService.mock.calls[0][0];
    expect(call.to).toBe('sam@test.com');
    expect(call.html).toContain('<!DOCTYPE html>');
    expect(call.html).toContain('mso-hide:all');
    expect(call.text.length).toBeGreaterThan(0);
  });

  it('includes phone and destination in the info table when provided', async () => {
    await sendLeadAssignmentEmail({
      salesRep: { name: 'Sam Rep', email: 'sam@test.com' },
      lead: { id: 'lead-1', name: 'Jane Doe', email: 'jane@test.com', phone: '555-0100', destination: 'Bali' },
      assignmentMode: 'auto',
    });

    const call = mockSendViaNotificationService.mock.calls[0][0];
    expect(call.html).toContain('555-0100');
    expect(call.html).toContain('Bali');
    expect(call.text).toContain('555-0100');
    expect(call.text).toContain('Bali');
  });

  it('omits phone/destination rows when not provided, without leaving blank table rows', async () => {
    await sendLeadAssignmentEmail({
      salesRep: { name: 'Sam Rep', email: 'sam@test.com' },
      lead: { id: 'lead-1', name: 'Jane Doe', email: 'jane@test.com' },
      assignmentMode: 'auto',
    });

    const call = mockSendViaNotificationService.mock.calls[0][0];
    expect(call.html).not.toContain('>Phone<');
    expect(call.html).not.toContain('>Destination<');
  });

  it('escapes HTML-significant characters in the lead name', async () => {
    await sendLeadAssignmentEmail({
      salesRep: { name: 'Sam Rep', email: 'sam@test.com' },
      lead: { id: 'lead-1', name: '<img src=x onerror=alert(1)>', email: 'jane@test.com' },
      assignmentMode: 'auto',
    });

    const call = mockSendViaNotificationService.mock.calls[0][0];
    expect(call.html).not.toContain('<img src=x onerror=alert(1)>');
  });

  it('labels manual assignments with the assigning admin\'s name', async () => {
    await sendLeadAssignmentEmail({
      salesRep: { name: 'Sam Rep', email: 'sam@test.com' },
      lead: { id: 'lead-1', name: 'Jane Doe', email: 'jane@test.com' },
      assignmentMode: 'manual',
      assignedBy: { name: 'Admin Alice' },
    });

    const call = mockSendViaNotificationService.mock.calls[0][0];
    expect(call.html).toContain('By Admin Alice');
  });
});

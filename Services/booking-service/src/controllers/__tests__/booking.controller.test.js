import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQueryRaw, mockExecuteRaw, mockBookingCreate, mockSendLeadAssignmentEmail } = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
  mockExecuteRaw: vi.fn(),
  mockBookingCreate: vi.fn(),
  mockSendLeadAssignmentEmail: vi.fn(),
}));

vi.mock('../../db/client.js', () => ({
  default: {
    $queryRaw: mockQueryRaw,
    $executeRaw: mockExecuteRaw,
    booking: { create: mockBookingCreate },
  },
}));

vi.mock('../../utils/email.js', () => ({
  sendLeadAssignmentEmail: mockSendLeadAssignmentEmail,
}));

const { createWebsiteBooking } = await import('../booking.controller.js');

function buildReqRes(body) {
  const req = { body, log: { warn: vi.fn(), error: vi.fn() } };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return { req, res };
}

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

describe('createWebsiteBooking — lead assignment email', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // $queryRaw call order: findPackageById, findUserByEmail, autoAssignSalesRep (settings), findSalesRepEmail
    mockQueryRaw
      .mockResolvedValueOnce([{ id: 'pkg-1', name: 'Bali Getaway', destination: 'Bali', price: 1500, isActive: true }])
      .mockResolvedValueOnce([{ id: 'user-1', name: 'Jane Doe', email: 'jane@test.com', phone: '5550100' }])
      .mockResolvedValueOnce([{ id: 'settings-1', enabledSalesRepIds: ['rep-1'], roundRobinIndex: 0, autoStrategy: 'round_robin', assignmentMode: 'auto' }])
      .mockResolvedValueOnce([{ name: 'Sam Rep', email: 'sam@test.com' }]);

    // $executeRaw call order: round-robin update, lead insert, status-history insert, package-bookings increment
    mockExecuteRaw.mockResolvedValue(undefined);

    mockBookingCreate.mockResolvedValue({ id: 'booking-1' });
  });

  it('still returns 201 when the lead-assignment email fails to send', async () => {
    mockSendLeadAssignmentEmail.mockRejectedValue(new Error('SMTP down'));

    const { req, res } = buildReqRes({
      name: 'Jane Doe', email: 'jane@test.com', phone: '+1-555-010-0100',
      travelers: 2, travelDate: '2026-12-01', packageId: 'pkg-1',
    });

    await createWebsiteBooking(req, res, vi.fn());
    await flush();

    expect(res.status).toHaveBeenCalledWith(201);
    expect(req.log.error).toHaveBeenCalledWith(expect.objectContaining({ err: expect.any(Error) }), 'Failed to send assignment email');
  });

  it('passes the lead\'s phone and destination through to the assignment email', async () => {
    mockSendLeadAssignmentEmail.mockResolvedValue({ success: true });

    const { req, res } = buildReqRes({
      name: 'Jane Doe', email: 'jane@test.com', phone: '+1-555-010-0100',
      travelers: 2, travelDate: '2026-12-01', packageId: 'pkg-1',
    });

    await createWebsiteBooking(req, res, vi.fn());
    await flush();

    expect(mockSendLeadAssignmentEmail).toHaveBeenCalledWith(expect.objectContaining({
      lead: expect.objectContaining({ phone: '15550100100', destination: 'Bali' }),
    }));
  });
});

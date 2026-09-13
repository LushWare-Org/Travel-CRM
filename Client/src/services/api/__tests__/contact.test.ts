import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPost = vi.hoisted(() => vi.fn());
vi.mock('../../http/client', () => ({ default: { post: mockPost } }));

import { submitContactForm } from '../contact';

beforeEach(() => {
  mockPost.mockReset();
});

describe('submitContactForm', () => {
  const validPayload = { name: 'Jane', email: 'jane@example.com', subject: 'Trip', message: 'Please help' };

  it('resolves with the parsed result on a well-formed response', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: { leadId: 'lead-1' } } });
    const result = await submitContactForm(validPayload);
    expect(result).toEqual({ leadId: 'lead-1' });
  });

  it('rejects a payload missing the required subject before sending', async () => {
    await expect(submitContactForm({ ...validPayload, subject: '' })).rejects.toThrow();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects on a malformed response missing leadId', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: {} } });
    await expect(submitContactForm(validPayload)).rejects.toThrow();
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
vi.mock('../../http/client', () => ({ default: { get: mockGet, post: mockPost } }));

import careerService from '../career';

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
});

describe('getActiveVacancies', () => {
  it('resolves with the parsed array directly (not nested under data.vacancies)', async () => {
    mockGet.mockResolvedValue({
      data: {
        status: 'success',
        data: [{ id: 'v1', position: 'Travel Consultant', type: 'Full-time', location: 'Chennai', experienceMin: 2 }],
      },
    });
    const result = await careerService.getActiveVacancies({ status: 'active' });
    expect(result).toEqual([{ id: 'v1', position: 'Travel Consultant', type: 'Full-time', location: 'Chennai', experienceMin: 2 }]);
  });

  it('rejects on a malformed array element', async () => {
    mockGet.mockResolvedValue({ data: { status: 'success', data: [{ experienceMin: 'not-a-number' }] } });
    await expect(careerService.getActiveVacancies()).rejects.toThrow();
  });
});

describe('submitApplication', () => {
  const validPayload = {
    fullName: 'Jane', email: 'jane@example.com', phone: '555-0100', position: 'Travel Consultant',
    coverLetter: 'I love travel', agreeTerms: true, resumeUrl: 'https://cdn.test/resume.pdf',
  };

  it('sends the exact validated payload and returns the raw envelope', async () => {
    mockPost.mockResolvedValue({ data: { status: 'success', data: { id: 'app-1' } } });
    const result = await careerService.submitApplication(validPayload);
    expect(mockPost).toHaveBeenCalledWith('/careers/apply', validPayload);
    expect(result).toEqual({ status: 'success', data: { id: 'app-1' } });
  });

  it('rejects a payload missing agreeTerms before sending', async () => {
    const { agreeTerms, ...rest } = validPayload;
    await expect(careerService.submitApplication(rest as never)).rejects.toThrow();
    expect(mockPost).not.toHaveBeenCalled();
  });
});

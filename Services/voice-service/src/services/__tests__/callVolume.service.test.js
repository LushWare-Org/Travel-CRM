import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockCount = vi.fn();
vi.mock('../../db/client.js', () => ({
  default: { voiceCall: { count: (...a) => mockCount(...a) } },
}));

const { isOverDailyCap } = await import('../callVolume.service.js');

const originalEnv = process.env.VOICE_MAX_CALLS_PER_NUMBER_PER_DAY;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.VOICE_MAX_CALLS_PER_NUMBER_PER_DAY;
});

afterEach(() => {
  if (originalEnv === undefined) delete process.env.VOICE_MAX_CALLS_PER_NUMBER_PER_DAY;
  else process.env.VOICE_MAX_CALLS_PER_NUMBER_PER_DAY = originalEnv;
});

describe('isOverDailyCap', () => {
  it('reports not over cap when the count is well under the default of 20', async () => {
    mockCount.mockResolvedValue(3);
    const result = await isOverDailyCap('94771234567');
    expect(result.overCap).toBe(false);
  });

  it('reports over cap once the count reaches the default of 20', async () => {
    mockCount.mockResolvedValue(20);
    const result = await isOverDailyCap('94771234567');
    expect(result.overCap).toBe(true);
  });

  it('reports not over cap at exactly one below the cap', async () => {
    mockCount.mockResolvedValue(19);
    const result = await isOverDailyCap('94771234567');
    expect(result.overCap).toBe(false);
  });

  it('honours a configured cap from the environment', async () => {
    process.env.VOICE_MAX_CALLS_PER_NUMBER_PER_DAY = '5';
    mockCount.mockResolvedValue(5);
    const result = await isOverDailyCap('94771234567');
    expect(result.overCap).toBe(true);
    expect(result.cap).toBe(5);
  });

  it('falls back to the default when the configured cap is not a number', async () => {
    process.env.VOICE_MAX_CALLS_PER_NUMBER_PER_DAY = 'not-a-number';
    mockCount.mockResolvedValue(3);
    const result = await isOverDailyCap('94771234567');
    expect(result.cap).toBe(20);
  });

  it('falls back to the default when the configured cap is zero or negative', async () => {
    process.env.VOICE_MAX_CALLS_PER_NUMBER_PER_DAY = '0';
    mockCount.mockResolvedValue(3);
    const result = await isOverDailyCap('94771234567');
    expect(result.cap).toBe(20);
  });

  it('scopes the count query to the calling number', async () => {
    mockCount.mockResolvedValue(1);
    await isOverDailyCap('94771234567');
    expect(mockCount.mock.calls[0][0].where.fromNumber).toBe('94771234567');
  });

  it('scopes the count query to a rolling 24-hour window', async () => {
    mockCount.mockResolvedValue(1);
    const before = Date.now();
    await isOverDailyCap('94771234567');
    const gte = mockCount.mock.calls[0][0].where.createdAt.gte;
    expect(before - gte.getTime()).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    expect(before - gte.getTime()).toBeGreaterThan(24 * 60 * 60 * 1000 - 5000);
  });

  it('never queries the database for an empty number, and reports not over cap', async () => {
    const result = await isOverDailyCap('');
    expect(result.overCap).toBe(false);
    expect(mockCount).not.toHaveBeenCalled();
  });

  it('never queries the database for a null number', async () => {
    const result = await isOverDailyCap(null);
    expect(result.overCap).toBe(false);
    expect(mockCount).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockGenerateContent } = vi.hoisted(() => ({ mockGenerateContent: vi.fn() }));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    constructor() {
      this.models = { generateContent: mockGenerateContent };
    }
  },
}));

vi.mock('../../config/logger.js', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// assistant-service ports the shared wizard-turn Gemini client (fixed backoff
// + RetryInfo.retryDelay handling) as its own seam — this suite locks down the
// retry/backoff behavior of THAT copy, mirroring the package-service twin's
// test conventions (src/ai/__tests__/geminiClient.test.js there). The
// controller suites mock this module wholesale, so nothing else executes it.
describe('geminiClient (assistant-service)', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, GEMINI_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });


  it('returns the parsed JSON when the model responds with valid structured output', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: '{"tool":"navigate","args":{"route":"packages"}}' });
    const { generateStructured } = await import('../geminiClient.js');

    const result = await generateStructured({ prompt: 'p', schema: {} });

    expect(result).toEqual({ tool: 'navigate', args: { route: 'packages' } });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('throws a typed error when the model returns text that is not valid JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: 'not json' });
    const { generateStructured } = await import('../geminiClient.js');

    await expect(generateStructured({ prompt: 'p', schema: {} })).rejects.toMatchObject({ statusCode: 502 });
  });

  it('retries on a 429 and succeeds once the model recovers', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(Object.assign(new Error('rate limited'), { status: 429 }))
      .mockResolvedValueOnce({ text: '{"ok":true}' });
    const { generateStructured } = await import('../geminiClient.js');

    const result = await generateStructured({ prompt: 'p', schema: {} });

    expect(result).toEqual({ ok: true });
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('does not retry on a 401 (bad key) and fails fast', async () => {
    mockGenerateContent.mockRejectedValueOnce(Object.assign(new Error('unauthorized'), { status: 401 }));
    const { generateStructured } = await import('../geminiClient.js');

    await expect(generateStructured({ prompt: 'p', schema: {} })).rejects.toMatchObject({ statusCode: 503 });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('does not retry on a 400 (bad request) and fails fast', async () => {
    mockGenerateContent.mockRejectedValueOnce(Object.assign(new Error('bad request'), { status: 400 }));
    const { generateStructured } = await import('../geminiClient.js');

    await expect(generateStructured({ prompt: 'p', schema: {} })).rejects.toMatchObject({ statusCode: 502 });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('treats a client-side timeout as retryable', async () => {
    vi.useFakeTimers();
    mockGenerateContent
      .mockImplementationOnce(() => new Promise(() => {})) // never resolves — forces the timeout branch
      .mockResolvedValueOnce({ text: '{"ok":true}' });

    const { generateStructured } = await import('../geminiClient.js');
    const promise = generateStructured({ prompt: 'p', schema: {}, timeoutMs: 100 });

    await vi.advanceTimersByTimeAsync(100); // trip the timeout on attempt 1
    await vi.advanceTimersByTimeAsync(1000); // clear the backoff sleep before attempt 2

    await expect(promise).resolves.toEqual({ ok: true });
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('retries with a larger token budget when Gemini reports MAX_TOKENS, and succeeds', async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ text: '{"tool":"navigate","args":{}}', candidates: [{ finishReason: 'MAX_TOKENS' }] })
      .mockResolvedValueOnce({ text: '{"tool":"navigate","args":{"route":"packages"}}', candidates: [{ finishReason: 'STOP' }] });
    const { generateStructured } = await import('../geminiClient.js');

    const result = await generateStructured({ prompt: 'p', schema: {}, maxOutputTokens: 1000 });

    expect(result).toEqual({ tool: 'navigate', args: { route: 'packages' } });
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(mockGenerateContent.mock.calls[0][0].config.maxOutputTokens).toBe(1000);
    expect(mockGenerateContent.mock.calls[1][0].config.maxOutputTokens).toBe(1500); // escalated 1.5x
  });

  it('never escalates the retry budget past the model output ceiling', async () => {
    mockGenerateContent.mockResolvedValue({ text: '{}', candidates: [{ finishReason: 'MAX_TOKENS' }] });
    const { generateStructured } = await import('../geminiClient.js');

    await expect(generateStructured({ prompt: 'p', schema: {}, maxOutputTokens: 60000 })).rejects.toMatchObject({ statusCode: 502 });

    const requestedBudgets = mockGenerateContent.mock.calls.map((c) => c[0].config.maxOutputTokens);
    expect(requestedBudgets.every((b) => b <= 65536)).toBe(true);
  });

  it('gives up with a clear error after repeated truncation', async () => {
    mockGenerateContent.mockResolvedValue({ text: '{"tool":"navigate"}', candidates: [{ finishReason: 'MAX_TOKENS' }] });
    const { generateStructured } = await import('../geminiClient.js');

    await expect(generateStructured({ prompt: 'p', schema: {} })).rejects.toMatchObject({ statusCode: 502 });
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
  });
  it('honors a caller-supplied one-attempt budget for retryable failures', async () => {
    mockGenerateContent.mockRejectedValueOnce(Object.assign(new Error('rate limited'), { status: 429 }));
    const { generateStructured } = await import('../geminiClient.js');

    await expect(
      generateStructured({ prompt: 'p', schema: {}, maxAttempts: 1 }),
    ).rejects.toMatchObject({ statusCode: 502 });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('throws a 503 without calling the model when GEMINI_API_KEY is unset', async () => {
    delete process.env.GEMINI_API_KEY;
    const { generateStructured } = await import('../geminiClient.js');

    await expect(generateStructured({ prompt: 'p', schema: {} })).rejects.toMatchObject({ statusCode: 503 });
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('honors RetryInfo.retryDelay from a 429 quota response instead of the fixed backoff', async () => {
    vi.useFakeTimers();
    const quotaErrorBody = JSON.stringify({
      error: {
        code: 429,
        message: 'Quota exceeded',
        status: 'RESOURCE_EXHAUSTED',
        details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '5s' }],
      },
    });
    mockGenerateContent
      .mockRejectedValueOnce(Object.assign(new Error(quotaErrorBody), { status: 429 }))
      .mockResolvedValueOnce({ text: '{"ok":true}' });
    const { generateStructured } = await import('../geminiClient.js');

    const resultPromise = generateStructured({ prompt: 'p', schema: {} });
    // Fixed backoff for attempt 1 would be ~500-750ms; advancing exactly 5s
    // (the RetryInfo value) proves the sleep used retryDelay, not the fixed
    // schedule, since a bug here would have already resolved by 750ms.
    await vi.advanceTimersByTimeAsync(5_000);
    const result = await resultPromise;

    expect(result).toEqual({ ok: true });
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('caps an honored RetryInfo.retryDelay at 60s', async () => {
    vi.useFakeTimers();
    const quotaErrorBody = JSON.stringify({
      error: {
        code: 429,
        message: 'Quota exceeded',
        status: 'RESOURCE_EXHAUSTED',
        details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '300s' }],
      },
    });
    mockGenerateContent
      .mockRejectedValueOnce(Object.assign(new Error(quotaErrorBody), { status: 429 }))
      .mockResolvedValueOnce({ text: '{"ok":true}' });
    const { generateStructured } = await import('../geminiClient.js');

    const resultPromise = generateStructured({ prompt: 'p', schema: {} });
    // A bug that slept the full 300s would still be pending at 60s; resolving
    // right at the cap proves the delay was clamped, not honored raw.
    await vi.advanceTimersByTimeAsync(60_000);
    const result = await resultPromise;

    expect(result).toEqual({ ok: true });
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('gives up after exhausting retries on repeated 503s', async () => {
    mockGenerateContent.mockRejectedValue(Object.assign(new Error('unavailable'), { status: 503 }));
    const { generateStructured } = await import('../geminiClient.js');

    await expect(generateStructured({ prompt: 'p', schema: {} })).rejects.toMatchObject({ statusCode: 502 });
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
  });

  // --- overall `deadlineMs` budget ----------------------------------------
  // The Management briefing needs a retry but must stay inside the client's
  // 20s abort, so `deadlineMs` bounds the WHOLE call, not just each attempt.
  // These four cases pin that contract: retry while time is left, no retry
  // once the budget is spent, never retry a non-transient status, and leave
  // deadline-less callers exactly as they were.

  it('retries a fast 503 with budget left and can succeed on the second attempt', async () => {
    vi.useFakeTimers();
    mockGenerateContent
      .mockRejectedValueOnce(Object.assign(new Error('unavailable'), { status: 503 }))
      .mockResolvedValueOnce({ text: '{"ok":true}' });
    const { generateStructured } = await import('../geminiClient.js');

    const promise = generateStructured({ prompt: 'p', schema: {}, timeoutMs: 17_000, maxAttempts: 2, deadlineMs: 17_000 });
    await vi.advanceTimersByTimeAsync(10); // let attempt 1 fail and schedule its backoff
    await vi.advanceTimersByTimeAsync(1_000); // clear the backoff sleep

    await expect(promise).resolves.toEqual({ ok: true });
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('does not retry a slow 503 when what is left of the deadline cannot cover a real attempt', async () => {
    vi.useFakeTimers();
    // Fails after 14s of the 17s budget, leaving ~3s: below MIN_RETRY_TIMEOUT_MS
    // (5s, just above the fastest healthy answer observed for this model, 4.8s),
    // so no retry — a retry here would only ever be a guaranteed timeout.
    mockGenerateContent.mockImplementationOnce(
      () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(Object.assign(new Error('unavailable'), { status: 503 })), 14_000),
        ),
    );
    const { generateStructured } = await import('../geminiClient.js');

    const promise = generateStructured({ prompt: 'p', schema: {}, timeoutMs: 17_000, maxAttempts: 2, deadlineMs: 17_000 });
    const outcome = expect(promise).rejects.toMatchObject({ statusCode: 502 });

    await vi.advanceTimersByTimeAsync(14_000);
    await outcome;

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('does not retry a 400 even when the deadline has plenty of room', async () => {
    mockGenerateContent.mockRejectedValueOnce(Object.assign(new Error('bad request'), { status: 400 }));
    const { generateStructured } = await import('../geminiClient.js');

    await expect(
      generateStructured({ prompt: 'p', schema: {}, maxAttempts: 2, deadlineMs: 17_000 }),
    ).rejects.toMatchObject({ statusCode: 502 });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('keeps per-attempt timeoutMs and maxAttempts when no deadlineMs is passed', async () => {
    vi.useFakeTimers();
    mockGenerateContent.mockImplementation(() => new Promise(() => {})); // every attempt hangs
    const { generateStructured } = await import('../geminiClient.js');

    const promise = generateStructured({ prompt: 'p', schema: {}, timeoutMs: 2_000, maxAttempts: 3 });
    const outcome = expect(promise).rejects.toMatchObject({ statusCode: 502 });

    // Just short of the caller's 2s: attempt 1 is still running, so the new
    // budget code did not shorten (or raise) the per-attempt timeout.
    await vi.advanceTimersByTimeAsync(1_999);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(20_000); // three full attempts + their backoffs
    await outcome;

    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});

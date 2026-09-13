/**
 * Grounded travel search — live Gemini smoke test.
 *
 * Makes one real Google-Search-grounded call and asserts the provider returns an
 * answer with at least one usable source. Exists to settle the ONE thing the
 * unit suite cannot: how the installed @google/genai version exposes the
 * grounding tool and its citations. If the SDK wants `tools: [{ googleSearch }]`
 * on `models.generateContent`, this test passes as written; if it needs the
 * interactions surface instead, this is the failure that says so, and
 * groundedSearch.js already parses both response shapes.
 *
 * Skipped by default, and gated on TWO things rather than on the key alone:
 * `RUN_LIVE_AI_TESTS=true` as well as a real GEMINI_API_KEY. The key check by
 * itself is not a reliable signal in this service — other suites in the same
 * worker set a fake key on `process.env` to exercise the unconfigured paths, so
 * a plain `npm test` could otherwise pick up a placeholder and make a real
 * billed search that fails. Run deliberately:
 *
 *   RUN_LIVE_AI_TESTS=true npx vitest run test/integration/travelSearch.live.test.js
 *   (with GEMINI_API_KEY in .env, which the config call below loads)
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const { generateGrounded } = await import('../../src/ai/groundedSearch.js');
const { buildTravelSearchPrompt } = await import('../../src/ai/prompts/travelSearch.v1.js');

const RUN_LIVE = process.env.RUN_LIVE_AI_TESTS === 'true' && Boolean(process.env.GEMINI_API_KEY);

describe.skipIf(!RUN_LIVE)('grounded travel search — live Gemini call', () => {
  it('answers a travel question with at least one https source', async () => {
    const { text, citations } = await generateGrounded({
      prompt: buildTravelSearchPrompt('best time of year to visit Kandy, Sri Lanka'),
    });

    expect(text.length).toBeGreaterThan(20);
    expect(citations.length).toBeGreaterThanOrEqual(1);
    expect(citations[0].uri).toMatch(/^https?:\/\//);
    expect(citations[0].title.length).toBeGreaterThan(0);
  }, 30_000);
});

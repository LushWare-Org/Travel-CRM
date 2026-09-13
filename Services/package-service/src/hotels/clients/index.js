import { MockHotelClient } from './mock.client.js';
import { LiteApiClient } from './liteapi.client.js';

/**
 * Create the configured hotel API client.
 *
 * Provider selection:
 * 1. LITEAPI_API_KEY set → LiteApiClient (real API)
 * 2. LITEAPI_MOCK_MODE not 'false' (default true) → MockHotelClient
 *
 * @returns {import('./interface.js').HotelApiClient}
 */
export function createHotelClient() {
  if (process.env.LITEAPI_API_KEY) {
    return new LiteApiClient();
  }

  const useMock = process.env.LITEAPI_MOCK_MODE !== 'false';

  if (useMock) {
    return new MockHotelClient();
  }

  // No key + mock explicitly disabled → still safe to mock
  console.warn('[package-service] LITEAPI_MOCK_MODE=false but no API key set — falling back to mock.');
  return new MockHotelClient();
}

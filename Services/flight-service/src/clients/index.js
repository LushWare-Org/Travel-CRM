import { MockFlightClient } from './mock.client.js';
import { TravelportClient } from './travelport.client.js';

/**
 * @returns {import('./interface.js').FlightApiClient}
 */
export function createFlightClient() {
  const useMock = process.env.TRAVELPORT_MOCK_MODE !== 'false';

  if (useMock) {
    return new MockFlightClient();
  }

  return new TravelportClient();
}

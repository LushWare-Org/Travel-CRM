import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createFlightClient } from '../index.js';
import { MockFlightClient } from '../mock.client.js';
import { TravelportClient } from '../travelport.client.js';

describe('createFlightClient', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should return MockFlightClient when TRAVELPORT_MOCK_MODE is true', () => {
    process.env.TRAVELPORT_MOCK_MODE = 'true';
    const client = createFlightClient();
    expect(client).toBeInstanceOf(MockFlightClient);
  });

  it('should return MockFlightClient by default (no env var set)', () => {
    delete process.env.TRAVELPORT_MOCK_MODE;
    const client = createFlightClient();
    expect(client).toBeInstanceOf(MockFlightClient);
  });

  it('should return TravelportClient when TRAVELPORT_MOCK_MODE is "false"', () => {
    process.env.TRAVELPORT_MOCK_MODE = 'false';
    const client = createFlightClient();
    expect(client).toBeInstanceOf(TravelportClient);
  });
});

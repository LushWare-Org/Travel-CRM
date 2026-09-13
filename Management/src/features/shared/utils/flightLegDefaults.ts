export interface FlightLegPrefs {
  origin?: string;
  destination?: string;
  cabinClass?: string;
  airlinePreference?: string;
  departureTime?: string;
  estimatedUnitPrice?: number | string;
}

export type TripType = 'oneWay' | 'roundTrip';

export interface FlightLegSubmission extends FlightLegPrefs {
  tripType: TripType;
}

/**
 * Flips an inbound (getting-to-the-trip) leg into sensible defaults for the
 * outbound (returning-home) leg: origin/destination swap, cabin class and
 * airline preference carry over (same traveler, same trip). Departure time
 * resets — inbound and outbound are different days, no sensible default.
 * estimatedUnitPrice is deliberately NOT carried over — return-leg pricing
 * varies independently and silently defaulting it risks an unnoticed
 * wrong quote; the rep must set it explicitly for each leg.
 */
export function flipLegForReturn(inboundPrefs?: FlightLegPrefs | null): FlightLegPrefs | null {
  if (!inboundPrefs) return null;
  const { origin, destination, cabinClass, airlinePreference } = inboundPrefs;
  if (!origin && !destination) return null;
  return {
    origin: destination || '',
    destination: origin || '',
    cabinClass: cabinClass || '',
    airlinePreference: airlinePreference || '',
    departureTime: '',
  };
}

/**
 * The other direction of a round trip: route swapped, cabin + airline carried,
 * departure time cleared, and price pinned to 0 — the rep sets the second
 * leg's cost explicitly (same reasoning as flipLegForReturn's missing price).
 */
export function oppositeLeg(prefs?: FlightLegPrefs | null): FlightLegPrefs | null {
  const flipped = flipLegForReturn(prefs);
  return flipped ? { ...flipped, estimatedUnitPrice: 0 } : null;
}

/**
 * What to prefill the outbound flight modal with: the outbound leg's own
 * saved prefs if it already has one, otherwise a flip of the inbound leg,
 * otherwise empty.
 */
export function getOutboundModalDefaults(
  inboundPrefs?: FlightLegPrefs | null,
  outboundPrefs?: FlightLegPrefs | null
): FlightLegPrefs {
  if (outboundPrefs && (outboundPrefs.origin || outboundPrefs.destination)) {
    return outboundPrefs;
  }
  return flipLegForReturn(inboundPrefs) || outboundPrefs || {};
}

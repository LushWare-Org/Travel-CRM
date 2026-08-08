/**
 * Flips an inbound (getting-to-the-trip) leg into sensible defaults for the
 * outbound (returning-home) leg: origin/destination swap, cabin class and
 * airline preference carry over (same traveler, same trip). Departure time
 * resets — inbound and outbound are different days, no sensible default.
 */
export function flipLegForReturn(inboundPrefs) {
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
 * What to prefill the outbound flight modal with: the outbound leg's own
 * saved prefs if it already has one, otherwise a flip of the inbound leg,
 * otherwise empty.
 */
export function getOutboundModalDefaults(inboundPrefs, outboundPrefs) {
  if (outboundPrefs && (outboundPrefs.origin || outboundPrefs.destination)) {
    return outboundPrefs;
  }
  return flipLegForReturn(inboundPrefs) || outboundPrefs || {};
}

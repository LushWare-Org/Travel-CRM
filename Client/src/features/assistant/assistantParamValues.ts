import { fetchPackages } from '../../services/api/packages';
import type { AggregatedDestination } from '../../services/api/packages.transform';

/**
 * The filter values the assistant is allowed to put into a URL, per route.
 *
 * The model reads a sentence and decides what the visitor meant, which is
 * exactly what it is good at — and also why it cannot be trusted to name a
 * destination. Measured on gemini-2.5-flash, "tell me about dubai packages"
 * returned the destination on some runs and a sort on others, and this page
 * does not reject a destination it does not know: the package service ignores
 * an unresolved slug and returns the WHOLE catalogue, so a wrong slug is not an
 * error, it is a silent "here are all seven packages" that looks like the
 * filter worked.
 *
 * So the model is given the closed set of real destinations and picks from it,
 * and the server checks what comes back against the same set. The values are
 * `AggregatedDestination.slug` — the exact value every existing destination
 * link on the site already puts in the URL (Header, InternationalGrid,
 * DestinationCard, DestinationListItem), so the assistant can only produce a
 * URL the site produces itself.
 *
 * Labels come along because people name places the way the site's own cards do
 * ("Bali", not "bali"): the server matches the visitor's words against both.
 */
export interface AssistantParamValue {
  value: string;
  label: string;
}

export type AssistantParamValues = Record<string, Record<string, AssistantParamValue[]>>;

// The whole catalogue is published packages, a few dozen at most, and this is
// one request per visit rather than per turn. Capped anyway so a catalogue
// that grows cannot turn the vocabulary into a payload.
const CATALOGUE_LIMIT = 100;

let cached: Promise<AssistantParamValues> | null = null;

const build = async (): Promise<AssistantParamValues> => {
  const { destinations } = await fetchPackages({ limit: CATALOGUE_LIMIT });
  const options: AssistantParamValue[] = [];
  const seen = new Set<string>();

  for (const destination of (destinations ?? []) as AggregatedDestination[]) {
    // Fall back to nameSlug only for an entry the aggregation could not slug
    // at all; `slug` is what every other link on the site uses.
    const value = `${destination.slug || destination.nameSlug || ''}`.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: destination.name || destination.raw || value });
  }

  return options.length ? { packages: { destination: options } } : {};
};

/**
 * Memoized for the visit: the catalogue changes rarely and a turn must not pay
 * a round trip per message. A failure is deliberately NOT cached, so one bad
 * request does not leave filtering disabled for the rest of the session, and it
 * never throws — the turn has to go out either way, and without the vocabulary
 * the assistant still navigates, just leaning on the model's own reading.
 */
export const loadAssistantParamValues = (): Promise<AssistantParamValues> => {
  if (!cached) {
    cached = build().catch(() => {
      cached = null;
      return {};
    });
  }
  return cached;
};

/** Test seam: drops the memoized catalogue so each test starts cold. */
export const resetAssistantParamValuesCache = (): void => {
  cached = null;
};

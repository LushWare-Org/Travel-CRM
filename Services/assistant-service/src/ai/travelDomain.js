// ─── The travel-domain gate for grounded web search ───────────────────────
// The assistant may look a travel question up on the web. It may not become a
// general-purpose search box: an open search is a cost line, a support surface,
// and a liability that this product never agreed to carry.
//
// The gate is deterministic and local — no model judgement, no network call.
// The model has already been told to reach for `search_travel_info` only on a
// travel question (assistantTurn.v1.js), and this is the second, independent
// check: the query the model composed must actually carry a travel signal, and
// must not look like a request outside the domain. A refusal is cheap and
// legible ("I only look up travel information"); a wrong search is neither.

// A static lexicon, not a catalogue read. The turn already spends its latency
// budget on the catalogue and policy fetches, and a gate that needs the network
// is a gate that fails open when the network is slow. Single common words only:
// matching is whole-word, so "tour" does not fire on "tournament" and "cost"
// does not fire on "costume".
export const TRAVEL_TERMS = [
  // trip shapes and planning
  'destination', 'destinations', 'place', 'places', 'location', 'locations', 'city', 'cities', 'town', 'island',
  'country', 'region', 'province', 'trip', 'trips', 'travel', 'travelling', 'traveling', 'holiday', 'holidays',
  'vacation', 'itinerary', 'tour', 'tours', 'tourist', 'sightseeing', 'sights', 'attraction', 'attractions',
  'day trip', 'excursion', 'backpacking', 'honeymoon', 'family trip', 'solo trip', 'road trip',
  // entry and paperwork
  'visa', 'visas', 'e-visa', 'passport', 'passports', 'entry', 'entry rules', 'border', 'crossing',
  'customs', 'embassy', 'consulate', 'permit', 'permits', 'vaccination', 'vaccinations', 'vaccine', 'vaccines',
  'yellow fever', 'malaria', 'insurance', 'advisory', 'advisories',
  // timing and conditions
  'weather', 'climate', 'season', 'seasons', 'monsoon', 'rain', 'rainy', 'rainfall', 'temperature', 'temperatures',
  'humid', 'humidity', 'snow', 'sunny', 'best time', 'peak season', 'off season', 'low season', 'high season',
  // money and practicalities
  'currency', 'money', 'cash', 'atm', 'atms', 'card', 'cards', 'exchange rate', 'cost', 'costs', 'price', 'prices',
  'pricing', 'budget', 'expensive', 'cheap', 'tipping', 'tip', 'sim', 'esim', 'roaming', 'wifi', 'internet',
  'electricity', 'plug', 'adapter', 'tap water', 'drinking water',
  // getting there and around
  'flight', 'flights', 'airline', 'airlines', 'airport', 'airports', 'layover', 'layovers', 'stopover', 'transfer',
  'transfers', 'train', 'trains', 'rail', 'bus', 'buses', 'coach', 'taxi', 'tuk', 'ferry', 'ferries', 'boat',
  'boat trip', 'cruise', 'driving', 'drive', 'rental', 'car hire', 'motorbike', 'scooter', 'transport',
  'getting around', 'public transport', 'distance', 'distances',
  // staying and eating
  'hotel', 'hotels', 'hostel', 'hostels', 'resort', 'resorts', 'guesthouse', 'homestay', 'villa', 'camping',
  'stay', 'accommodation', 'check-in', 'checkin', 'room', 'rooms', 'food', 'cuisine', 'restaurant', 'restaurants',
  'vegetarian', 'vegan', 'halal', 'street food', 'alcohol', 'nightlife',
  // doing and behaving
  'beach', 'beaches', 'mountain', 'mountains', 'hike', 'hiking', 'trek', 'trekking', 'diving', 'snorkel',
  'snorkelling', 'snorkeling', 'surfing', 'surf', 'ski', 'skiing', 'safari', 'wildlife', 'temple', 'temples',
  'museum', 'museums', 'market', 'markets', 'shopping', 'souvenir', 'souvenirs', 'festival', 'festivals',
  'carnival', 'culture', 'cultural', 'customs and etiquette', 'etiquette', 'dress code', 'language', 'language spoken',
  'photography', 'drone', 'ticket', 'tickets', 'entrance', 'opening hours', 'closing time', 'public holiday',
  'accessibility', 'wheelchair', 'kids', 'children', 'elderly', 'first time',
  // conditions on the ground
  'safe', 'safety', 'unsafe', 'danger', 'dangerous', 'security', 'risk', 'risks', 'crime', 'crime rate',
  'health', 'hospital', 'clinic', 'water safety', 'scam', 'scams', 'strike', 'strikes', 'protest', 'protests',
  'curfew', 'state of emergency', 'earthquake', 'flood', 'flooding', 'typhoon', 'cyclone', 'hurricane', 'volcano',
  // the reason a search is worth its cost at all
  'current', 'currently', 'now', 'nowadays', 'right now', 'these days', 'this year', 'next year', 'update',
  'updates', 'latest', 'recent', 'recently', 'today', 'this week', 'this month',
];

// Requests that are plainly not the domain, whatever else they contain. Kept
// short and specific on purpose: it is a hard refusal, so a false positive is a
// travel question the visitor cannot get answered. Instructions aimed at the
// model are here because a query that tries to steer the search is not a query
// about a place.
export const OFF_DOMAIN_PATTERNS = [
  /\b(write|generate|debug|refactor)\b[^.]{0,40}\b(code|script|javascript|python|sql|regex|essay|homework|resume|cv)\b/i,
  /\b(ignore|disregard|forget)\s+(all\s+)?(the\s+)?(previous|above|earlier|prior)\s+(instructions|prompts|rules)\b/i,
  /\b(system|developer|hidden)\s+(prompt|instruction|message)s?\b/i,
  /\b(bitcoin|crypto|ethereum|stock|stocks|share price|forex|trading|investment advice)\b/i,
  /\b(medical advice|diagnos\w*|prescription|symptoms?|treatment plan)\b/i,
  /\b(legal advice|lawyer|attorney|lawsuit|file a claim|draft a contract)\b/i,
];

const normalize = (query) => String(query ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

// Word-boundary matching on the normalized query. `\b` on both sides so "tour"
// never fires inside "tournament" and "safe" never fires inside "unsafe" — the
// latter matters, because "unsafe" is itself a travel signal and the two would
// otherwise be indistinguishable.
const containsWholeWord = (haystack, term) =>
  new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(haystack);

/**
 * True when a query may be searched: it carries at least one travel signal and
 * matches none of the off-domain patterns.
 */
export function isTravelDomainQuery(query) {
  const normalized = normalize(query);
  if (!normalized) return false;
  if (OFF_DOMAIN_PATTERNS.some((pattern) => pattern.test(normalized))) return false;
  return TRAVEL_TERMS.some((term) => containsWholeWord(normalized, term));
}

/**
 * The query as it goes to the provider: whitespace collapsed, control
 * characters (which can only be framing, never a search term) removed, and cut
 * to the length the contract allows.
 */
export function sanitizeSearchQuery(query) {
  return String(query ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 512);
}

// Question framing, which is how a model usually words a query it composed from
// what the visitor asked. Stripped because it changes the grounded call's
// behaviour: measured against the live provider, "What are the good locations of
// Afghanistan these days?" made the model answer from memory and skip the search
// entirely — no grounding metadata, no sources — while the same words without
// the interrogative came back with five. A search query is not a question, and
// the leading auxiliary carries nothing a search engine can use.
const LEADING_QUESTION_WORDS =
  /^(what|which|where|when|why|who|whose|how|is|are|am|was|were|do|does|did|can|could|should|would|will|may|might|shall|any|please)\b[\s,]*/i;

/**
 * The visitor's words as a search phrase: question framing and a trailing
 * question mark removed, whitespace collapsed. Falls back to the input when
 * stripping would leave nothing (a bare "why?" is still the query).
 */
export function toSearchPhrase(query) {
  const cleaned = String(query ?? '').replace(/\?+\s*$/, '').replace(/\s+/g, ' ').trim();
  let phrase = cleaned;
  let previous;
  do {
    previous = phrase;
    phrase = phrase.replace(LEADING_QUESTION_WORDS, '').trim();
  } while (phrase && phrase !== previous);

  // Falling back to the punctuation-stripped form rather than the raw input, so
  // a query that was nothing but framing ("why?") still goes out as "why".
  return phrase || cleaned;
}

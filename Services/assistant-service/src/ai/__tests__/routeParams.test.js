import { describe, expect, it } from 'vitest';
import {
  ROUTE_PARAM_RULES,
  buildRouteQuery,
  resolveRouteFilters,
  extractFilterArgs,
  matchDeclaredValue,
} from '../routeParams.js';

const PACKAGE_PARAMS = [
  'destination',
  'category',
  'priceMin',
  'priceMax',
  'durationMin',
  'durationMax',
  'rating',
  'sort',
];

describe('buildRouteQuery', () => {
  it('keeps a valid filter and lower-cases a place name into a slug', () => {
    expect(buildRouteQuery({ destination: 'Dubai' }, PACKAGE_PARAMS)).toBe('destination=dubai');
  });

  it('emits keys in the order the route declared them, not the order the model sent them', () => {
    expect(buildRouteQuery({ priceMax: 1000, destination: 'dubai' }, PACKAGE_PARAMS)).toBe(
      'destination=dubai&priceMax=1000',
    );
  });

  it('drops a key the route never declared, so a page cannot be filtered by an invented parameter', () => {
    // `page` and `view` exist on the packages URL but are deliberately not
    // offered to the model — nobody asks to be on page 3 of a grid view.
    expect(buildRouteQuery({ page: 3, view: 'list' }, PACKAGE_PARAMS)).toBe('');
    expect(buildRouteQuery({ destination: 'dubai' }, ['sort'])).toBe('');
  });

  it('drops a reversed range entirely rather than keeping the half that would invert it', () => {
    expect(buildRouteQuery({ priceMin: 2000, priceMax: 1000 }, PACKAGE_PARAMS)).toBe('');
    expect(buildRouteQuery({ durationMin: 10, durationMax: 3 }, PACKAGE_PARAMS)).toBe('');
  });

  it('keeps a well-ordered range', () => {
    expect(buildRouteQuery({ priceMin: 1000, priceMax: 2000 }, PACKAGE_PARAMS)).toBe(
      'priceMin=1000&priceMax=2000',
    );
  });

  it('keeps a range with only one end supplied', () => {
    expect(buildRouteQuery({ priceMax: 100 }, PACKAGE_PARAMS)).toBe('priceMax=100');
  });

  it('accepts only the declared ratings', () => {
    expect(buildRouteQuery({ rating: 4 }, PACKAGE_PARAMS)).toBe('rating=4');
    expect(buildRouteQuery({ rating: '5' }, PACKAGE_PARAMS)).toBe('rating=5');
    expect(buildRouteQuery({ rating: 2 }, PACKAGE_PARAMS)).toBe('');
  });

  it('accepts only the declared sort literals', () => {
    expect(buildRouteQuery({ sort: 'popularity' }, PACKAGE_PARAMS)).toBe('sort=popularity');
    expect(buildRouteQuery({ sort: 'cheapest' }, PACKAGE_PARAMS)).toBe('');
  });

  it('normalises a numeric string, because the schema asks for a number but a model may send text', () => {
    expect(buildRouteQuery({ priceMax: '1000' }, PACKAGE_PARAMS)).toBe('priceMax=1000');
    expect(buildRouteQuery({ priceMax: 'not a number' }, PACKAGE_PARAMS)).toBe('');
  });

  it('rejects a fractional day count but keeps the same value for a price', () => {
    expect(buildRouteQuery({ durationMin: 5.5 }, PACKAGE_PARAMS)).toBe('');
    expect(buildRouteQuery({ priceMin: 5.5 }, PACKAGE_PARAMS)).toBe('priceMin=5.5');
  });

  it('drops out-of-range and non-finite numbers', () => {
    expect(buildRouteQuery({ priceMax: -1 }, PACKAGE_PARAMS)).toBe('');
    expect(buildRouteQuery({ priceMax: 2_000_000 }, PACKAGE_PARAMS)).toBe('');
    expect(buildRouteQuery({ priceMax: Number.POSITIVE_INFINITY }, PACKAGE_PARAMS)).toBe('');
    expect(buildRouteQuery({ durationMax: 400 }, PACKAGE_PARAMS)).toBe('');
    expect(buildRouteQuery({ durationMin: 0 }, PACKAGE_PARAMS)).toBe('');
  });

  it('drops a place name carrying punctuation instead of guessing at it', () => {
    expect(buildRouteQuery({ destination: 'dubai; DROP TABLE' }, PACKAGE_PARAMS)).toBe('');
    expect(buildRouteQuery({ destination: 'new york' }, PACKAGE_PARAMS)).toBe('');
    expect(buildRouteQuery({ destination: '  Dubai  ' }, PACKAGE_PARAMS)).toBe('destination=dubai');
  });

  it('drops an over-long slug', () => {
    expect(buildRouteQuery({ destination: 'a'.repeat(61) }, PACKAGE_PARAMS)).toBe('');
    expect(buildRouteQuery({ destination: 'a'.repeat(60) }, PACKAGE_PARAMS)).toBe(`destination=${'a'.repeat(60)}`);
  });

  it('ignores non-string and non-object input without throwing', () => {
    expect(buildRouteQuery(null, PACKAGE_PARAMS)).toBe('');
    expect(buildRouteQuery('destination=dubai', PACKAGE_PARAMS)).toBe('');
    expect(buildRouteQuery([], PACKAGE_PARAMS)).toBe('');
    expect(buildRouteQuery({ destination: { toString: () => 'dubai' } }, PACKAGE_PARAMS)).toBe('');
    expect(buildRouteQuery({ destination: 'dubai' }, null)).toBe('');
  });

  it('returns an empty string when the route declares no filters', () => {
    expect(buildRouteQuery({ destination: 'dubai' }, [])).toBe('');
  });

  it('describes every filter the prompt can offer', () => {
    // The prompt derives its filter vocabulary from these keys, so a name
    // added here without a rule (or vice versa) would advertise an argument
    // the validator silently discards.
    expect(Object.keys(ROUTE_PARAM_RULES).sort()).toEqual([...PACKAGE_PARAMS].sort());
  });
});

describe('extractFilterArgs', () => {
  it('reads a price ceiling from the phrasing that used to become a sort', () => {
    // The exact sentence that gemini-2.5-flash answered with sort: "price-low",
    // which orders the list without filtering anything out of it.
    expect(extractFilterArgs('packages need to be below 100 dollars')).toEqual({ priceMax: 100 });
    expect(extractFilterArgs('anything under $1,000')).toEqual({ priceMax: 1000 });
    expect(extractFilterArgs('show me cheaper than 250 packages')).toEqual({ priceMax: 250 });
  });

  it('reads a price floor', () => {
    expect(extractFilterArgs('packages over 2000')).toEqual({ priceMin: 2000 });
    expect(extractFilterArgs('at least 1500 dollars please')).toEqual({ priceMin: 1500 });
  });

  it('never reads a day count as a price', () => {
    // "under 7 days" as priceMax: 7 would filter the catalogue to nothing.
    expect(extractFilterArgs('a trip under 7 days')).toEqual({ durationMax: 7 });
    expect(extractFilterArgs('up to 10 nights')).toEqual({ durationMax: 10 });
  });

  it('reads a duration range', () => {
    expect(extractFilterArgs('somewhere between 5 to 7 days')).toEqual({ durationMin: 5, durationMax: 7 });
    expect(extractFilterArgs('a 3-4 day break')).toEqual({ durationMin: 3, durationMax: 4 });
  });

  it('leaves the price alone when the sentence states a duration as well', () => {
    // A duration bound claims the sentence, because every number in it carries
    // a day unit and reading one as a price would be the worse error.
    expect(extractFilterArgs('under 7 days')).toEqual({ durationMax: 7 });
  });

  it('extracts nothing from an ordinary question', () => {
    expect(extractFilterArgs('tell me about dubai packages')).toEqual({});
    expect(extractFilterArgs('what can you do')).toEqual({});
    expect(extractFilterArgs('')).toEqual({});
    expect(extractFilterArgs(null)).toEqual({});
    expect(extractFilterArgs(undefined)).toEqual({});
  });

  it('does not mistake a bare word for a bound', () => {
    expect(extractFilterArgs('over the moon about this')).toEqual({});
    expect(extractFilterArgs('maximum comfort')).toEqual({});
  });

  it('produces values the validator accepts', () => {
    // The two halves have to agree, or extraction would hand buildRouteQuery a
    // value it then silently drops.
    const extracted = extractFilterArgs('under 1000 dollars for a 5 to 7 day trip');
    for (const [key, value] of Object.entries(extracted)) {
      expect(buildRouteQuery({ [key]: value }, [key])).not.toBe('');
    }
  });
});

describe('matchDeclaredValue', () => {
  // The real shape: the URL value and the name a person says are different
  // strings, which is the whole reason the pair travels together.
  const DESTINATIONS = [
    { value: 'uae', label: 'Dubai' },
    { value: 'indonesia', label: 'Bali' },
    { value: 'sri-lanka', label: 'Sri Lanka' },
  ];

  it('matches the label a visitor would say', () => {
    expect(matchDeclaredValue('tell me about dubai packages', DESTINATIONS)).toEqual({
      value: 'uae',
      label: 'Dubai',
    });
    expect(matchDeclaredValue('show me Sri Lanka', DESTINATIONS)).toEqual({
      value: 'sri-lanka',
      label: 'Sri Lanka',
    });
  });

  it('matches the value the URL takes', () => {
    expect(matchDeclaredValue('packages in sri-lanka please', DESTINATIONS)).toEqual({
      value: 'sri-lanka',
      label: 'Sri Lanka',
    });
  });

  it('ignores case and treats a hyphen and a space alike', () => {
    expect(matchDeclaredValue('BALI', DESTINATIONS)).toEqual({ value: 'indonesia', label: 'Bali' });
    expect(matchDeclaredValue('a trip to new  york', [{ value: 'new-york', label: 'New York' }])).toEqual({
      value: 'new-york',
      label: 'New York',
    });
  });

  it('does not match inside a longer word', () => {
    // "india" must not fire on "indiana", or a passing mention filters the page.
    expect(matchDeclaredValue('i love indiana', [{ value: 'india', label: 'India' }])).toBeNull();
  });

  it('prefers the longer value when several match the same sentence', () => {
    const values = [
      { value: 'uae', label: 'UAE' },
      { value: 'abu-dhabi', label: 'Abu Dhabi' },
    ];
    expect(matchDeclaredValue('a trip to abu dhabi in the uae', values)).toEqual({
      value: 'abu-dhabi',
      label: 'Abu Dhabi',
    });
  });

  it('returns null when nothing matches or there is nothing to match', () => {
    expect(matchDeclaredValue('what can you do', DESTINATIONS)).toBeNull();
    expect(matchDeclaredValue('', DESTINATIONS)).toBeNull();
    expect(matchDeclaredValue(null, DESTINATIONS)).toBeNull();
    expect(matchDeclaredValue('dubai', [])).toBeNull();
    expect(matchDeclaredValue('dubai', null)).toBeNull();
  });

  it('skips malformed entries without throwing', () => {
    expect(matchDeclaredValue('dubai', [{ label: 'Dubai' }, null, { value: '' }, 'uae'])).toBeNull();
  });
});

// A caller that names the matching packages, or describes the filter in prose,
// has to describe what the LINK carries — so this returns exactly the entries
// `buildRouteQuery` kept, in the JSON types the package tools declare.
describe('resolveRouteFilters', () => {
  it('returns the surviving filters with numeric ones restored to numbers', () => {
    expect(
      resolveRouteFilters({ destination: ' Dubai ', priceMax: '1000', rating: '4' }, PACKAGE_PARAMS),
    ).toEqual({ destination: 'dubai', priceMax: 1000, rating: 4 });
    // `rating` is an enum whose declared values are numbers; handing the tools
    // the string "4" would fail their schema and silently lose the preview.
    expect(typeof resolveRouteFilters({ rating: '5' }, PACKAGE_PARAMS).rating).toBe('number');
    expect(resolveRouteFilters({ sort: 'price-low' }, PACKAGE_PARAMS)).toEqual({ sort: 'price-low' });
  });

  it('drops exactly what the link drops', () => {
    expect(resolveRouteFilters({ priceMax: 2_000_000, destination: 'dubai' }, PACKAGE_PARAMS)).toEqual({
      destination: 'dubai',
    });
    expect(resolveRouteFilters({ priceMin: 2000, priceMax: 1000 }, PACKAGE_PARAMS)).toEqual({});
    expect(resolveRouteFilters({ sort: 'cheapest', destination: 'new york' }, PACKAGE_PARAMS)).toEqual({});
  });

  it('keeps no key for a filter the route never declared', () => {
    expect(resolveRouteFilters({ destination: 'dubai' }, ['sort'])).toEqual({});
    expect(resolveRouteFilters({ destination: 'dubai' }, [])).toEqual({});
  });
});

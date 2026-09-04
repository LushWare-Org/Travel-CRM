import { describe, it, expect } from 'vitest';
import { buildGeneratePackagePrompt, generatePackageResponseSchema } from '../generatePackage.v1.js';
import { buildGenerateFromTitlePrompt } from '../generateFromTitle.v1.js';
import { buildPackageMarketingContentPrompt } from '../packageMarketingContent.v1.js';
import { buildHotelSuggestionPrompt } from '../hotelSuggestion.v1.js';
import { buildGenerateDayPreviewPrompt, generateDayPreviewResponseSchema } from '../generateDayPreview.v1.js';
import { buildGenerateDaysRangePrompt, generateDaysRangeResponseSchema } from '../generateDaysRange.v1.js';
import { buildWizardTurnPrompt, wizardTurnResponseSchema } from '../wizardTurn.v1.js';

describe('buildGeneratePackagePrompt', () => {
  it('includes the exact day count and the special-requirements text', () => {
    const prompt = buildGeneratePackagePrompt({
      destination: 'Bali',
      duration: 5,
      category: 'FAMILY',
      preferences: 'vegetarian food only',
    });

    expect(prompt).toContain('Bali');
    expect(prompt).toContain('exactly 5 days');
    expect(prompt).toContain('numbered 1 to 5');
    expect(prompt).toContain('vegetarian food only');
  });

  it('includes the package tier only when provided', () => {
    const withTier = buildGeneratePackagePrompt({ destination: 'Bali', duration: 3, category: 'FAMILY', packageType: 'Luxury' });
    const withoutTier = buildGeneratePackagePrompt({ destination: 'Bali', duration: 3, category: 'FAMILY' });

    expect(withTier).toContain('Package tier: Luxury.');
    expect(withoutTier).not.toContain('Package tier');
  });

  it('response schema requires the day-level fields the itinerary mapper depends on', () => {
    const dayItem = generatePackageResponseSchema.properties.days.items;
    expect(dayItem.required).toEqual(expect.arrayContaining(['dayNumber', 'title', 'locations', 'activities']));
  });
});

describe('buildGenerateFromTitlePrompt', () => {
  it('omits empty context parts instead of leaving blank parentheses', () => {
    const prompt = buildGenerateFromTitlePrompt({ title: 'Kandy Getaway' });
    expect(prompt).toBe('Generate marketing content for a travel package titled "Kandy Getaway".');
  });

  it('joins destination, duration, and category context when present', () => {
    const prompt = buildGenerateFromTitlePrompt({ title: 'Kandy Getaway', destination: 'Kandy', duration: 4, category: 'family' });
    expect(prompt).toContain('to Kandy (4 days) in the family category');
  });
});

describe('buildPackageMarketingContentPrompt', () => {
  it('falls back to placeholder text for missing package fields', () => {
    const prompt = buildPackageMarketingContentPrompt({});
    expect(prompt).toContain('Travel Package');
    expect(prompt).toContain('Exotic destination');
  });
});

describe('buildHotelSuggestionPrompt', () => {
  it('includes dates only when both check-in and check-out are given', () => {
    const prompt = buildHotelSuggestionPrompt({ destination: 'Colombo', checkIn: '2026-09-01', checkOut: '2026-09-05', guests: 3 });
    expect(prompt).toContain('from 2026-09-01 to 2026-09-05');
    expect(prompt).toContain('3 guests');
  });
});

describe('buildGenerateDayPreviewPrompt', () => {
  const base = { destination: 'Bali', dayNumber: 3, totalDuration: 7 };

  it('includes the day number, total duration, and destination', () => {
    const prompt = buildGenerateDayPreviewPrompt(base);
    expect(prompt).toContain('Day 3');
    expect(prompt).toContain('7-day trip');
    expect(prompt).toContain('Bali');
  });

  it('omits the context block entirely when there are no existing days', () => {
    const prompt = buildGenerateDayPreviewPrompt(base);
    expect(prompt).not.toContain('Already planned days');
  });

  it('excludes the target day from the context block even if the caller includes it', () => {
    const prompt = buildGenerateDayPreviewPrompt({
      ...base,
      existingDays: [
        { dayNumber: 1, title: 'Arrival', locations: ['Ubud'], activities: ['Temple visit'] },
        { dayNumber: 3, title: 'Stale Day 3', locations: ['Old Location'], activities: ['Old Activity'] },
      ],
    });
    expect(prompt).toContain('excluding Day 3');
    expect(prompt).toContain('Ubud');
    expect(prompt).not.toContain('Old Location');
    expect(prompt).not.toContain('Old Activity');
  });

  it('falls back to "Untitled" for a context day with no title', () => {
    const prompt = buildGenerateDayPreviewPrompt({ ...base, existingDays: [{ dayNumber: 1, locations: ['Ubud'] }] });
    expect(prompt).toContain('Day 1: Untitled');
  });

  it('response schema requires the day-level fields the mapper depends on', () => {
    expect(generateDayPreviewResponseSchema.properties.day.required).toEqual(
      expect.arrayContaining(['dayNumber', 'title', 'locations', 'activities']),
    );
  });
});

describe('buildGenerateDaysRangePrompt', () => {
  const base = { destination: 'Bali', dayNumbers: [5, 4], totalDuration: 7 };

  it('sorts the requested days ascending in the prompt text regardless of request order', () => {
    const prompt = buildGenerateDaysRangePrompt(base);
    expect(prompt).toContain('day 4, day 5');
    expect(prompt).toContain('exactly 2 entries');
  });

  it('excludes every requested day from the context block, keyed by day number', () => {
    const prompt = buildGenerateDaysRangePrompt({
      ...base,
      existingDays: [
        { dayNumber: 1, title: 'Arrival', locations: ['Ubud'], activities: ['Temple visit'] },
        { dayNumber: 4, title: 'Stale Day 4', locations: ['Old Beach'], activities: ['Old Surf'] },
        { dayNumber: 5, title: 'Stale Day 5', locations: ['Old Airport'], activities: [] },
      ],
    });
    expect(prompt).toContain('excluding days 4, 5');
    expect(prompt).toContain('Ubud');
    expect(prompt).not.toContain('Old Beach');
    expect(prompt).not.toContain('Old Airport');
  });

  it('omits the context block entirely when there are no existing days', () => {
    expect(buildGenerateDaysRangePrompt(base)).not.toContain('Already planned days');
  });

  it('uses singular "day" phrasing for a single requested day', () => {
    const prompt = buildGenerateDaysRangePrompt({
      ...base,
      dayNumbers: [4],
      existingDays: [{ dayNumber: 1, title: 'Arrival', locations: ['Ubud'], activities: [] }],
    });
    expect(prompt).toContain('excluding day 4');
    expect(prompt).not.toContain('excluding days');
  });

  it('response schema requires the day-level fields the mapper depends on', () => {
    expect(generateDaysRangeResponseSchema.properties.days.items.required).toEqual(
      expect.arrayContaining(['dayNumber', 'title', 'locations', 'activities']),
    );
  });
});

describe('buildWizardTurnPrompt', () => {
  it('includes capture_contact in the tool vocabulary listed to the model', () => {
    const prompt = buildWizardTurnPrompt({ wizardState: {}, messages: [], candidateSnippets: [] });
    expect(prompt).toContain('capture_contact');
  });

  it('surfaces already-captured contact fields to the model', () => {
    const prompt = buildWizardTurnPrompt({
      wizardState: { contact: { email: 'a@b.com' } },
      messages: [],
      candidateSnippets: [],
    });
    expect(prompt).toContain('a@b.com');
  });
});

describe('wizardTurnResponseSchema', () => {
  it('includes capture_contact in the tool enum', () => {
    expect(wizardTurnResponseSchema.properties.tool.enum).toContain('capture_contact');
  });

  it('args.contact accepts name/email/phone/whatsapp', () => {
    expect(Object.keys(wizardTurnResponseSchema.properties.args.properties.contact.properties)).toEqual(
      expect.arrayContaining(['name', 'email', 'phone', 'whatsapp']),
    );
  });
});

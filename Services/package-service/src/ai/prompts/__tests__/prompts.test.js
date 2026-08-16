import { describe, it, expect } from 'vitest';
import { buildGeneratePackagePrompt, generatePackageResponseSchema } from '../generatePackage.v1.js';
import { buildGenerateFromTitlePrompt } from '../generateFromTitle.v1.js';
import { buildPackageMarketingContentPrompt } from '../packageMarketingContent.v1.js';
import { buildHotelSuggestionPrompt } from '../hotelSuggestion.v1.js';

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

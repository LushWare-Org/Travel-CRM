import { describe, expect, it } from 'vitest';
import { CATEGORY_IMAGES, FALLBACK_IMAGE, categoryImage } from '../media';

describe('CATEGORY_IMAGES', () => {
  it('maps exactly the five package categories', () => {
    expect(Object.keys(CATEGORY_IMAGES).sort()).toEqual([
      'couple',
      'family',
      'group',
      'honeymoon',
      'wild-safari',
    ]);
  });

  it('serves every category from the self-hosted /lush/categories/ prefix', () => {
    Object.values(CATEGORY_IMAGES).forEach((src) => {
      expect(src).toMatch(/^\/lush\/categories\/[a-z-]+\.jpg$/);
    });
  });
});

describe('categoryImage', () => {
  // The CRM sends the uppercase enum; the legacy monolith wrote lowercase and
  // space-separated forms. Both must land on the same curated photo.
  const mapped: Array<[string, string]> = [
    ['HONEYMOON', '/lush/categories/honeymoon.jpg'],
    ['honeymoon', '/lush/categories/honeymoon.jpg'],
    ['COUPLE', '/lush/categories/couple.jpg'],
    ['FAMILY', '/lush/categories/family.jpg'],
    ['GROUP', '/lush/categories/group.jpg'],
    ['WILD_SAFARI', '/lush/categories/wild-safari.jpg'],
    [' wild safari ', '/lush/categories/wild-safari.jpg'],
  ];

  it.each(mapped)('resolves %s to %s', (category, expected) => {
    expect(categoryImage(category)).toBe(expected);
  });

  it.each([['Adventure'], ['other'], [''], ['   ']])(
    'falls back to the site-wide image for the unmapped %s',
    (category) => {
      expect(categoryImage(category)).toBe(FALLBACK_IMAGE);
    },
  );

  it('falls back to the site-wide image when no category is provided', () => {
    expect(categoryImage(undefined)).toBe(FALLBACK_IMAGE);
    expect(categoryImage(null)).toBe(FALLBACK_IMAGE);
  });
});

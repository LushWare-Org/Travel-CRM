import { describe, expect, it } from 'vitest';
import { aggregateDestinations, createSlug, normalizeDestination, normalizePackage } from '../packages.transform';

describe('normalizeDestination', () => {
  it('infers a known region from the country segment', () => {
    const result = normalizeDestination('Male, Maldives');
    expect(result.region).toBe('Asia');
    expect(result.country).toBe('Maldives');
    expect(result.name).toBe('Male');
  });

  it('falls back to Global for an unknown country', () => {
    const result = normalizeDestination('Atlantis');
    expect(result.region).toBe('Global');
  });

  it('returns an empty-shape result for a blank value', () => {
    const result = normalizeDestination('');
    expect(result).toEqual({
      raw: '',
      name: '',
      country: '',
      type: 'unknown',
      region: 'Global',
      slug: '',
      key: '',
      nameSlug: '',
      countrySlug: '',
    });
  });

  it('is case-insensitive when matching the region lookup', () => {
    expect(normalizeDestination('DUBAI').region).toBe('Middle East');
  });
});

describe('createSlug', () => {
  it('lowercases and hyphenates a normal string', () => {
    expect(createSlug('Bali Beach Getaway')).toBe('bali-beach-getaway');
  });

  it('returns an empty string for empty input', () => {
    expect(createSlug('')).toBe('');
  });

  it('strips non-alphanumeric characters and collapses repeated separators', () => {
    expect(createSlug('Maldives!!  --  Luxury_Resort')).toBe('maldives-luxury-resort');
  });

  it('drops characters outside the basic Latin alphanumeric range', () => {
    expect(createSlug('Café México')).toBe('caf-mxico');
  });
});

describe('normalizePackage', () => {
  it('normalizes a raw API package into the expected shape', () => {
    const result = normalizePackage({
      _id: 'p1',
      title: 'Maldives Escape',
      description: 'A relaxing beach honeymoon in the Maldives',
      destination: 'Male, Maldives',
      durationDays: 5,
      sellPrice: 1200,
      images: [{ url: 'https://example.com/1.jpg' }],
      highlights: ['beach', 'romance'],
    });

    expect(result.id).toBe('p1');
    expect(result.slug).toBe('maldives-escape');
    expect(result.destination.region).toBe('Asia');
    expect(result.image_url).toBe('https://example.com/1.jpg');
    expect(result.activities).toEqual(expect.arrayContaining(['Beach', 'Romance']));
    expect(result.isActive).toBe(true);
  });

  it('treats an explicit isActive: false as inactive', () => {
    expect(normalizePackage({ isActive: false }).isActive).toBe(false);
  });
});

describe('aggregateDestinations', () => {
  it('groups packages by destination key and computes min price/duration', () => {
    const packages = [
      normalizePackage({ _id: '1', title: 'A', destination: 'Male, Maldives', sellPrice: 1000, durationDays: 4 }),
      normalizePackage({ _id: '2', title: 'B', destination: 'Male, Maldives', sellPrice: 800, durationDays: 6 }),
    ];

    const [destination] = aggregateDestinations(packages);
    expect(destination.packagesCount).toBe(2);
    expect(destination.price).toBe(800);
    expect(destination.minDuration).toBe(4);
    expect(destination.maxDuration).toBe(6);
  });

  it('skips packages with no resolvable destination key', () => {
    const packages = [normalizePackage({ _id: '1', title: 'A', destination: '' })];
    expect(aggregateDestinations(packages)).toEqual([]);
  });
});

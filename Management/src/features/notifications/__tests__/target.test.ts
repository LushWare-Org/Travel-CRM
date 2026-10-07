import { describe, expect, it } from 'vitest';
import { toNotificationUrl } from '../target';

describe('toNotificationUrl', () => {
  it('serializes and escapes filtered document targets', () => {
    expect(toNotificationUrl({
      path: '/billing',
      query: { tab: 'quotation', ids: 'quote-1,quote-2' },
    })).toBe('/billing?tab=quotation&ids=quote-1%2Cquote-2');
  });

  it('returns the route unchanged when there is no query', () => {
    expect(toNotificationUrl({ path: '/packages' })).toBe('/packages');
  });
});

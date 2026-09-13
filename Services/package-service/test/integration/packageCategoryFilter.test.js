import { describe, it, expect } from 'vitest';
import { assembleWhere } from '../../src/services/package.service.js';

// `category` is a Prisma enum column on Package: an unrecognised value used to
// reach Prisma as-is and surface as a 500. That is not a hypothetical — it is
// the URL the site itself builds. The landing page's category cards lowercase
// the name (`/packages?category=family`), and the floating assistant writes the
// same lowercase slug, so both produced "Something went wrong on our side"
// where a package list was expected.
describe('assembleWhere — category', () => {
  it('accepts the enum value in any case', () => {
    expect(assembleWhere({ category: 'FAMILY' }).category).toBe('FAMILY');
    expect(assembleWhere({ category: 'family' }).category).toBe('FAMILY');
    expect(assembleWhere({ category: ' Family ' }).category).toBe('FAMILY');
  });

  it('matches nothing for a category that does not exist, instead of erroring', () => {
    // `in: []` is a valid filter that matches no row, which is the honest answer
    // to "packages in a category that does not exist" — and it never reaches
    // Prisma as an invalid enum member, which is what made it a 500.
    expect(assembleWhere({ category: 'atlantis' }).category).toEqual({ in: [] });
    expect(assembleWhere({ category: 'family-package' }).category).toEqual({ in: [] });
  });

  it('leaves the filter out entirely when no category was asked for', () => {
    expect(assembleWhere({})).not.toHaveProperty('category');
    expect(assembleWhere({ category: '' })).not.toHaveProperty('category');
  });
});

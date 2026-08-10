import { z } from 'zod';

// Prisma Decimal columns serialize to JSON as strings (e.g. "1250.00"), not
// numbers. Every monetary field in this package's schemas should use this
// instead of z.number() so real payloads from either service parse cleanly.
export const moneyField = z.coerce.number();

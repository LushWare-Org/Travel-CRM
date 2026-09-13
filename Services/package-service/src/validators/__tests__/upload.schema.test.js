import { describe, it, expect } from 'vitest';
import { publicIdParamSchema, deleteMultipleImagesSchema, optimizeQuerySchema } from '../upload.schema.js';

describe('publicIdParamSchema', () => {
  it('accepts a non-empty publicId', () => {
    expect(publicIdParamSchema.safeParse({ publicId: 'travel-crm/packages/a' }).success).toBe(true);
  });

  it('rejects an empty publicId', () => {
    expect(publicIdParamSchema.safeParse({ publicId: '' }).success).toBe(false);
  });
});

describe('deleteMultipleImagesSchema', () => {
  it('accepts a non-empty array of publicIds', () => {
    const result = deleteMultipleImagesSchema.safeParse({ publicIds: ['a', 'b'] });
    expect(result.success).toBe(true);
  });

  it('rejects an empty array', () => {
    expect(deleteMultipleImagesSchema.safeParse({ publicIds: [] }).success).toBe(false);
  });

  it('rejects a missing publicIds field', () => {
    expect(deleteMultipleImagesSchema.safeParse({}).success).toBe(false);
  });
});

describe('optimizeQuerySchema', () => {
  it('requires publicId', () => {
    expect(optimizeQuerySchema.safeParse({}).success).toBe(false);
  });

  it('applies default quality and format', () => {
    const result = optimizeQuerySchema.safeParse({ publicId: 'a' });
    expect(result.success).toBe(true);
    expect(result.data.quality).toBe('auto');
    expect(result.data.format).toBe('auto');
  });

  it('coerces width and height query strings to numbers', () => {
    const result = optimizeQuerySchema.safeParse({ publicId: 'a', width: '800', height: '600' });
    expect(result.success).toBe(true);
    expect(result.data.width).toBe(800);
    expect(result.data.height).toBe(600);
  });
});
